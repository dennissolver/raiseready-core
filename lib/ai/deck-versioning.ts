// Deck Version Management & Comparison Service

import { createClient } from '@/lib/supabase/server'
import { analyzeDeck, DeckScores } from './scoring'
import { parsePDF } from '@/lib/pdf/parser'
import { Database } from '@/types/database'
import { PitchDeck, PitchDeckInsert, DeckAnalysisInsert } from '@/types/deck'

// ============================================================================
// TYPES
// ============================================================================

type Json = Database['public']['Tables']['deck_analysis']['Row']['scores']

export interface DeckVersion {
  id: string
  version: number
  readiness_score: number
  scores: DeckScores
  created_at: string
  file_url: string
  title: string
}

export interface ScoreComparison {
  category: string
  previousScore: number
  currentScore: number
  change: number
  percentChange: number
  improved: boolean
}

export interface VersionComparison {
  previousVersion: DeckVersion
  currentVersion: DeckVersion
  overallScoreChange: number
  categoryComparisons: ScoreComparison[]
  significantImprovements: string[]
  remainingWeaknesses: string[]
  readinessLevelChange?: {
    from: string
    to: string
    upgraded: boolean
  }
}

// Helper type for deck with parent_deck_id
type DeckWithParent = {
  id: string
  parent_deck_id: string | null
}

// ============================================================================
// DECK RE-UPLOAD
// ============================================================================

/**
 * Handle re-upload of improved deck
 */
export async function handleDeckReupload(
  founderId: string,
  sessionId: string,
  parentDeckId: string,
  file: File | Buffer,
  fileName: string
): Promise<{ deckId: string; version: number; analysis: any }> {
  const supabase = await createClient()

  // Get parent deck info
  const { data: parentDeck } = await supabase
    .from('pitch_decks')
    .select('version, title, founder_id')
    .eq('id', parentDeckId)
    .single()

  if (!parentDeck) {
    throw new Error('Parent deck not found')
  }

  const newVersion = (parentDeck.version || 1) + 1

  // Upload file to storage
  const fileBuffer = file instanceof Buffer
    ? file
    : Buffer.from(await (file as File).arrayBuffer())

  const storagePath = `${founderId}/${Date.now()}_v${newVersion}_${fileName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('pitch-decks')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('pitch-decks')
    .getPublicUrl(storagePath)

  // Create new deck record with version info using proper Insert type
  const deckInsert: PitchDeckInsert = {
    founder_id: founderId,
    title: `${parentDeck.title} (v${newVersion})`,
    file_url: publicUrl,
    status: 'processing',
    version: newVersion,
    parent_deck_id: parentDeckId,
  }

  const { data: newDeck, error: deckError } = await supabase
    .from('pitch_decks')
    .insert(deckInsert)
    .select()
    .single()

  if (deckError || !newDeck) throw deckError || new Error('Failed to create deck')

  // Parse and analyze new version
  const parsed = await parsePDF(fileBuffer)
  const analysis = await analyzeDeck(parsed.text, newDeck.title)

  // Save analysis using proper Insert type
  const analysisInsert: DeckAnalysisInsert = {
    deck_id: newDeck.id,
    analysis_type: 'revision',
    scores: analysis.scores as Json,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    recommendations: analysis.recommendations,
  }

  await supabase.from('deck_analysis').insert(analysisInsert)

  // Update deck with score
  await supabase
    .from('pitch_decks')
    .update({
      status: 'analyzed',
      readiness_score: analysis.overallScore,
    })
    .eq('id', newDeck.id)

  // Update coaching session to point to new deck version
  await supabase
    .from('coaching_sessions')
    .update({
      deck_id: newDeck.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  return {
    deckId: newDeck.id,
    version: newVersion,
    analysis,
  }
}

// ============================================================================
// VERSION COMPARISON
// ============================================================================

/**
 * Compare two deck versions
 */
export async function compareDeckVersions(
  currentDeckId: string,
  previousDeckId?: string
): Promise<VersionComparison | null> {
  const supabase = await createClient()

  // Get current deck with analysis
  const { data: currentDeck } = await supabase
    .from('pitch_decks')
    .select(`
      id,
      version,
      readiness_score,
      created_at,
      file_url,
      title,
      parent_deck_id,
      deck_analysis!inner(scores)
    `)
    .eq('id', currentDeckId)
    .single()

  if (!currentDeck) return null

  // Get previous deck (either specified or parent)
  const prevId = previousDeckId || currentDeck.parent_deck_id
  if (!prevId) return null

  const { data: previousDeck } = await supabase
    .from('pitch_decks')
    .select(`
      id,
      version,
      readiness_score,
      created_at,
      file_url,
      title,
      deck_analysis!inner(scores)
    `)
    .eq('id', prevId)
    .single()

  if (!previousDeck) return null

  // Compare scores by category
  const currentScores = (currentDeck as any).deck_analysis[0].scores as DeckScores
  const previousScores = (previousDeck as any).deck_analysis[0].scores as DeckScores

  const categoryComparisons: ScoreComparison[] = Object.keys(currentScores)
    .filter(key => key !== 'constructor') // Filter out index signature
    .map(category => {
      const current = currentScores[category as keyof DeckScores]
      const previous = previousScores[category as keyof DeckScores]
      const change = current - previous
      const percentChange = previous > 0 ? (change / previous) * 100 : 0

      return {
        category,
        currentScore: current,
        previousScore: previous,
        change,
        percentChange,
        improved: change > 0,
      }
    })

  // Identify significant improvements (>10 points)
  const significantImprovements = categoryComparisons
    .filter(comp => comp.change >= 10)
    .map(comp => comp.category)

  // Identify remaining weaknesses (<70 score)
  const remainingWeaknesses = categoryComparisons
    .filter(comp => comp.currentScore < 70)
    .map(comp => comp.category)

  // Check readiness level change
  const getReadinessLevel = (score: number) => {
    if (score >= 85) return 'investor-ready'
    if (score >= 70) return 'ready'
    if (score >= 50) return 'needs-work'
    return 'not-ready'
  }

  const prevLevel = getReadinessLevel(previousDeck.readiness_score || 0)
  const currLevel = getReadinessLevel(currentDeck.readiness_score || 0)

  return {
    previousVersion: {
      id: previousDeck.id,
      version: previousDeck.version || 1,
      readiness_score: previousDeck.readiness_score || 0,
      scores: previousScores,
      created_at: previousDeck.created_at || '',
      file_url: previousDeck.file_url,
      title: previousDeck.title,
    },
    currentVersion: {
      id: currentDeck.id,
      version: currentDeck.version || 1,
      readiness_score: currentDeck.readiness_score || 0,
      scores: currentScores,
      created_at: currentDeck.created_at || '',
      file_url: currentDeck.file_url,
      title: currentDeck.title,
    },
    overallScoreChange: (currentDeck.readiness_score || 0) - (previousDeck.readiness_score || 0),
    categoryComparisons,
    significantImprovements,
    remainingWeaknesses,
    readinessLevelChange:
      prevLevel !== currLevel
        ? {
            from: prevLevel,
            to: currLevel,
            upgraded: (currentDeck.readiness_score || 0) > (previousDeck.readiness_score || 0),
          }
        : undefined,
  }
}

// ============================================================================
// VERSION HISTORY
// ============================================================================

/**
 * Get all versions of a deck
 */
export async function getDeckVersionHistory(deckId: string): Promise<DeckVersion[]> {
  const supabase = await createClient()

  // Get the root deck (oldest version) - with explicit type
  let currentDeck: { data: DeckWithParent | null } = await supabase
    .from('pitch_decks')
    .select('id, parent_deck_id')
    .eq('id', deckId)
    .single()

  if (!currentDeck.data) return []

  // Traverse to root with explicit typing
  let rootId = currentDeck.data.id
  while (currentDeck.data?.parent_deck_id) {
    const parent: { data: DeckWithParent | null } = await supabase
      .from('pitch_decks')
      .select('id, parent_deck_id')
      .eq('id', currentDeck.data.parent_deck_id)
      .single()

    if (!parent.data) break
    rootId = parent.data.id
    currentDeck = parent
  }

  // Get all versions starting from root
  const { data: allVersions } = await supabase
    .from('pitch_decks')
    .select(`
      id,
      version,
      readiness_score,
      created_at,
      file_url,
      title,
      parent_deck_id,
      deck_analysis!inner(scores)
    `)
    .or(`id.eq.${rootId},parent_deck_id.eq.${rootId}`)
    .order('version', { ascending: true })

  if (!allVersions) return []

  // Build version chain
  const orderedVersions: any[] = []

  let current = allVersions.find(v => v.id === rootId)
  while (current) {
    orderedVersions.push(current)
    current = allVersions.find(v => v.parent_deck_id === current!.id)
  }

  return orderedVersions.map(v => ({
    id: v.id,
    version: v.version || 1,
    readiness_score: v.readiness_score || 0,
    scores: v.deck_analysis[0].scores as DeckScores,
    created_at: v.created_at || '',
    file_url: v.file_url,
    title: v.title,
  }))
}

// ============================================================================
// READINESS CHECK
// ============================================================================

/**
 * Check if founder is ready to move to verbal practice
 */
export async function checkReadyForVerbal(deckId: string): Promise<{
  ready: boolean
  overallScore: number
  blockingIssues: string[]
}> {
  const supabase = await createClient()

  const { data: deck } = await supabase
    .from('pitch_decks')
    .select(`
      readiness_score,
      deck_analysis!inner(scores)
    `)
    .eq('id', deckId)
    .single()

  if (!deck) {
    return { ready: false, overallScore: 0, blockingIssues: ['Deck not found'] }
  }

  const overallScore = deck.readiness_score || 0
  const scores = (deck as any).deck_analysis[0].scores as DeckScores

  const blockingIssues: string[] = []

  // Check overall threshold
  if (overallScore < 75) {
    blockingIssues.push(`Overall score (${overallScore}) needs to be at least 75`)
  }

  // Check individual categories - filter out index signature
  const scoreEntries = Object.entries(scores).filter(([key]) => key !== 'constructor')
  scoreEntries.forEach(([category, score]) => {
    if (typeof score === 'number' && score < 65) {
      blockingIssues.push(`${category} (${score}) needs to be at least 65`)
    }
  })

  return {
    ready: blockingIssues.length === 0,
    overallScore,
    blockingIssues,
  }
}

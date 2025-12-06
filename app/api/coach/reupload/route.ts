import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleDeckReupload } from '@/lib/ai/deck-versioning'

export const dynamic = 'force-dynamic'

/**
 * Handle deck re-upload for materials improvement
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const parentDeckId = formData.get('parentDeckId') as string

    if (!file || !sessionId || !parentDeckId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, sessionId, parentDeckId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get session info
    const { data: session } = await supabase
      .from('coaching_sessions')
      .select('*, pitch_decks!inner(founder_id)')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const founderId = (session as any).pitch_decks.founder_id

    // Process re-upload
    const result = await handleDeckReupload(
      founderId,
      sessionId,
      parentDeckId,
      file,
      file.name
    )

    // Trigger version comparison
    const comparisonResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/coach/materials`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'compare_versions',
        }),
      }
    )

    const comparisonData = await comparisonResponse.json()

    return NextResponse.json({
      success: true,
      deckId: result.deckId,
      version: result.version,
      analysis: result.analysis,
      comparison: comparisonData.comparison,
      feedbackMessage: comparisonData.feedbackMessage,
    })
  } catch (error: any) {
    console.error('Deck re-upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Re-upload failed' },
      { status: 500 }
    )
  }
}

/**
 * Get version history for a deck
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deckId = searchParams.get('deckId')

    if (!deckId) {
      return NextResponse.json({ error: 'Missing deckId parameter' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all versions
    const { data: versions, error }: { data: any, error: any } = await supabase
      .from('pitch_decks')
      .select(`
        id,
        version,
        readiness_score,
        created_at,
        title,
        parent_deck_id,
        deck_analysis!inner(scores, strengths, weaknesses)
      `)
      .or(`id.eq.${deckId},parent_deck_id.eq.${deckId}`)
      .order('version', { ascending: true })

    if (error) {
      throw error
    }

    // Build version tree
    const versionTree = versions.map(v => ({
      id: v.id,
      version: v.version || 1,
      readinessScore: v.readiness_score || 0,
      createdAt: v.created_at,
      title: v.title,
      parentDeckId: v.parent_deck_id,
      scores: (v as any).deck_analysis[0]?.scores || {},
      strengths: (v as any).deck_analysis[0]?.strengths || [],
      weaknesses: (v as any).deck_analysis[0]?.weaknesses || [],
    }))

    return NextResponse.json({
      success: true,
      versions: versionTree,
    })
  } catch (error: any) {
    console.error('Version history error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get version history' },
      { status: 500 }
    )
  }
}



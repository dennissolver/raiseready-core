import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  MATERIALS_PROMPTS,
  generateImprovementPrompt,
  identifyFocusAreas,
  prioritizeImprovements,
} from '@/lib/ai/materials-prompts'
import { compareDeckVersions, checkReadyForVerbal } from '@/lib/ai/deck-versioning'

export const dynamic = 'force-dynamic'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

/**
 * Handle mode transitions and materials improvement coaching
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, action, data } = await request.json()

    const supabase = await createClient()

    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select(`
        *,
        pitch_decks!inner(
          id,
          title,
          readiness_score,
          founder_id,
          version,
          parent_deck_id
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    switch (action) {
      case 'transition_to_materials':
        return await handleTransitionToMaterials(session, supabase)

      case 'get_category_coaching':
        return await handleCategoryCoaching(session, data.category, supabase)

      case 'compare_versions':
        return await handleVersionComparison(session, supabase)

      case 'check_verbal_readiness':
        return await handleVerbalReadinessCheck(session, supabase)

      case 'update_focus_areas':
        return await handleUpdateFocusAreas(session, data.focusAreas, supabase)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Materials mode error:', error)
    return NextResponse.json({ error: error.message || 'Request failed' }, { status: 500 })
  }
}

/**
 * Transition from discovery to materials improvement
 */
async function handleTransitionToMaterials(session: any, supabase: any) {
  // Get latest deck analysis
  const { data: analysisArray } = await supabase
    .from('deck_analysis')
    .select('scores, weaknesses')
    .eq('deck_id', session.pitch_decks.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const analysis = analysisArray && analysisArray.length > 0 ? analysisArray[0] : null

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 })
  }

  // Identify focus areas (categories scoring < 70)
  const focusAreas = identifyFocusAreas(analysis.scores, 70)
  const priorities = prioritizeImprovements(analysis.scores)

  // Get founder profile for context
  const { data: founderProfiles } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('founder_id', session.pitch_decks.founder_id)
    .limit(1)

  const founderProfile = founderProfiles && founderProfiles.length > 0 ? founderProfiles[0] : null

  // Generate transition message
  const transitionMessage = MATERIALS_PROMPTS.TRANSITION_TO_MATERIALS(
    founderProfile,
    focusAreas.map(area => formatCategoryName(area))
  )

  // Update session mode
  await supabase
    .from('coaching_sessions')
    .update({
      current_mode: 'materials_improvement',
      phase_completed: {
        ...(session.phase_completed || {}),
        discovery: true,
      },
      focus_areas: focusAreas,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  // Add transition message to conversation
  const conversationHistory = (Array.isArray(session.conversation)
    ? session.conversation
    : []) as ConversationMessage[]

  const updatedConversation = [
    ...conversationHistory,
    {
      role: 'assistant' as const,
      content: transitionMessage,
      timestamp: new Date().toISOString(),
    },
  ]

  await supabase
    .from('coaching_sessions')
    .update({ conversation: updatedConversation })
    .eq('id', session.id)

  return NextResponse.json({
    success: true,
    message: transitionMessage,
    focusAreas,
    priorities,
    currentMode: 'materials_improvement',
  })
}

/**
 * Get category-specific coaching - FIXED TO ACTUALLY CALL CLAUDE
 */
async function handleCategoryCoaching(session: any, category: string, supabase: any) {
  // Get latest analysis
  const { data: analysisArray } = await supabase
    .from('deck_analysis')
    .select('scores, strengths, weaknesses, recommendations')
    .eq('deck_id', session.pitch_decks.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const analysis = analysisArray && analysisArray.length > 0 ? analysisArray[0] : null

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 })
  }

  // Get founder profile
  const { data: founderProfiles } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('founder_id', session.pitch_decks.founder_id)
    .limit(1)

  const founderProfile = founderProfiles && founderProfiles.length > 0 ? founderProfiles[0] : null

  // Generate coaching context
  const currentScore = analysis.scores[category] || 0
  const improvementContext = {
    categoryName: category,
    currentScore,
    targetScore: 80,
    founderId: session.pitch_decks.founder_id,
    founderProfile,
    previousAnalysis: analysis,
  }

  // Get the base coaching template
  const coachingTemplate = generateImprovementPrompt(
    category as keyof typeof MATERIALS_PROMPTS.CATEGORY_COACHING,
    improvementContext
  )

  // ✅ FIX: Actually call Claude API with the template as system prompt
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `You are an expert pitch deck coach helping founders improve their materials for impact investors.

**Current Context:**
- Category: ${formatCategoryName(category)}
- Current Score: ${currentScore}/100
- Target: 80+
- Deck: ${session.pitch_decks.title}
- Company: ${founderProfile?.company_name || 'Unknown'}

**Analysis Results:**
- Strengths: ${analysis.strengths?.join(', ') || 'None identified'}
- Weaknesses: ${analysis.weaknesses?.join(', ') || 'None identified'}

**Your Role:**
${coachingTemplate}

**Your Response Style:**
1. Be specific and actionable - give concrete examples
2. Reference their actual deck content when possible
3. Ask probing questions to understand their thinking
4. Keep it conversational and encouraging
5. Focus on ONE key improvement area at a time`,
      messages: [
        {
          role: 'user',
          content: `I'm working on improving my ${formatCategoryName(category)}. My current score is ${currentScore}/100. What specific improvements should I focus on to reach 80+?`
        }
      ],
    })

    const coaching = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I encountered an error generating coaching. Please try again.'

    return NextResponse.json({
      success: true,
      coaching, // ✅ Now returns actual AI response, not template
      currentScore,
      targetScore: 80,
    })
  } catch (error: any) {
    console.error('Error calling Claude API:', error)
    // Fallback to template if API fails
    return NextResponse.json({
      success: true,
      coaching: coachingTemplate,
      currentScore,
      targetScore: 80,
      warning: 'Using template due to API error',
    })
  }
}

/**
 * Compare deck versions after re-upload
 */
async function handleVersionComparison(session: any, supabase: any) {
  const currentDeckId = session.pitch_decks.id
  const parentDeckId = session.pitch_decks.parent_deck_id

  if (!parentDeckId) {
    return NextResponse.json({
      success: true,
      isFirstVersion: true,
      message: 'This is your first version. Keep improving!',
    })
  }

  const comparison = await compareDeckVersions(currentDeckId, parentDeckId)

  if (!comparison) {
    return NextResponse.json({ error: 'Could not compare versions' }, { status: 500 })
  }

  // Generate celebration/feedback message
  let feedbackMessage = ''

  if (comparison.overallScoreChange > 0) {
    feedbackMessage = MATERIALS_PROMPTS.SCORE_IMPROVEMENT(
      comparison.previousVersion.readiness_score,
      comparison.currentVersion.readiness_score,
      comparison.overallScoreChange,
      'Overall Score'
    )

    // Add category-specific improvements
    if (comparison.significantImprovements.length > 0) {
      feedbackMessage += '\n\n**Significant improvements:**\n'
      comparison.significantImprovements.forEach(category => {
        const comp = comparison.categoryComparisons.find(c => c.category === category)
        if (comp) {
          feedbackMessage += `• ${formatCategoryName(category)}: ${comp.previousScore} → ${comp.currentScore} (+${comp.change})\n`
        }
      })
    }

    // Note remaining weaknesses
    if (comparison.remainingWeaknesses.length > 0) {
      feedbackMessage += '\n\n**Still needs work:**\n'
      comparison.remainingWeaknesses.forEach(category => {
        const comp = comparison.categoryComparisons.find(c => c.category === category)
        if (comp) {
          feedbackMessage += `• ${formatCategoryName(category)}: ${comp.currentScore}/100\n`
        }
      })
    }
  } else {
    feedbackMessage =
      "I don't see significant improvements yet. Let's review what changed and refine further."
  }

  // Update conversation
  const conversationHistory = (Array.isArray(session.conversation)
    ? session.conversation
    : []) as ConversationMessage[]

  const updatedConversation = [
    ...conversationHistory,
    {
      role: 'assistant' as const,
      content: feedbackMessage,
      timestamp: new Date().toISOString(),
    },
  ]

  await supabase
    .from('coaching_sessions')
    .update({ conversation: updatedConversation })
    .eq('id', session.id)

  return NextResponse.json({
    success: true,
    comparison,
    feedbackMessage,
  })
}

/**
 * Check if ready for verbal practice
 */
async function handleVerbalReadinessCheck(session: any, supabase: any) {
  const readiness = await checkReadyForVerbal(session.pitch_decks.id)

  if (readiness.ready) {
    // Generate transition message
    const { data: analysisArray } = await supabase
      .from('deck_analysis')
      .select('scores')
      .eq('deck_id', session.pitch_decks.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const analysis = analysisArray && analysisArray.length > 0 ? analysisArray[0] : null

    // Calculate improvements from initial version
    const { data: allAnalyses } = await supabase
      .from('deck_analysis')
      .select('scores')
      .eq('deck_id', session.pitch_decks.id)
      .order('created_at', { ascending: true })

    const improvements: Record<string, number> = {}
    if (allAnalyses && allAnalyses.length > 1) {
      const first = allAnalyses[0].scores
      const last = allAnalyses[allAnalyses.length - 1].scores

      Object.keys(first).forEach(category => {
        improvements[category] = last[category] - first[category]
      })
    }

    const transitionMessage = MATERIALS_PROMPTS.READY_FOR_VERBAL(readiness.overallScore, improvements)

    // Update session
    await supabase
      .from('coaching_sessions')
      .update({
        phase_completed: {
          ...(session.phase_completed || {}),
          materials: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    return NextResponse.json({
      success: true,
      ready: true,
      message: transitionMessage,
      overallScore: readiness.overallScore,
    })
  } else {
    return NextResponse.json({
      success: true,
      ready: false,
      overallScore: readiness.overallScore,
      blockingIssues: readiness.blockingIssues,
      message: `Not quite ready yet. Here's what needs improvement:\n${readiness.blockingIssues.map(issue => `• ${issue}`).join('\n')}`,
    })
  }
}

/**
 * Update focus areas for current session
 */
async function handleUpdateFocusAreas(session: any, focusAreas: string[], supabase: any) {
  await supabase
    .from('coaching_sessions')
    .update({
      focus_areas: focusAreas,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  return NextResponse.json({
    success: true,
    focusAreas,
  })
}

/**
 * Helper: Format category name for display
 */
function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    problemClarity: 'Problem Clarity',
    solutionFit: 'Solution Fit',
    marketOpportunity: 'Market Opportunity',
    teamCredibility: 'Team Credibility',
    impactPotential: 'Impact Potential',
    financialViability: 'Financial Viability',
  }
  return names[category] || category
}

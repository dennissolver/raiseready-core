// File: app/api/coaching/start/route.ts
// Initialize coaching session with full context caching

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await request.json()

    // Load deck and analysis
    const { data: deck } = await supabase
      .from('pitch_decks')
      .select('*')
      .eq('id', deckId)
      .single()

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    const { data: analysis } = await supabase
      .from('deck_analysis')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Load founder profile (discovery insights)
    const { data: profile } = await supabase
      .from('founders')
      .select('*')
      .eq('id', user.id)
      .single()

    // Determine focus areas (top 3 weaknesses) - MOVED TO TOP SCOPE
    const focusAreas = analysis?.weaknesses?.slice(0, 3) || ['Overall deck improvement']

    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('deck_id', deckId)
      .eq('founder_id', user.id)
      .eq('status', 'active')
      .single()

    let session

    if (existingSession) {
      // Resume existing session
      session = existingSession
    } else {
      // Build rich context object for AI coaching
      const sessionContext = {
        deck_title: deck.title,
        deck_version: deck.version || 1,
        readiness_score: deck.readiness_score || 0,
        analysis_summary: {
          scores: analysis?.scores || {},
          strengths: analysis?.strengths || [],
          weaknesses: analysis?.weaknesses || [],
          recommendations: analysis?.recommendations || [],
        },
        founder_context: {
          company_name: profile?.company_name,
          tagline: profile?.tagline,
          problem_statement: profile?.problem_statement,
          solution_statement: profile?.solution_statement,
          impact_focus: profile?.impact_focus || [],
          team_background: profile?.team_background,
          funding_ask_stage: profile?.funding_ask_stage,
          funding_ask_amount: profile?.funding_ask_amount,
        },
      }

      // Create new coaching session with full context
      const { data: newSession, error: sessionError } = await supabase
        .from('coaching_sessions')
        .insert({
          deck_id: deckId,
          founder_id: user.id,
          session_type: 'materials_improvement',
          coach_type: 'primary',
          status: 'active',
          context: sessionContext,
          focus_areas: focusAreas,
          message_count: 0,
          current_mode: 'initial_review',
          conversation: [],
          last_activity: new Date().toISOString(),
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        return NextResponse.json(
          { error: 'Failed to create session', details: sessionError.message },
          { status: 500 }
        )
      }

      session = newSession
    }

    // Generate opening message based on context
    const score = deck.readiness_score || 0
    const version = deck.version || 1
    const weaknesses = analysis?.weaknesses || []
    const strengths = analysis?.strengths || []

    const openingMessage = `Great to see you again! I've reviewed **${deck.title}** (v${version}) and you're at **${score}%** investor readiness.

**What's Working Well:**
${strengths.slice(0, 2).map((s: string) => `✓ ${s}`).join('\n') || '✓ Strong foundation'}

**Areas We'll Focus On:**
${weaknesses.slice(0, 3).map((w: string, i: number) => `${i + 1}. ${w}`).join('\n') || '1. Strengthening your overall pitch'}

Let's start with the biggest opportunity for improvement. ${weaknesses[0] || 'Your deck structure'} - tell me more about your thinking here. What were you trying to communicate?`

    // Cast session to any to access new fields
    const sessionData = session as any

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      openingMessage,
      context: {
        readinessScore: score,
        version,
        focusAreas: sessionData.focus_areas || focusAreas,
      },
    })

  } catch (error: any) {
    console.error('Error starting coaching session:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to start session',
        details: error.details || error.toString()
      },
      { status: 500 }
    )
  }
}

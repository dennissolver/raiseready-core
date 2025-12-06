import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeWithClaude } from '@/lib/ai/anthropic'
import { ANALYSIS_PROMPTS } from '@/lib/ai/prompts'
import { parsePDF } from '@/lib/pdf/parser'
import { calculateOverallScore, getReadinessLevel, generateRecommendations } from '@/lib/ai/scoring'
import { cleanJsonResponse } from '@/lib/ai/utils'

export async function POST(request: NextRequest) {
  try {
    const { deckId } = await request.json()
    const supabase = await createClient()

    const { data: deck } = await supabase.from('pitch_decks').select('*').eq('id', deckId).single()
    if (!deck) return NextResponse.json({ error: 'Deck not found' }, { status: 404 })

    await supabase.from('pitch_decks').update({ status: 'processing' }).eq('id', deckId)

    const response = await fetch(deck.file_url)
    const buffer = Buffer.from(await response.arrayBuffer())
    const parsed = await parsePDF(buffer)

    const analysisPrompt = ANALYSIS_PROMPTS.INITIAL_DECK_ANALYSIS(parsed.text)
    const aiResponse = await analyzeWithClaude(analysisPrompt)

    // Use shared utility instead of inline cleaning
    const cleanJson = cleanJsonResponse(aiResponse)

    let analysis
    try {
      analysis = JSON.parse(cleanJson)
    } catch (parseError) {
      console.error('Failed to parse deck analysis:', parseError)
      console.error('Raw response:', aiResponse)
      console.error('Cleaned response:', cleanJson)

      // Update deck status to failed
      await supabase.from('pitch_decks').update({ status: 'failed' }).eq('id', deckId)

      return NextResponse.json(
        { error: 'Failed to parse AI analysis response' },
        { status: 500 }
      )
    }

    const overallScore = calculateOverallScore(analysis.scores)
    const readinessLevel = getReadinessLevel(overallScore)
    const recommendations = generateRecommendations(analysis.scores)

    await supabase.from('deck_analysis').insert({
      deck_id: deckId,
      analysis_type: 'initial',
      scores: analysis.scores,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      recommendations,
    })

    await supabase.from('pitch_decks').update({
      status: 'analyzed',
      readiness_score: overallScore
    }).eq('id', deckId)

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        overallScore,
        readinessLevel,
        recommendations
      }
    })
  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json({
      error: error.message || 'Analysis failed'
    }, { status: 500 })
  }
}

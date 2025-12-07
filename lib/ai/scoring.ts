/**
 * Deck Scoring & Analysis
 *
 * DETERMINISM: Uses temperature: 0 for consistent scoring across identical decks
 * This ensures founders see stable scores when re-analyzing the same content
 */

import Anthropic from '@anthropic-ai/sdk'
import { DeckScores } from '@/types/deck'
import { cleanJsonResponse } from './utils'

// ============================================================================
// TYPES
// ============================================================================

export type { DeckScores } from '@/types/deck'

export interface ReadinessAssessment {
  overallScore: number
  scores: DeckScores
  strengths: string[]
  weaknesses: string[]
  criticalGaps: string[]
  recommendations: string[]
  readinessLevel: 'not-ready' | 'needs-work' | 'ready' | 'investor-ready'
}

// ============================================================================
// SHARED CLIENT
// ============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ============================================================================
// DECK ANALYSIS
// ============================================================================

export async function analyzeDeck(deckText: string, title: string): Promise<ReadinessAssessment> {
  const prompt = `Analyze this pitch deck and provide scores for each category (0-100):

DECK TITLE: ${title}

DECK CONTENT:
${deckText.substring(0, 4000)} // Limit text to avoid token limits

Provide your analysis in the following JSON format:
{
  "problemClarity": <score 0-100>,
  "solutionFit": <score 0-100>,
  "marketOpportunity": <score 0-100>,
  "teamCredibility": <score 0-100>,
  "impactPotential": <score 0-100>,
  "financialViability": <score 0-100>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "criticalGaps": ["gap 1", "gap 2"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Only respond with valid JSON, no other text.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    temperature: 0, // DETERMINISTIC: Ensures consistent scoring
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'

  // Clean markdown formatting before parsing
  const cleanedResponse = cleanJsonResponse(responseText)

  let analysis
  try {
    analysis = JSON.parse(cleanedResponse)
  } catch (error) {
    console.error('Failed to parse Claude response:', error)
    console.error('Raw response:', responseText)
    console.error('Cleaned response:', cleanedResponse)

    // Fallback to default values if parsing fails
    analysis = {
      problemClarity: 50,
      solutionFit: 50,
      marketOpportunity: 50,
      teamCredibility: 50,
      impactPotential: 50,
      financialViability: 50,
      strengths: ['Unable to analyze - please try re-uploading'],
      weaknesses: [],
      criticalGaps: [],
      recommendations: []
    }
  }

  const scores: DeckScores = {
    problemClarity: analysis.problemClarity || 50,
    solutionFit: analysis.solutionFit || 50,
    marketOpportunity: analysis.marketOpportunity || 50,
    teamCredibility: analysis.teamCredibility || 50,
    impactPotential: analysis.impactPotential || 50,
    financialViability: analysis.financialViability || 50,
  }

  const overallScore = calculateOverallScore(scores)
  const readinessLevel = getReadinessLevel(overallScore)

  return {
    overallScore,
    scores,
    strengths: analysis.strengths || [],
    weaknesses: analysis.weaknesses || [],
    criticalGaps: analysis.criticalGaps || [],
    recommendations: analysis.recommendations || generateRecommendations(scores),
    readinessLevel,
  }
}

// ============================================================================
// SCORING CALCULATIONS
// ============================================================================

export function calculateOverallScore(scores: DeckScores): number {
  // Weighted average based on importance for impact investors
  const weights = {
    problemClarity: 0.20,      // 20% - Critical foundation
    solutionFit: 0.15,          // 15%
    marketOpportunity: 0.20,    // 20% - Market size matters
    teamCredibility: 0.15,      // 15%
    impactPotential: 0.20,      // 20% - Key for impact investors
    financialViability: 0.10,   // 10% - Important but flexible for impact
  }

  const weighted =
    scores.problemClarity * weights.problemClarity +
    scores.solutionFit * weights.solutionFit +
    scores.marketOpportunity * weights.marketOpportunity +
    scores.teamCredibility * weights.teamCredibility +
    scores.impactPotential * weights.impactPotential +
    scores.financialViability * weights.financialViability

  return Math.round(weighted)
}

export function getReadinessLevel(score: number): ReadinessAssessment['readinessLevel'] {
  if (score >= 85) return 'investor-ready'
  if (score >= 70) return 'ready'
  if (score >= 50) return 'needs-work'
  return 'not-ready'
}

export function generateRecommendations(scores: DeckScores): string[] {
  const recommendations: string[] = []
  const threshold = 70 // Minimum acceptable score per category

  if (scores.problemClarity < threshold) {
    recommendations.push(
      'Strengthen your problem statement with specific examples and data'
    )
  }

  if (scores.solutionFit < threshold) {
    recommendations.push(
      'Better demonstrate why your solution is uniquely suited to solve this problem'
    )
  }

  if (scores.marketOpportunity < threshold) {
    recommendations.push(
      'Provide more compelling market size data and growth projections'
    )
  }

  if (scores.teamCredibility < threshold) {
    recommendations.push(
      'Highlight relevant experience and domain expertise of your team'
    )
  }

  if (scores.impactPotential < threshold) {
    recommendations.push(
      'Articulate your impact metrics and Theory of Change more clearly'
    )
  }

  if (scores.financialViability < threshold) {
    recommendations.push(
      'Show a clearer path to sustainability and revenue generation'
    )
  }

  return recommendations
}
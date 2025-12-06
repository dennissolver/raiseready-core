import { createClient } from '@/lib/supabase/server'
import { anthropic } from './anthropic'
import { cleanJsonResponse } from './utils'

export async function extractFounderInsights(
  conversation: Array<{role: string, content: string}>,
  founderId: string
) {
  try {
    const conversationText = conversation
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n')

    const extractionPrompt = `Analyze this conversation and extract structured founder insights.

CONVERSATION:
${conversationText}

Extract ONLY if explicitly mentioned (return null if not found):
{
  "founder_type": "impact/tech/social/bootstrapped/etc or null",
  "motivation": "why they started the company or null",
  "personal_story": "their journey to this problem or null",
  "dream_outcome": "what success looks like to them or null",
  "problem_passion": "why THIS problem matters personally or null",
  "funding_motivation": "why raising now or null",
  "team_background": {...} or null,
  "ideal_investor_type": [...] or null
}

Return valid JSON only.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: extractionPrompt }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'

    // Use shared utility instead of inline cleaning
    const cleanedText = cleanJsonResponse(responseText)

    let insights
    try {
      insights = JSON.parse(cleanedText)
    } catch (error) {
      console.error('Failed to parse founder insights:', error)
      console.error('Raw response:', responseText)
      console.error('Cleaned response:', cleanedText)
      // Return early if parsing fails - extraction is non-critical
      return
    }

    // Remove null values
    const cleanInsights = Object.fromEntries(
      Object.entries(insights).filter(([_, v]) => v !== null && v !== 'null')
    )

    if (Object.keys(cleanInsights).length > 0) {
      const supabase = await createClient()
      await supabase.from('founder_profiles')
        .upsert({
          founder_id: founderId,
          ...cleanInsights,
          last_updated: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Extraction error:', error)
    // Don't throw - extraction is non-critical
  }
}
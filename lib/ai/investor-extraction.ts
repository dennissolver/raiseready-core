import { clientConfig } from '@/config';
// lib/ai/investor-extraction.ts
import Anthropic from '@anthropic-ai/sdk'
import { cleanJsonResponse } from './utils'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function extractInvestorCriteria(
  conversation: Array<{role: string, content: string}>
) {
  const conversationText = conversation
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n')

  const extractionPrompt = `Analyze this investor discovery conversation and extract their investment criteria.

CONVERSATION:
${conversationText}

Extract and return ONLY valid JSON:
{
  "min_readiness_score": <number 0-100 based on their tolerance for early stage>,
  "required_sectors": [<sectors they explicitly mentioned or implied>],
  "preferred_stages": [<"pre-seed", "seed", "series-a", "series-b">],
  "geography_focus": [<regions they mentioned>],
  "deal_breakers": [<specific things they will NOT invest in>],
  "ideal_founder_profile": {
    "domain_expertise_required": <boolean>,
    "team_size_preference": <string>,
    "prior_experience": <what they look for>
  },
  "red_flags": [<things that make them pass>],
  "investment_philosophy": <their approach in 1-2 sentences>
}

Be specific. If they said "I need to see revenue", that's a deal_breaker.
If they said "I backed a founder with no experience because of their passion", set min_readiness_score lower.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: extractionPrompt }]
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'

  // Use shared utility instead of inline cleaning
  const cleanedResponse = cleanJsonResponse(responseText)

  try {
    const criteria = JSON.parse(cleanedResponse)
    return criteria
  } catch (error) {
    console.error('Failed to parse investor criteria:', error)
    console.error('Raw response:', responseText)
    console.error('Cleaned response:', cleanedResponse)

    // Return fallback criteria structure
    return {
      min_readiness_score: 70,
      required_sectors: [],
      preferred_stages: ['seed'],
      geography_focus: [],
      deal_breakers: [],
      ideal_founder_profile: {
        domain_expertise_required: false,
        team_size_preference: 'any',
        prior_experience: 'preferred but not required'
      },
      red_flags: [],
      investment_philosophy: 'Unable to extract from conversation'
    }
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { cleanJsonResponse } from '@/lib/ai/utils'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

// Helper function to generate sample deals
async function generateSampleDeals(sector: string) {
  const prompt = `Generate 3 realistic seed-stage startup profiles in the ${sector} sector.

For each startup, provide:
- Company description (2 sentences max)
- Stage and funding target
- Team: number of co-founders and brief background
- Traction: key metrics (revenue, users, etc.)
- RaiseReady readiness score (0-100)
- 2-3 key strengths
- 2-3 notable gaps or concerns

Output as JSON array. Make profiles realistic with varying quality (mix of 60-85 scores).`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'

  // Use shared utility instead of inline cleaning
  const cleaned = cleanJsonResponse(text)

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    console.error('Failed to parse sample deals:', error)
    console.error('Raw response:', text)
    // Return empty array as fallback
    return []
  }
}

// Helper to format deal card
function formatDealCard(deal: any) {
  return `
**${deal.description}**

?? **Overview:**
- Stage: ${deal.stage}
- Raising: ${deal.funding_target}
- Team: ${deal.team}
- RaiseReady Score: ${deal.readiness_score}/100

?? **Traction:**
${deal.traction}

? **Strengths:**
${deal.strengths.map((s: string) => `- ${s}`).join('\n')}

?? **Gaps:**
${deal.gaps.map((g: string) => `- ${g}`).join('\n')}
`
}

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, sessionId } = await request.json()
    const supabase = await createClient()

    const userMessageCount = messages.filter((m: any) => m.role === 'user').length

    // DEAL EVALUATION MODE - After 4 exchanges
    if (userMessageCount === 4 && messages[messages.length - 1].content.includes('climate')) {
      // Extract sector from conversation (simple keyword matching for now)
      const conversationText = messages.map((m: any) => m.content).join(' ')
      let sector = 'climate tech' // Default

      if (conversationText.includes('health')) sector = 'healthcare'
      if (conversationText.includes('fintech') || conversationText.includes('financial')) sector = 'fintech'
      if (conversationText.includes('education') || conversationText.includes('edtech')) sector = 'education technology'

      const sampleDeals = await generateSampleDeals(sector)

      const dealPrompt = `Great! I've identified that you focus on ${sector}.

Now let me show you some real founder profiles (anonymized) from our platform. This helps me understand your ACTUAL evaluation criteria - not just theory, but how you really decide.

For each profile, tell me:
- Would you take a meeting?
- What excites you?
- What concerns you?

**Deal #1:**
${formatDealCard(sampleDeals[0])}

What's your gut reaction to this one?`

      return NextResponse.json({
        message: dealPrompt,
        sessionId,
        completed: false,
        dealEvaluation: true
      })
    }

    // NORMAL CONVERSATION MODE
    const systemPrompt = `You are an expert investment coach helping an investor define their investment thesis.

Your goal is to extract:
1. Minimum readiness score (0-100)
2. Required sectors
3. Deal breakers
4. Preferred stages
5. Geography focus

Ask probing Socratic questions. Be conversational but insightful. After 3-4 exchanges, you'll show them sample deals to evaluate.

Current question: ${userMessageCount + 1}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    if (!sessionId) {
      const { data: session, error: insertError } = await supabase
        .from('investor_discovery_sessions')
        .insert({
          investor_id: userId,
          conversation: messages,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Session insert failed:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({
        message: responseText,
        sessionId: session?.id,
        completed: false
      })
    } else {
      await supabase
        .from('investor_discovery_sessions')
        .update({
          conversation: [...messages, { role: 'assistant', content: responseText }]
        })
        .eq('id', sessionId)

      const completed = userMessageCount >= 10 // Extended to include deal evaluation

      if (completed) {
        const extractionPrompt = `Extract investor criteria as JSON based on this conversation AND their deal evaluations:
{
  "min_readiness_score": <number 0-100, infer from deals they liked>,
  "required_sectors": [<sectors they mentioned>],
  "preferred_stages": [<stages>],
  "geography_focus": [<regions>],
  "deal_breakers": [<strings, including patterns from deals they rejected>],
  "evaluation_patterns": {
    "focuses_on_team": <boolean>,
    "needs_traction": <boolean>,
    "values_mission_alignment": <boolean>
  }
}

Conversation:
${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n\n')}`

        const extraction = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: extractionPrompt }]
        })

        const criteriaText = extraction.content[0].type === 'text' ? extraction.content[0].text : '{}'

        // Use shared utility instead of inline cleaning
        const cleanedCriteria = cleanJsonResponse(criteriaText)

        let criteria
        try {
          criteria = JSON.parse(cleanedCriteria)
        } catch (error) {
          console.error('Failed to parse extracted criteria:', error)
          console.error('Raw criteria:', criteriaText)
          // Fallback to basic criteria
          criteria = {
            min_readiness_score: 70,
            required_sectors: [],
            preferred_stages: ['Seed'],
            geography_focus: [],
            deal_breakers: [],
            evaluation_patterns: {
              focuses_on_team: true,
              needs_traction: true,
              values_mission_alignment: true
            }
          }
        }

        await supabase
          .from('investor_discovery_sessions')
          .update({
            extracted_criteria: criteria,
            completed_at: new Date().toISOString()
          })
          .eq('id', sessionId)
      }

      return NextResponse.json({
        message: responseText,
        sessionId,
        completed
      })
    }
  } catch (error: any) {
    console.error('Investor coach error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, sessionId } = await request.json()

    // Fetch founder profile data
    const { data: founderData } = await supabase
      .from('founders')
      .select('*')
      .eq('id', user.id)
      .single()

    // Fetch latest pitch deck
    const { data: deckData } = await supabase
      .from('pitch_decks')
      .select('*')
      .eq('founder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Build context from profile and deck
    let contextInfo = '\n\n**FOUNDER CONTEXT (Use this to inform your questions):**\n'

    if (founderData) {
      contextInfo += `\nCompany: ${founderData.company_name || 'Not provided'}`
      contextInfo += `\nTagline: ${founderData.tagline || 'Not provided'}`
      contextInfo += `\nCountry: ${founderData.country || 'Not provided'}`
      contextInfo += `\nTeam Size: ${founderData.team_size || 'Not provided'}`
      contextInfo += `\nTeam Background: ${founderData.team_background || 'Not provided'}`
      contextInfo += `\nProblem: ${founderData.problem_statement || 'Not provided'}`
      contextInfo += `\nSolution: ${founderData.solution_statement || 'Not provided'}`
      contextInfo += `\nTarget Market: ${founderData.target_market || 'Not provided'}`
      contextInfo += `\nFunding Stage: ${founderData.funding_stage || 'Not provided'}`
      contextInfo += `\nFunding Seeking: ${founderData.funding_ask_stage || 'Not provided'} - ${founderData.funding_ask_amount || 'Not provided'}`
      contextInfo += `\nUse of Funds: ${founderData.use_of_funds || 'Not provided'}`
      contextInfo += `\nTraction: ${founderData.traction_details || 'Not provided'}`
      contextInfo += `\nSDG Focus: ${founderData.impact_focus?.join(', ') || 'Not provided'}`

      const checkmarks = []
      if (founderData.has_domain_expertise) checkmarks.push('Domain expertise')
      if (founderData.has_startup_experience) checkmarks.push('Startup experience')
      if (founderData.has_prototype) checkmarks.push('Has prototype')
      if (founderData.has_customers) checkmarks.push('Has customers')
      if (founderData.has_revenue) checkmarks.push('Generating revenue')
      if (checkmarks.length > 0) {
        contextInfo += `\n✓ ${checkmarks.join(', ')}`
      }
    }

    if (deckData) {
      contextInfo += `\n\nPitch Deck: "${deckData.title}"`
      contextInfo += `\nReadiness Score: ${deckData.readiness_score || 'Not analyzed yet'}%`
      if (deckData.sdgs?.length) {
        contextInfo += `\nSDGs in Deck: ${deckData.sdgs.join(', ')}`
      }
    }

    contextInfo += '\n\n**IMPORTANT:** You have reviewed their profile and deck above. Reference specific details naturally in your questions to show you understand their context. Ask deeper questions based on what you see.'

    // System prompt for founder discovery
    const systemPrompt = `You are an expert impact investment coach helping founders discover and articulate their authentic story. Your goal is to help them understand:

1. Their personal connection to the problem they're solving
2. The specific SDG-aligned impact they want to create
3. Why their solution is uniquely positioned to work
4. How their team came together and complements each other
5. Their vision for measurable success

CONVERSATION FLOW (8-10 questions total):
1. Start with the problem and their personal "why"
2. Explore the moment they realized this needed to exist
3. Dig into the specific impact metrics (SDG alignment)
4. Understand their unique insight or advantage
5. Learn about the team's origin story
6. Clarify their definition of success (both impact and financial)
7. Identify their ideal investor profile
8. Summarize their story back to them

RULES:
- Ask ONE question at a time
- Use their answers to ask deeper follow-up questions
- Be conversational and warm, not robotic
- Push for specifics - numbers, names, moments, feelings
- When they give generic answers, ask for specific examples
- After 8-10 exchanges, summarize their story and mark complete
- Use markdown formatting for emphasis when helpful
- Keep responses concise (2-4 sentences per question)

When the conversation is complete (after ~8-10 quality exchanges), respond with:
"**Your Impact Story (Summary)**

[Synthesize their answers into a compelling 3-4 paragraph narrative]

**Key Points:**
- Problem: [their personal connection]
- Impact: [SDG alignment and metrics]
- Solution: [unique advantage]
- Team: [origin story]
- Success: [their definition]

You're ready for the next step! This foundation will make your pitch materials much more authentic and compelling."

And set completed: true in your response.

${contextInfo}`

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I encountered an error. Please try again.'

    // Check if conversation is complete
    const isComplete = assistantMessage.includes('**Your Impact Story (Summary)**') ||
                      assistantMessage.toLowerCase().includes('you\'re ready for the next step')

    // Save to database - founder_profiles table
    let currentSessionId = sessionId
    const userMessageCount = messages.filter((m: any) => m.role === 'user').length
    const completenessPercent = isComplete ? 100 : Math.min(95, Math.round((userMessageCount / 8) * 100))

    // Prepare session data
    const sessionData = {
      founder_id: user.id,
      discovery_questions: { messages }, // Save full conversation so questions don't change
      discovery_completeness: completenessPercent,
      last_updated: new Date().toISOString(),
      ...(isComplete && { completed_at: new Date().toISOString() })
    }

    // Always upsert - creates if doesn't exist, updates if it does
    const { data: session, error: sessionError } = await supabase
      .from('founder_profiles')
      .upsert(sessionData, {
        onConflict: 'founder_id'
      })
      .select()
      .single()

    if (!sessionError && session) {
      currentSessionId = session.id
    } else if (sessionError) {
      console.error('Session save error:', sessionError)
    }

    // If complete, also update founders table with discovery completion timestamp
    if (isComplete) {
      await supabase
        .from('founders')
        .update({
          profile_completed_at: new Date().toISOString()
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      message: assistantMessage,
      sessionId: currentSessionId,
      completed: isComplete
    })

  } catch (error: any) {
    console.error('Founder discovery error:', error)
    return NextResponse.json(
      { error: error.message || 'Discovery session failed' },
      { status: 500 }
    )
  }
}

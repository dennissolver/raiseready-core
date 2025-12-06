// File: app/api/coaching/chat/route.ts
// Context-aware AI coaching chat endpoint with session management
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Then your existing imports and code below...
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

    const { messages, deckId, sessionId } = await request.json()

    // Load session with cached context
    const { data: session } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Cast to any until types are regenerated with new fields
    const sessionData = session as any

    // Use cached context from session (fast!)
    const context = sessionData.context || {}
    const analysis = context.analysis_summary || {}
    const weaknesses = analysis.weaknesses || []
    const strengths = analysis.strengths || []
    const scores = analysis.scores || {}
    const founderContext = context.founder_context || {}

    // Build context-aware system prompt
    const systemPrompt = `You are an expert pitch deck coach helping a founder improve their materials for impact investors.

**CONTEXT YOU HAVE (from cached session):**

**Deck Information:**
- Title: ${context.deck_title}
- Version: ${context.deck_version}
- Current Readiness: ${context.readiness_score}%
- Target: 80%+ for investor meetings

**Analysis Results:**
Strengths: ${strengths.join(', ')}
Weaknesses: ${weaknesses.join(', ')}
Scores: ${JSON.stringify(scores, null, 2)}

**Founder Context (from Discovery Session):**
- Company: ${founderContext.company_name}
- Tagline: ${founderContext.tagline}
- Problem: ${founderContext.problem_statement}
- Solution: ${founderContext.solution_statement}
- Impact Focus: SDGs ${founderContext.impact_focus?.join(', ')}
- Team: ${founderContext.team_background}
- Funding: ${founderContext.funding_ask_stage} - ${founderContext.funding_ask_amount}

**Focus Areas for This Session:**
${sessionData.focus_areas?.join(', ') || 'General improvement'}

**YOUR COACHING APPROACH:**

1. **Be Specific & Actionable**: Don't just say "improve your problem statement." Show them HOW:
   - Bad: "Make it more compelling"
   - Good: "Try: 'Every year, 2M families in Kenya lose $500 to unsafe water - that's $1B in lost productivity.' This gives scale + human impact + economic cost."

2. **One Issue at a Time**: Focus on the biggest weakness first. Don't overwhelm them.

3. **Ask Probing Questions**: Understand their thinking before suggesting changes
   - "What data are you using to back up that claim?"
   - "How does this connect to your SDG ${founderContext.impact_focus?.[0]} impact thesis?"
   - "What question is an investor trying to answer on this slide?"

4. **Reference Their Context**: Use their discovery insights
   - "You mentioned your problem is '${founderContext.problem_statement}' - how does that show up in the deck?"
   - "Your impact focus is SDG ${founderContext.impact_focus?.[0]}, but I don't see clear impact metrics in the deck"
   - "Your team background in ${founderContext.team_background} - is that highlighted?"

5. **Celebrate Progress**: Acknowledge what's working well

6. **When Ready for Re-upload**: After discussing improvements (usually 8-10 exchanges), say:
   "Ready to upload your improved version? I'll compare it to see what got better!"
   Then set action: request_reupload

**CONVERSATION GUIDELINES:**
- Keep responses conversational and encouraging
- Use markdown for emphasis (**bold**, bullet points)
- Give 1-2 specific examples per response
- Reference their company (${founderContext.company_name}) and impact goals
- After significant discussion, offer to review new version
- End conversations with clear next steps

**TONE:** Supportive expert - like a mentor who believes in their mission, not a critic

**CONVERSATION DEPTH:**
- Message ${(sessionData.message_count || 0) + 2} of this session
- ${sessionData.current_mode === 'initial_review' ? 'Focus on understanding their thinking' : 'Focus on concrete improvements'}`

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    })

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I encountered an error. Please try again.'

    // Check for special actions
    let action = null
    let newMode = sessionData.current_mode

    if (assistantMessage.toLowerCase().includes('upload your improved version') ||
        assistantMessage.toLowerCase().includes("i'll compare it")) {
      action = 'request_reupload'
      newMode = 'awaiting_reupload'
    }

    // Update session with activity tracking
    const newMessageCount = (sessionData.message_count || 0) + 2 // user + assistant
    const updatedConversation = [
      ...(sessionData.conversation || []),
      {
        role: 'user',
        content: messages[messages.length - 1].content,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      },
    ]

    await supabase
      .from('coaching_sessions')
      .update({
        message_count: newMessageCount,
        last_activity: new Date().toISOString(),
        current_mode: newMode,
        conversation: updatedConversation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return NextResponse.json({
      message: assistantMessage,
      sessionId,
      action,
      messageCount: newMessageCount,
    })
  } catch (error: any) {
    console.error('Coaching chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Chat failed' },
      { status: 500 }
    )
  }
}

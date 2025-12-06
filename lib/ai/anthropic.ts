import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeWithClaude(prompt: string, context?: string) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: context ? `${context}\n\n${prompt}` : prompt,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}

export async function coachWithClaude(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>,
  newMessage: string
) {
  // Strip out timestamp fields before sending to Claude
  const cleanMessages = conversationHistory.map(msg => ({
    role: msg.role,
    content: msg.content
  }))

  const messages = [
    ...cleanMessages,
    { role: 'user' as const, content: newMessage },
  ]

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages,
  })

  return message.content[0].type === 'text' ? message.content[0].text : ''
}

export { anthropic }

import Anthropic from '@anthropic-ai/sdk'

// Proxy configuration
const PROXY_URL = process.env.RAISEREADY_PROXY_URL
const CLIENT_ID = process.env.RAISEREADY_CLIENT_ID
const CLIENT_SECRET = process.env.RAISEREADY_CLIENT_SECRET

// Check if we should use proxy (client platforms) or direct API (admin platform)
const useProxy = !!(PROXY_URL && CLIENT_ID && CLIENT_SECRET)

// Direct Anthropic client (only used if not using proxy)
const anthropic = !useProxy ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null

/**
 * Make a request through the proxy
 */
async function proxyRequest(body: {
  model: string
  max_tokens: number
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  const response = await fetch(`${PROXY_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': CLIENT_ID!,
      'X-Client-Secret': CLIENT_SECRET!,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Proxy request failed' }))
    throw new Error(error.message || `Proxy error: ${response.status}`)
  }

  return response.json()
}

/**
 * Analyze content with Claude
 */
export async function analyzeWithClaude(prompt: string, context?: string) {
  const content = context ? `${context}\n\n${prompt}` : prompt
  const messages = [{ role: 'user' as const, content }]

  if (useProxy) {
    // Use proxy
    const response = await proxyRequest({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages,
    })
    return response.content[0]?.type === 'text' ? response.content[0].text : ''
  } else {
    // Use direct API
    const message = await anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages,
    })
    return message.content[0].type === 'text' ? message.content[0].text : ''
  }
}

/**
 * Coach conversation with Claude
 */
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

  if (useProxy) {
    // Use proxy
    const response = await proxyRequest({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    })
    return response.content[0]?.type === 'text' ? response.content[0].text : ''
  } else {
    // Use direct API
    const message = await anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    })
    return message.content[0].type === 'text' ? message.content[0].text : ''
  }
}

/**
 * Stream response from Claude (for real-time chat)
 */
export async function streamWithClaude(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  onChunk: (text: string) => void
) {
  if (useProxy) {
    // Proxy streaming (returns full response for now, can enhance later)
    const response = await proxyRequest({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    onChunk(text)
    return text
  } else {
    // Direct streaming
    const stream = await anthropic!.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    })

    let fullText = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text
        onChunk(event.delta.text)
      }
    }
    return fullText
  }
}

/**
 * Generic message creation (for custom use cases)
 */
export async function createMessage(options: {
  model?: string
  max_tokens?: number
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  temperature?: number
}) {
  const {
    model = 'claude-sonnet-4-20250514',
    max_tokens = 4000,
    system,
    messages,
    temperature,
  } = options

  if (useProxy) {
    return proxyRequest({
      model,
      max_tokens,
      system,
      messages,
      ...(temperature !== undefined && { temperature }),
    } as any)
  } else {
    return anthropic!.messages.create({
      model,
      max_tokens,
      system,
      messages,
      ...(temperature !== undefined && { temperature }),
    })
  }
}

// Export for backwards compatibility (only works if not using proxy)
export { anthropic }

// Export proxy status for debugging
export const isUsingProxy = useProxy
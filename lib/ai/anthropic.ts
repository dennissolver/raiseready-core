/**
 * Anthropic Claude API Client
 *
 * PRIVACY NOTICE:
 * - Anthropic API does NOT use customer data for model training by default
 * - No additional headers or opt-out required
 * - See: https://www.anthropic.com/policies/privacy-policy
 *
 * TEMPERATURE SETTINGS:
 * - temperature: 0 → Deterministic (scoring, extraction, analysis)
 * - temperature: 0.7-1.0 → Creative (coaching conversations)
 */

import Anthropic from '@anthropic-ai/sdk'

// ============================================================================
// CONFIGURATION
// ============================================================================

// Proxy configuration for white-label clients
const PROXY_URL = process.env.RAISEREADY_PROXY_URL
const CLIENT_ID = process.env.RAISEREADY_CLIENT_ID
const CLIENT_SECRET = process.env.RAISEREADY_CLIENT_SECRET

// Check if we should use proxy (client platforms) or direct API (admin platform)
const useProxy = !!(PROXY_URL && CLIENT_ID && CLIENT_SECRET)

// Model configuration
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

// Temperature presets
export const TEMPERATURE = {
  DETERMINISTIC: 0,      // For scoring, extraction, analysis - consistent results
  BALANCED: 0.5,         // For structured generation with some variety
  CREATIVE: 0.8,         // For coaching conversations - natural variation
} as const

// Direct Anthropic client (only used if not using proxy)
const anthropic = !useProxy ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
}) : null

// ============================================================================
// PROXY REQUEST HANDLER
// ============================================================================

interface ProxyRequestBody {
  model: string
  max_tokens: number
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  temperature?: number
}

async function proxyRequest(body: ProxyRequestBody) {
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

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Analyze content with Claude (deterministic)
 * Use for: deck analysis, scoring, data extraction
 */
export async function analyzeWithClaude(prompt: string, context?: string) {
  const content = context ? `${context}\n\n${prompt}` : prompt
  const messages = [{ role: 'user' as const, content }]

  if (useProxy) {
    const response = await proxyRequest({
      model: DEFAULT_MODEL,
      max_tokens: 4000,
      temperature: TEMPERATURE.DETERMINISTIC,
      messages,
    })
    return response.content[0]?.type === 'text' ? response.content[0].text : ''
  } else {
    const message = await anthropic!.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 4000,
      temperature: TEMPERATURE.DETERMINISTIC,
      messages,
    })
    return message.content[0].type === 'text' ? message.content[0].text : ''
  }
}

/**
 * Coach conversation with Claude (creative)
 * Use for: interactive coaching sessions, practice conversations
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
    const response = await proxyRequest({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      temperature: TEMPERATURE.CREATIVE,
      system: systemPrompt,
      messages,
    })
    return response.content[0]?.type === 'text' ? response.content[0].text : ''
  } else {
    const message = await anthropic!.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      temperature: TEMPERATURE.CREATIVE,
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
    // Proxy streaming (returns full response for now)
    const response = await proxyRequest({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      temperature: TEMPERATURE.CREATIVE,
      system: systemPrompt,
      messages,
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    onChunk(text)
    return text
  } else {
    const stream = await anthropic!.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      temperature: TEMPERATURE.CREATIVE,
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
 * Defaults to deterministic temperature - override for coaching
 */
export async function createMessage(options: {
  model?: string
  max_tokens?: number
  system?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  temperature?: number
}) {
  const {
    model = DEFAULT_MODEL,
    max_tokens = 4000,
    system,
    messages,
    temperature = TEMPERATURE.DETERMINISTIC, // Default to deterministic
  } = options

  if (useProxy) {
    return proxyRequest({
      model,
      max_tokens,
      system,
      messages,
      temperature,
    })
  } else {
    return anthropic!.messages.create({
      model,
      max_tokens,
      system,
      messages,
      temperature,
    })
  }
}

// Export for backwards compatibility
export { anthropic }

// Export proxy status for debugging
export const isUsingProxy = useProxy
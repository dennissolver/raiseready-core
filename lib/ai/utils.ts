// lib/ai/utils.ts
/**
 * Utilities for working with Anthropic Claude API responses
 */

export function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
  cleaned = cleaned.trim()
  if (cleaned.startsWith('`') && cleaned.endsWith('`')) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned
}

export function parseClaudeJson<T = any>(text: string): T {
  const cleaned = cleanJsonResponse(text)
  try {
    return JSON.parse(cleaned) as T
  } catch (error) {
    console.error('❌ Failed to parse Claude JSON')
    console.error('Raw:', text.substring(0, 200))
    console.error('Cleaned:', cleaned.substring(0, 200))
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown'}`)
  }
}
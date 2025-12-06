export function safeDate(date: string | null | undefined, fallback: Date = new Date()): Date {
  if (!date) return fallback
  return new Date(date)
}
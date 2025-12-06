'use client'

import { useState, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function useCoachingSession(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || sending) return

      setSending(true)
      setError(null)

      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      try {
        const response = await fetch('/api/coaching/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: content }),
        })

        const data = await response.json()

        if (!response.ok) throw new Error(data.error)

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } catch (err: any) {
        setError(err.message)
        setMessages((prev) => prev.slice(0, -1))
      } finally {
        setSending(false)
      }
    },
    [sessionId, sending]
  )

  return { messages, sendMessage, sending, error, setMessages }
}

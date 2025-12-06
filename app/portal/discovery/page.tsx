'use client';
import { clientConfig } from '@/config';
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth';

export default function PortalDiscoveryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'portal_admin',
  });

  useEffect(() => {
    const init = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      const openingMessage = {
        role: 'assistant',
        content: `Welcome to " + clientConfig.company.name + " Thesis Discovery! 🎯

I'm here to help you define and refine your investment criteria so we can better match incoming founder pitches to what you're looking for.

Since investor has helped 500+ startups raise $2B+, you've seen a lot of pitches. Let's capture that knowledge.

**What's a recent pitch you passed on that you now regret?** Tell me about that founder and why you said no at the time.`
      }
      setMessages([openingMessage])
    }

    init()
  }, [router, user])

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/investor-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: user.id,
          sessionId
        })
      })

      const data = await response.json()

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }])

      if (data.completed) {
        setTimeout(() => {
          router.push('/portal/dashboard?discovery=complete')
        }, 2000)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader className="bg-gradient-to-r from-primary to-purple-700 text-white rounded-t-lg">
            <CardTitle>" + clientConfig.company.name + " Thesis Discovery</CardTitle>
            <p className="text-sm text-purple-100">
              Define your criteria for evaluating incoming pitches
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Type your response..."
                className="flex-1"
                rows={3}
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-auto"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

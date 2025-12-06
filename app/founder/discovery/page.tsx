'use client';
import { clientConfig } from '@/config';

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function FounderDiscoveryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'founder',
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [isResuming, setIsResuming] = useState(false)

  useEffect(() => {
    if (user) {
      loadExistingSession()
    }
  }, [user])

  const loadExistingSession = async () => {
    try {
      const { data: existingSession, error } = await supabase
        .from('founder_profiles')
        .select('*')
        .eq('founder_id', user!.id)
        .single()

      const discoveryQuestions = existingSession?.discovery_questions as { messages?: Array<{role: string, content: string}> } | null

      if (existingSession && discoveryQuestions?.messages) {
        setMessages(discoveryQuestions.messages)
        setSessionId(existingSession.id)
        setIsResuming(true)

        if (existingSession.completed_at) {
          setIsComplete(true)
        }
      } else {
        initializeSession()
      }
    } catch (error) {
      initializeSession()
    }
  }

  const initializeSession = async () => {
    const openingMessage = {
      role: 'assistant',
      content: `Welcome to your Story Discovery Session! 🎯

I'm here to help you uncover and articulate the powerful story behind your startup. This is the foundation of every great pitch.

At " + clientConfig.company.name + ", we've helped 500+ founders raise over $2B - and the secret is always the same: **investors invest in stories, not just spreadsheets.**

Most founders can explain *what* they do. But the pitches that close deals explain *why* it matters and *why you* are the one to solve it.

Let's start with something personal:

**What problem are you solving, and why does it keep you up at night?**

Tell me the moment you realized this problem HAD to be solved.`
    }
    setMessages([openingMessage])
  }

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/founder-discovery', {
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
        setIsComplete(true)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or continue to your dashboard.'
      }])
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
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-primary to-purple-700 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Story Discovery Session</CardTitle>
            <p className="text-sm text-purple-100">
              Uncover the compelling narrative behind your startup
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Progress Indicator */}
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              {isResuming && !isComplete && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    <strong>Welcome back!</strong> Resuming your discovery session from where you left off.
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-purple-900">Discovery Progress</span>
                {isComplete ? (
                  <span className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Complete!
                  </span>
                ) : (
                  <span className="text-purple-600">
                    {messages.filter(m => m.role === 'user').length} / ~8 questions
                  </span>
                )}
              </div>
              <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{
                    width: `${Math.min(100, (messages.filter(m => m.role === 'user').length / 8) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Chat Messages */}
            <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Completion Card */}
            {isComplete && (
              <div className="mb-6 p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-green-900 mb-2">
                      Story Discovery Complete! 🎉
                    </h3>
                    <p className="text-sm text-green-800 mb-4">
                      Great work! You've uncovered the narrative that will make investors lean in.
                      Now let's put it into action with your pitch deck.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => router.push('/founder/dashboard')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Return to Dashboard
                      </Button>
                      <Button
                        onClick={() => router.push('/founder/upload')}
                        variant="outline"
                        className="border-green-600 text-green-700 hover:bg-green-50"
                      >
                        Upload Your Deck →
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            {!isComplete && (
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
                  placeholder="Share your story here... (Press Enter to send, Shift+Enter for new line)"
                  className="flex-1 min-h-[100px]"
                  rows={4}
                  disabled={loading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  size="icon"
                  className="h-auto bg-primary hover:bg-primary/90"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Helper Text */}
            {!isComplete && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                💡 Tip: The more authentic and specific you are, the more compelling your pitch will be
              </p>
            )}
          </CardContent>
        </Card>

        {/* Context Card */}
        <Card className="mt-6 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-sm text-amber-900 mb-2">
              What We'll Uncover Together:
            </h4>
            <ul className="text-xs text-amber-800 space-y-1">
              <li>• Your personal connection to the problem</li>
              <li>• The "aha moment" that started your journey</li>
              <li>• Why your solution is uniquely positioned to win</li>
              <li>• The story of how your team came together</li>
              <li>• Your vision that gets investors excited</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

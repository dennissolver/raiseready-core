'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { Send, Loader2, Upload, FileText, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function CoachingPage({ params }: { params: Promise<{ deckId: string }> }) {
  const resolvedParams = use(params)
  const deckId = resolvedParams.deckId
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'founder',
  })

  const [deck, setDeck] = useState<any>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id && deckId) {
      loadDeckAndAnalysis()
    }
  }, [user?.id, deckId])

  const loadDeckAndAnalysis = async () => {
    try {
      // Load deck
      const { data: deckData, error: deckError } = await supabase
        .from('pitch_decks')
        .select('*')
        .eq('id', deckId)
        .single()

      if (deckError) throw deckError
      setDeck(deckData)

      // Load analysis
      const { data: analysisData } = await supabase
        .from('deck_analysis')
        .select('*')
        .eq('deck_id', deckId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setAnalysis(analysisData)

      // Start coaching session
      await initializeCoachingSession(deckData, analysisData)
    } catch (error) {
      console.error('Error loading deck:', error)
      toast({
        title: 'Error loading deck',
        description: 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const initializeCoachingSession = async (deckData: any, analysisData: any) => {
    try {
      // Start coaching session
      const response = await fetch('/api/coaching/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId,
          founderId: user.id,
        }),
      })

      const data = await response.json()

      if (data.sessionId) {
        setSessionId(data.sessionId)
      }

      // Set initial message from coach
      const openingMessage = {
        role: 'assistant',
        content: data.openingMessage || generateOpeningMessage(deckData, analysisData),
      }
      setMessages([openingMessage])
    } catch (error) {
      console.error('Error starting session:', error)
    }
  }

  const generateOpeningMessage = (deckData: any, analysisData: any) => {
    const score = deckData.readiness_score || 0
    const version = deckData.version || 1
    const weaknesses = analysisData?.weaknesses || []

    return `Great to see you again! I've reviewed ${deckData.title} (v${version}) and you're at **${score}%** investor readiness.

**What's Working Well:**
${analysisData?.strengths?.slice(0, 2).map((s: string) => `✓ ${s}`).join('\n') || '• Strong foundation'}

**Areas We'll Focus On:**
${weaknesses.slice(0, 3).map((w: string, i: number) => `${i + 1}. ${w}`).join('\n')}

Let's start with the biggest opportunity for improvement. ${weaknesses[0] || 'Your deck structure'} - tell me more about your thinking here. What were you trying to communicate?`
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      const response = await fetch('/api/coaching/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          deckId,
          sessionId,
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
      }])

      // Handle special actions
      if (data.action === 'request_reupload') {
        // Show upload prompt
        toast({
          title: 'Ready to upload improved version?',
          description: 'Upload your revised deck to see what improved',
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error sending message',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading coaching session...</p>
        </div>
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">Deck not found</h1>
        <Button onClick={() => router.push('/founder/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/founder/dashboard')}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Refine Your Materials</h1>
              <p className="text-muted-foreground">
                Working on: {deck.title} (v{deck.version || 1})
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-600">
                {deck.readiness_score || 0}%
              </div>
              <p className="text-sm text-muted-foreground">Readiness Score</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Progress to Investor Ready</span>
                  <span className="text-sm text-muted-foreground">
                    {deck.readiness_score || 0}% / 80%
                  </span>
                </div>
                <Progress value={deck.readiness_score || 0} className="h-3" />
              </div>
              <Badge variant={deck.readiness_score >= 80 ? 'default' : 'secondary'}>
                {deck.readiness_score >= 80 ? 'Ready!' : 'In Progress'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chat Section - 2 columns */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  AI Coach: Materials Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
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
                    placeholder="Discuss your deck improvements... (Press Enter to send)"
                    className="flex-1"
                    rows={3}
                    disabled={sending}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={sending || !input.trim()}
                    size="icon"
                    className="h-auto bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-4">
            {/* Current Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analysis?.scores && Object.entries(analysis.scores).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-bold">{value}%</span>
                    </div>
                    <Progress value={value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(deck.file_url, '_blank')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Current Deck
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/founder/upload')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New Version
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Version Comparison
                  <Badge variant="secondary" className="ml-auto">Soon</Badge>
                </Button>
              </CardContent>
            </Card>

            {/* Top Weaknesses */}
            {analysis?.weaknesses && analysis.weaknesses.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Focus Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.weaknesses.slice(0, 4).map((weakness: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
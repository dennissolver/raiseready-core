'use client';
import { clientConfig } from '@/config';
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Edit } from 'lucide-react'

function ConfirmThesisContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  const [criteria, setCriteria] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadCriteria = async () => {
      if (!sessionId) {
        setLoading(false)
        return
      }

      const { data: session } = await supabase
        .from('investor_discovery_sessions')
        .select('extracted_criteria')
        .eq('id', sessionId)
        .single()

      setCriteria(session?.extracted_criteria)
      setLoading(false)
    }

    loadCriteria()
  }, [sessionId, supabase])

  const handleConfirm = async () => {
    if (!sessionId) return

    setLoading(true)

    const response = await fetch('/api/investor-coach/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, criteria })
    })

    if (response.ok) {
      router.push('/portal/dashboard?thesis=confirmed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!sessionId || !criteria) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4">Session not found. Please start a new discovery session.</p>
            <Button onClick={() => router.push('/portal/discovery')}>
              Start Discovery
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="border-2 border-primary">
          <CardHeader className="bg-gradient-to-r from-primary to-purple-700 text-white rounded-t-lg">
            <CardTitle>Review Your " + clientConfig.company.name + " Thesis</CardTitle>
            <CardDescription className="text-purple-100">
              Based on our conversation, here's what I learned about your criteria for evaluating pitches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Criteria Display */}
            {criteria && (
              <div className="space-y-4">
                {criteria.stages && (
                  <div>
                    <h4 className="font-semibold mb-2">Preferred Stages</h4>
                    <div className="flex flex-wrap gap-2">
                      {criteria.stages.map((stage: string) => (
                        <Badge key={stage} variant="secondary">{stage}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {criteria.sectors && (
                  <div>
                    <h4 className="font-semibold mb-2">Target Sectors</h4>
                    <div className="flex flex-wrap gap-2">
                      {criteria.sectors.map((sector: string) => (
                        <Badge key={sector} variant="outline">{sector}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {criteria.deal_breakers && (
                  <div>
                    <h4 className="font-semibold mb-2">Deal Breakers</h4>
                    <p className="text-sm text-muted-foreground">{criteria.deal_breakers}</p>
                  </div>
                )}

                {criteria.ideal_founder && (
                  <div>
                    <h4 className="font-semibold mb-2">Ideal Founder Profile</h4>
                    <p className="text-sm text-muted-foreground">{criteria.ideal_founder}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleConfirm} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Confirm Thesis
              </Button>
              <Button variant="outline" onClick={() => router.push('/portal/discovery')} className="gap-2">
                <Edit className="w-4 h-4" />
                Refine Further
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ConfirmThesisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ConfirmThesisContent />
    </Suspense>
  )
}

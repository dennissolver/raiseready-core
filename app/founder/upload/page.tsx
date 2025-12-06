'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeckUpload } from '@/components/deck/deck-upload'
import { useAuth } from '@/hooks/use-auth'

// Cache bust: v2 - redirect to dashboard
export default function UploadPage() {
  const router = useRouter()
  const [analyzing, setAnalyzing] = useState(false)

  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'founder',
  })

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

  const handleUploadComplete = async (deckId: string) => {
    setAnalyzing(true)

    try {
      // Trigger analysis
      const response = await fetch('/api/deck/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId }),
      })

      if (!response.ok) {
        console.warn('Analysis endpoint returned error, but deck was uploaded')
      }

      // Redirect to dashboard where they can see their deck
      router.push('/founder/dashboard')
    } catch (error) {
      console.error('Analysis error:', error)
      // Even if analysis fails, redirect to dashboard - deck is uploaded
      router.push('/founder/dashboard')
    }
  }

  return (
    <div className="container mx-auto py-12 flex justify-center">
      {analyzing ? (
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Processing your deck...</div>
          <div className="text-muted-foreground">
            Redirecting you to your dashboard...
          </div>
        </div>
      ) : (
        <DeckUpload
          onUploadComplete={handleUploadComplete}
          founderId={user?.id || '00000000-0000-0000-0000-000000000001'}
        />
      )}
    </div>
  )
}

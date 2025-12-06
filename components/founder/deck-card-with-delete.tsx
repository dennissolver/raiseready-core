'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { FileText, Calendar, TrendingUp } from 'lucide-react'

interface DeckCardProps {
  deck: {
    id: string
    title: string
    uploaded_at: string
    readiness_score?: number
    status?: string
  }
  onDelete?: (deckId: string) => void
}

export function DeckCardWithDelete({ deck, onDelete }: DeckCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteDeck = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/founder/delete-deck?deckId=${deck.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete deck')
      }

      toast({
        title: 'Deck deleted',
        description: 'Your pitch deck has been permanently deleted.',
      })

      // Call parent callback if provided
      if (onDelete) {
        onDelete(deck.id)
      }

      router.refresh()
    } catch (error) {
      console.error('Error deleting deck:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete deck',
        variant: 'destructive',
      })
      throw error // Re-throw to keep dialog open on error
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'analyzed':
        return <Badge variant="default">Analyzed</Badge>
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>
      case 'uploaded':
        return <Badge variant="outline">Uploaded</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{deck.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatDate(deck.uploaded_at)}
                </span>
              </div>
            </div>
          </div>
          {getStatusBadge(deck.status)}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {deck.readiness_score !== null && deck.readiness_score !== undefined && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Readiness Score</span>
              </div>
              <Badge
                variant={
                  deck.readiness_score >= 70
                    ? 'default'
                    : deck.readiness_score >= 40
                    ? 'secondary'
                    : 'outline'
                }
              >
                {deck.readiness_score}/100
              </Badge>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => router.push(`/founder/deck/${deck.id}`)}
            >
              View Details
            </Button>
            <DeleteConfirmationDialog
              title="Delete this deck?"
              description="This will permanently delete your pitch deck and all associated analysis. This action cannot be undone."
              onConfirm={handleDeleteDeck}
              triggerVariant="outline"
              triggerSize="sm"
              isIcon
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
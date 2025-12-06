'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Calendar } from 'lucide-react'

interface DeckPreviewProps {
  deck: {
    id: string
    title: string
    status: string
    readiness_score: number | null
    created_at: string
  }
}

export function DeckPreview({ deck }: DeckPreviewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'text-green-500'
      case 'processing':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {deck.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {new Date(deck.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <span className={`text-sm font-medium ${getStatusColor(deck.status)}`}>
            {deck.status}
          </span>
        </div>
        {deck.readiness_score !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Score:</span>
            <span className="text-2xl font-bold">{deck.readiness_score}/100</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

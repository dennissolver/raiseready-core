'use client'

import { useState } from 'react'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Eye, Mail } from 'lucide-react'

interface Founder {
  id: string
  email: string
  company_name?: string
  created_at: string
  deck_count: number
  readiness_score?: number
}

interface FounderManagementTableProps {
  founders: Founder[]
}

export function FounderManagementTable({ founders: initialFounders }: FounderManagementTableProps) {
  const [founders, setFounders] = useState(initialFounders)
  const router = useRouter()
  const { toast } = useToast()

  const handleDeleteFounder = async (founderId: string) => {
    try {
      const response = await fetch(`/api/admin/delete-founder?founderId=${founderId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete founder')
      }

      // Remove from local state
      setFounders(prev => prev.filter(f => f.id !== founderId))

      toast({
        title: 'Founder deleted',
        description: 'Founder and all related data have been permanently deleted.',
      })

      router.refresh()
    } catch (error) {
      console.error('Error deleting founder:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete founder',
        variant: 'destructive',
      })
      throw error // Re-throw to keep dialog open on error
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Founder</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Decks</TableHead>
            <TableHead>Readiness</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {founders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                No founders found
              </TableCell>
            </TableRow>
          ) : (
            founders.map((founder) => (
              <TableRow key={founder.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{founder.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {founder.company_name || (
                    <span className="text-muted-foreground italic">Not set</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={founder.deck_count > 0 ? 'default' : 'secondary'}>
                    {founder.deck_count} {founder.deck_count === 1 ? 'deck' : 'decks'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {founder.readiness_score !== null && founder.readiness_score !== undefined ? (
                    <Badge
                      variant={
                        founder.readiness_score >= 70
                          ? 'default'
                          : founder.readiness_score >= 40
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {founder.readiness_score}/100
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(founder.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/founders/${founder.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <DeleteConfirmationDialog
                      title="Delete Founder?"
                      description={`This will permanently delete ${founder.email} and all their data including ${founder.deck_count} deck(s), discovery sessions, matches, and watchlist entries. This action cannot be undone.`}
                      onConfirm={() => handleDeleteFounder(founder.id)}
                      triggerText="Delete"
                      triggerVariant="destructive"
                      triggerSize="sm"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
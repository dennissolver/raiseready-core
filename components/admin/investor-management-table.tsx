'use client';
import { clientConfig } from '@/config';

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
import { Eye, Mail, Building2 } from 'lucide-react'

interface Investor {
  id: string
  email: string
  name?: string
  organization_name?: string
  investor_type?: string
  created_at: string
  watchlist_count: number
  priority_sdgs?: string[]
}

interface InvestorManagementTableProps {
  investors: Investor[]
}

export function InvestorManagementTable({ investors: initialInvestors }: InvestorManagementTableProps) {
  const [investors, setInvestors] = useState(initialInvestors)
  const router = useRouter()
  const { toast } = useToast()

  const handleDeleteInvestor = async (investorId: string) => {
    try {
      const response = await fetch(`/api/admin/delete-investor?investorId=${investorId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete investor')
      }

      // Remove from local state
      setInvestors(prev => prev.filter(i => i.id !== investorId))

      toast({
        title: 'Investor deleted',
        description: 'Investor and all related data have been permanently deleted.',
      })

      router.refresh()
    } catch (error) {
      console.error('Error deleting investor:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete investor',
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

  const getInvestorTypeLabel = (type?: string) => {
    if (!type) return 'Not set'
    const labels: Record<string, string> = {
      'angel': 'Angel Investor',
      'vc': 'VC Fund',
      'family-office': 'Family Office',
      'corporate': 'Corporate VC',
      'impact-fund': 'Impact Fund',
      'accelerator': 'Accelerator',
    }
    return labels[type] || type
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Investor</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Watchlist</TableHead>
            <TableHead>Focus SDGs</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No investors found
              </TableCell>
            </TableRow>
          ) : (
            investors.map((investor) => (
              <TableRow key={investor.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{investor.email}</div>
                      {investor.name && (
                        <div className="text-sm text-muted-foreground">{investor.name}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {investor.organization_name ? (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{investor.organization_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Not set</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getInvestorTypeLabel(investor.investor_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={investor.watchlist_count > 0 ? 'default' : 'secondary'}>
                    {investor.watchlist_count} {investor.watchlist_count === 1 ? 'project' : 'projects'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {investor.priority_sdgs && investor.priority_sdgs.length > 0 ? (
                    <div className="flex gap-1 flex-wrap">
                      {investor.priority_sdgs.slice(0, 3).map((sdg) => (
                        <Badge key={sdg} variant="secondary" className="text-xs">
                          SDG {sdg}
                        </Badge>
                      ))}
                      {investor.priority_sdgs.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{investor.priority_sdgs.length - 3}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">None set</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(investor.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/investors/${investor.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <DeleteConfirmationDialog
                      title="Delete Investor?"
                      description={`This will permanently delete ${investor.email} and all their data including ${investor.watchlist_count} watchlist entries, matches, and profile. This action cannot be undone.`}
                      onConfirm={() => handleDeleteInvestor(investor.id)}
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

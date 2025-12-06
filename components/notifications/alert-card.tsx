'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/types/supabase';

type Alert = Database['public']['Tables']['watchlist_alerts']['Row'];

interface AlertCardProps {
  alert: Alert;
  onMarkRead?: (alertId: string) => void;
  onDelete?: (alertId: string) => void;
}

export function AlertCard({ alert, onMarkRead, onDelete }: AlertCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const handleMarkRead = async () => {
    try {
      const { error } = await supabase
        .from('watchlist_alerts')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', alert.id);

      if (error) throw error;

      if (onMarkRead) onMarkRead(alert.id);
    } catch (error) {
      console.error('Error marking as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark as read',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('watchlist_alerts')
        .delete()
        .eq('id', alert.id);

      if (error) throw error;

      if (onDelete) onDelete(alert.id);

      toast({
        title: 'Alert deleted',
      });
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete alert',
        variant: 'destructive',
      });
    }
  };

  const handleViewTarget = () => {
    const targetUrl = alert.target_type === 'project'
      ? `/projects/${alert.target_id}`
      : `/investors/${alert.target_id}`;
    router.push(targetUrl);
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'score_change':
        return '📈';
      case 'project_update':
        return '📄';
      case 'funding_stage_change':
        return '💰';
      case 'criteria_update':
        return '🎯';
      case 'new_investment':
        return '💵';
      case 'status_change':
        return '🔄';
      default:
        return '🔔';
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Recently';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <Card className={`${!alert.read ? 'border-blue-500 bg-blue-50/30' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl flex-shrink-0">
            {getAlertIcon(alert.alert_type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-medium">
                {alert.message}
              </p>
              {!alert.read && (
                <Badge variant="default" className="text-xs">
                  New
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {formatTime(alert.created_at)}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewTarget}
              >
                <ExternalLink className="w-3 h-3 mr-2" />
                View Details
              </Button>

              {!alert.read && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkRead}
                >
                  <CheckCheck className="w-3 h-3 mr-2" />
                  Mark Read
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertListProps {
  alerts: Alert[];
  onMarkRead?: (alertId: string) => void;
  onDelete?: (alertId: string) => void;
  emptyMessage?: string;
}

export function AlertList({
  alerts,
  onMarkRead,
  onDelete,
  emptyMessage = 'No notifications'
}: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
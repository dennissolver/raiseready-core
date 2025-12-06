'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCard, AlertList } from '@/components/notifications/alert-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';


import { Database } from '@/types/supabase';

type Alert = Database['public']['Tables']['watchlist_alerts']['Row'];

type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

  const supabase = createClient();
  const { toast } = useToast();
  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
  });

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

  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadAlerts();
    loadPreferences();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'watchlist_alerts',
        },
        (payload) => {
          setAlerts(prev => [payload.new as Alert, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [alerts, filterType, filterRead]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
    }
  };

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('watchlist_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setPreferences((data as any) || {
        email_enabled: true,
        in_app_enabled: true,
        alert_score_change: true,
        alert_project_update: true,
        alert_funding_stage: true,
        alert_milestone: false,
        alert_status_change: true,
        alert_criteria_update: true,
        alert_new_investment: false,
        alert_portfolio_addition: true,
        alert_ticket_change: true,
        alert_new_match: true,
        alert_profile_view: false,
        digest_frequency: 'realtime',
      });
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !preferences) return;

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
      setPreferencesOpen(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...alerts];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(alert => alert.alert_type === filterType);
    }

    // Filter by read status
    if (filterRead === 'unread') {
      filtered = filtered.filter(alert => !alert.read);
    } else if (filterRead === 'read') {
      filtered = filtered.filter(alert => alert.read);
    }

    setFilteredAlerts(filtered);
  };

  const handleMarkRead = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const handleDelete = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('watchlist_alerts')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(alert => ({ ...alert, read: true }))
      );

      toast({
        title: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all as read',
        variant: 'destructive',
      });
    }
  };

  const deleteAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('watchlist_alerts')
        .delete()
        .eq('user_id', user.id)
        .eq('read', true);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => !alert.read));

      toast({
        title: 'Read notifications deleted',
      });
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete notifications',
        variant: 'destructive',
      });
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'score_change': 'Score Changes',
      'project_update': 'Project Updates',
      'funding_stage_change': 'Stage Changes',
      'criteria_update': 'Criteria Updates',
      'new_investment': 'New Investments',
      'status_change': 'Status Changes',
    };
    return labels[type] || type;
  };

  const uniqueAlertTypes = Array.from(new Set(alerts.map(a => a.alert_type)));
  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="w-8 h-8" />
                  <h1 className="text-4xl font-bold">Notifications</h1>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-lg px-3 py-1">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-muted-foreground">
                  Stay updated on your watchlist activities
                </p>
              </div>

              {/* Settings Button */}
              <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Notification Preferences</DialogTitle>
                    <DialogDescription>
                      Customize what notifications you receive and how often
                    </DialogDescription>
                  </DialogHeader>

                  {preferences && (
                    <div className="space-y-6 py-4">
                      {/* Delivery Channels */}
                      <div>
                        <h3 className="font-semibold mb-3">Delivery Channels</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="in_app">In-app notifications</Label>
                            <Switch
                              id="in_app"
                              checked={preferences.in_app_enabled ?? false}
                              onCheckedChange={(checked) =>
                                setPreferences({ ...preferences, in_app_enabled: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="email">Email notifications</Label>
                            <Switch
                              id="email"
                              checked={preferences.email_enabled ?? false}
                              onCheckedChange={(checked) =>
                                setPreferences({ ...preferences, email_enabled: checked })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Alert Types */}
                      <div>
                        <h3 className="font-semibold mb-3">Alert Types</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="score_change">Score changes (±10 points)</Label>
                            <Switch
                              id="score_change"
                              checked={preferences.alert_score_change ?? false}
                              onCheckedChange={(checked) =>
                                setPreferences({ ...preferences, alert_score_change: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="project_update">Project updates</Label>
                            <Switch
                              id="project_update"
                              checked={preferences.alert_project_update ?? false}
                              onCheckedChange={(checked) =>
                                setPreferences({ ...preferences, alert_project_update: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="funding_stage">Funding stage changes</Label>
                            <Switch
                              id="funding_stage"
                              checked={preferences.alert_funding_stage ?? false}
                              onCheckedChange={(checked) =>
                                setPreferences({ ...preferences, alert_funding_stage: checked ?? false})
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="criteria_update">Investor criteria updates</Label>
                            <Switch
                              id="criteria_update"
                              checked={preferences.alert_criteria_update ?? false}
                              onCheckedChange={(checked) =>
                                setPreferences({ ...preferences, alert_criteria_update: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="new_match">New matches</Label>
                            <Switch
                              id="new_match"
                              checked={preferences.alert_new_match ?? false}
                              onCheckedChange={(checked) =>
                                setPreferences({ ...preferences, alert_new_match: checked })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Frequency */}
                      <div>
                        <h3 className="font-semibold mb-3">Digest Frequency</h3>
                        <Select
                          value={preferences.digest_frequency ?? 'realtime'}
                          onValueChange={(value: any) =>
                            setPreferences({ ...preferences, digest_frequency: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">Real-time (instant)</SelectItem>
                            <SelectItem value="daily">Daily digest</SelectItem>
                            <SelectItem value="weekly">Weekly digest</SelectItem>
                            <SelectItem value="never">Never</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPreferencesOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={savePreferences}>
                      Save Preferences
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{alerts.length}</div>
                <div className="text-sm text-muted-foreground">Total Notifications</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{unreadCount}</div>
                <div className="text-sm text-muted-foreground">Unread</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-2xl font-bold">{alerts.length - unreadCount}</div>
                <div className="text-sm text-muted-foreground">Read</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Filters and Actions */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterRead} onValueChange={(value: any) => setFilterRead(value)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread only</SelectItem>
                      <SelectItem value="read">Read only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueAlertTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {getAlertTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Mark all read
                    </Button>
                  )}
                  {alerts.filter(a => a.read).length > 0 && (
                    <Button variant="outline" size="sm" onClick={deleteAllRead}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete read
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <AlertList
              alerts={filteredAlerts as any}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              emptyMessage={
                filterRead === 'unread' && unreadCount === 0
                  ? "You're all caught up! 🎉"
                  : 'No notifications yet'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

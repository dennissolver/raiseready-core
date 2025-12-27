'use client';
// app/portal/dashboard/page.tsx

import { clientConfig } from '@/config';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { safeDate } from '@/lib/utils/date'
import {
  TrendingUp,
  Users,
  Target,
  MessageSquare,
  Edit,
  CheckCircle2,
  AlertCircle,
  FileText,
  LayoutDashboard,
  Inbox
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export default function PortalDashboard() {
  const router = useRouter();
  const supabase = createClient();

  // Get config-driven labels
  const { company, platformTypeConfig } = clientConfig;
  const ownerLabel = platformTypeConfig?.ownerLabel || 'Investor';
  const thesisLabel = platformTypeConfig?.thesisLabel || 'Investment Thesis';
  const founderLabel = platformTypeConfig?.founderLabel || 'Founder';
  const matchActionLabel = platformTypeConfig?.matchActionLabel || 'Invest';

  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'portal_admin',
  });

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [hasCompletedThesis, setHasCompletedThesis] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      if (!user) return;

      // Load investor profile/thesis
      const { data: profileData } = await supabase
        .from('investor_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        const completion = calculateProfileCompletion(profileData);
        setProfileCompletion(completion);
      }

      // Check if thesis/discovery completed
      const { data: session } = await supabase
        .from('investor_discovery_sessions')
        .select('completed_at, extracted_criteria')
        .eq('investor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setHasCompletedThesis(!!session?.completed_at);

      // Load founder submissions (all pitch decks)
      const { data: pitchDecks } = await supabase
        .from('pitch_decks')
        .select(`
          *,
          founders (
            id,
            email,
            name,
            founder_type,
            funding_stage,
            target_market
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      setSubmissions(pitchDecks || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompletion = (profile: any) => {
    if (!profile) return 0;

    let completed = 0;
    let total = 10;

    if (profile.organization_name) completed++;
    if (profile.investor_type) completed++;
    if (profile.min_ticket_size) completed++;
    if (profile.max_ticket_size) completed++;
    if (profile.stages?.length > 0) completed++;
    if (profile.sectors?.length > 0) completed++;
    if (profile.geographies?.length > 0) completed++;
    if (profile.investment_philosophy) completed++;
    if (profile.deal_breakers) completed++;
    if (profile.ideal_founder_profile) completed++;

    return Math.round((completed / total) * 100);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">{company.name} Admin</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/portal/thesis">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit {thesisLabel}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <Inbox className="w-4 h-4" />
              Submissions ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="shortlist" className="gap-2">
              <Users className="w-4 h-4" />
              Shortlist
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{submissions.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {submissions.filter(s => {
                      const created = new Date(s.created_at);
                      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                      return created > weekAgo;
                    }).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Readiness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {submissions.length > 0
                      ? Math.round(submissions.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / submissions.length)
                      : '—'
                    }
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{thesisLabel} Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{profileCompletion}%</div>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </CardContent>
              </Card>
            </div>

            {/* Thesis Setup Card */}
            {profileCompletion < 100 && (
              <Card className="border-2 border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-600" />
                    Configure Your {thesisLabel}
                  </CardTitle>
                  <CardDescription>
                    Set up your criteria to enable AI-powered matching with incoming pitches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{thesisLabel} Completion</span>
                      <span className="text-sm font-bold text-amber-600">{profileCompletion}%</span>
                    </div>
                    <Progress value={profileCompletion} className="h-2" />
                  </div>
                  <div className="flex gap-3">
                    <Link href="/portal/thesis">
                      <Button>Complete {thesisLabel} Setup</Button>
                    </Link>
                    <Link href="/portal/discovery">
                      <Button variant="outline" className="gap-2">
                        <MessageSquare className="w-4 h-4" />
                        AI Discovery Session
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Submissions Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Submissions</CardTitle>
                    <CardDescription>Latest pitch decks from {founderLabel.toLowerCase()}s</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('submissions')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{submission.title || 'Untitled Pitch'}</p>
                          <p className="text-sm text-muted-foreground">
                            {submission.founders?.email} • {submission.founders?.funding_stage || 'Stage not set'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={submission.readiness_score >= 70 ? 'default' : 'secondary'}>
                            Score: {submission.readiness_score || '—'}
                          </Badge>
                          <Link href={`/portal/review/${submission.id}`}>
                            <Button size="sm" variant="outline">Review</Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Pitch Submissions</CardTitle>
                <CardDescription>Review and manage incoming {founderLabel.toLowerCase()} pitches</CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                    <p className="text-sm text-muted-foreground">
                      {founderLabel}s will appear here when they submit their pitch decks
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <Card key={submission.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold">{submission.title || 'Untitled Pitch'}</h3>
                                <Badge variant={submission.readiness_score >= 70 ? 'default' : 'secondary'}>
                                  Score: {submission.readiness_score || '—'}/100
                                </Badge>
                              </div>
                              <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                                <span>{submission.founders?.name || submission.founders?.email}</span>
                                <span>{submission.founders?.funding_stage || 'Stage not set'}</span>
                                <span>{submission.founders?.target_market || 'Market not set'}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Submitted {safeDate(submission.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/portal/review/${submission.id}`}>
                                <Button size="sm">Review</Button>
                              </Link>
                              <Button size="sm" variant="outline">Shortlist</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shortlist Tab */}
          <TabsContent value="shortlist" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shortlisted {founderLabel}s</CardTitle>
                <CardDescription>{founderLabel}s you've marked for follow-up</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No shortlisted {founderLabel.toLowerCase()}s yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review submissions and add {founderLabel.toLowerCase()}s to your shortlist
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('submissions')}>
                    Browse Submissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

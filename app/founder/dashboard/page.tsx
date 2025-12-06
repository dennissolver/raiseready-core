'use client';
import { clientConfig } from '@/config';
// Updated types - $(date)

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, FileText, TrendingUp, CheckCircle, Circle, ArrowRight, Target, BookOpen, Mic, User } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { safeDate } from '@/lib/utils/date';

import { Database } from '@/types/supabase';

type PitchDeck = Database['public']['Tables']['pitch_decks']['Row'];

export default function DashboardPage() {
  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'founder',
  });

  const [decks, setDecks] = useState<PitchDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedDiscovery, setHasCompletedDiscovery] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.id) return;

      // Load decks
      try {
        const { data, error } = await supabase
          .from('pitch_decks')
          .select('*')
          .eq('founder_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDecks((data || []) as PitchDeck[]);
      } catch (error) {
        console.error('Error loading decks:', error);
      } finally {
        setIsLoading(false);
      }

      // Check discovery status
      try {
        const { data } = await supabase
          .from('founder_profiles')
          .select('discovery_completeness')
          .eq('founder_id', user.id)
          .single();

        setHasCompletedDiscovery((data?.discovery_completeness || 0) > 50);
      } catch (error) {
        setHasCompletedDiscovery(false);
      }

      // Check profile completion
      try {
        const { data } = await supabase
          .from('founders')
          .select('profile_completed_at')
          .eq('id', user.id)
          .single();

        setHasCompletedProfile(!!data?.profile_completed_at);
      } catch (error) {
        setHasCompletedProfile(false);
      }
    };

    loadAllData();
  }, [user?.id]);

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

  // Journey Steps - investor version (5 steps, no "Find Investors")
  const journeySteps = [
    {
      number: 1,
      title: 'Upload Your Deck',
      description: 'Share your pitch deck for AI analysis',
      icon: FileText,
      href: '/founder/upload',
      completed: decks.length > 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      number: 2,
      title: 'Complete Your Profile',
      description: 'Tell us about your venture and team',
      icon: User,
      href: '/founder/profile',
      completed: hasCompletedProfile,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      number: 3,
      title: 'Story Discovery',
      description: 'AI coach helps craft your narrative',
      icon: Target,
      href: '/founder/discovery',
      completed: hasCompletedDiscovery,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      disabled: !hasCompletedProfile || decks.length === 0,
    },
    {
      number: 4,
      title: 'Refine Materials',
      description: 'Improve deck with AI coaching',
      icon: BookOpen,
      href: decks.length > 0 ? `/coaching/${decks[0].id}` : '/founder/upload',
      completed: decks.some(d => (d.readiness_score || 0) > 70),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      disabled: decks.length === 0,
    },
    {
      number: 5,
      title: 'Practice Your Pitch',
      description: 'Rehearse with voice coaching',
      icon: Mic,
      href: '/founder/practice',
      completed: false,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      disabled: false,
      comingSoon: false,
    },
  ];

  const currentStep = journeySteps.findIndex(step => !step.completed);
  const nextStep = journeySteps[currentStep >= 0 ? currentStep : journeySteps.length - 1];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Founder Dashboard</h1>
        <p className="text-muted-foreground">
          Your journey to becoming investor-ready with investor
        </p>
      </div>

      {/* Journey Progress Widget */}
      <Card className="mb-8 border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">🎯 Your Path to Investor-Ready</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete each step to perfect your pitch for investor review
              </p>
            </div>
            {nextStep && !nextStep.disabled && (
              <Link href={nextStep.href}>
                <Button size="lg" className="gap-2">
                  Continue Journey
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {journeySteps.map((step) => {
              const Icon = step.icon;
              const isNext = step.number === (currentStep + 1);

              return (
                <Link
                  key={step.number}
                  href={step.disabled ? '#' : step.href}
                  className={step.disabled ? 'pointer-events-none' : ''}
                >
                  <Card
                    className={`h-full transition-all hover:shadow-lg ${
                      isNext ? 'ring-2 ring-primary' : ''
                    } ${step.disabled ? 'opacity-50' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${step.bgColor}`}>
                          <Icon className={`w-5 h-5 ${step.color}`} />
                        </div>
                        {step.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : isNext ? (
                          <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            STEP {step.number}
                          </span>
                          {step.comingSoon && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              Soon
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm leading-tight">{step.title}</h3>
                        <p className="text-xs text-muted-foreground leading-tight">
                          {step.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decks</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{decks.length}</div>
            <p className="text-xs text-muted-foreground">
              {decks.length === 1 ? 'pitch deck' : 'pitch decks'} uploaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Readiness</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {decks.length > 0
                ? Math.round(
                    decks.reduce((sum, deck) => sum + (deck.readiness_score || 0), 0) /
                      decks.length
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all decks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Journey Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {journeySteps.filter(s => s.completed).length}/{journeySteps.filter(s => !s.comingSoon).length}
            </div>
            <p className="text-xs text-muted-foreground">
              steps completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pitch Decks */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-4">Your Pitch Decks</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : !decks || decks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No pitch decks yet</p>
            <p className="text-muted-foreground mb-6">
              Upload your first deck to get AI-powered analysis and coaching
            </p>
            <Link href="/founder/upload">
              <Button size="lg">
                <PlusCircle className="w-4 h-4 mr-2" />
                Upload Your First Deck
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card key={deck.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-1">{deck.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span>
                    {safeDate(deck.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Readiness Score</span>
                      <span className="text-lg font-bold">
                        {deck.readiness_score || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${deck.readiness_score || 0}%` }}
                      />
                    </div>
                  </div>
                  <Link href={`/coaching/${deck.id}`}>
                    <Button className="w-full" variant="outline">
                      Get Coaching
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

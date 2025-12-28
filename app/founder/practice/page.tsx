'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clientConfig } from '@/config';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Mic, Play, Users, TrendingUp,
  Clock, Target, AlertCircle, CheckCircle, Star
} from 'lucide-react';
import { VoiceInterface, CoachingMode } from '@/components/voice-coach/VoiceInterface';

// ============================================================================
// INVESTOR PERSONAS
// ============================================================================

interface InvestorPersona {
  id: string;
  name: string;
  title: string;
  style: string;
  description: string;
  focusAreas: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  icon: string;
}

const INVESTOR_PERSONAS: InvestorPersona[] = [
  {
    id: 'supportive',
    name: 'Sarah Chen',
    title: 'Angel Investor',
    style: 'Supportive & Encouraging',
    description: 'Asks clarifying questions and helps you refine your pitch. Great for first-time practice.',
    focusAreas: ['Team background', 'Personal motivation', 'Vision'],
    difficulty: 'easy',
    icon: '😊',
  },
  {
    id: 'analytical',
    name: 'Michael Torres',
    title: 'VC Partner',
    style: 'Data-Driven & Analytical',
    description: 'Focused on metrics, market size, and unit economics. Expects concrete numbers.',
    focusAreas: ['Market size', 'Unit economics', 'Growth metrics'],
    difficulty: 'medium',
    icon: '📊',
  },
  {
    id: 'skeptical',
    name: 'Dr. Amanda Foster',
    title: 'Impact Fund Manager',
    style: 'Skeptical & Rigorous',
    description: 'Challenges assumptions and looks for holes in your logic. Tough but fair.',
    focusAreas: ['Competitive moats', 'Risk factors', 'Exit strategy'],
    difficulty: 'hard',
    icon: '🧐',
  },
  {
    id: 'impact',
    name: 'David Okonkwo',
    title: 'ESG Investment Director',
    style: 'Impact-Focused',
    description: 'Deep dives on social/environmental impact and SDG alignment.',
    focusAreas: ['Impact metrics', 'SDG alignment', 'Theory of change'],
    difficulty: 'medium',
    icon: '🌍',
  },
];

// ============================================================================
// PITCH PRACTICE PAGE
// ============================================================================

export default function PitchPracticePage() {
  const router = useRouter();
  const supabase = createClient();

  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'founder',
  });

  // State
  const [selectedPersona, setSelectedPersona] = useState<InvestorPersona | null>(null);
  const [practiceMode, setPracticeMode] = useState<'select' | 'practice' | 'feedback'>('select');
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [currentDeck, setCurrentDeck] = useState<any>(null);
  const [founderData, setFounderData] = useState<any>(null);

  // Load founder data and latest deck
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      // Load founder
      const { data: founder } = await supabase
        .from('founders')
        .select('*')
        .eq('id', user.id)
        .single();
      setFounderData(founder);

      // Load latest deck
      const { data: deck } = await supabase
        .from('pitch_decks')
        .select('*')
        .eq('founder_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setCurrentDeck(deck);

      // Load practice history
      const { data: history } = await supabase
        .from('voice_sessions')
        .select('*')
        .eq('founder_id', user.id)
        .eq('mode', 'pitch_practice')
        .order('created_at', { ascending: false })
        .limit(10);
      setSessionHistory(history || []);
    };

    loadData();
  }, [user?.id, supabase]);

  // Handle session end
  const handleSessionEnd = async (sessionId: string, transcript: any[]) => {
    // Save to database
    try {
      await supabase.from('voice_sessions').insert({
        session_id: sessionId,
        founder_id: user?.id,
        mode: 'pitch_practice',
        persona: selectedPersona?.id,
        transcript,
        deck_id: currentDeck?.id,
        created_at: new Date().toISOString(),
      });

      setPracticeMode('feedback');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  // Start new practice
  const startPractice = (persona: InvestorPersona) => {
    setSelectedPersona(persona);
    setPracticeMode('practice');
  };

  // Loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/founder/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Mic className="w-8 h-8 text-blue-600" />
                Pitch Practice
              </h1>
              <p className="text-gray-600">
                Practice your pitch with AI-simulated investors
              </p>
            </div>
            {currentDeck && (
              <div className="text-right">
                <Badge variant="secondary">
                  Using: {currentDeck.title}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">
                  Readiness: {currentDeck.readiness_score || 0}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Persona Selection */}
        {practiceMode === 'select' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Play className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{sessionHistory.length}</p>
                      <p className="text-sm text-gray-500">Practice Sessions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{currentDeck?.readiness_score || 0}%</p>
                      <p className="text-sm text-gray-500">Pitch Readiness</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">5-10</p>
                      <p className="text-sm text-gray-500">Min per session</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Persona Cards */}
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Choose Your Investor
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {INVESTOR_PERSONAS.map((persona) => (
                <Card
                  key={persona.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 ${
                    persona.difficulty === 'hard' ? 'border-red-200' :
                    persona.difficulty === 'medium' ? 'border-yellow-200' :
                    'border-green-200'
                  }`}
                  onClick={() => startPractice(persona)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{persona.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{persona.name}</h3>
                          <Badge
                            variant={
                              persona.difficulty === 'hard' ? 'destructive' :
                              persona.difficulty === 'medium' ? 'secondary' :
                              'default'
                            }
                          >
                            {persona.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{persona.title}</p>
                        <p className="text-sm font-medium text-blue-600 mb-2">{persona.style}</p>
                        <p className="text-sm text-gray-600 mb-3">{persona.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {persona.focusAreas.map((area) => (
                            <Badge key={area} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* No deck warning */}
            {!currentDeck && (
              <Card className="border-yellow-300 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">No pitch deck uploaded</p>
                      <p className="text-sm text-yellow-700">
                        Upload a deck first to get more personalized practice feedback.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="ml-auto"
                      onClick={() => router.push('/founder/upload')}
                    >
                      Upload Deck
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Practice Session */}
        {practiceMode === 'practice' && selectedPersona && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{selectedPersona.icon}</div>
                  <div>
                    <CardTitle>{selectedPersona.name}</CardTitle>
                    <p className="text-blue-100">{selectedPersona.title}</p>
                    <p className="text-sm text-blue-200">{selectedPersona.style}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <VoiceInterface
                  mode="investor_sim"
                  context={{
                    founderName: founderData?.name || user?.email?.split('@')[0],
                    companyName: founderData?.company_name,
                    deckTitle: currentDeck?.title,
                    readinessScore: currentDeck?.readiness_score,
                    investorPersona: selectedPersona.id,
                    platformType: clientConfig.platformType,
                  }}
                  onSessionEnd={handleSessionEnd}
                />

                <div className="mt-6 flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => setPracticeMode('select')}
                  >
                    ← Choose Different Investor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback View */}
        {practiceMode === 'feedback' && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Practice Complete!</h2>
                <p className="text-gray-600 mb-6">
                  Great job practicing with {selectedPersona?.name}.
                  Your session has been saved for review.
                </p>

                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPersona(null);
                      setPracticeMode('select');
                    }}
                  >
                    Try Another Investor
                  </Button>
                  <Button onClick={() => router.push('/founder/dashboard')}>
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
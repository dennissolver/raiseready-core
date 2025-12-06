// app/founder/practice/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceInterface } from '@/components/voice-coach/VoiceInterface';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, Users, MessageSquare, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { COACHING_MODES, INVESTOR_PERSONAS } from '@/types/voice-coaching';
import type { CoachingMode, InvestorPersona } from '@/types/voice-coaching';

export default function PracticePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [projectData, setProjectData] = useState<any>(null);
  const [selectedMode, setSelectedMode] = useState<CoachingMode | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<InvestorPersona | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserAndProject = async () => {
      const supabase = createClient();

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // Get latest pitch deck
      const { data: deck } = await supabase
        .from('pitch_decks')
        .select('*')
        .eq('founder_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (deck) {
        setProjectId(deck.id);
        setProjectData({
          name: deck.title || 'Your Project',
          sectors: deck.sectors || [],
          summary: deck.one_liner || 'Your startup pitch',
        });
      } else {
        // No deck found - redirect to upload
        router.push('/founder/upload');
        return;
      }

      setIsLoading(false);
    };

    loadUserAndProject();
  }, [router]);

  const handleModeSelect = (mode: CoachingMode) => {
    setSelectedMode(mode);
    // Reset persona when changing modes
    if (mode !== 'investor-simulation') {
      setSelectedPersona(null);
    }
  };

  const handlePersonaSelect = (persona: InvestorPersona) => {
    setSelectedPersona(persona);
  };

  const handleStartPractice = () => {
    if (!selectedMode) return;
    if (selectedMode === 'investor-simulation' && !selectedPersona) return;
    setIsReady(true);
  };

  const handleSessionEnd = (result: any) => {
    // Redirect to feedback page
    router.push(`/founder/practice/feedback/${result.sessionId}`);
  };

  if (isLoading) {
    return (
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
    );
  }

  if (isReady && projectData) {
    return (
      <div className="container mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => setIsReady(false)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>

        <VoiceInterface
          userId={userId}
          projectId={projectId}
          mode={selectedMode!}
          persona={selectedPersona || undefined}
          projectData={projectData}
          onSessionEnd={handleSessionEnd}
        />
      </div>
    );
  }

  const modeIcons = {
    'pitch-practice': Mic,
    'investor-simulation': Users,
    'q-and-a': MessageSquare,
    'storytelling': Sparkles,
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Voice AI Pitch Practice</h1>
          <p className="text-muted-foreground">
            Practice your pitch with Shamini, your AI coach, and get real-time feedback
          </p>
        </div>

        {/* Project Info */}
        {projectData && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm">
              <strong>Practicing with:</strong> {projectData.name}
              {projectData.sectors && projectData.sectors.length > 0 && (
                <span className="ml-2 text-muted-foreground">
                  | {projectData.sectors.slice(0, 3).join(', ')}
                </span>
              )}
            </p>
            {projectData.summary && (
              <p className="text-sm text-muted-foreground mt-1">{projectData.summary}</p>
            )}
          </div>
        )}

        {/* Mode Selection */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose Coaching Mode</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(COACHING_MODES).map(([key, config]) => {
              const Icon = modeIcons[key as keyof typeof modeIcons] || Mic;
              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedMode === key
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => handleModeSelect(key as CoachingMode)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{config.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Persona Selection (if investor-simulation) */}
        {selectedMode === 'investor-simulation' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Choose Investor Type</h2>
            <p className="text-sm text-muted-foreground">
              Shamini will role-play as this type of investor to give you realistic practice
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(INVESTOR_PERSONAS).map(([key, config]) => (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedPersona === key
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => handlePersonaSelect(key as InvestorPersona)}
                >
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-1">{config.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{config.title}</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      {config.description}
                    </p>
                    <p className="text-xs italic text-muted-foreground">
                      {config.style}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Start Button */}
        <div className="text-center pt-4">
          <Button
            size="lg"
            onClick={handleStartPractice}
            disabled={
              !selectedMode ||
              (selectedMode === 'investor-simulation' && !selectedPersona) ||
              !projectData
            }
            className="px-12 h-14 text-lg"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Practice Session
          </Button>
          {selectedMode === 'investor-simulation' && !selectedPersona && (
            <p className="text-sm text-muted-foreground mt-2">
              Please select an investor persona to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

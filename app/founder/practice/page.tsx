'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Mic, Users, AlertCircle, Loader2
} from 'lucide-react';

// ============================================================================
// TYPES (from DataWizz)
// ============================================================================

interface InvestorPersona {
  persona_id: string;
  display_name: string;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard';
  difficulty_score: number;
  personality_traits: string[];
  avatar_emoji: string;
  primary_focus_areas: string[];
  background_story: string;
  what_impresses: string;
  what_concerns: string;
}

interface SessionConfig {
  sessionId: string;
  agentType: string;
  persona: string;
  difficulty: number;
  focusAreas: string[];
  sessionGoals: string[];
  systemPrompt: string;
  openingMessage: string;
  voiceConfig?: {
    agentId: string;
    voiceId?: string;
  };
}

// ============================================================================
// DATAWIZZ HOOKS
// ============================================================================

function useDataWizzPersonas() {
  const [personas, setPersonas] = useState<InvestorPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPersonas() {
      try {
        const response = await fetch('/api/datawizz/personas');
        if (!response.ok) throw new Error('Failed to fetch personas');
        const data = await response.json();
        setPersonas(data.personas || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to empty - could also use cached/default personas
      } finally {
        setLoading(false);
      }
    }
    fetchPersonas();
  }, []);

  return { personas, loading, error };
}

async function initDataWizzSession(
  personaId: string,
  sessionType: 'voice' | 'chat' = 'voice'
): Promise<SessionConfig | null> {
  try {
    const response = await fetch('/api/datawizz/session/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: sessionType,
        selectedPersona: personaId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initialize session');
    }

    return await response.json();
  } catch (err) {
    console.error('DataWizz session init failed:', err);
    return null;
  }
}

async function completeDataWizzSession(
  sessionId: string,
  outcome: {
    completed: boolean;
    duration: number;
    turnCount: number;
    scores?: Record<string, number>;
    transcript?: Array<{ role: string; content: string }>;
  }
): Promise<void> {
  try {
    await fetch('/api/datawizz/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ...outcome }),
    });
  } catch (err) {
    console.error('DataWizz session complete failed:', err);
  }
}

// ============================================================================
// DATAWIZZ VOICE INTERFACE
// ============================================================================

interface DataWizzVoiceProps {
  sessionConfig: SessionConfig;
  persona: InvestorPersona;
  onSessionEnd: (transcript: Array<{ role: string; content: string }>) => void;
}

function DataWizzVoiceInterface({ sessionConfig, persona, onSessionEnd }: DataWizzVoiceProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: string; content: string }>>([]);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Use ElevenLabs hook when available
  // For now, we'll show the UI structure

  const agentId = sessionConfig.voiceConfig?.agentId ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  const handleStart = async () => {
    if (!agentId) {
      alert('Voice agent not configured');
      return;
    }

    setIsConnecting(true);
    setStartTime(Date.now());

    try {
      // Request microphone
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // In real implementation, start ElevenLabs conversation here
      // with sessionConfig.systemPrompt as dynamic variable

      setIsConnected(true);

      // Add opening message to transcript
      if (sessionConfig.openingMessage) {
        setTranscript([{ role: 'assistant', content: sessionConfig.openingMessage }]);
      }
    } catch (err) {
      console.error('Failed to start voice session:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEnd = async () => {
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    // Complete the DataWizz session
    await completeDataWizzSession(sessionConfig.sessionId, {
      completed: true,
      duration,
      turnCount: transcript.length,
      transcript,
    });

    setIsConnected(false);
    onSessionEnd(transcript);
  };

  const difficultyColor = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-500',
  }[persona.difficulty];

  return (
    <Card className="border-2 border-purple-500/30 bg-purple-500/5">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center gap-4">
          <div className="text-4xl">{persona.avatar_emoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>{persona.display_name}</CardTitle>
              <Badge className={difficultyColor}>{persona.difficulty}</Badge>
            </div>
            <p className="text-purple-100">{persona.role}</p>
          </div>
          {isConnected && (
            <Badge className="bg-green-500 animate-pulse">Live</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Session Goals */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-sm font-medium mb-2">Session Focus:</p>
          <div className="flex flex-wrap gap-2">
            {sessionConfig.focusAreas.map((area) => (
              <Badge key={area} variant="outline">{area.replace(/_/g, ' ')}</Badge>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Difficulty: {sessionConfig.difficulty.toFixed(1)}x
          </p>
        </div>

        {/* Voice Status */}
        <div className="flex items-center justify-center py-8">
          <div className={`relative ${isSpeaking ? 'animate-pulse' : ''}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
              isConnected ? 'bg-green-500' : 'bg-gray-700'
            }`}>
              {isConnecting ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Mic className={`w-10 h-10 ${isConnected ? 'text-white' : 'text-gray-400'}`} />
              )}
            </div>
          </div>
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="mb-4 max-h-48 overflow-y-auto bg-black/10 rounded-lg p-3">
            {transcript.slice(-6).map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm mb-2 ${
                  msg.role === 'user' ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="font-medium">
                  {msg.role === 'user' ? 'You: ' : `${persona.display_name}: `}
                </span>
                {msg.content}
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {isConnected ? (
            <Button size="lg" variant="destructive" onClick={handleEnd}>
              End Session
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleStart}
              disabled={isConnecting || !agentId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Start Practice
                </>
              )}
            </Button>
          )}
        </div>

        {!agentId && (
          <p className="text-center text-sm text-red-500 mt-4">
            Voice coaching not configured
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PRACTICE PAGE
// ============================================================================

export default function PracticePage() {
  const router = useRouter();
  const { personas, loading: personasLoading, error: personasError } = useDataWizzPersonas();

  const [selectedPersona, setSelectedPersona] = useState<InvestorPersona | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'select' | 'practice' | 'results'>('select');
  const [sessionResults, setSessionResults] = useState<any>(null);

  const handleSelectPersona = async (persona: InvestorPersona) => {
    setSelectedPersona(persona);
    setIsInitializing(true);

    try {
      const config = await initDataWizzSession(persona.persona_id, 'voice');
      if (config) {
        setSessionConfig(config);
        setPracticeMode('practice');
      } else {
        alert('Failed to initialize session. Please try again.');
      }
    } catch (err) {
      console.error('Session init error:', err);
      alert('Failed to start practice session');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSessionEnd = (transcript: Array<{ role: string; content: string }>) => {
    setSessionResults({ transcript, turnCount: transcript.length });
    setPracticeMode('results');
  };

  const handleBackToSelect = () => {
    setPracticeMode('select');
    setSelectedPersona(null);
    setSessionConfig(null);
    setSessionResults(null);
  };

  // Loading state
  if (personasLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-3">Loading investor personas...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pitch Practice</h1>
            <p className="text-gray-500">Practice with AI investor personas</p>
          </div>
        </div>

        {/* Persona Selection */}
        {practiceMode === 'select' && (
          <>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Choose Your Investor
            </h2>

            {personasError && (
              <Card className="border-yellow-300 bg-yellow-50 mb-4">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                    <p className="text-yellow-800">
                      Could not load personas: {personasError}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {personas.map((persona) => (
                <Card
                  key={persona.persona_id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    persona.difficulty === 'hard' ? 'hover:border-red-400' :
                    persona.difficulty === 'medium' ? 'hover:border-yellow-400' :
                    'hover:border-green-400'
                  } ${isInitializing && selectedPersona?.persona_id === persona.persona_id 
                    ? 'ring-2 ring-purple-500' : ''}`}
                  onClick={() => !isInitializing && handleSelectPersona(persona)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{persona.avatar_emoji}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{persona.display_name}</h3>
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
                        <p className="text-sm text-gray-500 mb-2">{persona.role}</p>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {persona.background_story}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {persona.primary_focus_areas.slice(0, 3).map((area) => (
                            <Badge key={area} variant="outline" className="text-xs">
                              {area.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>

                        {isInitializing && selectedPersona?.persona_id === persona.persona_id && (
                          <div className="mt-3 flex items-center text-purple-600">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Preparing session...
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {personas.length === 0 && !personasError && (
              <Card className="border-gray-300">
                <CardContent className="pt-6 text-center text-gray-500">
                  No investor personas available. Check DataWizz configuration.
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Practice Session */}
        {practiceMode === 'practice' && selectedPersona && sessionConfig && (
          <div className="max-w-2xl mx-auto">
            <DataWizzVoiceInterface
              sessionConfig={sessionConfig}
              persona={selectedPersona}
              onSessionEnd={handleSessionEnd}
            />
            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={handleBackToSelect}>
                ← Choose Different Investor
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {practiceMode === 'results' && sessionResults && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Session Complete</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  You completed {sessionResults.turnCount} exchanges with {selectedPersona?.display_name}.
                </p>
                <div className="flex gap-4">
                  <Button onClick={handleBackToSelect}>
                    Practice Again
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/founder/dashboard')}>
                    Back to Dashboard
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

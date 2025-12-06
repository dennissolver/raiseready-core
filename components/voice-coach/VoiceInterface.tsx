// components/voice-coach/VoiceInterface.tsx
'use client';

import { useState } from 'react';
import { useVoiceCoach } from '@/hooks/useVoiceCoach';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Loader2 } from 'lucide-react';
import type { CoachingMode, InvestorPersona } from '@/types/voice-coaching';

interface VoiceInterfaceProps {
  userId: string;
  projectId: string;
  mode: CoachingMode;
  persona?: InvestorPersona;
  projectData: {
    name: string;
    sdgs: number[];
    summary: string;
  };
  onSessionEnd?: (result: any) => void;
}

export function VoiceInterface({
  userId,
  projectId,
  mode,
  persona,
  projectData,
  onSessionEnd
}: VoiceInterfaceProps) {
  const {
    isActive,
    isConnecting,
    sessionId,
    error,
    startSession,
    endSession,
  } = useVoiceCoach({
    userId,
    projectId,
    mode,
    persona,
    projectData
  });

  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handleStart = async () => {
    try {
      await startSession();
    } catch (err) {
      // Error already set in hook
    }
  };

  const handleEnd = async () => {
    try {
      const result = await endSession();
      setShowEndConfirm(false);
      onSessionEnd?.(result);
    } catch (err) {
      // Error already set in hook
    }
  };

  if (isConnecting) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">
              Connecting to Sharene...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isActive) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Ready to Practice?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              How this works:
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✓ Click "Start Practice" to begin</li>
              <li>✓ Speak naturally - Sharene will listen and respond</li>
              <li>✓ Practice as if talking to a real investor</li>
              <li>✓ Get real-time coaching and feedback</li>
              <li>✓ End when done to receive detailed analysis</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            size="lg"
            className="w-full h-16 text-lg"
            onClick={handleStart}
          >
            <Mic className="w-6 h-6 mr-2" />
            Start Practice Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardTitle className="text-2xl flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          Session Active with Sharene
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full">
            <Mic className="w-12 h-12 text-green-600 animate-pulse" />
          </div>

          <div>
            <p className="text-lg font-medium">Speaking with Sharene...</p>
            <p className="text-sm text-muted-foreground">
              Session ID: {sessionId?.slice(0, 8)}...
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              💡 <strong>Tip:</strong> Speak clearly and naturally. Sharene is listening
              and will respond when you pause.
            </p>
          </div>
        </div>

        {!showEndConfirm ? (
          <Button
            variant="destructive"
            size="lg"
            className="w-full h-14"
            onClick={() => setShowEndConfirm(true)}
          >
            <Square className="w-5 h-5 mr-2" />
            End Practice Session
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Are you sure? You'll receive detailed feedback after ending.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEndConfirm(false)}
              >
                Keep Practicing
              </Button>
              <Button
                variant="destructive"
                onClick={handleEnd}
              >
                End & Get Feedback
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
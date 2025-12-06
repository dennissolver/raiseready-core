// hooks/useVoiceCoach.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import { ElevenLabsVoiceCoach } from '@/lib/elevenlabs-coach';
import type { VoiceCoachConfig, VoiceSessionResult } from '@/types/voice-coaching';

export function useVoiceCoach(config: VoiceCoachConfig) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const coachRef = useRef<ElevenLabsVoiceCoach | null>(null);

  /**
   * Start a new coaching session
   */
  const startSession = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Create new coach instance
      const coach = new ElevenLabsVoiceCoach(config);

      // Initialize and get session ID
      const newSessionId = await coach.initialize();

      coachRef.current = coach;
      setSessionId(newSessionId);
      setIsActive(true);
      setIsConnecting(false);

      return newSessionId;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start session');
      setIsConnecting(false);
      throw err;
    }
  }, [config]);

  /**
   * End the current session
   */
  const endSession = useCallback(async (): Promise<VoiceSessionResult> => {
    if (!coachRef.current) {
      throw new Error('No active session');
    }

    try {
      const result = await coachRef.current.endSession();

      setIsActive(false);
      setSessionId(null);
      coachRef.current = null;

      return result;

    } catch (err: any) {
      console.error('Failed to end session:', err);
      setError(err.message || 'Failed to end session');
      throw err;
    }
  }, []);

  return {
    isActive,
    isConnecting,
    sessionId,
    error,
    startSession,
    endSession,
  };
}
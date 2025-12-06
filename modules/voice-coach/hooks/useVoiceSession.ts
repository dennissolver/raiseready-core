/**
 * useVoiceSession Hook
 * React hook for managing voice coaching sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceSessionManager } from '../lib/session-manager';
import {
  VoiceSessionConfig,
  VoiceSessionState,
  Message,
  SessionFeedback,
  SessionEvent
} from '../types/voice-session';

export interface UseVoiceSessionReturn {
  // State
  session: VoiceSessionState | null;
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  error: string | null;
  transcript: Message[];
  feedback: SessionFeedback | null;
  
  // Actions
  startSession: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => Promise<void>;
  
  // Status
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canComplete: boolean;
}

export function useVoiceSession(config: VoiceSessionConfig): UseVoiceSessionReturn {
  const [session, setSession] = useState<VoiceSessionState | null>(null);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const managerRef = useRef<VoiceSessionManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Initialize session manager
  useEffect(() => {
    managerRef.current = new VoiceSessionManager(config);
    
    // Subscribe to session events
    const unsubscribe = managerRef.current.on(handleSessionEvent);
    unsubscribeRef.current = unsubscribe;
    
    // Update initial state
    setSession(managerRef.current.getState());
    
    return () => {
      // Cleanup on unmount
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, [config]);
  
  /**
   * Handle session events
   */
  const handleSessionEvent = useCallback((event: SessionEvent) => {
    switch (event.type) {
      case 'session_started':
        setSession(event.data);
        setError(null);
        break;
        
      case 'message_received':
        setTranscript(prev => [...prev, event.data]);
        break;
        
      case 'transcription_update':
        // Handle real-time transcription updates
        // This could update a temporary "currently speaking" indicator
        break;
        
      case 'session_paused':
        if (managerRef.current) {
          setSession(managerRef.current.getState());
        }
        break;
        
      case 'session_resumed':
        if (managerRef.current) {
          setSession(managerRef.current.getState());
        }
        break;
        
      case 'session_completed':
        setFeedback(event.data);
        if (managerRef.current) {
          setSession(managerRef.current.getState());
        }
        break;
        
      case 'error':
        setError(event.data.message);
        if (managerRef.current) {
          setSession(managerRef.current.getState());
        }
        break;
        
      case 'audio_chunk':
        // Handle audio chunks if needed
        break;
    }
  }, []);
  
  /**
   * Start the session
   */
  const startSession = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      setError(null);
      await managerRef.current.startSession();
      setSession(managerRef.current.getState());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }, []);
  
  /**
   * Send a text message
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!managerRef.current) return;
    
    try {
      setError(null);
      await managerRef.current.sendMessage(content);
      setSession(managerRef.current.getState());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, []);
  
  /**
   * Pause the session
   */
  const pauseSession = useCallback(() => {
    if (!managerRef.current) return;
    
    managerRef.current.pauseSession();
    setSession(managerRef.current.getState());
  }, []);
  
  /**
   * Resume the session
   */
  const resumeSession = useCallback(() => {
    if (!managerRef.current) return;
    
    managerRef.current.resumeSession();
    setSession(managerRef.current.getState());
  }, []);
  
  /**
   * Complete the session
   */
  const completeSession = useCallback(async () => {
    if (!managerRef.current) return;
    
    try {
      setError(null);
      const sessionFeedback = await managerRef.current.completeSession();
      setFeedback(sessionFeedback);
      setSession(managerRef.current.getState());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    }
  }, []);
  
  // Computed state
  const isActive = session?.status === 'active';
  const isPaused = session?.status === 'paused';
  const isCompleted = session?.status === 'completed';
  
  const canStart = session?.status === 'initializing';
  const canPause = session?.status === 'active';
  const canResume = session?.status === 'paused';
  const canComplete = session?.status === 'active' || session?.status === 'paused';
  
  return {
    // State
    session,
    isActive,
    isPaused,
    isCompleted,
    error,
    transcript,
    feedback,
    
    // Actions
    startSession,
    sendMessage,
    pauseSession,
    resumeSession,
    completeSession,
    
    // Status
    canStart,
    canPause,
    canResume,
    canComplete
  };
}

export default useVoiceSession;

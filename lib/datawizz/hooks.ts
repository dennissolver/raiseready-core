// ============================================================================
// DATAWIZZ REACT HOOKS
// Frontend integration for session management
// ============================================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { 
  InvestorPersonaId, 
  SessionType,
  AgentType,
  SessionScores,
  EngagementLevel,
  FounderDiscoveredContext,
} from '../../types/datawizz';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface SessionState {
  sessionId: string | null;
  agentType: AgentType | null;
  persona: InvestorPersonaId | null;
  difficulty: number;
  systemPrompt: string | null;
  openingMessage: string | null;
  focusAreas: string[];
  sessionGoals: string[];
  isLoading: boolean;
  error: string | null;
}

interface PersonaOption {
  id: InvestorPersonaId;
  name: string;
  role: string;
  difficulty: string;
  difficultyScore: number;
  emoji: string;
  description: string;
  focus: string[];
}

interface ProgressState {
  totalSessions: number;
  discoveryCompleteness: number;
  averageConfidence: number;
  journeyPhase: string;
  recentTrend: 'improving' | 'stable' | 'declining';
}

// ----------------------------------------------------------------------------
// useDataWizzSession - Main session management hook
// ----------------------------------------------------------------------------

export function useDataWizzSession() {
  const [state, setState] = useState<SessionState>({
    sessionId: null,
    agentType: null,
    persona: null,
    difficulty: 1.0,
    systemPrompt: null,
    openingMessage: null,
    focusAreas: [],
    sessionGoals: [],
    isLoading: false,
    error: null,
  });

  // Start a new session
  const startSession = useCallback(async (
    requestType: SessionType,
    selectedPersona?: InvestorPersonaId
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/datawizz/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType,
          selectedPersona,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start session');
      }

      const data = await response.json();

      setState({
        sessionId: data.sessionId,
        agentType: data.agentType,
        persona: data.persona,
        difficulty: data.difficulty,
        systemPrompt: data.systemPrompt,
        openingMessage: data.openingMessage,
        focusAreas: data.focusAreas,
        sessionGoals: data.sessionGoals,
        isLoading: false,
        error: null,
      });

      return {
        success: true,
        sessionId: data.sessionId,
        systemPrompt: data.systemPrompt,
        openingMessage: data.openingMessage,
        voiceConfig: data.voiceConfig,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Complete a session with outcome data
  const completeSession = useCallback(async (outcome: {
    scores: SessionScores;
    duration: number;
    turnCount: number;
    userEngagement: EngagementLevel;
    userFrustration: boolean;
    identifiedStrengths?: string[];
    identifiedWeaknesses?: string[];
    keyMoments?: Array<{
      timestamp: string;
      type: 'breakthrough' | 'struggle' | 'insight';
      content: string;
    }>;
    discoveredContext?: Partial<FounderDiscoveredContext>;
  }) => {
    if (!state.sessionId) {
      return { success: false, error: 'No active session' };
    }

    try {
      const response = await fetch('/api/datawizz/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          ...outcome,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete session');
      }

      const data = await response.json();

      // Clear session state
      setState({
        sessionId: null,
        agentType: null,
        persona: null,
        difficulty: 1.0,
        systemPrompt: null,
        openingMessage: null,
        focusAreas: [],
        sessionGoals: [],
        isLoading: false,
        error: null,
      });

      return {
        success: true,
        progress: data.progress,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }, [state.sessionId]);

  // Reset session without completing
  const resetSession = useCallback(() => {
    setState({
      sessionId: null,
      agentType: null,
      persona: null,
      difficulty: 1.0,
      systemPrompt: null,
      openingMessage: null,
      focusAreas: [],
      sessionGoals: [],
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    startSession,
    completeSession,
    resetSession,
    hasActiveSession: !!state.sessionId,
  };
}

// ----------------------------------------------------------------------------
// useInvestorPersonas - Fetch available personas
// ----------------------------------------------------------------------------

export function useInvestorPersonas() {
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const [platformType, setPlatformType] = useState<string>('impact');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPersonas() {
      try {
        const response = await fetch('/api/datawizz/personas');
        
        if (!response.ok) {
          throw new Error('Failed to fetch personas');
        }

        const data = await response.json();
        setPersonas(data.personas);
        setPlatformType(data.platformType);
        setError(null);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPersonas();
  }, []);

  return { personas, platformType, isLoading, error };
}

// ----------------------------------------------------------------------------
// useFounderContext - Manage founder discovered context
// ----------------------------------------------------------------------------

export function useFounderContext() {
  const [context, setContext] = useState<FounderDiscoveredContext | null>(null);
  const [completeness, setCompleteness] = useState(0);
  const [missingElements, setMissingElements] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch context on mount
  useEffect(() => {
    async function fetchContext() {
      try {
        const response = await fetch('/api/datawizz/founder-context');
        
        if (!response.ok) {
          throw new Error('Failed to fetch founder context');
        }

        const data = await response.json();
        setContext(data.context);
        setCompleteness(data.completeness ?? 0);
        setMissingElements(data.missingElements ?? []);
        setError(null);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchContext();
  }, []);

  // Update context
  const updateContext = useCallback(async (
    updates: Partial<FounderDiscoveredContext>
  ) => {
    try {
      const response = await fetch('/api/datawizz/founder-context', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update context');
      }

      const data = await response.json();
      setContext(data.context);
      setCompleteness(data.completeness ?? 0);
      
      return { success: true };

    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }, []);

  // Refresh context
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/datawizz/founder-context');
      const data = await response.json();
      setContext(data.context);
      setCompleteness(data.completeness ?? 0);
      setMissingElements(data.missingElements ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    context,
    completeness,
    missingElements,
    isLoading,
    error,
    updateContext,
    refresh,
  };
}

// ----------------------------------------------------------------------------
// useSessionProgress - Track user's overall progress
// ----------------------------------------------------------------------------

export function useSessionProgress() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // Progress is returned after session completion
      // This hook can poll or use the data from completeSession
      const response = await fetch('/api/datawizz/founder-context');
      const data = await response.json();
      
      if (data.context) {
        setProgress({
          totalSessions: data.sessionsCompleted ?? 0,
          discoveryCompleteness: data.completeness ?? 0,
          averageConfidence: 70, // Would come from session aggregation
          journeyPhase: determinePhase(data.completeness),
          recentTrend: 'stable',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { progress, isLoading, refresh };
}

function determinePhase(completeness: number): string {
  if (completeness >= 80) return 'ready_to_connect';
  if (completeness >= 50) return 'pitch_practice';
  if (completeness >= 20) return 'materials_review';
  return 'discovery';
}


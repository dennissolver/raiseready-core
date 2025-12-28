// lib/voice/use-session-time.ts
// ============================================================================
// SESSION TIME MANAGEMENT
//
// Handles the client-side tools for ElevenLabs conversation time management
// - Tracks elapsed time
// - Responds to check_session_time tool calls
// - Handles extend_session requests
// ============================================================================

import { useRef, useCallback } from 'react';

interface SessionTimeConfig {
  maxDurationSeconds: number;
  warningAtSeconds: number;
  extensionSeconds: number;
}

const DEFAULT_CONFIG: SessionTimeConfig = {
  maxDurationSeconds: 1200,    // 20 minutes
  warningAtSeconds: 1080,      // 18 minutes
  extensionSeconds: 600,       // 10 minute extensions
};

export function useSessionTime(config: Partial<SessionTimeConfig> = {}) {
  const settings = { ...DEFAULT_CONFIG, ...config };
  
  const sessionStartRef = useRef<number | null>(null);
  const currentMaxDurationRef = useRef<number>(settings.maxDurationSeconds);
  const extensionCountRef = useRef<number>(0);

  // Start tracking when conversation begins
  const startSession = useCallback(() => {
    sessionStartRef.current = Date.now();
    currentMaxDurationRef.current = settings.maxDurationSeconds;
    extensionCountRef.current = 0;
    console.log('[SessionTime] Session started');
  }, [settings.maxDurationSeconds]);

  // Get current session state
  const getSessionState = useCallback(() => {
    if (!sessionStartRef.current) {
      return {
        elapsedSeconds: 0,
        remainingSeconds: settings.maxDurationSeconds,
        maxDurationSeconds: settings.maxDurationSeconds,
        isNearingEnd: false,
        extensionCount: 0,
      };
    }

    const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const remainingSeconds = Math.max(0, currentMaxDurationRef.current - elapsedSeconds);
    const isNearingEnd = remainingSeconds <= (settings.maxDurationSeconds - settings.warningAtSeconds);

    return {
      elapsedSeconds,
      remainingSeconds,
      maxDurationSeconds: currentMaxDurationRef.current,
      isNearingEnd,
      extensionCount: extensionCountRef.current,
    };
  }, [settings]);

  // Extend the session
  const extendSession = useCallback((reason: string) => {
    currentMaxDurationRef.current += settings.extensionSeconds;
    extensionCountRef.current += 1;
    
    console.log(`[SessionTime] Session extended: ${reason}`);
    console.log(`[SessionTime] New max duration: ${currentMaxDurationRef.current}s (extension #${extensionCountRef.current})`);
    
    return {
      success: true,
      newMaxDuration: currentMaxDurationRef.current,
      extensionCount: extensionCountRef.current,
    };
  }, [settings.extensionSeconds]);

  // Handle tool calls from ElevenLabs
  const handleToolCall = useCallback((toolName: string, parameters: Record<string, any>) => {
    switch (toolName) {
      case 'check_session_time': {
        const state = getSessionState();
        const minutes = Math.floor(state.remainingSeconds / 60);
        const seconds = state.remainingSeconds % 60;
        
        return {
          remaining_time: `${minutes} minutes and ${seconds} seconds`,
          remaining_seconds: state.remainingSeconds,
          is_nearing_end: state.isNearingEnd,
          elapsed_minutes: Math.floor(state.elapsedSeconds / 60),
        };
      }
      
      case 'extend_session': {
        const reason = parameters.reason || 'continued coaching';
        const result = extendSession(reason);
        
        return {
          success: result.success,
          message: `Session extended by ${settings.extensionSeconds / 60} minutes`,
          new_max_duration_minutes: Math.floor(result.newMaxDuration / 60),
          extension_count: result.extensionCount,
        };
      }
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }, [getSessionState, extendSession, settings.extensionSeconds]);

  // Reset when conversation ends
  const endSession = useCallback(() => {
    const finalState = getSessionState();
    sessionStartRef.current = null;
    
    console.log('[SessionTime] Session ended', {
      totalDuration: finalState.elapsedSeconds,
      extensions: extensionCountRef.current,
    });
    
    return finalState;
  }, [getSessionState]);

  return {
    startSession,
    endSession,
    getSessionState,
    extendSession,
    handleToolCall,
  };
}

// ============================================================================
// INTEGRATION WITH ELEVENLABS WIDGET
// ============================================================================

/**
 * Example integration with ElevenLabs conversation widget:
 * 
 * ```tsx
 * import { useSessionTime } from '@/lib/voice/use-session-time';
 * 
 * function VoiceCoach() {
 *   const sessionTime = useSessionTime();
 *   
 *   const handleConversationStart = () => {
 *     sessionTime.startSession();
 *   };
 *   
 *   const handleConversationEnd = () => {
 *     const stats = sessionTime.endSession();
 *     // Log session stats, save to database, etc.
 *   };
 *   
 *   const handleClientToolCall = (toolName: string, params: any) => {
 *     // This gets called by ElevenLabs when the agent uses a client tool
 *     return sessionTime.handleToolCall(toolName, params);
 *   };
 *   
 *   return (
 *     <ElevenLabsWidget
 *       agentId={agentId}
 *       onConversationStart={handleConversationStart}
 *       onConversationEnd={handleConversationEnd}
 *       onClientToolCall={handleClientToolCall}
 *     />
 *   );
 * }
 * ```
 */

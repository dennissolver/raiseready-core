/**
 * RaiseReady Voice Coach Module
 * Main export file for clean imports
 */

// Hooks
export { useVoiceSession } from './hooks/useVoiceSession';
export type { UseVoiceSessionReturn } from './hooks/useVoiceSession';

// Core classes
export { VoiceSessionManager } from './lib/session-manager';

// Services
export { SupabaseSessionsService, getSupabaseSessionsService } from './services/supabase-sessions';

// Types
export type {
  CoachingMode,
  InvestorPersona,
  SessionType,
  SessionStatus,
  Message,
  VoiceSessionConfig,
  VoiceSessionState,
  SessionFeedback,
  VoiceSessionRecord,
  SessionEvent,
  SessionEventHandler,
  TranscriptionChunk,
  AudioChunk,
  VoiceStreamConfig
} from './types/voice-session';

export type {
  CoachingModeConfig
} from './types/coaching-modes';

export type {
  InvestorPersonaConfig
} from './types/investor-personas';

// Configurations
export {
  COACHING_MODES,
  getCoachingModeConfig,
  canInterrupt,
  getInterruptionThreshold,
  getPauseDetectionMs
} from './config/coaching-modes';

export {
  INVESTOR_PERSONAS,
  getPersonaConfig,
  buildInvestorSimPrompt
} from './config/personas';

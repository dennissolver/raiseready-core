// ============================================================================
// DATAWIZZ MODULE INDEX
// Central export for all DataWizz functionality
// ============================================================================

// Core routing engine
export { 
  routeSession,
  determineAgentType,
  selectLLM,
  calculateDifficulty,
  identifyWeakSpots,
  determineSessionGoals,
} from './routing-engine';

// Prompt assembly
export {
  assemblePrompt,
  loadBaseTemplate,
  loadPersona,
  loadFocusAreaQuestions,
} from './prompt-assembler';

// Session management
export {
  initializeSession,
  completeSession,
  updateFounderContext,
  gatherRoutingContext,
  fetchFounderContext,
  fetchSessionHistory,
  determineJourneyPhase,
} from './session-manager';

export type { InitSessionParams, InitSessionResult } from './session-manager';

// Re-export types
export type {
  // Core types
  AgentType,
  JourneyPhase,
  InvestorPersonaId,
  DifficultyLevel,
  PlatformType,
  SessionType,
  EngagementLevel,
  LLMChoice,
  
  // Context types
  RoutingContext,
  MaterialsStatus,
  SessionSummary,
  SessionScores,
  ClientConfig,
  
  // Decision types
  RoutingDecision,
  PromptVariables,
  
  // Data types
  FounderDiscoveredContext,
  InvestorPersona,
  PromptTemplate,
  SessionRoutingLog,
  FocusAreaQuestions,
  
  // Session types
  VoiceSessionConfig,
  VoiceAgentOverrides,
  SessionOutcome,
  
  // API types
  RouteSessionRequest,
  RouteSessionResponse,
  UpdateFounderContextRequest,
  RecordSessionOutcomeRequest,
  GetFounderContextRequest,
  GetFounderContextResponse,
} from '../../types/datawizz';


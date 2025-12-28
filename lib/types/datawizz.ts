// ============================================================================
// DATAWIZZ AGENT ORCHESTRATION TYPES
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums and Literals
// ----------------------------------------------------------------------------

export type AgentType = 'discovery' | 'coaching' | 'investor_simulator';

export type JourneyPhase = 
  | 'onboarding'
  | 'discovery'
  | 'materials_draft'
  | 'materials_review'
  | 'pitch_practice'
  | 'investor_simulation'
  | 'ready_to_connect';

export type InvestorPersonaId = 
  | 'sarah_chen'
  | 'michael_torres'
  | 'dr_amanda_foster'
  | 'david_okonkwo';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type PlatformType = 'impact' | 'commercial';

export type SessionType = 'voice' | 'chat' | 'analysis';

export type EngagementLevel = 'low' | 'medium' | 'high';

export type LLMChoice = 
  | 'claude-opus-4-20250514'
  | 'claude-sonnet-4-20250514'
  | 'claude-haiku-4-20250514'
  | 'gpt-4o';

// ----------------------------------------------------------------------------
// Routing Context (Input to DataWizz)
// ----------------------------------------------------------------------------

export interface RoutingContext {
  // User Identity
  userId: string;
  organizationId: string;
  
  // Journey State
  journeyPhase: JourneyPhase;
  materialsStatus: MaterialsStatus;
  sessionHistory: SessionSummary[];
  
  // Current Request
  requestType: SessionType;
  selectedPersona?: InvestorPersonaId;
  userMessage?: string;
  
  // Behavioral Signals
  confidenceScore: number;
  engagementLevel: EngagementLevel;
  timeInPlatformDays: number;
  lastSessionDate?: Date;
  
  // Platform Config
  platformType: PlatformType;
  clientConfig: ClientConfig;
  
  // Discovered Context (from prior sessions)
  founderContext?: FounderDiscoveredContext;
}

export interface MaterialsStatus {
  hasExecutiveSummary: boolean;
  hasPitchDeck: boolean;
  hasFinancials: boolean;
  hasImpactFramework: boolean;
  completenessScore: number;
  lastUpdated?: Date;
}

export interface SessionSummary {
  sessionId: string;
  date: Date;
  type: AgentType;
  persona?: InvestorPersonaId;
  scores: SessionScores;
  focusAreas: string[];
  duration: number;
  completed: boolean;
}

export interface SessionScores {
  clarity: number;
  confidence: number;
  storytelling: number;
  businessAcumen: number;
  impactArticulation?: number;
}

export interface ClientConfig {
  voiceAgents: {
    discovery?: string;
    coaching?: string;
    investor_simulator?: string;
  };
  preferredLLMs: {
    discovery: LLMChoice;
    coaching: LLMChoice;
    investor_simulator: LLMChoice;
    analysis: LLMChoice;
  };
  defaultDifficultyLevel: number;
  autoAdjustDifficulty: boolean;
  maxSessionDurationMinutes: number;
  platformType: PlatformType;
}

// ----------------------------------------------------------------------------
// Routing Decision (Output from DataWizz)
// ----------------------------------------------------------------------------

export interface RoutingDecision {
  // LLM Selection
  llm: LLMChoice;
  
  // Agent Configuration
  agentType: AgentType;
  voiceAgentId?: string;
  
  // Prompt Assembly
  promptTemplateId: string;
  promptVariables: PromptVariables;
  personaOverride?: InvestorPersonaId;
  
  // Behavioral Modifiers
  difficultyLevel: number;
  focusAreas: string[];
  sessionGoals: string[];
  
  // Guardrails
  maxTurns?: number;
  timeLimit?: number;
  escalationTriggers: string[];
  
  // Metadata
  routingReason: string;
  confidenceInDecision: number;
}

export interface PromptVariables {
  // Founder context
  founderName?: string;
  companyName?: string;
  industry?: string;
  stage?: string;
  
  // Discovered story elements
  founderStory?: string;
  whyThisProblem?: string;
  whyNow?: string;
  whyThisTeam?: string;
  personalConnection?: string;
  originMoment?: string;
  keyQuotes?: Array<{ quote: string; context: string }>;
  
  // Session context
  difficulty: number;
  focusAreas: string[];
  priorSessionCount: number;
  sessionGoals: string[];
  
  // Persona (if applicable)
  investorPersona?: InvestorPersonaId;
  personaContent?: string;
  
  // Platform type
  platformType: PlatformType;
  impactFocus: boolean;
  
  // Opening message
  openingMessage?: string;
}

// ----------------------------------------------------------------------------
// Founder Discovered Context
// ----------------------------------------------------------------------------

export interface FounderDiscoveredContext {
  id: string;
  userId: string;
  
  // Core story elements
  whyThisProblem?: string;
  whyThisProblemMoment?: string;
  whyNow?: string;
  whyNowTrigger?: string;
  whyThisTeam?: string;
  uniqueInsight?: string;
  
  // Origin story
  founderStory?: string;
  originMoment?: string;
  originLocation?: string;
  originEmotion?: string;
  
  // Personal connection
  personalConnection?: string;
  whoTheySawSuffer?: string;
  personalStakes?: string;
  
  // Key quotes
  keyQuotes: Array<{
    quote: string;
    context: string;
    sessionId: string;
  }>;
  
  // Themes
  emotionalThemes: string[];
  
  // Completeness
  discoveryCompleteness: number;
  discoverySessionsCount: number;
  lastDiscoverySessionAt?: Date;
}

// ----------------------------------------------------------------------------
// Investor Persona
// ----------------------------------------------------------------------------

export interface InvestorPersona {
  id: string;
  personaId: InvestorPersonaId;
  displayName: string;
  
  // Character profile
  role: string;
  organizationType: string;
  investmentFocus: string[];
  checkSizeMin: number;
  checkSizeMax: number;
  
  // Personality
  difficulty: DifficultyLevel;
  difficultyScore: number;
  personalityTraits: string[];
  communicationStyle: string;
  
  // Visual
  avatarEmoji: string;
  avatarUrl?: string;
  
  // Prompt content
  backgroundStory: string;
  typicalQuestions: Array<{
    question: string;
    difficulty: number;
    followUps?: string[];
  }>;
  whatImpresses: string;
  whatConcerns: string;
  decisionStyle: string;
  feedbackStyle: string;
  
  // Focus areas
  primaryFocusAreas: string[];
  
  // Platform availability
  availableForImpact: boolean;
  availableForCommercial: boolean;
}

// ----------------------------------------------------------------------------
// Prompt Template
// ----------------------------------------------------------------------------

export interface PromptTemplate {
  id: string;
  templateId: string;
  version: string;
  
  // Classification
  agentType: AgentType;
  persona?: InvestorPersonaId;
  platformType: PlatformType | 'both';
  
  // Content
  systemPrompt: string;
  openingMessage?: string;
  contextInjectionTemplate?: string;
  focusAreaPrompts: Record<string, string>;
  
  // Behavioral controls
  stayInCharacterReinforcement?: string;
  boundaryConditions?: string;
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// Session Routing Log
// ----------------------------------------------------------------------------

export interface SessionRoutingLog {
  id: string;
  sessionId: string;
  sessionType: SessionType;
  userId: string;
  organizationId: string;
  
  // Input context
  journeyPhase: JourneyPhase;
  materialsCompleteness?: number;
  priorSessionCount: number;
  confidenceScoreInput?: number;
  engagementLevel?: EngagementLevel;
  timeInPlatformDays?: number;
  selectedPersona?: InvestorPersonaId;
  
  // Routing decision
  llmSelected: LLMChoice;
  agentType: AgentType;
  promptTemplateId: string;
  voiceAgentId?: string;
  difficultyLevel: number;
  focusAreas: string[];
  sessionGoals: string[];
  founderContextSnapshot?: Partial<FounderDiscoveredContext>;
  
  // Outcome
  sessionCompleted?: boolean;
  sessionDurationSeconds?: number;
  turnCount?: number;
  
  // Scores
  scoreClarity?: number;
  scoreConfidence?: number;
  scoreStorytelling?: number;
  scoreBusinessAcumen?: number;
  scoreImpactArticulation?: number;
  
  // Behavioral signals
  userEngagementOutcome?: EngagementLevel;
  userFrustrationDetected?: boolean;
  escalationTriggered?: boolean;
  escalationReason?: string;
  
  // Qualitative
  identifiedStrengths?: string[];
  identifiedWeaknesses?: string[];
  keyMoments?: Array<{
    timestamp: string;
    type: 'breakthrough' | 'struggle' | 'insight';
    content: string;
  }>;
  
  // Feedback
  routingFeedback?: 'appropriate' | 'too_easy' | 'too_hard' | 'wrong_focus';
  
  createdAt: Date;
  completedAt?: Date;
}

// ----------------------------------------------------------------------------
// Focus Area Questions
// ----------------------------------------------------------------------------

export interface FocusAreaQuestion {
  question: string;
  difficulty: number;
  followUps?: string[];
}

export interface FocusAreaQuestions {
  focusArea: string;
  questions: FocusAreaQuestion[];
  personaAffinity: InvestorPersonaId[];
  platformType: PlatformType | 'both';
}

// ----------------------------------------------------------------------------
// Voice Session Types
// ----------------------------------------------------------------------------

export interface VoiceSessionConfig {
  conversationId: string;
  signedUrl: string;
  agentType: AgentType;
  persona?: InvestorPersonaId;
  difficultyLevel: number;
  sessionGoals: string[];
}

export interface VoiceAgentOverrides {
  prompt: {
    prompt: string;
  };
  first_message?: string;
}

// ----------------------------------------------------------------------------
// Session Outcome (for learning loop)
// ----------------------------------------------------------------------------

export interface SessionOutcome {
  sessionId: string;
  userId: string;
  agentType: AgentType;
  persona?: InvestorPersonaId;
  
  // Performance
  scores: SessionScores;
  
  // Behavioral
  duration: number;
  turnCount: number;
  userEngagement: EngagementLevel;
  userFrustration: boolean;
  
  // Routing decision that was made
  routingDecision: RoutingDecision;
  
  // Qualitative
  keyMoments: Array<{
    timestamp: string;
    type: 'breakthrough' | 'struggle' | 'insight';
    content: string;
  }>;
  identifiedWeaknesses: string[];
  identifiedStrengths: string[];
  
  // For founder profile building
  discoveredContext?: Partial<FounderDiscoveredContext>;
}

// ----------------------------------------------------------------------------
// API Request/Response Types
// ----------------------------------------------------------------------------

export interface RouteSessionRequest {
  userId: string;
  organizationId: string;
  requestType: SessionType;
  selectedPersona?: InvestorPersonaId;
  userMessage?: string;
}

export interface RouteSessionResponse {
  success: boolean;
  decision?: RoutingDecision;
  assembledPrompt?: string;
  voiceConfig?: VoiceSessionConfig;
  error?: string;
}

export interface UpdateFounderContextRequest {
  userId: string;
  updates: Partial<FounderDiscoveredContext>;
  sessionId?: string;
}

export interface RecordSessionOutcomeRequest {
  sessionId: string;
  outcome: SessionOutcome;
}

export interface GetFounderContextRequest {
  userId: string;
}

export interface GetFounderContextResponse {
  success: boolean;
  context?: FounderDiscoveredContext;
  error?: string;
}

// ============================================================================
// DATAWIZZ ROUTING ENGINE
// The brain that decides which agent, LLM, prompt, and difficulty for each session
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import type {
  RoutingContext,
  RoutingDecision,
  AgentType,
  LLMChoice,
  InvestorPersonaId,
  SessionSummary,
  PromptVariables,
  InvestorPersona,
  FocusAreaQuestions,
} from '../../types/datawizz';

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------

const DIFFICULTY_MIN = 0.5;
const DIFFICULTY_MAX = 2.0;
const DEFAULT_DIFFICULTY = 1.0;

const PERSONA_DIFFICULTY_MODIFIERS: Record<InvestorPersonaId, number> = {
  sarah_chen: -0.3,
  michael_torres: 0,
  dr_amanda_foster: 0.4,
  david_okonkwo: 0.1,
};

const ESCALATION_TRIGGERS = [
  'user expresses frustration repeatedly',
  'user mentions giving up',
  'user asks for human help',
  'confidence score drops significantly mid-session',
  'user appears confused or lost',
];

// ----------------------------------------------------------------------------
// Main Routing Function
// ----------------------------------------------------------------------------

export async function routeSession(
  context: RoutingContext,
  supabase: ReturnType<typeof createClient>
): Promise<RoutingDecision> {
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: Determine Agent Type
  // ═══════════════════════════════════════════════════════════════
  
  const agentType = determineAgentType(context);
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: Select LLM Based on Task
  // ═══════════════════════════════════════════════════════════════
  
  const llm = selectLLM(agentType, context);
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: Calculate Difficulty Level
  // ═══════════════════════════════════════════════════════════════
  
  const difficultyLevel = calculateDifficulty(context);
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: Identify Focus Areas
  // ═══════════════════════════════════════════════════════════════
  
  const focusAreas = await identifyFocusAreas(context, supabase);
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: Select Prompt Template
  // ═══════════════════════════════════════════════════════════════
  
  const promptTemplateId = selectPromptTemplate(agentType, context);
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 6: Build Prompt Variables
  // ═══════════════════════════════════════════════════════════════
  
  const sessionGoals = determineSessionGoals(context, agentType);
  
  const promptVariables = buildPromptVariables(
    context,
    difficultyLevel,
    focusAreas,
    sessionGoals
  );
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 7: Determine Voice Agent (if voice request)
  // ═══════════════════════════════════════════════════════════════
  
  const voiceAgentId = context.requestType === 'voice'
    ? context.clientConfig.voiceAgents[agentType]
    : undefined;
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 8: Set Session Constraints
  // ═══════════════════════════════════════════════════════════════
  
  const maxTurns = agentType === 'discovery' ? undefined : 25;
  const timeLimit = agentType === 'investor_simulator' 
    ? 15 
    : context.clientConfig.maxSessionDurationMinutes;
  
  // ═══════════════════════════════════════════════════════════════
  // Build Final Decision
  // ═══════════════════════════════════════════════════════════════
  
  const routingReason = buildRoutingReason(context, agentType, difficultyLevel);
  
  return {
    llm,
    agentType,
    voiceAgentId,
    promptTemplateId,
    promptVariables,
    personaOverride: context.selectedPersona,
    difficultyLevel,
    focusAreas,
    sessionGoals,
    maxTurns,
    timeLimit,
    escalationTriggers: ESCALATION_TRIGGERS,
    routingReason,
    confidenceInDecision: calculateRoutingConfidence(context),
  };
}

// ----------------------------------------------------------------------------
// Phase 1: Determine Agent Type
// ----------------------------------------------------------------------------

function determineAgentType(context: RoutingContext): AgentType {
  // Discovery mode for early journey phases
  if (
    context.journeyPhase === 'onboarding' ||
    context.journeyPhase === 'discovery'
  ) {
    return 'discovery';
  }
  
  // Investor simulator when persona is selected
  if (
    context.journeyPhase === 'investor_simulation' &&
    context.selectedPersona
  ) {
    return 'investor_simulator';
  }
  
  // Also investor sim for pitch practice with low discovery completeness
  // forces them back to story work
  if (
    context.journeyPhase === 'pitch_practice' &&
    context.founderContext?.discoveryCompleteness &&
    context.founderContext.discoveryCompleteness < 50
  ) {
    return 'discovery';
  }
  
  // Default to coaching for everything else
  return 'coaching';
}

// ----------------------------------------------------------------------------
// Phase 2: Select LLM
// ----------------------------------------------------------------------------

function selectLLM(agentType: AgentType, context: RoutingContext): LLMChoice {
  // Use client preferences if set
  const clientPrefs = context.clientConfig.preferredLLMs;
  
  switch (agentType) {
    case 'discovery':
      // Discovery needs nuance and emotional intelligence
      // Opus for complex cases, Sonnet for standard
      if (
        context.sessionHistory.length === 0 ||
        context.founderContext?.discoveryCompleteness === 0
      ) {
        return clientPrefs?.discovery || 'claude-sonnet-4-20250514';
      }
      return clientPrefs?.discovery || 'claude-sonnet-4-20250514';
      
    case 'investor_simulator':
      // Investor sim needs to stay in character - Sonnet is great
      return clientPrefs?.investor_simulator || 'claude-sonnet-4-20250514';
      
    case 'coaching':
      // Coaching can use Sonnet
      return clientPrefs?.coaching || 'claude-sonnet-4-20250514';
      
    default:
      return 'claude-sonnet-4-20250514';
  }
}

// ----------------------------------------------------------------------------
// Phase 3: Calculate Difficulty
// ----------------------------------------------------------------------------

function calculateDifficulty(context: RoutingContext): number {
  if (!context.clientConfig.autoAdjustDifficulty) {
    return context.clientConfig.defaultDifficultyLevel;
  }
  
  let difficulty = DEFAULT_DIFFICULTY;
  
  // ─────────────────────────────────────────────────────────────
  // Adjust based on session experience
  // ─────────────────────────────────────────────────────────────
  
  const sessionCount = context.sessionHistory.length;
  
  if (sessionCount < 3) {
    // Gentle start for new users
    difficulty = 0.7;
  } else if (sessionCount > 10) {
    // They're experienced
    difficulty = 1.2;
  } else if (sessionCount > 20) {
    // Veteran
    difficulty = 1.4;
  }
  
  // ─────────────────────────────────────────────────────────────
  // Adjust based on confidence trajectory
  // ─────────────────────────────────────────────────────────────
  
  const recentSessions = context.sessionHistory.slice(-5);
  if (recentSessions.length >= 3) {
    const recentScores = recentSessions.map(s => s.scores.confidence);
    const avgConfidence = average(recentScores);
    
    if (avgConfidence > 80) {
      // They're confident, push harder
      difficulty += 0.3;
    } else if (avgConfidence < 50) {
      // Struggling, ease up
      difficulty -= 0.2;
    }
    
    // Check for improvement trend
    const firstHalf = average(recentScores.slice(0, Math.floor(recentScores.length / 2)));
    const secondHalf = average(recentScores.slice(Math.floor(recentScores.length / 2)));
    
    if (secondHalf > firstHalf + 10) {
      // Improving rapidly, can push more
      difficulty += 0.15;
    } else if (secondHalf < firstHalf - 10) {
      // Declining, ease back
      difficulty -= 0.15;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // Persona-specific adjustment
  // ─────────────────────────────────────────────────────────────
  
  if (context.selectedPersona) {
    difficulty += PERSONA_DIFFICULTY_MODIFIERS[context.selectedPersona] || 0;
  }
  
  // ─────────────────────────────────────────────────────────────
  // Materials completeness adjustment
  // ─────────────────────────────────────────────────────────────
  
  if (context.materialsStatus.completenessScore < 50) {
    // Don't grill them if they're not prepared
    difficulty = Math.min(difficulty, 1.0);
  }
  
  // ─────────────────────────────────────────────────────────────
  // Time in platform adjustment
  // ─────────────────────────────────────────────────────────────
  
  if (context.timeInPlatformDays > 30 && difficulty < 1.2) {
    // They've been here a while, should be ready for more
    difficulty = Math.max(difficulty, 1.1);
  }
  
  // Clamp to valid range
  return Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, difficulty));
}

// ----------------------------------------------------------------------------
// Phase 4: Identify Focus Areas
// ----------------------------------------------------------------------------

async function identifyFocusAreas(
  context: RoutingContext,
  supabase: ReturnType<typeof createClient>
): Promise<string[]> {
  const focusAreas: string[] = [];
  
  // ─────────────────────────────────────────────────────────────
  // Identify weak spots from session history
  // ─────────────────────────────────────────────────────────────
  
  const weakSpots = identifyWeakSpots(context.sessionHistory);
  focusAreas.push(...weakSpots);
  
  // ─────────────────────────────────────────────────────────────
  // Add persona-specific focus areas
  // ─────────────────────────────────────────────────────────────
  
  if (context.selectedPersona) {
    const { data: persona } = await supabase
      .from('investor_personas')
      .select('primary_focus_areas')
      .eq('persona_id', context.selectedPersona)
      .single();
    
    if (persona?.primary_focus_areas) {
      focusAreas.push(...persona.primary_focus_areas);
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // Add platform-specific focus
  // ─────────────────────────────────────────────────────────────
  
  if (context.platformType === 'impact') {
    if (!focusAreas.includes('impact_metrics')) {
      focusAreas.push('impact_metrics');
    }
    if (!focusAreas.includes('sdg_alignment')) {
      focusAreas.push('sdg_alignment');
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // Add discovery gaps if story is incomplete
  // ─────────────────────────────────────────────────────────────
  
  if (context.founderContext) {
    const fc = context.founderContext;
    
    if (!fc.whyThisProblem) {
      focusAreas.push('personal_motivation');
    }
    if (!fc.founderStory) {
      focusAreas.push('founder_story');
    }
    if (!fc.whyThisTeam) {
      focusAreas.push('team_background');
    }
  }
  
  // Deduplicate and limit
  return [...new Set(focusAreas)].slice(0, 5);
}

function identifyWeakSpots(history: SessionSummary[]): string[] {
  if (history.length === 0) return [];
  
  const recentSessions = history
    .filter(s => s.completed)
    .slice(-5);
  
  if (recentSessions.length === 0) return [];
  
  const avgScores = {
    clarity: average(recentSessions.map(s => s.scores.clarity)),
    confidence: average(recentSessions.map(s => s.scores.confidence)),
    storytelling: average(recentSessions.map(s => s.scores.storytelling)),
    businessAcumen: average(recentSessions.map(s => s.scores.businessAcumen)),
  };
  
  const weakAreas: string[] = [];
  
  if (avgScores.clarity < 70) {
    weakAreas.push('clarity', 'conciseness');
  }
  if (avgScores.storytelling < 70) {
    weakAreas.push('narrative', 'emotional_hook');
  }
  if (avgScores.businessAcumen < 70) {
    weakAreas.push('market_understanding', 'financials');
  }
  if (avgScores.confidence < 60) {
    weakAreas.push('conviction', 'presence');
  }
  
  return weakAreas;
}

// ----------------------------------------------------------------------------
// Phase 5: Select Prompt Template
// ----------------------------------------------------------------------------

function selectPromptTemplate(
  agentType: AgentType,
  context: RoutingContext
): string {
  const platform = context.platformType;
  
  switch (agentType) {
    case 'discovery':
      return 'discovery/founder_story_excavator';
      
    case 'investor_simulator':
      // Base template + persona overlay
      return `investor_simulator/base_with_${context.selectedPersona || 'default'}`;
      
    case 'coaching':
      // Select based on what they need
      if (context.materialsStatus.completenessScore < 50) {
        return 'coaching/materials_coach';
      }
      if (context.confidenceScore < 60) {
        return 'coaching/confidence_builder';
      }
      return 'coaching/pitch_refinement';
      
    default:
      return 'coaching/pitch_refinement';
  }
}

// ----------------------------------------------------------------------------
// Phase 6: Determine Session Goals
// ----------------------------------------------------------------------------

function determineSessionGoals(
  context: RoutingContext,
  agentType: AgentType
): string[] {
  const goals: string[] = [];
  
  if (agentType === 'discovery') {
    if (!context.founderContext?.whyThisProblem) {
      goals.push('Uncover the personal connection to the problem');
    }
    if (!context.founderContext?.founderStory) {
      goals.push('Excavate the founder origin story');
    }
    if (!context.founderContext?.originMoment) {
      goals.push('Find the pivotal moment that sparked this journey');
    }
    goals.push('Build emotional foundation for pitch narrative');
  }
  
  else if (agentType === 'investor_simulator') {
    goals.push('Simulate realistic investor pressure');
    goals.push('Test responses to tough questions');
    goals.push('Build muscle memory for live pitches');
    
    if (context.materialsStatus.completenessScore < 80) {
      goals.push('Identify gaps in preparation');
    }
    
    // Persona-specific goals
    if (context.selectedPersona === 'michael_torres') {
      goals.push('Stress test financial understanding');
    } else if (context.selectedPersona === 'dr_amanda_foster') {
      goals.push('Challenge impact assumptions rigorously');
    } else if (context.selectedPersona === 'david_okonkwo') {
      goals.push('Explore systems-level thinking');
    }
  }
  
  else if (agentType === 'coaching') {
    if (context.materialsStatus.completenessScore < 50) {
      goals.push('Guide materials completion');
    }
    goals.push('Refine pitch delivery');
    goals.push('Build confidence through practice');
    
    if (context.confidenceScore < 60) {
      goals.push('Focus on building self-assurance');
    }
  }
  
  return goals;
}

// ----------------------------------------------------------------------------
// Phase 6b: Build Prompt Variables
// ----------------------------------------------------------------------------

function buildPromptVariables(
  context: RoutingContext,
  difficulty: number,
  focusAreas: string[],
  sessionGoals: string[]
): PromptVariables {
  const fc = context.founderContext;
  
  return {
    // Basic founder info (would come from user profile)
    founderName: undefined, // Populated by caller
    companyName: undefined,
    industry: undefined,
    stage: undefined,
    
    // Discovered story elements
    founderStory: fc?.founderStory,
    whyThisProblem: fc?.whyThisProblem,
    whyNow: fc?.whyNow,
    whyThisTeam: fc?.whyThisTeam,
    personalConnection: fc?.personalConnection,
    originMoment: fc?.originMoment,
    keyQuotes: fc?.keyQuotes,
    
    // Session context
    difficulty,
    focusAreas,
    priorSessionCount: context.sessionHistory.length,
    sessionGoals,
    
    // Persona
    investorPersona: context.selectedPersona,
    
    // Platform
    platformType: context.platformType,
    impactFocus: context.platformType === 'impact',
  };
}

// ----------------------------------------------------------------------------
// Helper: Build Routing Reason (for logging/debugging)
// ----------------------------------------------------------------------------

function buildRoutingReason(
  context: RoutingContext,
  agentType: AgentType,
  difficulty: number
): string {
  const reasons: string[] = [];
  
  reasons.push(`Journey phase: ${context.journeyPhase}`);
  reasons.push(`Agent type selected: ${agentType}`);
  
  if (context.selectedPersona) {
    reasons.push(`Persona: ${context.selectedPersona}`);
  }
  
  reasons.push(`Difficulty: ${difficulty.toFixed(2)}`);
  
  if (context.sessionHistory.length === 0) {
    reasons.push('First session - using gentle approach');
  }
  
  if (context.founderContext?.discoveryCompleteness) {
    reasons.push(`Discovery completeness: ${context.founderContext.discoveryCompleteness}%`);
  }
  
  return reasons.join(' | ');
}

// ----------------------------------------------------------------------------
// Helper: Calculate Routing Confidence
// ----------------------------------------------------------------------------

function calculateRoutingConfidence(context: RoutingContext): number {
  let confidence = 0.7; // Base confidence
  
  // More history = more confidence in routing
  if (context.sessionHistory.length > 5) {
    confidence += 0.15;
  }
  
  // Clear journey phase = more confidence
  if (['discovery', 'investor_simulation'].includes(context.journeyPhase)) {
    confidence += 0.1;
  }
  
  // Selected persona = clear intent
  if (context.selectedPersona) {
    confidence += 0.05;
  }
  
  return Math.min(confidence, 1.0);
}

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

// ----------------------------------------------------------------------------
// Export Additional Utilities
// ----------------------------------------------------------------------------

export { 
  determineAgentType,
  selectLLM,
  calculateDifficulty,
  identifyWeakSpots,
  determineSessionGoals,
};



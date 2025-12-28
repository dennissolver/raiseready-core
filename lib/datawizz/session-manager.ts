// ============================================================================
// DATAWIZZ SESSION MANAGER
// Handles the full lifecycle of coaching/simulation sessions
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import { routeSession } from './routing-engine';
import { assemblePrompt } from './prompt-assembler';
import type {
  RoutingContext,
  RoutingDecision,
  SessionOutcome,
  FounderDiscoveredContext,
  SessionRoutingLog,
  VoiceSessionConfig,
  SessionSummary,
  MaterialsStatus,
  ClientConfig,
  JourneyPhase,
  PlatformType,
  InvestorPersonaId,
  SessionType,
  EngagementLevel,
} from '../../types/datawizz';

// ----------------------------------------------------------------------------
// Session Initialization
// ----------------------------------------------------------------------------

export interface InitSessionParams {
  userId: string;
  organizationId: string;
  requestType: SessionType;
  selectedPersona?: InvestorPersonaId;
  userMessage?: string;
}

export interface InitSessionResult {
  success: boolean;
  sessionId: string;
  routingDecision: RoutingDecision;
  assembledPrompt: string;
  openingMessage?: string;
  voiceConfig?: VoiceSessionConfig;
  error?: string;
}

export async function initializeSession(
  params: InitSessionParams,
  supabase: ReturnType<typeof createClient>
): Promise<InitSessionResult> {
  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Gather full context for routing
    // ─────────────────────────────────────────────────────────────
    
    const context = await gatherRoutingContext(params, supabase);
    
    // ─────────────────────────────────────────────────────────────
    // 2. Run routing engine
    // ─────────────────────────────────────────────────────────────
    
    const routingDecision = await routeSession(context, supabase);
    
    // ─────────────────────────────────────────────────────────────
    // 3. Assemble prompt
    // ─────────────────────────────────────────────────────────────
    
    const { systemPrompt, openingMessage } = await assemblePrompt(
      routingDecision,
      supabase
    );
    
    // ─────────────────────────────────────────────────────────────
    // 4. Create session record
    // ─────────────────────────────────────────────────────────────
    
    const sessionId = crypto.randomUUID();
    
    await logRoutingDecision(sessionId, context, routingDecision, supabase);
    
    // ─────────────────────────────────────────────────────────────
    // 5. Configure voice agent if voice session
    // ─────────────────────────────────────────────────────────────
    
    let voiceConfig: VoiceSessionConfig | undefined;
    
    if (params.requestType === 'voice' && routingDecision.voiceAgentId) {
      voiceConfig = await configureVoiceAgent(
        sessionId,
        routingDecision,
        systemPrompt,
        openingMessage
      );
    }
    
    return {
      success: true,
      sessionId,
      routingDecision,
      assembledPrompt: systemPrompt,
      openingMessage,
      voiceConfig,
    };
    
  } catch (error) {
    console.error('Failed to initialize session:', error);
    return {
      success: false,
      sessionId: '',
      routingDecision: {} as RoutingDecision,
      assembledPrompt: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ----------------------------------------------------------------------------
// Context Gathering
// ----------------------------------------------------------------------------

async function gatherRoutingContext(
  params: InitSessionParams,
  supabase: ReturnType<typeof createClient>
): Promise<RoutingContext> {
  const { userId, organizationId, requestType, selectedPersona, userMessage } = params;
  
  // Fetch all required data in parallel
  const [
    userProfile,
    sessionHistory,
    founderContext,
    materialsStatus,
    clientConfig,
  ] = await Promise.all([
    fetchUserProfile(userId, supabase),
    fetchSessionHistory(userId, supabase),
    fetchFounderContext(userId, supabase),
    fetchMaterialsStatus(userId, supabase),
    fetchClientConfig(organizationId, supabase),
  ]);
  
  // Calculate derived values
  const confidenceScore = calculateConfidenceScore(sessionHistory);
  const engagementLevel = calculateEngagementLevel(sessionHistory, userProfile);
  const timeInPlatformDays = calculateTimeInPlatform(userProfile);
  const journeyPhase = determineJourneyPhase(
    founderContext,
    materialsStatus,
    sessionHistory,
    selectedPersona
  );
  
  return {
    userId,
    organizationId,
    journeyPhase,
    materialsStatus,
    sessionHistory,
    requestType,
    selectedPersona,
    userMessage,
    confidenceScore,
    engagementLevel,
    timeInPlatformDays,
    lastSessionDate: sessionHistory[0]?.date,
    platformType: clientConfig.platformType,
    clientConfig,
    founderContext,
  };
}

// ----------------------------------------------------------------------------
// Data Fetchers
// ----------------------------------------------------------------------------

async function fetchUserProfile(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ createdAt: Date; lastActiveAt?: Date }> {
  const { data } = await supabase
    .from('users')
    .select('created_at, last_active_at')
    .eq('id', userId)
    .single();
  
  return {
    createdAt: data?.created_at ? new Date(data.created_at) : new Date(),
    lastActiveAt: data?.last_active_at ? new Date(data.last_active_at) : undefined,
  };
}

async function fetchSessionHistory(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<SessionSummary[]> {
  const { data } = await supabase
    .from('session_routing_log')
    .select(`
      id,
      created_at,
      agent_type,
      selected_persona,
      score_clarity,
      score_confidence,
      score_storytelling,
      score_business_acumen,
      score_impact_articulation,
      focus_areas,
      session_duration_seconds,
      session_completed
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (!data) return [];
  
  return data.map(row => ({
    sessionId: row.id,
    date: new Date(row.created_at),
    type: row.agent_type as any,
    persona: row.selected_persona as any,
    scores: {
      clarity: row.score_clarity ?? 70,
      confidence: row.score_confidence ?? 70,
      storytelling: row.score_storytelling ?? 70,
      businessAcumen: row.score_business_acumen ?? 70,
      impactArticulation: row.score_impact_articulation,
    },
    focusAreas: row.focus_areas ?? [],
    duration: row.session_duration_seconds ? row.session_duration_seconds / 60 : 0,
    completed: row.session_completed ?? false,
  }));
}

async function fetchFounderContext(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<FounderDiscoveredContext | undefined> {
  const { data } = await supabase
    .from('founder_discovered_context')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!data) return undefined;
  
  return {
    id: data.id,
    userId: data.user_id,
    whyThisProblem: data.why_this_problem,
    whyThisProblemMoment: data.why_this_problem_moment,
    whyNow: data.why_now,
    whyNowTrigger: data.why_now_trigger,
    whyThisTeam: data.why_this_team,
    uniqueInsight: data.unique_insight,
    founderStory: data.founder_story,
    originMoment: data.origin_moment,
    originLocation: data.origin_location,
    originEmotion: data.origin_emotion,
    personalConnection: data.personal_connection,
    whoTheySawSuffer: data.who_they_saw_suffer,
    personalStakes: data.personal_stakes,
    keyQuotes: data.key_quotes ?? [],
    emotionalThemes: data.emotional_themes ?? [],
    discoveryCompleteness: data.discovery_completeness ?? 0,
    discoverySessionsCount: data.discovery_sessions_count ?? 0,
    lastDiscoverySessionAt: data.last_discovery_session_at 
      ? new Date(data.last_discovery_session_at) 
      : undefined,
  };
}

async function fetchMaterialsStatus(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<MaterialsStatus> {
  // Check what materials the user has uploaded
  const { data } = await supabase
    .from('user_materials')
    .select('material_type, updated_at')
    .eq('user_id', userId);
  
  const materials = data ?? [];
  const hasType = (type: string) => materials.some(m => m.material_type === type);
  
  // Calculate completeness based on what they have
  let completeness = 0;
  if (hasType('executive_summary')) completeness += 25;
  if (hasType('pitch_deck')) completeness += 35;
  if (hasType('financials')) completeness += 25;
  if (hasType('impact_framework')) completeness += 15;
  
  const lastUpdated = materials.length > 0
    ? new Date(Math.max(...materials.map(m => new Date(m.updated_at).getTime())))
    : undefined;
  
  return {
    hasExecutiveSummary: hasType('executive_summary'),
    hasPitchDeck: hasType('pitch_deck'),
    hasFinancials: hasType('financials'),
    hasImpactFramework: hasType('impact_framework'),
    completenessScore: completeness,
    lastUpdated,
  };
}

async function fetchClientConfig(
  organizationId: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientConfig> {
  const { data } = await supabase
    .from('agent_configurations')
    .select('*')
    .eq('organization_id', organizationId)
    .single();
  
  // Return defaults if no config found
  if (!data) {
    return {
      voiceAgents: {},
      preferredLLMs: {
        discovery: 'claude-sonnet-4-20250514',
        coaching: 'claude-sonnet-4-20250514',
        investor_simulator: 'claude-sonnet-4-20250514',
        analysis: 'claude-haiku-4-20250514',
      },
      defaultDifficultyLevel: 1.0,
      autoAdjustDifficulty: true,
      maxSessionDurationMinutes: 30,
      platformType: 'impact',
    };
  }
  
  return {
    voiceAgents: {
      discovery: data.discovery_voice_agent_id,
      coaching: data.coaching_voice_agent_id,
      investor_simulator: data.investor_sim_voice_agent_id,
    },
    preferredLLMs: {
      discovery: data.preferred_llm_discovery,
      coaching: data.preferred_llm_coaching,
      investor_simulator: data.preferred_llm_investor_sim,
      analysis: data.preferred_llm_analysis,
    },
    defaultDifficultyLevel: data.default_difficulty_level ?? 1.0,
    autoAdjustDifficulty: data.auto_adjust_difficulty ?? true,
    maxSessionDurationMinutes: data.max_session_duration_minutes ?? 30,
    platformType: data.platform_type ?? 'impact',
  };
}

// ----------------------------------------------------------------------------
// Derived Calculations
// ----------------------------------------------------------------------------

function calculateConfidenceScore(history: SessionSummary[]): number {
  if (history.length === 0) return 70; // Default starting point
  
  const completedSessions = history.filter(s => s.completed);
  if (completedSessions.length === 0) return 70;
  
  const recentSessions = completedSessions.slice(0, 5);
  const avgConfidence = recentSessions.reduce((sum, s) => sum + s.scores.confidence, 0) 
    / recentSessions.length;
  
  return Math.round(avgConfidence);
}

function calculateEngagementLevel(
  history: SessionSummary[],
  profile: { createdAt: Date; lastActiveAt?: Date }
): EngagementLevel {
  // Check session frequency in last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const recentSessions = history.filter(s => s.date > twoWeeksAgo);
  
  if (recentSessions.length >= 5) return 'high';
  if (recentSessions.length >= 2) return 'medium';
  return 'low';
}

function calculateTimeInPlatform(profile: { createdAt: Date }): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - profile.createdAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function determineJourneyPhase(
  founderContext: FounderDiscoveredContext | undefined,
  materialsStatus: MaterialsStatus,
  sessionHistory: SessionSummary[],
  selectedPersona?: InvestorPersonaId
): JourneyPhase {
  // If they've selected a persona, they want investor simulation
  if (selectedPersona) {
    return 'investor_simulation';
  }
  
  // No sessions yet = onboarding
  if (sessionHistory.length === 0) {
    return 'onboarding';
  }
  
  // Story not discovered yet = discovery
  if (!founderContext || founderContext.discoveryCompleteness < 50) {
    return 'discovery';
  }
  
  // No materials = materials draft phase
  if (materialsStatus.completenessScore < 30) {
    return 'materials_draft';
  }
  
  // Has materials but incomplete = materials review
  if (materialsStatus.completenessScore < 70) {
    return 'materials_review';
  }
  
  // Good materials and story = pitch practice
  if (founderContext.discoveryCompleteness >= 70 && materialsStatus.completenessScore >= 70) {
    // Check their scores
    const avgConfidence = sessionHistory.length > 0
      ? sessionHistory.slice(0, 5).reduce((sum, s) => sum + s.scores.confidence, 0) / Math.min(5, sessionHistory.length)
      : 0;
    
    if (avgConfidence >= 80 && sessionHistory.length >= 10) {
      return 'ready_to_connect';
    }
  }
  
  return 'pitch_practice';
}

// ----------------------------------------------------------------------------
// Logging
// ----------------------------------------------------------------------------

async function logRoutingDecision(
  sessionId: string,
  context: RoutingContext,
  decision: RoutingDecision,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  await supabase.from('session_routing_log').insert({
    session_id: sessionId,
    session_type: context.requestType,
    user_id: context.userId,
    organization_id: context.organizationId,
    journey_phase: context.journeyPhase,
    materials_completeness: context.materialsStatus.completenessScore,
    prior_session_count: context.sessionHistory.length,
    confidence_score_input: context.confidenceScore,
    engagement_level: context.engagementLevel,
    time_in_platform_days: context.timeInPlatformDays,
    selected_persona: context.selectedPersona,
    llm_selected: decision.llm,
    agent_type: decision.agentType,
    prompt_template_id: decision.promptTemplateId,
    voice_agent_id: decision.voiceAgentId,
    difficulty_level: decision.difficultyLevel,
    focus_areas: decision.focusAreas,
    session_goals: decision.sessionGoals,
    founder_context_snapshot: context.founderContext,
  });
}

// ----------------------------------------------------------------------------
// Voice Agent Configuration
// ----------------------------------------------------------------------------

async function configureVoiceAgent(
  sessionId: string,
  decision: RoutingDecision,
  systemPrompt: string,
  openingMessage?: string
): Promise<VoiceSessionConfig> {
  // This would integrate with ElevenLabs API
  // For now, return the config structure
  
  return {
    conversationId: sessionId,
    signedUrl: '', // Would come from ElevenLabs
    agentType: decision.agentType,
    persona: decision.personaOverride,
    difficultyLevel: decision.difficultyLevel,
    sessionGoals: decision.sessionGoals,
  };
}

// ----------------------------------------------------------------------------
// Session Completion
// ----------------------------------------------------------------------------

export async function completeSession(
  sessionId: string,
  outcome: SessionOutcome,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Update routing log with outcome
  await supabase
    .from('session_routing_log')
    .update({
      session_completed: true,
      session_duration_seconds: outcome.duration * 60,
      turn_count: outcome.turnCount,
      score_clarity: outcome.scores.clarity,
      score_confidence: outcome.scores.confidence,
      score_storytelling: outcome.scores.storytelling,
      score_business_acumen: outcome.scores.businessAcumen,
      score_impact_articulation: outcome.scores.impactArticulation,
      user_engagement_outcome: outcome.userEngagement,
      user_frustration_detected: outcome.userFrustration,
      identified_strengths: outcome.identifiedStrengths,
      identified_weaknesses: outcome.identifiedWeaknesses,
      key_moments: outcome.keyMoments,
      completed_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId);
  
  // Update founder context if discovery session
  if (outcome.discoveredContext && outcome.agentType === 'discovery') {
    await updateFounderContext(outcome.userId, outcome.discoveredContext, supabase);
  }
}

// ----------------------------------------------------------------------------
// Founder Context Updates
// ----------------------------------------------------------------------------

export async function updateFounderContext(
  userId: string,
  updates: Partial<FounderDiscoveredContext>,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  // Check if context exists
  const { data: existing } = await supabase
    .from('founder_discovered_context')
    .select('id, key_quotes, discovery_sessions_count')
    .eq('user_id', userId)
    .single();
  
  // Build update object
  const updateData: Record<string, any> = {};
  
  if (updates.whyThisProblem) updateData.why_this_problem = updates.whyThisProblem;
  if (updates.whyThisProblemMoment) updateData.why_this_problem_moment = updates.whyThisProblemMoment;
  if (updates.whyNow) updateData.why_now = updates.whyNow;
  if (updates.whyNowTrigger) updateData.why_now_trigger = updates.whyNowTrigger;
  if (updates.whyThisTeam) updateData.why_this_team = updates.whyThisTeam;
  if (updates.uniqueInsight) updateData.unique_insight = updates.uniqueInsight;
  if (updates.founderStory) updateData.founder_story = updates.founderStory;
  if (updates.originMoment) updateData.origin_moment = updates.originMoment;
  if (updates.originLocation) updateData.origin_location = updates.originLocation;
  if (updates.originEmotion) updateData.origin_emotion = updates.originEmotion;
  if (updates.personalConnection) updateData.personal_connection = updates.personalConnection;
  if (updates.whoTheySawSuffer) updateData.who_they_saw_suffer = updates.whoTheySawSuffer;
  if (updates.personalStakes) updateData.personal_stakes = updates.personalStakes;
  if (updates.emotionalThemes) updateData.emotional_themes = updates.emotionalThemes;
  
  // Handle key quotes (append)
  if (updates.keyQuotes && updates.keyQuotes.length > 0) {
    const existingQuotes = existing?.key_quotes ?? [];
    updateData.key_quotes = [...existingQuotes, ...updates.keyQuotes];
  }
  
  // Increment session count
  updateData.discovery_sessions_count = (existing?.discovery_sessions_count ?? 0) + 1;
  updateData.last_discovery_session_at = new Date().toISOString();
  
  if (existing) {
    await supabase
      .from('founder_discovered_context')
      .update(updateData)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('founder_discovered_context')
      .insert({
        user_id: userId,
        ...updateData,
      });
  }
}

// ----------------------------------------------------------------------------
// Export
// ----------------------------------------------------------------------------

export {
  gatherRoutingContext,
  fetchFounderContext,
  fetchSessionHistory,
  determineJourneyPhase,
};



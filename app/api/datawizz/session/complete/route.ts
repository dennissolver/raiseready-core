// ============================================================================
// API: Complete Session
// POST /api/datawizz/session/complete
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeSession } from '@raiseready/core/lib/datawizz';
import type { SessionOutcome, SessionScores, EngagementLevel, AgentType, InvestorPersonaId } from '@raiseready/core/types/datawizz';

interface CompleteSessionRequest {
  sessionId: string;
  scores: SessionScores;
  duration: number;  // minutes
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
  discoveredContext?: {
    whyThisProblem?: string;
    whyNow?: string;
    whyThisTeam?: string;
    founderStory?: string;
    originMoment?: string;
    personalConnection?: string;
    keyQuotes?: Array<{ quote: string; context: string }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json() as CompleteSessionRequest;
    
    const {
      sessionId,
      scores,
      duration,
      turnCount,
      userEngagement,
      userFrustration,
      identifiedStrengths,
      identifiedWeaknesses,
      keyMoments,
      discoveredContext,
    } = body;
    
    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }
    
    if (!scores || typeof scores.clarity !== 'number') {
      return NextResponse.json(
        { error: 'Valid scores object is required' },
        { status: 400 }
      );
    }
    
    // Verify session belongs to user
    const { data: sessionLog } = await supabase
      .from('session_routing_log')
      .select('user_id, agent_type, selected_persona')
      .eq('session_id', sessionId)
      .single();
    
    if (!sessionLog || sessionLog.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }
    
    // Build outcome object
    const outcome: SessionOutcome = {
      sessionId,
      userId: user.id,
      agentType: sessionLog.agent_type as AgentType,
      persona: sessionLog.selected_persona as InvestorPersonaId | undefined,
      scores,
      duration,
      turnCount,
      userEngagement,
      userFrustration,
      routingDecision: {} as any, // Not needed for completion
      keyMoments: keyMoments ?? [],
      identifiedStrengths: identifiedStrengths ?? [],
      identifiedWeaknesses: identifiedWeaknesses ?? [],
      discoveredContext: discoveredContext ? {
        ...discoveredContext,
        keyQuotes: discoveredContext.keyQuotes?.map(q => ({
          ...q,
          sessionId,
        })),
      } : undefined,
    };
    
    // Complete the session
    await completeSession(sessionId, outcome, supabase);
    
    // Calculate progress indicators
    const progressUpdate = await calculateProgressUpdate(user.id, supabase);
    
    return NextResponse.json({
      success: true,
      sessionId,
      progress: progressUpdate,
    });
    
  } catch (error) {
    console.error('Session complete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ----------------------------------------------------------------------------
// Calculate Progress Update
// ----------------------------------------------------------------------------

async function calculateProgressUpdate(
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{
  totalSessions: number;
  discoveryCompleteness: number;
  averageConfidence: number;
  journeyPhase: string;
  recentTrend: 'improving' | 'stable' | 'declining';
}> {
  // Get session count
  const { count } = await supabase
    .from('session_routing_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('session_completed', true);
  
  // Get discovery completeness
  const { data: context } = await supabase
    .from('founder_discovered_context')
    .select('discovery_completeness')
    .eq('user_id', userId)
    .single();
  
  // Get recent confidence scores
  const { data: recentSessions } = await supabase
    .from('session_routing_log')
    .select('score_confidence, created_at')
    .eq('user_id', userId)
    .eq('session_completed', true)
    .not('score_confidence', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
  
  const confidenceScores = recentSessions?.map(s => s.score_confidence) ?? [];
  const avgConfidence = confidenceScores.length > 0
    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
    : 70;
  
  // Calculate trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (confidenceScores.length >= 4) {
    const firstHalf = confidenceScores.slice(Math.floor(confidenceScores.length / 2));
    const secondHalf = confidenceScores.slice(0, Math.floor(confidenceScores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 5) {
      trend = 'improving';
    } else if (secondAvg < firstAvg - 5) {
      trend = 'declining';
    }
  }
  
  // Determine journey phase
  const discoveryCompleteness = context?.discovery_completeness ?? 0;
  let journeyPhase = 'discovery';
  
  if (discoveryCompleteness >= 70 && avgConfidence >= 80) {
    journeyPhase = 'ready_to_connect';
  } else if (discoveryCompleteness >= 50) {
    journeyPhase = 'pitch_practice';
  }
  
  return {
    totalSessions: count ?? 0,
    discoveryCompleteness,
    averageConfidence: Math.round(avgConfidence),
    journeyPhase,
    recentTrend: trend,
  };
}




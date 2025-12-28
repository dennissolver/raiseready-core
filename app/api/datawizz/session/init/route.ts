// ============================================================================
// API: Initialize Session
// POST /api/datawizz/session/init
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initializeSession } from '@raiseready/core/lib/datawizz';
import type { InitSessionParams } from '@raiseready/core/lib/datawizz';
import type { InvestorPersonaId, SessionType } from '@raiseready/core/types/datawizz';

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
    const body = await request.json();
    
    const {
      organizationId,
      requestType,
      selectedPersona,
      userMessage,
    } = body as {
      organizationId?: string;
      requestType?: SessionType;
      selectedPersona?: InvestorPersonaId;
      userMessage?: string;
    };
    
    // Validate required fields
    if (!requestType || !['voice', 'chat', 'analysis'].includes(requestType)) {
      return NextResponse.json(
        { error: 'Invalid requestType. Must be voice, chat, or analysis.' },
        { status: 400 }
      );
    }
    
    // Get organization ID from user's membership if not provided
    let orgId = organizationId;
    if (!orgId) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      orgId = membership?.organization_id;
    }
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 400 }
      );
    }
    
    // Validate persona if provided
    if (selectedPersona && !['sarah_chen', 'michael_torres', 'dr_amanda_foster', 'david_okonkwo'].includes(selectedPersona)) {
      return NextResponse.json(
        { error: 'Invalid investor persona' },
        { status: 400 }
      );
    }
    
    // Initialize the session
    const params: InitSessionParams = {
      userId: user.id,
      organizationId: orgId,
      requestType,
      selectedPersona,
      userMessage,
    };
    
    const result = await initializeSession(params, supabase);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to initialize session' },
        { status: 500 }
      );
    }
    
    // Return session configuration
    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      agentType: result.routingDecision.agentType,
      persona: result.routingDecision.personaOverride,
      difficulty: result.routingDecision.difficultyLevel,
      focusAreas: result.routingDecision.focusAreas,
      sessionGoals: result.routingDecision.sessionGoals,
      systemPrompt: result.assembledPrompt,
      openingMessage: result.openingMessage,
      voiceConfig: result.voiceConfig,
      // Include routing info for debugging (remove in production)
      _debug: {
        llm: result.routingDecision.llm,
        promptTemplate: result.routingDecision.promptTemplateId,
        routingReason: result.routingDecision.routingReason,
        confidence: result.routingDecision.confidenceInDecision,
      },
    });
    
  } catch (error) {
    console.error('Session init error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




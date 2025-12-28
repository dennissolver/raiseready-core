// ============================================================================
// API: Founder Discovered Context
// GET /api/datawizz/founder-context - Get founder's discovered context
// PATCH /api/datawizz/founder-context - Update founder's discovered context
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateFounderContext, fetchFounderContext } from '@raiseready/core/lib/datawizz';
import type { FounderDiscoveredContext } from '@raiseready/core/types/datawizz';

// GET - Retrieve founder context
export async function GET(request: NextRequest) {
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
    
    // Fetch context
    const context = await fetchFounderContext(user.id, supabase);
    
    if (!context) {
      return NextResponse.json({
        success: true,
        context: null,
        message: 'No discovered context yet. Start a discovery session to build your founder story.',
      });
    }
    
    // Calculate what's missing
    const missingElements: string[] = [];
    if (!context.whyThisProblem) missingElements.push('Why this problem');
    if (!context.whyNow) missingElements.push('Why now');
    if (!context.whyThisTeam) missingElements.push('Why this team');
    if (!context.founderStory) missingElements.push('Founder origin story');
    if (!context.originMoment) missingElements.push('Origin moment');
    if (!context.personalConnection) missingElements.push('Personal connection');
    
    return NextResponse.json({
      success: true,
      context,
      completeness: context.discoveryCompleteness,
      missingElements,
      sessionsCompleted: context.discoverySessionsCount,
    });
    
  } catch (error) {
    console.error('Get founder context error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update founder context manually
export async function PATCH(request: NextRequest) {
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
    const updates = await request.json() as Partial<FounderDiscoveredContext>;
    
    // Remove protected fields
    delete updates.id;
    delete updates.userId;
    delete updates.discoveryCompleteness; // Auto-calculated
    delete updates.discoverySessionsCount; // Auto-incremented
    
    // Validate key quotes format if provided
    if (updates.keyQuotes) {
      if (!Array.isArray(updates.keyQuotes)) {
        return NextResponse.json(
          { error: 'keyQuotes must be an array' },
          { status: 400 }
        );
      }
      
      for (const quote of updates.keyQuotes) {
        if (!quote.quote || typeof quote.quote !== 'string') {
          return NextResponse.json(
            { error: 'Each keyQuote must have a quote string' },
            { status: 400 }
          );
        }
      }
    }
    
    // Update context
    await updateFounderContext(user.id, updates, supabase);
    
    // Fetch updated context
    const context = await fetchFounderContext(user.id, supabase);
    
    return NextResponse.json({
      success: true,
      context,
      completeness: context?.discoveryCompleteness ?? 0,
    });
    
  } catch (error) {
    console.error('Update founder context error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




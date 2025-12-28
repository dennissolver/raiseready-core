// ============================================================================
// API: Investor Personas
// GET /api/datawizz/personas - List available investor personas
// GET /api/datawizz/personas/[id] - Get specific persona details
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    
    // Get organization to check platform type
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();
    
    let platformType = 'impact'; // default
    
    if (membership?.organization_id) {
      const { data: config } = await supabase
        .from('agent_configurations')
        .select('platform_type')
        .eq('organization_id', membership.organization_id)
        .single();
      
      platformType = config?.platform_type ?? 'impact';
    }
    
    // Fetch personas available for this platform
    const platformFilter = platformType === 'impact' 
      ? 'available_for_impact' 
      : 'available_for_commercial';
    
    const { data: personas, error } = await supabase
      .from('investor_personas')
      .select(`
        persona_id,
        display_name,
        role,
        organization_type,
        difficulty,
        difficulty_score,
        personality_traits,
        avatar_emoji,
        avatar_url,
        investment_focus,
        check_size_min,
        check_size_max,
        primary_focus_areas
      `)
      .eq('is_active', true)
      .eq(platformFilter, true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Fetch personas error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch personas' },
        { status: 500 }
      );
    }
    
    // Format for frontend
    const formattedPersonas = personas.map(p => ({
      id: p.persona_id,
      name: p.display_name,
      role: p.role,
      organizationType: p.organization_type,
      difficulty: p.difficulty,
      difficultyScore: p.difficulty_score,
      traits: p.personality_traits,
      emoji: p.avatar_emoji,
      avatar: p.avatar_url,
      focus: p.primary_focus_areas,
      investmentFocus: p.investment_focus,
      checkSize: {
        min: p.check_size_min,
        max: p.check_size_max,
      },
      // UI helper
      difficultyLabel: getDifficultyLabel(p.difficulty),
      description: getPersonaDescription(p.persona_id),
    }));
    
    return NextResponse.json({
      success: true,
      personas: formattedPersonas,
      platformType,
    });
    
  } catch (error) {
    console.error('Get personas error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'Supportive & Encouraging';
    case 'medium':
      return 'Challenging but Fair';
    case 'hard':
      return 'Skeptical & Rigorous';
    default:
      return 'Standard';
  }
}

function getPersonaDescription(personaId: string): string {
  const descriptions: Record<string, string> = {
    sarah_chen: 'Asks clarifying questions and helps you refine your pitch. Great for first-time practice.',
    michael_torres: 'Focused on metrics, market size, and unit economics. Expects concrete numbers.',
    dr_amanda_foster: 'Challenges assumptions and looks for holes in your logic. Tough but fair.',
    david_okonkwo: 'Deep dives on social/environmental impact and SDG alignment.',
  };
  
  return descriptions[personaId] ?? 'Professional investor simulation.';
}




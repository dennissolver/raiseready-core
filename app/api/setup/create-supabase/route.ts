// app/api/setup/create-supabase/route.ts
// ============================================================================
// CREATE SUPABASE PROJECT
// Wait for ACTIVE_HEALTHY, then run RLS policies
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_API = 'https://api.supabase.com/v1';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================================================
// RLS POLICIES SQL
// SIMPLIFIED: Uses auth.uid() directly instead of auth.users email lookup
// This avoids "permission denied for table users" errors
// ============================================================================

const RLS_POLICIES_SQL = `
-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE IF EXISTS public.founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deck_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.founder_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.watchlist_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.founder_sdg_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.impact_returns_calculated ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.founder_investor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.investor_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.investor_sdg_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.investor_network_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.investor_discovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.impact_matching_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.voice_coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.voice_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pitch_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sdg_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FOUNDERS (id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "founders_own_data" ON public.founders;
DROP POLICY IF EXISTS "Founders can view own profile" ON public.founders;
DROP POLICY IF EXISTS "Founders can update own profile" ON public.founders;
DROP POLICY IF EXISTS "Founders can insert own profile" ON public.founders;
DROP POLICY IF EXISTS "Service role full access founders" ON public.founders;
DROP POLICY IF EXISTS "service_role_founders" ON public.founders;

CREATE POLICY "founders_own_data" ON public.founders
  FOR ALL USING (id = auth.uid());

CREATE POLICY "service_role_founders" ON public.founders
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- FOUNDER_PROFILES (founder_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "founder_profiles_own" ON public.founder_profiles;
DROP POLICY IF EXISTS "Users can view own founder profile" ON public.founder_profiles;
DROP POLICY IF EXISTS "Users can manage own founder profile" ON public.founder_profiles;
DROP POLICY IF EXISTS "Service role full access founder_profiles" ON public.founder_profiles;
DROP POLICY IF EXISTS "service_role_founder_profiles" ON public.founder_profiles;

CREATE POLICY "founder_profiles_own" ON public.founder_profiles
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "service_role_founder_profiles" ON public.founder_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- PITCH_DECKS (founder_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "pitch_decks_own" ON public.pitch_decks;
DROP POLICY IF EXISTS "Users can view own decks" ON public.pitch_decks;
DROP POLICY IF EXISTS "Users can insert own decks" ON public.pitch_decks;
DROP POLICY IF EXISTS "Users can update own decks" ON public.pitch_decks;
DROP POLICY IF EXISTS "Users can delete own decks" ON public.pitch_decks;
DROP POLICY IF EXISTS "Service role full access pitch_decks" ON public.pitch_decks;
DROP POLICY IF EXISTS "service_role_pitch_decks" ON public.pitch_decks;

CREATE POLICY "pitch_decks_own" ON public.pitch_decks
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "service_role_pitch_decks" ON public.pitch_decks
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- DECK_ANALYSIS (via deck_id -> pitch_decks)
-- ============================================================================
DROP POLICY IF EXISTS "deck_analysis_own" ON public.deck_analysis;
DROP POLICY IF EXISTS "Users can view own deck analysis" ON public.deck_analysis;
DROP POLICY IF EXISTS "Users can insert own deck analysis" ON public.deck_analysis;
DROP POLICY IF EXISTS "Service role full access deck_analysis" ON public.deck_analysis;
DROP POLICY IF EXISTS "service_role_deck_analysis" ON public.deck_analysis;

CREATE POLICY "deck_analysis_own" ON public.deck_analysis
  FOR ALL USING (
    deck_id IN (SELECT id FROM pitch_decks WHERE founder_id = auth.uid())
  );

CREATE POLICY "service_role_deck_analysis" ON public.deck_analysis
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- COACHING_SESSIONS (founder_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "coaching_sessions_own" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Service role full access coaching_sessions" ON public.coaching_sessions;
DROP POLICY IF EXISTS "service_role_coaching_sessions" ON public.coaching_sessions;

CREATE POLICY "coaching_sessions_own" ON public.coaching_sessions
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "service_role_coaching_sessions" ON public.coaching_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- FOUNDER_WATCHLIST (founder_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "founder_watchlist_own" ON public.founder_watchlist;
DROP POLICY IF EXISTS "Users can view own watchlist" ON public.founder_watchlist;
DROP POLICY IF EXISTS "Users can manage own watchlist" ON public.founder_watchlist;
DROP POLICY IF EXISTS "Service role full access founder_watchlist" ON public.founder_watchlist;
DROP POLICY IF EXISTS "service_role_founder_watchlist" ON public.founder_watchlist;

CREATE POLICY "founder_watchlist_own" ON public.founder_watchlist
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "service_role_founder_watchlist" ON public.founder_watchlist
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- WATCHLIST_ALERTS (user_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "watchlist_alerts_own" ON public.watchlist_alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON public.watchlist_alerts;
DROP POLICY IF EXISTS "Users can manage own alerts" ON public.watchlist_alerts;
DROP POLICY IF EXISTS "Service role full access watchlist_alerts" ON public.watchlist_alerts;
DROP POLICY IF EXISTS "service_role_watchlist_alerts" ON public.watchlist_alerts;

CREATE POLICY "watchlist_alerts_own" ON public.watchlist_alerts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_watchlist_alerts" ON public.watchlist_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- NOTIFICATION_PREFERENCES (user_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "notification_prefs_own" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can manage own notification prefs" ON public.notification_preferences;
DROP POLICY IF EXISTS "Service role full access notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "service_role_notification_prefs" ON public.notification_preferences;

CREATE POLICY "notification_prefs_own" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_notification_prefs" ON public.notification_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- FOUNDER_SDG_PROJECTIONS (founder_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "sdg_projections_own" ON public.founder_sdg_projections;
DROP POLICY IF EXISTS "Users can view own sdg projections" ON public.founder_sdg_projections;
DROP POLICY IF EXISTS "Users can manage own sdg projections" ON public.founder_sdg_projections;
DROP POLICY IF EXISTS "Service role full access founder_sdg_projections" ON public.founder_sdg_projections;
DROP POLICY IF EXISTS "service_role_sdg_projections" ON public.founder_sdg_projections;

CREATE POLICY "sdg_projections_own" ON public.founder_sdg_projections
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "service_role_sdg_projections" ON public.founder_sdg_projections
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- IMPACT_RETURNS_CALCULATED (founder_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "impact_returns_own" ON public.impact_returns_calculated;
DROP POLICY IF EXISTS "Founders can view own impact returns" ON public.impact_returns_calculated;
DROP POLICY IF EXISTS "Service role full access impact_returns_calculated" ON public.impact_returns_calculated;
DROP POLICY IF EXISTS "service_role_impact_returns" ON public.impact_returns_calculated;

CREATE POLICY "impact_returns_own" ON public.impact_returns_calculated
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "service_role_impact_returns" ON public.impact_returns_calculated
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- AI_FEEDBACK (via deck_id -> pitch_decks)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own ai feedback" ON public.ai_feedback;
DROP POLICY IF EXISTS "Service role full access ai_feedback" ON public.ai_feedback;
DROP POLICY IF EXISTS "ai_feedback_own" ON public.ai_feedback;
DROP POLICY IF EXISTS "service_role_ai_feedback" ON public.ai_feedback;

CREATE POLICY "ai_feedback_own" ON public.ai_feedback
  FOR ALL USING (
    deck_id IN (SELECT id FROM pitch_decks WHERE founder_id = auth.uid())
  );

CREATE POLICY "service_role_ai_feedback" ON public.ai_feedback
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- FOUNDER_INVESTOR_MATCHES (founder_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Founders can view own matches" ON public.founder_investor_matches;
DROP POLICY IF EXISTS "Founders can manage own matches" ON public.founder_investor_matches;
DROP POLICY IF EXISTS "Service role full access founder_investor_matches" ON public.founder_investor_matches;
DROP POLICY IF EXISTS "founder_investor_matches_own" ON public.founder_investor_matches;
DROP POLICY IF EXISTS "service_role_founder_investor_matches" ON public.founder_investor_matches;

CREATE POLICY "founder_investor_matches_own" ON public.founder_investor_matches
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "service_role_founder_investor_matches" ON public.founder_investor_matches
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- INVESTOR_PROFILES (founder_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own investor profile" ON public.investor_profiles;
DROP POLICY IF EXISTS "Users can manage own investor profile" ON public.investor_profiles;
DROP POLICY IF EXISTS "Public can view visible profiles" ON public.investor_profiles;
DROP POLICY IF EXISTS "Service role full access investor_profiles" ON public.investor_profiles;
DROP POLICY IF EXISTS "investor_profiles_own" ON public.investor_profiles;
DROP POLICY IF EXISTS "investor_profiles_public" ON public.investor_profiles;
DROP POLICY IF EXISTS "service_role_investor_profiles" ON public.investor_profiles;

CREATE POLICY "investor_profiles_own" ON public.investor_profiles
  FOR ALL USING (founder_id = auth.uid());

CREATE POLICY "investor_profiles_public" ON public.investor_profiles
  FOR SELECT USING (profile_visibility = 'public');

CREATE POLICY "service_role_investor_profiles" ON public.investor_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- INVESTOR_WATCHLIST (investor_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Investors can view own watchlist" ON public.investor_watchlist;
DROP POLICY IF EXISTS "Investors can manage own watchlist" ON public.investor_watchlist;
DROP POLICY IF EXISTS "Service role full access investor_watchlist" ON public.investor_watchlist;
DROP POLICY IF EXISTS "investor_watchlist_own" ON public.investor_watchlist;
DROP POLICY IF EXISTS "service_role_investor_watchlist" ON public.investor_watchlist;

CREATE POLICY "investor_watchlist_own" ON public.investor_watchlist
  FOR ALL USING (investor_id = auth.uid());

CREATE POLICY "service_role_investor_watchlist" ON public.investor_watchlist
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- INVESTOR_SDG_VALUATIONS (investor_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Investors can view own valuations" ON public.investor_sdg_valuations;
DROP POLICY IF EXISTS "Investors can manage own valuations" ON public.investor_sdg_valuations;
DROP POLICY IF EXISTS "Service role full access investor_sdg_valuations" ON public.investor_sdg_valuations;
DROP POLICY IF EXISTS "investor_sdg_valuations_own" ON public.investor_sdg_valuations;
DROP POLICY IF EXISTS "service_role_investor_sdg_valuations" ON public.investor_sdg_valuations;

CREATE POLICY "investor_sdg_valuations_own" ON public.investor_sdg_valuations
  FOR ALL USING (investor_id = auth.uid());

CREATE POLICY "service_role_investor_sdg_valuations" ON public.investor_sdg_valuations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- INVESTOR_NETWORK_WATCHLIST (investor_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Investors can view own network watchlist" ON public.investor_network_watchlist;
DROP POLICY IF EXISTS "Investors can manage own network watchlist" ON public.investor_network_watchlist;
DROP POLICY IF EXISTS "Service role full access investor_network_watchlist" ON public.investor_network_watchlist;
DROP POLICY IF EXISTS "investor_network_watchlist_own" ON public.investor_network_watchlist;
DROP POLICY IF EXISTS "service_role_investor_network_watchlist" ON public.investor_network_watchlist;

CREATE POLICY "investor_network_watchlist_own" ON public.investor_network_watchlist
  FOR ALL USING (investor_id = auth.uid());

CREATE POLICY "service_role_investor_network_watchlist" ON public.investor_network_watchlist
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- INVESTOR_DISCOVERY_SESSIONS (investor_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Investors can view own discovery sessions" ON public.investor_discovery_sessions;
DROP POLICY IF EXISTS "Investors can manage own discovery sessions" ON public.investor_discovery_sessions;
DROP POLICY IF EXISTS "Service role full access investor_discovery_sessions" ON public.investor_discovery_sessions;
DROP POLICY IF EXISTS "investor_discovery_sessions_own" ON public.investor_discovery_sessions;
DROP POLICY IF EXISTS "service_role_investor_discovery_sessions" ON public.investor_discovery_sessions;

CREATE POLICY "investor_discovery_sessions_own" ON public.investor_discovery_sessions
  FOR ALL USING (investor_id = auth.uid());

CREATE POLICY "service_role_investor_discovery_sessions" ON public.investor_discovery_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- IMPACT_MATCHING_SCORES (founder_id or investor_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own matching scores" ON public.impact_matching_scores;
DROP POLICY IF EXISTS "Service role full access impact_matching_scores" ON public.impact_matching_scores;
DROP POLICY IF EXISTS "impact_matching_scores_own" ON public.impact_matching_scores;
DROP POLICY IF EXISTS "service_role_impact_matching_scores" ON public.impact_matching_scores;

CREATE POLICY "impact_matching_scores_own" ON public.impact_matching_scores
  FOR ALL USING (founder_id = auth.uid() OR investor_id = auth.uid());

CREATE POLICY "service_role_impact_matching_scores" ON public.impact_matching_scores
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- VOICE_COACHING_SESSIONS (user_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own voice coaching" ON public.voice_coaching_sessions;
DROP POLICY IF EXISTS "Users can manage own voice coaching" ON public.voice_coaching_sessions;
DROP POLICY IF EXISTS "Service role full access voice_coaching_sessions" ON public.voice_coaching_sessions;
DROP POLICY IF EXISTS "voice_coaching_sessions_own" ON public.voice_coaching_sessions;
DROP POLICY IF EXISTS "service_role_voice_coaching_sessions" ON public.voice_coaching_sessions;

CREATE POLICY "voice_coaching_sessions_own" ON public.voice_coaching_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_voice_coaching_sessions" ON public.voice_coaching_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- VOICE_SESSIONS (user_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own voice sessions" ON public.voice_sessions;
DROP POLICY IF EXISTS "Users can manage own voice sessions" ON public.voice_sessions;
DROP POLICY IF EXISTS "Service role full access voice_sessions" ON public.voice_sessions;
DROP POLICY IF EXISTS "voice_sessions_own" ON public.voice_sessions;
DROP POLICY IF EXISTS "service_role_voice_sessions" ON public.voice_sessions;

CREATE POLICY "voice_sessions_own" ON public.voice_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_voice_sessions" ON public.voice_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- VOICE_FEEDBACK (user_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own voice feedback" ON public.voice_feedback;
DROP POLICY IF EXISTS "Service role full access voice_feedback" ON public.voice_feedback;
DROP POLICY IF EXISTS "voice_feedback_own" ON public.voice_feedback;
DROP POLICY IF EXISTS "service_role_voice_feedback" ON public.voice_feedback;

CREATE POLICY "voice_feedback_own" ON public.voice_feedback
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "service_role_voice_feedback" ON public.voice_feedback
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- VOICE_MESSAGES (via session_id -> voice_sessions)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own voice messages" ON public.voice_messages;
DROP POLICY IF EXISTS "Service role full access voice_messages" ON public.voice_messages;
DROP POLICY IF EXISTS "voice_messages_own" ON public.voice_messages;
DROP POLICY IF EXISTS "service_role_voice_messages" ON public.voice_messages;

CREATE POLICY "voice_messages_own" ON public.voice_messages
  FOR ALL USING (
    session_id IN (SELECT id FROM voice_sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "service_role_voice_messages" ON public.voice_messages
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- PITCH_VIDEOS (via deck_id -> pitch_decks)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own pitch videos" ON public.pitch_videos;
DROP POLICY IF EXISTS "Service role full access pitch_videos" ON public.pitch_videos;
DROP POLICY IF EXISTS "pitch_videos_own" ON public.pitch_videos;
DROP POLICY IF EXISTS "service_role_pitch_videos" ON public.pitch_videos;

CREATE POLICY "pitch_videos_own" ON public.pitch_videos
  FOR ALL USING (
    deck_id IN (SELECT id FROM pitch_decks WHERE founder_id = auth.uid())
  );

CREATE POLICY "service_role_pitch_videos" ON public.pitch_videos
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SCORE_HISTORY (via deck_id -> pitch_decks)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own score history" ON public.score_history;
DROP POLICY IF EXISTS "Service role full access score_history" ON public.score_history;
DROP POLICY IF EXISTS "score_history_own" ON public.score_history;
DROP POLICY IF EXISTS "service_role_score_history" ON public.score_history;

CREATE POLICY "score_history_own" ON public.score_history
  FOR ALL USING (
    deck_id IN (SELECT id FROM pitch_decks WHERE founder_id = auth.uid())
  );

CREATE POLICY "service_role_score_history" ON public.score_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- PROFILE_VIEWS (viewer_id or viewed_id = auth.uid())
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Users can insert profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Service role full access profile_views" ON public.profile_views;
DROP POLICY IF EXISTS "profile_views_own" ON public.profile_views;
DROP POLICY IF EXISTS "service_role_profile_views" ON public.profile_views;

CREATE POLICY "profile_views_own" ON public.profile_views
  FOR ALL USING (viewer_id = auth.uid() OR viewed_id = auth.uid());

CREATE POLICY "service_role_profile_views" ON public.profile_views
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- PUBLIC/READ-ONLY TABLES
-- ============================================================================

-- INVESTORS (public catalog)
DROP POLICY IF EXISTS "Authenticated users can view investors" ON public.investors;
DROP POLICY IF EXISTS "Service role full access investors" ON public.investors;
DROP POLICY IF EXISTS "investors_read" ON public.investors;
DROP POLICY IF EXISTS "service_role_investors" ON public.investors;

CREATE POLICY "investors_read" ON public.investors
  FOR SELECT USING (true);

CREATE POLICY "service_role_investors" ON public.investors
  FOR ALL USING (auth.role() = 'service_role');

-- SDG_VALUATIONS (public reference)
DROP POLICY IF EXISTS "Anyone can view sdg valuations" ON public.sdg_valuations;
DROP POLICY IF EXISTS "Service role full access sdg_valuations" ON public.sdg_valuations;
DROP POLICY IF EXISTS "sdg_valuations_read" ON public.sdg_valuations;
DROP POLICY IF EXISTS "service_role_sdg_valuations" ON public.sdg_valuations;

CREATE POLICY "sdg_valuations_read" ON public.sdg_valuations
  FOR SELECT USING (true);

CREATE POLICY "service_role_sdg_valuations" ON public.sdg_valuations
  FOR ALL USING (auth.role() = 'service_role');

-- KNOWLEDGE_BASE (public content)
DROP POLICY IF EXISTS "Anyone can view knowledge base" ON public.knowledge_base;
DROP POLICY IF EXISTS "Service role full access knowledge_base" ON public.knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_read" ON public.knowledge_base;
DROP POLICY IF EXISTS "service_role_knowledge_base" ON public.knowledge_base;

CREATE POLICY "knowledge_base_read" ON public.knowledge_base
  FOR SELECT USING (true);

CREATE POLICY "service_role_knowledge_base" ON public.knowledge_base
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- ADMIN-ONLY TABLES
-- ============================================================================

-- SUPERADMINS
DROP POLICY IF EXISTS "Service role full access superadmins" ON public.superadmins;
DROP POLICY IF EXISTS "service_role_superadmins" ON public.superadmins;

CREATE POLICY "service_role_superadmins" ON public.superadmins
  FOR ALL USING (auth.role() = 'service_role');

-- ADMIN_AUDIT_LOG
DROP POLICY IF EXISTS "Service role full access admin_audit_log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "service_role_admin_audit_log" ON public.admin_audit_log;

CREATE POLICY "service_role_admin_audit_log" ON public.admin_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- FEATURE_FLAGS
DROP POLICY IF EXISTS "Authenticated can read feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Service role full access feature_flags" ON public.feature_flags;
DROP POLICY IF EXISTS "feature_flags_read" ON public.feature_flags;
DROP POLICY IF EXISTS "service_role_feature_flags" ON public.feature_flags;

CREATE POLICY "feature_flags_read" ON public.feature_flags
  FOR SELECT USING (true);

CREATE POLICY "service_role_feature_flags" ON public.feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- GLOBAL_SETTINGS
DROP POLICY IF EXISTS "Anyone can read public settings" ON public.global_settings;
DROP POLICY IF EXISTS "Service role full access global_settings" ON public.global_settings;
DROP POLICY IF EXISTS "global_settings_read" ON public.global_settings;
DROP POLICY IF EXISTS "service_role_global_settings" ON public.global_settings;

CREATE POLICY "global_settings_read" ON public.global_settings
  FOR SELECT USING (is_public = true);

CREATE POLICY "service_role_global_settings" ON public.global_settings
  FOR ALL USING (auth.role() = 'service_role');

-- SYSTEM_METRICS
DROP POLICY IF EXISTS "Service role full access system_metrics" ON public.system_metrics;
DROP POLICY IF EXISTS "service_role_system_metrics" ON public.system_metrics;

CREATE POLICY "service_role_system_metrics" ON public.system_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
`;

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectName, region = 'ap-southeast-2', skipRLS = false } = body;

    if (!projectName) {
      return NextResponse.json({ error: 'Project name required' }, { status: 400 });
    }

    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    const orgId = body.organizationId || process.env.SUPABASE_ORG_ID;

    if (!accessToken || !orgId) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').slice(0, 40);
    console.log(`[CreateSupabase] Project: ${safeName}`);

    // ========================================================================
    // Check if project already exists
    // ========================================================================
    const listRes = await fetch(`${SUPABASE_API}/projects`, { headers });
    if (listRes.ok) {
      const projects = await listRes.json();
      const existing = projects.find((p: any) => p.name === safeName);

      if (existing) {
        console.log(`[CreateSupabase] Already exists: ${existing.id}, status: ${existing.status}`);

        // Wait for existing project to be ready if needed
        if (existing.status !== 'ACTIVE_HEALTHY') {
          console.log(`[CreateSupabase] Waiting for existing project to be ready...`);
          for (let i = 0; i < 24; i++) {
            await sleep(5000);
            const statusRes = await fetch(`${SUPABASE_API}/projects/${existing.id}`, { headers });
            if (statusRes.ok) {
              const status = await statusRes.json();
              console.log(`[CreateSupabase] Status: ${status.status}`);
              if (status.status === 'ACTIVE_HEALTHY') break;
            }
          }
        }

        // Get keys
        const keysRes = await fetch(`${SUPABASE_API}/projects/${existing.id}/api-keys`, { headers });
        if (keysRes.ok) {
          const keys = await keysRes.json();
          const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key || '';
          const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key || '';

          return NextResponse.json({
            success: true,
            alreadyExists: true,
            projectRef: existing.id,
            projectId: existing.id,
            url: `https://${existing.id}.supabase.co`,
            anonKey,
            serviceKey,
            serviceRoleKey: serviceKey,
          });
        }
      }
    }

    // ========================================================================
    // Create new project
    // ========================================================================
    const dbPassword = generatePassword();
    console.log(`[CreateSupabase] Creating new project...`);

    const createRes = await fetch(`${SUPABASE_API}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: safeName,
        organization_id: orgId,
        db_pass: dbPassword,
        region,
        plan: 'free',
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      console.error('[CreateSupabase] Create failed:', error);
      return NextResponse.json({ error: `Failed to create: ${error}` }, { status: 500 });
    }

    const project = await createRes.json();
    const projectRef = project.id;
    console.log(`[CreateSupabase] Created: ${projectRef}`);

    // ========================================================================
    // Wait for ACTIVE_HEALTHY status (max 2 minutes)
    // ========================================================================
    console.log(`[CreateSupabase] Waiting for ACTIVE_HEALTHY...`);

    let isReady = false;
    for (let i = 0; i < 24; i++) {
      await sleep(5000);

      const statusRes = await fetch(`${SUPABASE_API}/projects/${projectRef}`, { headers });
      if (statusRes.ok) {
        const status = await statusRes.json();
        console.log(`[CreateSupabase] Status (${i + 1}/24): ${status.status}`);

        if (status.status === 'ACTIVE_HEALTHY') {
          isReady = true;
          console.log(`[CreateSupabase] Project ready!`);
          break;
        }
      }
    }

    if (!isReady) {
      console.warn(`[CreateSupabase] Project not fully ready after 2 minutes, proceeding anyway...`);
    }

    // ========================================================================
    // Get API keys
    // ========================================================================
    console.log(`[CreateSupabase] Getting API keys...`);

    let anonKey = '';
    let serviceKey = '';

    for (let i = 0; i < 5; i++) {
      const keysRes = await fetch(`${SUPABASE_API}/projects/${projectRef}/api-keys`, { headers });

      if (keysRes.ok) {
        const keys = await keysRes.json();
        anonKey = keys.find((k: any) => k.name === 'anon')?.api_key || '';
        serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key || '';

        if (anonKey && serviceKey) {
          console.log(`[CreateSupabase] Keys retrieved!`);
          break;
        }
      }

      await sleep(2000);
    }

    if (!serviceKey) {
      return NextResponse.json({
        error: 'Project created but keys not available. Try again.'
      }, { status: 500 });
    }

    // ========================================================================
    // Run RLS Policies
    // ========================================================================
    let rlsSuccess = false;
    let rlsError = '';

    if (!skipRLS) {
      console.log(`[CreateSupabase] Applying RLS policies...`);

      try {
        const rlsRes = await fetch(`${SUPABASE_API}/projects/${projectRef}/database/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: RLS_POLICIES_SQL }),
        });

        if (rlsRes.ok) {
          console.log(`[CreateSupabase] RLS policies applied successfully!`);
          rlsSuccess = true;
        } else {
          const rlsErrorText = await rlsRes.text();
          console.error(`[CreateSupabase] RLS failed:`, rlsErrorText);
          rlsError = rlsErrorText;
        }
      } catch (rlsErr: any) {
        console.error(`[CreateSupabase] RLS exception:`, rlsErr);
        rlsError = rlsErr.message;
      }
    }

    // ========================================================================
    // Return
    // ========================================================================
    return NextResponse.json({
      success: true,
      projectRef,
      projectId: projectRef,
      url: `https://${projectRef}.supabase.co`,
      anonKey,
      serviceKey,
      serviceRoleKey: serviceKey,
      dbPassword,
      region,
      ready: isReady,
      rlsSuccess,
      rlsError: rlsError || undefined,
    });

  } catch (error: any) {
    console.error('[CreateSupabase] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'create-supabase',
    description: 'Creates Supabase project, waits for ACTIVE_HEALTHY, applies RLS policies',
    maxWait: '2 minutes',
    mainTable: 'founders (id = auth.uid())',
    rlsPattern: 'Simplified - uses auth.uid() directly, no auth.users lookup',
  });
}
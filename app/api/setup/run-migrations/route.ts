// app/api/setup/run-migrations/route.ts
// ============================================================================
// RUN MIGRATIONS - Full RaiseReady Impact Schema (33 tables + views)
// Matches child template's types/supabase.ts exactly
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const CLIENT_SCHEMA = `
-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Founders (main user table for founders)
CREATE TABLE IF NOT EXISTS founders (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  country text,
  impact_focus text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_role text DEFAULT 'founder'::text,
  founder_type text,
  funding_stage text,
  target_market text,
  team_size integer,
  has_revenue boolean DEFAULT false,
  has_customers boolean DEFAULT false,
  has_prototype boolean DEFAULT false,
  has_domain_expertise boolean DEFAULT false,
  has_startup_experience boolean DEFAULT false,
  company_name text,
  tagline text,
  problem_statement text,
  solution_statement text,
  traction_details text,
  team_background text,
  funding_ask_amount text,
  funding_ask_stage text,
  use_of_funds text,
  profile_completed_at timestamp with time zone
);

-- Superadmins
CREATE TABLE IF NOT EXISTS superadmins (
  id uuid NOT NULL PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  permissions jsonb DEFAULT '{"edit_users": true, "delete_users": true, "view_all_users": true, "view_analytics": true, "manage_features": true, "manage_settings": true, "view_financials": true, "impersonate_users": true}'::jsonb,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Founder Profiles (extended discovery data)
CREATE TABLE IF NOT EXISTS founder_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  founder_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  founder_type text,
  motivation text,
  personal_story text,
  dream_outcome text,
  target_market text,
  problem_passion text,
  team_background jsonb,
  team_gaps text[],
  funding_stage text,
  funding_motivation text,
  ideal_investor_type text[],
  discovery_completeness integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  discovery_questions jsonb,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(founder_id)
);

-- Investor Profiles
CREATE TABLE IF NOT EXISTS investor_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  firm text,
  focus_areas text[],
  check_size_min integer,
  check_size_max integer,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  founder_id uuid REFERENCES founders(id) ON DELETE SET NULL,
  organization_name text,
  investor_type text,
  website_url text,
  linkedin_url text,
  min_ticket_size bigint,
  max_ticket_size bigint,
  stages text[],
  sectors text[],
  geographies text[],
  investment_philosophy text,
  deal_breakers text,
  ideal_founder_profile text,
  target_financial_return numeric,
  target_impact_return numeric,
  priority_sdgs integer[],
  profile_visibility text DEFAULT 'platform-only'::text,
  show_portfolio boolean DEFAULT true,
  show_contact_info boolean DEFAULT false,
  show_investment_activity boolean DEFAULT true,
  allow_direct_contact boolean DEFAULT false
);

-- Investors (directory/catalog)
CREATE TABLE IF NOT EXISTS investors (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  website text,
  geography text[],
  sectors text[],
  sdgs text[],
  stage text[],
  ticket_size text[],
  investment_types text[],
  business_models text[],
  portfolio_size integer,
  rating numeric,
  response_rate numeric,
  avg_time_to_decision integer,
  successful_matches integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  min_readiness_score integer DEFAULT 70,
  discovered_via_ai boolean DEFAULT false,
  discovery_session_id uuid
);

-- ============================================================================
-- PITCH DECKS & ANALYSIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pitch_decks (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  founder_id uuid REFERENCES founders(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  status text DEFAULT 'uploaded'::text,
  readiness_score integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  version integer DEFAULT 1,
  previous_version_id uuid REFERENCES pitch_decks(id),
  is_latest boolean DEFAULT true,
  visibility text DEFAULT 'platform-only'::text,
  one_liner text,
  sectors text[],
  funding_stage text,
  funding_goal bigint,
  target_market text,
  sdgs integer[],
  parent_deck_id uuid REFERENCES pitch_decks(id),
  improvement_notes text,
  version_notes text,
  file_name text,
  raw_text text,
  analyzed_at timestamp with time zone,
  file_size bigint
);

CREATE TABLE IF NOT EXISTS deck_analysis (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id uuid REFERENCES pitch_decks(id) ON DELETE CASCADE,
  analysis_type text,
  scores jsonb,
  strengths text[],
  weaknesses text[],
  recommendations text[],
  created_at timestamp with time zone DEFAULT now(),
  improvement_suggestions jsonb,
  progress_notes text
);

CREATE TABLE IF NOT EXISTS score_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id uuid REFERENCES pitch_decks(id) ON DELETE CASCADE,
  version integer,
  overall_score integer,
  scores jsonb,
  improvements text[],
  regressions text[],
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pitch_videos (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id uuid REFERENCES pitch_decks(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  transcript jsonb,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- COACHING SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS coaching_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id uuid REFERENCES pitch_decks(id) ON DELETE SET NULL,
  coach_type text DEFAULT 'primary'::text,
  conversation jsonb DEFAULT '[]'::jsonb,
  feedback_summary text,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  current_mode text DEFAULT 'discovery'::text,
  phase_completed jsonb DEFAULT '{"verbal": false, "discovery": false, "materials": false, "assessment": false}'::jsonb,
  focus_areas text[] DEFAULT '{}'::text[],
  founder_id uuid REFERENCES founders(id) ON DELETE CASCADE,
  session_type text DEFAULT 'materials_improvement'::text,
  context jsonb DEFAULT '{}'::jsonb,
  message_count integer DEFAULT 0,
  last_activity timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id uuid REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  deck_id uuid REFERENCES pitch_decks(id) ON DELETE CASCADE,
  slide_number integer,
  feedback_type text,
  original_content text,
  suggestion text,
  reasoning text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_discovery_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  investor_id uuid,
  conversation jsonb,
  extracted_criteria jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- ============================================================================
-- VOICE COACHING
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid,
  coaching_mode text NOT NULL,
  investor_persona text,
  status text NOT NULL DEFAULT 'active'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  audio_url text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_feedback (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES voice_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  project_id uuid,
  overall_score integer,
  strengths text[],
  improvements text[],
  sdg_alignment_score integer,
  sdg_alignment_feedback text,
  impact_clarity_score integer,
  impact_clarity_feedback text,
  financial_logic_score integer,
  financial_logic_feedback text,
  delivery_quality_score integer,
  delivery_quality_feedback text,
  recommendations text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_coaching_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_type text NOT NULL,
  coaching_mode text NOT NULL,
  investor_persona text,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  audio_url text,
  video_url text,
  feedback jsonb,
  metrics jsonb,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  pitch_deck_id uuid REFERENCES pitch_decks(id) ON DELETE SET NULL
);

-- ============================================================================
-- MATCHING & IMPACT
-- ============================================================================

CREATE TABLE IF NOT EXISTS founder_investor_matches (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  founder_id uuid REFERENCES founders(id) ON DELETE CASCADE,
  investor_id uuid,
  deck_id uuid REFERENCES pitch_decks(id) ON DELETE SET NULL,
  match_score numeric,
  match_reasons jsonb,
  status text,
  founder_interest text,
  investor_response text,
  suggested_at timestamp with time zone DEFAULT now(),
  contacted_at timestamp with time zone,
  responded_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS impact_matching_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  founder_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  pitch_deck_id uuid REFERENCES pitch_decks(id) ON DELETE SET NULL,
  overall_match_score integer,
  financial_match_score integer,
  impact_match_score integer,
  sdg_alignment_score integer,
  match_tier text,
  sdg_overlap jsonb,
  mismatch_reasons jsonb,
  investor_viewed boolean DEFAULT false,
  investor_response text,
  investor_response_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- SDG & IMPACT VALUATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS sdg_valuations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sdg_number integer NOT NULL,
  sdg_name text NOT NULL,
  sdg_category text,
  indicator_name text NOT NULL,
  measurement_description text NOT NULL,
  measurement_unit text NOT NULL,
  default_unit_value_usd numeric NOT NULL,
  valuation_rationale text,
  data_sources text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_sdg_projections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  pitch_deck_id uuid REFERENCES pitch_decks(id) ON DELETE SET NULL,
  sdg_number integer NOT NULL,
  projected_units numeric NOT NULL,
  unit_type text NOT NULL,
  projection_period_years integer DEFAULT 5,
  baseline_description text,
  measurement_methodology text,
  data_sources text,
  confidence_level text,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES founders(id),
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS investor_sdg_valuations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  sdg_number integer NOT NULL,
  custom_unit_value_usd numeric NOT NULL,
  custom_rationale text,
  importance_weight integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_returns_calculated (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  pitch_deck_id uuid REFERENCES pitch_decks(id) ON DELETE SET NULL,
  total_investment_usd numeric,
  impact_investment_usd numeric,
  profit_investment_usd numeric,
  projected_financial_return_pct numeric,
  projected_financial_return_annual_pct numeric,
  total_impact_value_usd numeric,
  impact_return_pct numeric,
  impact_return_annual_pct numeric,
  blended_return_total_pct numeric,
  blended_return_annual_pct numeric,
  sdg_breakdown jsonb,
  calculation_date timestamp with time zone DEFAULT now(),
  valuation_framework_version text DEFAULT 'RealChange v2'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- WATCHLISTS & ALERTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS founder_watchlist (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  founder_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  notes text,
  tags text[],
  last_viewed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS investor_watchlist (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  investor_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  founder_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  added_at timestamp with time zone DEFAULT now(),
  notes text,
  tags text[],
  last_viewed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS investor_network_watchlist (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  investor_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  target_investor_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  reason text,
  notes text,
  added_at timestamp with time zone DEFAULT now(),
  last_viewed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS watchlist_alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS profile_views (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  viewer_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  viewed_id uuid NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  viewed_type text NOT NULL,
  viewed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES founders(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  alert_score_change boolean DEFAULT true,
  alert_project_update boolean DEFAULT true,
  alert_funding_stage boolean DEFAULT true,
  alert_milestone boolean DEFAULT false,
  alert_status_change boolean DEFAULT true,
  alert_criteria_update boolean DEFAULT true,
  alert_new_investment boolean DEFAULT false,
  alert_portfolio_addition boolean DEFAULT true,
  alert_ticket_change boolean DEFAULT true,
  alert_new_match boolean DEFAULT true,
  alert_profile_view boolean DEFAULT false,
  digest_frequency text DEFAULT 'realtime'::text,
  digest_time time without time zone DEFAULT '09:00:00'::time without time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- ADMIN & SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES superadmins(id),
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  changes jsonb,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key text NOT NULL UNIQUE,
  flag_name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0,
  enabled_for_users text[],
  enabled_for_roles text[],
  metadata jsonb,
  created_by uuid REFERENCES superadmins(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  setting_type text NOT NULL,
  category text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  last_updated_by uuid REFERENCES superadmins(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date date NOT NULL UNIQUE,
  total_users integer DEFAULT 0,
  total_founders integer DEFAULT 0,
  total_investors integer DEFAULT 0,
  total_projects integer DEFAULT 0,
  active_users_7d integer DEFAULT 0,
  active_users_30d integer DEFAULT 0,
  new_signups_today integer DEFAULT 0,
  total_matches integer DEFAULT 0,
  total_watchlist_items integer DEFAULT 0,
  total_notifications_sent integer DEFAULT 0,
  storage_used_mb numeric DEFAULT 0,
  api_calls_today integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  category text NOT NULL,
  tags text[],
  founder_types text[],
  source_url text,
  source_type text,
  author text,
  published_date date,
  relevance_score numeric DEFAULT 0,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_discovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_investor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_matching_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sdg_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_sdg_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_sdg_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_returns_calculated ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_network_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Founders access own data
-- ============================================================================

-- Founders table - access by email match
DROP POLICY IF EXISTS "founders_own_data" ON founders;
CREATE POLICY "founders_own_data" ON founders FOR ALL USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Founder profiles
DROP POLICY IF EXISTS "founder_profiles_own" ON founder_profiles;
CREATE POLICY "founder_profiles_own" ON founder_profiles FOR ALL USING (
  founder_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Pitch decks
DROP POLICY IF EXISTS "pitch_decks_own" ON pitch_decks;
CREATE POLICY "pitch_decks_own" ON pitch_decks FOR ALL USING (
  founder_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Deck analysis
DROP POLICY IF EXISTS "deck_analysis_own" ON deck_analysis;
CREATE POLICY "deck_analysis_own" ON deck_analysis FOR ALL USING (
  deck_id IN (SELECT id FROM pitch_decks WHERE founder_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())))
);

-- Coaching sessions
DROP POLICY IF EXISTS "coaching_sessions_own" ON coaching_sessions;
CREATE POLICY "coaching_sessions_own" ON coaching_sessions FOR ALL USING (
  founder_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Voice sessions
DROP POLICY IF EXISTS "voice_sessions_own" ON voice_sessions;
CREATE POLICY "voice_sessions_own" ON voice_sessions FOR ALL USING (
  user_id = auth.uid()
);

-- Voice coaching sessions
DROP POLICY IF EXISTS "voice_coaching_own" ON voice_coaching_sessions;
CREATE POLICY "voice_coaching_own" ON voice_coaching_sessions FOR ALL USING (
  user_id = auth.uid()
);

-- Founder watchlist
DROP POLICY IF EXISTS "founder_watchlist_own" ON founder_watchlist;
CREATE POLICY "founder_watchlist_own" ON founder_watchlist FOR ALL USING (
  founder_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Watchlist alerts
DROP POLICY IF EXISTS "watchlist_alerts_own" ON watchlist_alerts;
CREATE POLICY "watchlist_alerts_own" ON watchlist_alerts FOR ALL USING (
  user_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Notification preferences
DROP POLICY IF EXISTS "notification_prefs_own" ON notification_preferences;
CREATE POLICY "notification_prefs_own" ON notification_preferences FOR ALL USING (
  user_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- SDG projections
DROP POLICY IF EXISTS "sdg_projections_own" ON founder_sdg_projections;
CREATE POLICY "sdg_projections_own" ON founder_sdg_projections FOR ALL USING (
  founder_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Impact returns
DROP POLICY IF EXISTS "impact_returns_own" ON impact_returns_calculated;
CREATE POLICY "impact_returns_own" ON impact_returns_calculated FOR ALL USING (
  founder_id IN (SELECT id FROM founders WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Superadmins
DROP POLICY IF EXISTS "superadmins_self" ON superadmins;
CREATE POLICY "superadmins_self" ON superadmins FOR SELECT USING (id = auth.uid());

-- Public read for SDG valuations
DROP POLICY IF EXISTS "sdg_valuations_public" ON sdg_valuations;
CREATE POLICY "sdg_valuations_public" ON sdg_valuations FOR SELECT USING (true);

-- Public read for investors directory
DROP POLICY IF EXISTS "investors_public_read" ON investors;
CREATE POLICY "investors_public_read" ON investors FOR SELECT USING (true);

-- Public read for knowledge base
DROP POLICY IF EXISTS "knowledge_base_public" ON knowledge_base;
CREATE POLICY "knowledge_base_public" ON knowledge_base FOR SELECT USING (true);

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'pitch-decks', 
  'pitch-decks', 
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "pitch_decks_upload" ON storage.objects;
CREATE POLICY "pitch_decks_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'pitch-decks' AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "pitch_decks_select" ON storage.objects;
CREATE POLICY "pitch_decks_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'pitch-decks' AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "pitch_decks_delete" ON storage.objects;
CREATE POLICY "pitch_decks_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'pitch-decks' AND auth.uid() IS NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_founders_email ON founders(email);
CREATE INDEX IF NOT EXISTS idx_founders_company ON founders(company_name);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_founder ON pitch_decks(founder_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_status ON pitch_decks(status);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_founder ON coaching_sessions(founder_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_watchlist_founder ON founder_watchlist(founder_id);
CREATE INDEX IF NOT EXISTS idx_investor_watchlist_investor ON investor_watchlist(investor_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_alerts_user ON watchlist_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_impact_matching_investor ON impact_matching_scores(investor_id);
CREATE INDEX IF NOT EXISTS idx_impact_matching_founder ON impact_matching_scores(founder_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_superadmin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM superadmins 
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseServiceKey } = await request.json();

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase URL and service key required' }, { status: 400 });
    }

    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) {
      return NextResponse.json({ error: 'Invalid Supabase URL' }, { status: 400 });
    }

    const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!supabaseToken) {
      return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    console.log(`[run-migrations] Applying full RaiseReady schema to ${projectRef}...`);

    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: CLIENT_SCHEMA }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`[run-migrations] Failed:`, error);
      return NextResponse.json({ error: error || 'Migration failed' }, { status: 500 });
    }

    console.log(`[run-migrations] Success - 33 tables created!`);

    return NextResponse.json({
      success: true,
      version: 'v3-full-raiseready',
      tablesCreated: [
        'founders', 'superadmins', 'founder_profiles', 'investor_profiles', 'investors',
        'pitch_decks', 'deck_analysis', 'score_history', 'pitch_videos',
        'coaching_sessions', 'ai_feedback', 'investor_discovery_sessions',
        'voice_sessions', 'voice_messages', 'voice_feedback', 'voice_coaching_sessions',
        'founder_investor_matches', 'impact_matching_scores',
        'sdg_valuations', 'founder_sdg_projections', 'investor_sdg_valuations', 'impact_returns_calculated',
        'founder_watchlist', 'investor_watchlist', 'investor_network_watchlist', 'watchlist_alerts',
        'profile_views', 'notification_preferences',
        'admin_audit_log', 'feature_flags', 'global_settings', 'system_metrics', 'knowledge_base'
      ],
      bucketCreated: 'pitch-decks',
      rlsPoliciesApplied: true
    });

  } catch (error: any) {
    console.error(`[run-migrations] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'run-migrations',
    version: 'v3-full-raiseready',
    tables: 33,
    description: 'Creates complete RaiseReady Impact schema matching child template'
  });
}
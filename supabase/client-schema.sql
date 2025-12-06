-- =============================================================================
-- RAISEREADY CLIENT PLATFORM SCHEMA
-- =============================================================================
-- Database: {client-name}-pitch (e.g., acme-pitch)
-- Purpose: Full platform schema for a client's pitch coaching platform
-- Run: Automatically via Supabase Management API during client creation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- USER ROLES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('founder', 'portal_admin', 'team_member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- -----------------------------------------------------------------------------
-- INVESTOR PROFILES TABLE (for the portal admin / investor)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  position TEXT,
  linkedin_url TEXT,
  
  -- Company info
  company_name TEXT,
  company_website TEXT,
  company_description TEXT,
  
  -- Investment thesis
  thesis JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "philosophy": "...", "sectors": [...], "stages": [...], "geographies": [...], "ticketSize": {...} }
  
  -- Branding/theme extracted from website
  branding JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "primary": "#xxx", "accent": "#xxx", "logo": "..." }
  
  -- AI coaching preferences
  coaching_config JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "coachName": "Sarah", "personality": "...", "scoringFocus": "storytelling" }
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- -----------------------------------------------------------------------------
-- FOUNDER PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS founder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  
  -- Company info
  company_name TEXT,
  company_website TEXT,
  company_description TEXT,
  
  -- Startup details
  sector TEXT,
  stage TEXT,
  geography TEXT,
  funding_target TEXT,
  
  -- Readiness tracking
  readiness_score INTEGER DEFAULT 0,
  readiness_level TEXT DEFAULT 'not-ready',
  
  -- Journey progress
  journey_stage TEXT DEFAULT 'upload',
  journey_completed JSONB DEFAULT '[]'::jsonb,
  
  -- Discovery session data
  discovery_completed BOOLEAN DEFAULT false,
  discovery_data JSONB DEFAULT '{}'::jsonb,
  
  -- Profile completeness
  profile_completeness INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),
  UNIQUE(email)
);

-- -----------------------------------------------------------------------------
-- PITCH DECKS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pitch_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  
  -- File info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  previous_version_id UUID REFERENCES pitch_decks(id),
  
  -- AI analysis
  analysis JSONB DEFAULT '{}'::jsonb,
  -- Structure: { "summary": "...", "strengths": [...], "weaknesses": [...], "scores": {...} }
  
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  analyzed_at TIMESTAMPTZ,
  
  -- Scores
  overall_score INTEGER,
  narrative_score INTEGER,
  problem_score INTEGER,
  solution_score INTEGER,
  market_score INTEGER,
  traction_score INTEGER,
  team_score INTEGER,
  financials_score INTEGER,
  
  -- Visibility
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'preview', 'full')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- COACHING SESSIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES pitch_decks(id) ON DELETE SET NULL,
  
  -- Session type
  session_type TEXT NOT NULL CHECK (session_type IN ('discovery', 'materials', 'practice', 'simulation')),
  
  -- Session data
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  
  -- Outcomes
  summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  insights JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- VOICE COACHING SESSIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  
  -- ElevenLabs session
  elevenlabs_conversation_id TEXT,
  
  -- Session type
  session_type TEXT DEFAULT 'practice' CHECK (session_type IN ('practice', 'simulation')),
  investor_persona TEXT, -- For simulation mode
  
  -- Transcript and analysis
  transcript JSONB DEFAULT '[]'::jsonb,
  analysis JSONB DEFAULT '{}'::jsonb,
  
  -- Scores
  overall_score INTEGER,
  clarity_score INTEGER,
  confidence_score INTEGER,
  engagement_score INTEGER,
  
  -- Feedback
  feedback TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  
  -- Duration
  duration_seconds INTEGER,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- WATCHLIST TABLE (investor watching founders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES investor_profiles(id) ON DELETE CASCADE,
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'watching' CHECK (status IN ('watching', 'contacted', 'meeting_scheduled', 'passed', 'invested')),
  
  -- Notes
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Tracking
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,
  status_changed_at TIMESTAMPTZ,
  
  UNIQUE(investor_id, founder_id)
);

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'action')),
  
  -- Link
  action_url TEXT,
  action_label TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- FEEDBACK REQUESTS TABLE (founder requesting feedback)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES pitch_decks(id) ON DELETE CASCADE,
  
  -- Request details
  message TEXT,
  areas_of_focus JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'responded')),
  
  -- Response
  response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- MATERIALS IMPROVEMENTS TABLE (AI-suggested improvements)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES pitch_decks(id) ON DELETE SET NULL,
  session_id UUID REFERENCES coaching_sessions(id) ON DELETE SET NULL,
  
  -- Improvement details
  category TEXT NOT NULL, -- 'narrative', 'slide', 'data', 'design'
  section TEXT, -- Which part of the deck
  
  original_content TEXT,
  suggested_content TEXT,
  reasoning TEXT,
  
  -- Priority
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  
  -- Status
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'accepted', 'rejected', 'implemented')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- ACTIVITY LOG TABLE (audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Activity details
  action TEXT NOT NULL,
  entity_type TEXT, -- 'deck', 'session', 'profile', etc.
  entity_id UUID,
  
  -- Context
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

CREATE INDEX IF NOT EXISTS idx_founder_profiles_user_id ON founder_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_email ON founder_profiles(email);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_readiness ON founder_profiles(readiness_score DESC);

CREATE INDEX IF NOT EXISTS idx_pitch_decks_founder_id ON pitch_decks(founder_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_is_current ON pitch_decks(is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_founder_id ON coaching_sessions(founder_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_type ON coaching_sessions(session_type);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_founder_id ON voice_sessions(founder_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_investor_id ON watchlist(investor_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_founder_id ON watchlist(founder_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- -----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investor_profiles_updated_at BEFORE UPDATE ON investor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_founder_profiles_updated_at BEFORE UPDATE ON founder_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pitch_decks_updated_at BEFORE UPDATE ON pitch_decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coaching_sessions_updated_at BEFORE UPDATE ON coaching_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS POLICIES: USER ROLES
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role full access user_roles" ON user_roles FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: INVESTOR PROFILES
-- -----------------------------------------------------------------------------
CREATE POLICY "Investors can view own profile" ON investor_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Investors can update own profile" ON investor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access investor_profiles" ON investor_profiles FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: FOUNDER PROFILES
-- -----------------------------------------------------------------------------
CREATE POLICY "Founders can view own profile" ON founder_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Founders can update own profile" ON founder_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Investors can view founder profiles" ON founder_profiles FOR SELECT 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'portal_admin'));
CREATE POLICY "Service role full access founder_profiles" ON founder_profiles FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: PITCH DECKS
-- -----------------------------------------------------------------------------
CREATE POLICY "Founders can view own decks" ON pitch_decks FOR SELECT 
  USING (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can create decks" ON pitch_decks FOR INSERT 
  WITH CHECK (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can update own decks" ON pitch_decks FOR UPDATE 
  USING (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Investors can view decks" ON pitch_decks FOR SELECT 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'portal_admin'));
CREATE POLICY "Service role full access pitch_decks" ON pitch_decks FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: COACHING SESSIONS
-- -----------------------------------------------------------------------------
CREATE POLICY "Founders can view own sessions" ON coaching_sessions FOR SELECT 
  USING (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can create sessions" ON coaching_sessions FOR INSERT 
  WITH CHECK (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can update own sessions" ON coaching_sessions FOR UPDATE 
  USING (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access coaching_sessions" ON coaching_sessions FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: VOICE SESSIONS
-- -----------------------------------------------------------------------------
CREATE POLICY "Founders can view own voice sessions" ON voice_sessions FOR SELECT 
  USING (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can create voice sessions" ON voice_sessions FOR INSERT 
  WITH CHECK (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access voice_sessions" ON voice_sessions FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: WATCHLIST
-- -----------------------------------------------------------------------------
CREATE POLICY "Investors can view own watchlist" ON watchlist FOR SELECT 
  USING (investor_id IN (SELECT id FROM investor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Investors can manage own watchlist" ON watchlist FOR ALL 
  USING (investor_id IN (SELECT id FROM investor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access watchlist" ON watchlist FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access notifications" ON notifications FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: FEEDBACK REQUESTS
-- -----------------------------------------------------------------------------
CREATE POLICY "Founders can view own feedback requests" ON feedback_requests FOR SELECT 
  USING (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can create feedback requests" ON feedback_requests FOR INSERT 
  WITH CHECK (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Investors can view feedback requests" ON feedback_requests FOR SELECT 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'portal_admin'));
CREATE POLICY "Service role full access feedback_requests" ON feedback_requests FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: MATERIALS IMPROVEMENTS
-- -----------------------------------------------------------------------------
CREATE POLICY "Founders can view own improvements" ON materials_improvements FOR SELECT 
  USING (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can update own improvements" ON materials_improvements FOR UPDATE 
  USING (founder_id IN (SELECT id FROM founder_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access materials_improvements" ON materials_improvements FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- RLS POLICIES: ACTIVITY LOG
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own activity" ON activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Investors can view all activity" ON activity_log FOR SELECT 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'portal_admin'));
CREATE POLICY "Service role full access activity_log" ON activity_log FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Get user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM user_roles WHERE user_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate founder readiness
CREATE OR REPLACE FUNCTION calculate_founder_readiness(p_founder_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_profile founder_profiles%ROWTYPE;
  v_deck pitch_decks%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM founder_profiles WHERE id = p_founder_id;
  SELECT * INTO v_deck FROM pitch_decks WHERE founder_id = p_founder_id AND is_current = true;
  
  -- Profile completeness (30%)
  IF v_profile.company_name IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_profile.company_description IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_profile.sector IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_profile.stage IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_profile.linkedin_url IS NOT NULL THEN v_score := v_score + 5; END IF;
  IF v_profile.discovery_completed THEN v_score := v_score + 5; END IF;
  
  -- Deck score (70%)
  IF v_deck.overall_score IS NOT NULL THEN
    v_score := v_score + (v_deck.overall_score * 0.7)::INTEGER;
  END IF;
  
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update readiness score trigger
CREATE OR REPLACE FUNCTION update_founder_readiness()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE founder_profiles
  SET 
    readiness_score = calculate_founder_readiness(NEW.founder_id),
    readiness_level = CASE
      WHEN calculate_founder_readiness(NEW.founder_id) >= 80 THEN 'investor-ready'
      WHEN calculate_founder_readiness(NEW.founder_id) >= 60 THEN 'almost-ready'
      WHEN calculate_founder_readiness(NEW.founder_id) >= 40 THEN 'needs-work'
      ELSE 'not-ready'
    END
  WHERE id = NEW.founder_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_readiness_on_deck_analysis
  AFTER UPDATE OF overall_score ON pitch_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_founder_readiness();

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
-- Run these separately in the Supabase dashboard or via API:
-- 
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pitch-decks', 'pitch-decks', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true);
--
-- =============================================================================

-- =============================================================================
-- SEED: CREATE PORTAL ADMIN USER
-- =============================================================================
-- This will be run by the automation with the client admin's email:
--
-- INSERT INTO auth.users (email, ...) VALUES ('{{ADMIN_EMAIL}}', ...);
-- INSERT INTO user_roles (user_id, role) VALUES ((SELECT id FROM auth.users WHERE email = '{{ADMIN_EMAIL}}'), 'portal_admin');
-- INSERT INTO investor_profiles (user_id, first_name, last_name, email, company_name)
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = '{{ADMIN_EMAIL}}'),
--   '{{ADMIN_FIRST_NAME}}',
--   '{{ADMIN_LAST_NAME}}',
--   '{{ADMIN_EMAIL}}',
--   '{{COMPANY_NAME}}'
-- );
--
-- =============================================================================

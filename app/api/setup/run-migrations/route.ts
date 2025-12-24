// app/api/setup/run-migrations/route.ts
// ============================================================================
// RUN MIGRATIONS - Apply database schema to a new Supabase project
//
// This route:
// 1. Reads the client schema SQL
// 2. Executes it against the new Supabase project using service role key
// 3. Returns success/failure
//
// Called by orchestrator after create-supabase completes.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RunMigrationsRequest {
  supabaseUrl: string;
  supabaseServiceKey: string;
  // Optional: specific schema to run (defaults to full client schema)
  schemaType?: 'client' | 'admin' | 'minimal';
}

// ============================================================================
// CLIENT SCHEMA - Full platform schema for child platforms
// ============================================================================

const CLIENT_SCHEMA = `
-- =============================================================================
-- RAISEREADY CLIENT PLATFORM SCHEMA
-- =============================================================================
-- Applied automatically during child platform creation
-- =============================================================================

-- Extensions
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
-- INVESTOR PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  position TEXT,
  linkedin_url TEXT,
  company_name TEXT,
  company_website TEXT,
  company_description TEXT,
  thesis JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,
  coaching_config JSONB DEFAULT '{}'::jsonb,
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
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  company_name TEXT,
  company_website TEXT,
  company_description TEXT,
  sector TEXT,
  stage TEXT,
  geography TEXT,
  funding_target TEXT,
  readiness_score INTEGER DEFAULT 0,
  readiness_level TEXT DEFAULT 'not-ready',
  journey_stage TEXT DEFAULT 'upload',
  journey_completed JSONB DEFAULT '[]'::jsonb,
  discovery_completed BOOLEAN DEFAULT false,
  discovery_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- -----------------------------------------------------------------------------
-- PITCH DECKS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pitch_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT DEFAULT 'application/pdf',
  page_count INTEGER,
  
  -- Version tracking
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  parent_deck_id UUID REFERENCES pitch_decks(id),
  
  -- Analysis status
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_started_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,
  
  -- Extracted content
  extracted_text TEXT,
  extracted_slides JSONB DEFAULT '[]'::jsonb,
  
  -- AI Analysis results
  analysis JSONB DEFAULT '{}'::jsonb,
  scores JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- COACHING SESSIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES pitch_decks(id),
  
  -- Session type
  session_type TEXT NOT NULL CHECK (session_type IN ('discovery', 'materials', 'practice', 'review')),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  
  -- Conversation
  messages JSONB DEFAULT '[]'::jsonb,
  
  -- Outcomes
  insights JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  
  -- Metrics
  duration_seconds INTEGER,
  message_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- VOICE SESSIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES pitch_decks(id),
  
  -- ElevenLabs integration
  elevenlabs_conversation_id TEXT,
  
  -- Session data
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  transcript JSONB DEFAULT '[]'::jsonb,
  
  -- Analysis
  delivery_score INTEGER,
  clarity_score INTEGER,
  confidence_score INTEGER,
  feedback JSONB DEFAULT '{}'::jsonb,
  
  -- Metrics
  duration_seconds INTEGER,
  word_count INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- FOUNDER PROGRESS TABLE (journey tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS founder_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stage tracking
  current_stage TEXT DEFAULT 'upload',
  stages_completed JSONB DEFAULT '[]'::jsonb,
  
  -- Scores over time
  score_history JSONB DEFAULT '[]'::jsonb,
  
  -- Overall readiness
  overall_readiness INTEGER DEFAULT 0,
  investor_ready BOOLEAN DEFAULT false,
  investor_ready_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_profiles_user_id ON founder_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_user_id ON investor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_founder_id ON pitch_decks(founder_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_user_id ON pitch_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_founder_id ON coaching_sessions(founder_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_founder_id ON voice_sessions(founder_id);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_progress ENABLE ROW LEVEL SECURITY;

-- User Roles policies
CREATE POLICY "Users can view own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Founder Profiles policies
CREATE POLICY "Founders can view own profile" ON founder_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Founders can update own profile" ON founder_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Founders can insert own profile" ON founder_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Portal admins can view all founders" ON founder_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'portal_admin')
);

-- Investor Profiles policies
CREATE POLICY "Investors can view own profile" ON investor_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Investors can update own profile" ON investor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Investors can insert own profile" ON investor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pitch Decks policies
CREATE POLICY "Founders can view own decks" ON pitch_decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Founders can insert own decks" ON pitch_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Founders can update own decks" ON pitch_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Founders can delete own decks" ON pitch_decks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Portal admins can view all decks" ON pitch_decks FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'portal_admin')
);

-- Coaching Sessions policies
CREATE POLICY "Users can view own sessions" ON coaching_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON coaching_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON coaching_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Voice Sessions policies
CREATE POLICY "Users can view own voice sessions" ON voice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice sessions" ON voice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice sessions" ON voice_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Founder Progress policies
CREATE POLICY "Founders can view own progress" ON founder_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Founders can insert own progress" ON founder_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Founders can update own progress" ON founder_progress FOR UPDATE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- STORAGE BUCKETS
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('pitch-decks', 'pitch-decks', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pitch-decks bucket
CREATE POLICY "Founders can upload own decks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pitch-decks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Founders can view own decks"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pitch-decks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Founders can delete own decks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pitch-decks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- -----------------------------------------------------------------------------
-- FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_founder_profiles_updated_at BEFORE UPDATE ON founder_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investor_profiles_updated_at BEFORE UPDATE ON investor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pitch_decks_updated_at BEFORE UPDATE ON pitch_decks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coaching_sessions_updated_at BEFORE UPDATE ON coaching_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voice_sessions_updated_at BEFORE UPDATE ON voice_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_founder_progress_updated_at BEFORE UPDATE ON founder_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create founder profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user signed up as founder
  IF NEW.raw_user_meta_data->>'role' = 'founder' THEN
    INSERT INTO public.founder_profiles (user_id, email, first_name, last_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'founder');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`;

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: RunMigrationsRequest = await request.json();
    const { supabaseUrl, supabaseServiceKey, schemaType = 'client' } = body;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase URL and service key required' },
        { status: 400 }
      );
    }

    console.log(`[RunMigrations] Applying ${schemaType} schema to ${supabaseUrl}`);

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the schema to apply
    let schema: string;
    switch (schemaType) {
      case 'client':
        schema = CLIENT_SCHEMA;
        break;
      default:
        schema = CLIENT_SCHEMA;
    }

    // Split schema into individual statements and execute
    // Note: We need to run this via the SQL endpoint or exec
    const { error } = await supabase.rpc('exec_sql', { sql: schema }).single();

    if (error) {
      // If exec_sql doesn't exist, try running statements individually
      console.log('[RunMigrations] exec_sql not available, running via REST...');

      // Use the Supabase Management API to run SQL
      const managementRes = await runSqlViaManagementApi(
        extractProjectRef(supabaseUrl),
        schema
      );

      if (!managementRes.success) {
        return NextResponse.json(
          { error: managementRes.error || 'Failed to run migrations' },
          { status: 500 }
        );
      }
    }

    console.log(`[RunMigrations] Schema applied successfully`);

    return NextResponse.json({
      success: true,
      schemaType,
      tablesCreated: [
        'user_roles',
        'investor_profiles',
        'founder_profiles',
        'pitch_decks',
        'coaching_sessions',
        'voice_sessions',
        'founder_progress',
      ],
      policiesCreated: true,
      storageConfigured: true,
    });

  } catch (error: any) {
    console.error('[RunMigrations] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run migrations' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER: Extract project ref from URL
// ============================================================================

function extractProjectRef(supabaseUrl: string): string {
  // https://abcdefghijkl.supabase.co -> abcdefghijkl
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : '';
}

// ============================================================================
// HELPER: Run SQL via Supabase Management API
// ============================================================================

async function runSqlViaManagementApi(
  projectRef: string,
  sql: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!supabaseAccessToken) {
    return { success: false, error: 'SUPABASE_ACCESS_TOKEN not configured' };
  }

  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[RunMigrations] Management API error:', errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// GET - Documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    service: 'run-migrations',
    description: 'Applies database schema to a new Supabase project',
    method: 'POST',
    params: {
      supabaseUrl: 'string (required)',
      supabaseServiceKey: 'string (required)',
      schemaType: 'string (optional) - "client" (default)',
    },
    creates: [
      'user_roles table',
      'investor_profiles table',
      'founder_profiles table',
      'pitch_decks table',
      'coaching_sessions table',
      'voice_sessions table',
      'founder_progress table',
      'RLS policies',
      'Storage bucket: pitch-decks',
      'Triggers for updated_at',
      'Trigger for auto-create founder profile',
    ],
  });
}
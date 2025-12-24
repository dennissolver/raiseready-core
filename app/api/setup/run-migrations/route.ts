import { NextRequest, NextResponse } from 'next/server';

const CLIENT_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('founder', 'portal_admin', 'team_member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS founder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT, last_name TEXT, email TEXT NOT NULL, phone TEXT, linkedin_url TEXT,
  company_name TEXT, company_website TEXT, company_description TEXT,
  sector TEXT, stage TEXT, geography TEXT, funding_target TEXT,
  readiness_score INTEGER DEFAULT 0, readiness_level TEXT DEFAULT 'not-ready',
  journey_stage TEXT DEFAULT 'upload', journey_completed JSONB DEFAULT '[]'::jsonb,
  discovery_completed BOOLEAN DEFAULT false, discovery_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS pitch_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL, file_url TEXT NOT NULL, file_size INTEGER, file_type TEXT DEFAULT 'application/pdf',
  version INTEGER DEFAULT 1, is_current BOOLEAN DEFAULT true,
  analysis_status TEXT DEFAULT 'pending',
  extracted_text TEXT, analysis JSONB DEFAULT '{}'::jsonb, scores JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founder_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES pitch_decks(id),
  session_type TEXT NOT NULL, status TEXT DEFAULT 'active',
  messages JSONB DEFAULT '[]'::jsonb, insights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Founders can view own profile" ON founder_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Founders can update own profile" ON founder_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Founders can insert own profile" ON founder_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Founders can manage own decks" ON pitch_decks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own sessions" ON coaching_sessions FOR ALL USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('pitch-decks', 'pitch-decks', false) ON CONFLICT DO NOTHING;
`;

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseServiceKey } = await request.json();
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase URL and service key required' }, { status: 400 });
    }

    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) return NextResponse.json({ error: 'Invalid Supabase URL' }, { status: 400 });

    const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!supabaseToken) return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not configured' }, { status: 500 });

    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supabaseToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: CLIENT_SCHEMA }),
    });

    if (!res.ok) {
      const error = await res.text();
      return NextResponse.json({ error: error || 'Migration failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tablesCreated: ['user_roles', 'founder_profiles', 'pitch_decks', 'coaching_sessions'] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

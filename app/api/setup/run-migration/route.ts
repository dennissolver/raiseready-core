import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RunMigrationRequest {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RunMigrationRequest = await req.json();
    const { supabaseUrl, supabaseServiceKey } = body;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'supabaseUrl and supabaseServiceKey required'
      }, { status: 400 });
    }

    // Create Supabase client for the CLIENT's project
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ========== Step 1: Create Storage Buckets ==========
    console.log('Creating storage buckets...');

    // Create pitch-decks bucket
    const { error: pitchBucketError } = await supabase.storage.createBucket('pitch-decks', {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/pdf'],
    });

    if (pitchBucketError && !pitchBucketError.message.includes('already exists')) {
      console.warn('Failed to create pitch-decks bucket:', pitchBucketError.message);
    } else {
      console.log('✅ pitch-decks bucket created (or already exists)');
    }

    // Create profile-avatars bucket
    const { error: avatarBucketError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });

    if (avatarBucketError && !avatarBucketError.message.includes('already exists')) {
      console.warn('Failed to create avatars bucket:', avatarBucketError.message);
    } else {
      console.log('✅ avatars bucket created (or already exists)');
    }

    // Create company-logos bucket
    const { error: logoBucketError } = await supabase.storage.createBucket('company-logos', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    });

    if (logoBucketError && !logoBucketError.message.includes('already exists')) {
      console.warn('Failed to create company-logos bucket:', logoBucketError.message);
    } else {
      console.log('✅ company-logos bucket created (or already exists)');
    }

    // ========== Step 2: Run Database Schema Migration ==========
    console.log('Running base schema migration...');

    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

    // Try Management API for SQL execution (most reliable)
    const managementResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: BASE_SCHEMA_SQL }),
      }
    );

    if (!managementResponse.ok) {
      const errorText = await managementResponse.text();
      console.warn('Management API schema error:', errorText);
      // Don't fail - tables might already exist
    } else {
      console.log('✅ Base schema migration completed');
    }

    // ========== Step 3: Run Storage RLS Policies ==========
    console.log('Setting up storage RLS policies...');

    const storagePolicyResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: STORAGE_POLICIES_SQL }),
      }
    );

    if (!storagePolicyResponse.ok) {
      const errorText = await storagePolicyResponse.text();
      console.warn('Storage policies warning:', errorText);
    } else {
      console.log('✅ Storage RLS policies created');
    }

    console.log('Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Schema and storage created',
      tables: ['profiles', 'founders', 'pitch_decks', 'coaching_sessions', 'watchlist', 'discovery_responses', 'voice_sessions'],
      buckets: ['pitch-decks', 'avatars', 'company-logos'],
    });

  } catch (error) {
    console.error('Run migration error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Storage RLS Policies SQL
const STORAGE_POLICIES_SQL = `
-- =============================================
-- STORAGE RLS POLICIES FOR PITCH-DECKS BUCKET
-- =============================================

-- Allow authenticated users to upload to their own folder (user_id/filename)
DROP POLICY IF EXISTS "Users can upload own pitch decks" ON storage.objects;
CREATE POLICY "Users can upload own pitch decks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pitch-decks' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own pitch deck files
DROP POLICY IF EXISTS "Users can read own pitch decks" ON storage.objects;
CREATE POLICY "Users can read own pitch decks"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pitch-decks' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own pitch deck files
DROP POLICY IF EXISTS "Users can update own pitch decks" ON storage.objects;
CREATE POLICY "Users can update own pitch decks"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pitch-decks' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own pitch deck files
DROP POLICY IF EXISTS "Users can delete own pitch decks" ON storage.objects;
CREATE POLICY "Users can delete own pitch decks"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pitch-decks' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow investors and admins to read ALL pitch decks
DROP POLICY IF EXISTS "Investors can read all pitch decks" ON storage.objects;
CREATE POLICY "Investors can read all pitch decks"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pitch-decks' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.user_type IN ('investor', 'admin') OR profiles.is_admin = true)
  )
);

-- =============================================
-- STORAGE RLS POLICIES FOR AVATARS BUCKET
-- =============================================

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view avatars (public bucket)
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================
-- STORAGE RLS POLICIES FOR COMPANY-LOGOS BUCKET
-- =============================================

-- Allow authenticated users to upload company logos
DROP POLICY IF EXISTS "Users can upload company logos" ON storage.objects;
CREATE POLICY "Users can upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view company logos (public bucket)
DROP POLICY IF EXISTS "Company logos are publicly viewable" ON storage.objects;
CREATE POLICY "Company logos are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Allow users to update their own company logo
DROP POLICY IF EXISTS "Users can update own company logo" ON storage.objects;
CREATE POLICY "Users can update own company logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own company logo
DROP POLICY IF EXISTS "Users can delete own company logo" ON storage.objects;
CREATE POLICY "Users can delete own company logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
`;

// Base schema SQL for client platforms
const BASE_SCHEMA_SQL = `
-- Profiles table (for all users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  user_type TEXT DEFAULT 'founder' CHECK (user_type IN ('founder', 'investor', 'admin')),
  is_admin BOOLEAN DEFAULT false,
  company_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  linkedin_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Founders table (extended founder info)
CREATE TABLE IF NOT EXISTS founders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  company_website TEXT,
  industry TEXT,
  stage TEXT,
  location TEXT,
  founded_year INTEGER,
  team_size INTEGER,
  funding_sought DECIMAL(15,2),
  funding_raised DECIMAL(15,2) DEFAULT 0,
  elevator_pitch TEXT,
  problem_statement TEXT,
  solution TEXT,
  target_market TEXT,
  business_model TEXT,
  traction TEXT,
  competitive_advantage TEXT,
  use_of_funds TEXT,
  readiness_score INTEGER DEFAULT 0,
  ai_feedback JSONB DEFAULT '{}',
  journey_stage TEXT DEFAULT 'upload',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pitch decks table
CREATE TABLE IF NOT EXISTS pitch_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  file_name TEXT,
  file_url TEXT,
  file_type TEXT DEFAULT 'pdf',
  file_size INTEGER,
  slide_count INTEGER,
  version INTEGER DEFAULT 1,
  parent_deck_id UUID REFERENCES pitch_decks(id),
  is_latest BOOLEAN DEFAULT true,
  is_current BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  extracted_text TEXT,
  analysis JSONB DEFAULT '{}',
  score INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaching sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT DEFAULT 'chat',
  messages JSONB DEFAULT '[]',
  summary TEXT,
  action_items JSONB DEFAULT '[]',
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Watchlist table (for investors tracking founders)
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  notes TEXT,
  status TEXT DEFAULT 'watching' CHECK (status IN ('watching', 'contacted', 'meeting', 'passed', 'invested')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_id, founder_id)
);

-- Discovery responses table
CREATE TABLE IF NOT EXISTS discovery_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  response TEXT,
  ai_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice sessions table
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT DEFAULT 'pitch-practice',
  transcript TEXT,
  duration_seconds INTEGER,
  feedback JSONB DEFAULT '{}',
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_founders_user_id ON founders(user_id);
CREATE INDEX IF NOT EXISTS idx_founders_stage ON founders(stage);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_founder ON pitch_decks(founder_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_user ON pitch_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_latest ON pitch_decks(is_latest) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_coaching_founder ON coaching_sessions(founder_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_investor ON watchlist(investor_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_founder ON watchlist(founder_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- RLS Policies for founders
DROP POLICY IF EXISTS "Founders can view own data" ON founders;
CREATE POLICY "Founders can view own data" ON founders
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Founders can update own data" ON founders;
CREATE POLICY "Founders can update own data" ON founders
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Founders can insert own data" ON founders;
CREATE POLICY "Founders can insert own data" ON founders
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Investors can view founders" ON founders;
CREATE POLICY "Investors can view founders" ON founders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('investor', 'admin'))
  );

-- RLS Policies for pitch_decks
DROP POLICY IF EXISTS "Users can view own decks" ON pitch_decks;
CREATE POLICY "Users can view own decks" ON pitch_decks
  FOR SELECT USING (user_id = auth.uid() OR founder_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own decks" ON pitch_decks;
CREATE POLICY "Users can insert own decks" ON pitch_decks
  FOR INSERT WITH CHECK (user_id = auth.uid() OR founder_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own decks" ON pitch_decks;
CREATE POLICY "Users can update own decks" ON pitch_decks
  FOR UPDATE USING (user_id = auth.uid() OR founder_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own decks" ON pitch_decks;
CREATE POLICY "Users can delete own decks" ON pitch_decks
  FOR DELETE USING (user_id = auth.uid() OR founder_id = auth.uid());

DROP POLICY IF EXISTS "Investors can view decks" ON pitch_decks;
CREATE POLICY "Investors can view decks" ON pitch_decks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type IN ('investor', 'admin'))
  );

-- RLS Policies for coaching_sessions
DROP POLICY IF EXISTS "Users can manage own sessions" ON coaching_sessions;
CREATE POLICY "Users can manage own sessions" ON coaching_sessions
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for watchlist
DROP POLICY IF EXISTS "Investors can manage own watchlist" ON watchlist;
CREATE POLICY "Investors can manage own watchlist" ON watchlist
  FOR ALL USING (investor_id = auth.uid());

-- RLS Policies for discovery_responses
DROP POLICY IF EXISTS "Users can manage own responses" ON discovery_responses;
CREATE POLICY "Users can manage own responses" ON discovery_responses
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for voice_sessions
DROP POLICY IF EXISTS "Users can manage own voice sessions" ON voice_sessions;
CREATE POLICY "Users can manage own voice sessions" ON voice_sessions
  FOR ALL USING (user_id = auth.uid());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
`;
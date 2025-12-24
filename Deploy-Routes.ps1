# ============================================================================
# DEPLOY ALL SETUP ROUTES
# Run this from C:\Users\denni\RaiseReadyTemplate
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "Creating setup routes..." -ForegroundColor Cyan

# ============================================================================
# delete-github/route.ts
# ============================================================================
$deleteGithub = @'
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { repoName } = await request.json();
    if (!repoName) return NextResponse.json({ error: 'Repository name required' }, { status: 400 });

    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';
    if (!githubToken) return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 500 });

    const res = await fetch(`https://api.github.com/repos/${githubOwner}/${repoName}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
    });

    if (res.status === 404) return NextResponse.json({ success: true, alreadyDeleted: true });
    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: res.status });
    }
    return NextResponse.json({ success: true, deleted: repoName });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
'@
Set-Content -Path "app/api/setup/delete-github/route.ts" -Value $deleteGithub
Write-Host "  + delete-github/route.ts" -ForegroundColor Green

# ============================================================================
# delete-vercel/route.ts
# ============================================================================
$deleteVercel = @'
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectName } = await request.json();
    const identifier = projectId || projectName;
    if (!identifier) return NextResponse.json({ error: 'projectId or projectName required' }, { status: 400 });

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    if (!vercelToken) return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });

    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';
    const res = await fetch(`https://api.vercel.com/v9/projects/${identifier}${teamQuery}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    if (res.status === 404) return NextResponse.json({ success: true, alreadyDeleted: true });
    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json({ error: error.error?.message || 'Failed to delete' }, { status: res.status });
    }
    return NextResponse.json({ success: true, deleted: identifier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
'@
Set-Content -Path "app/api/setup/delete-vercel/route.ts" -Value $deleteVercel
Write-Host "  + delete-vercel/route.ts" -ForegroundColor Green

# ============================================================================
# delete-supabase/route.ts
# ============================================================================
$deleteSupabase = @'
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectRef } = await request.json();
    if (!projectRef) return NextResponse.json({ error: 'Project reference required' }, { status: 400 });

    const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!supabaseToken) return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not configured' }, { status: 500 });

    // Pause first
    await fetch(`https://api.supabase.com/v1/projects/${projectRef}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supabaseToken}`, 'Content-Type': 'application/json' },
    });
    await new Promise(r => setTimeout(r, 2000));

    // Delete
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supabaseToken}`, 'Content-Type': 'application/json' },
    });

    if (res.status === 404) return NextResponse.json({ success: true, alreadyDeleted: true });
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText || 'Failed to delete' }, { status: res.status });
    }
    return NextResponse.json({ success: true, deleted: projectRef });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
'@
Set-Content -Path "app/api/setup/delete-supabase/route.ts" -Value $deleteSupabase
Write-Host "  + delete-supabase/route.ts" -ForegroundColor Green

# ============================================================================
# delete-elevenlabs/route.ts
# ============================================================================
$deleteElevenlabs = @'
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();
    if (!agentId) return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });

    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
    });

    if (res.status === 404) return NextResponse.json({ success: true, alreadyDeleted: true });
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText || 'Failed to delete' }, { status: res.status });
    }
    return NextResponse.json({ success: true, deleted: agentId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
'@
Set-Content -Path "app/api/setup/delete-elevenlabs/route.ts" -Value $deleteElevenlabs
Write-Host "  + delete-elevenlabs/route.ts" -ForegroundColor Green

# ============================================================================
# cleanup/route.ts
# ============================================================================
$cleanup = @'
import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

async function callDelete(baseUrl: string, tool: string, payload: any) {
  try {
    const res = await fetch(`${baseUrl}/api/setup/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { success: res.ok || res.status === 404, error: data.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const baseUrl = getBaseUrl(request);
    const results: any = {};
    const errors: string[] = [];

    const { projectSlug, resources = {} } = body;

    // Delete Vercel
    if (resources.vercel?.projectId || resources.vercel?.projectName || projectSlug) {
      const r = await callDelete(baseUrl, 'delete-vercel', { projectName: resources.vercel?.projectId || projectSlug });
      results.vercel = r;
      if (!r.success) errors.push(`Vercel: ${r.error}`);
    }

    // Delete GitHub
    if (resources.github?.repoName || projectSlug) {
      const r = await callDelete(baseUrl, 'delete-github', { repoName: resources.github?.repoName || projectSlug });
      results.github = r;
      if (!r.success) errors.push(`GitHub: ${r.error}`);
    }

    // Delete Supabase
    if (resources.supabase?.projectRef) {
      const r = await callDelete(baseUrl, 'delete-supabase', { projectRef: resources.supabase.projectRef });
      results.supabase = r;
      if (!r.success) errors.push(`Supabase: ${r.error}`);
    }

    // Delete ElevenLabs
    if (resources.elevenlabs?.agentId) {
      const r = await callDelete(baseUrl, 'delete-elevenlabs', { agentId: resources.elevenlabs.agentId });
      results.elevenlabs = r;
      if (!r.success) errors.push(`ElevenLabs: ${r.error}`);
    }

    return NextResponse.json({ success: errors.length === 0, results, errors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
'@
Set-Content -Path "app/api/setup/cleanup/route.ts" -Value $cleanup
Write-Host "  + cleanup/route.ts" -ForegroundColor Green

# ============================================================================
# run-migrations/route.ts
# ============================================================================
$runMigrations = @'
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
'@
Set-Content -Path "app/api/setup/run-migrations/route.ts" -Value $runMigrations
Write-Host "  + run-migrations/route.ts" -ForegroundColor Green

Write-Host "`nRoutes created! Now run:" -ForegroundColor Cyan
Write-Host "  npm run build" -ForegroundColor Yellow
Write-Host "  git add -A && git commit -m 'Add cleanup and migration routes' && git push" -ForegroundColor Yellow
# ============================================================================
# FIX CREATE-VERCEL ROUTE
# Run after Deploy-Routes.ps1
# ============================================================================

$createVercel = @'
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept multiple parameter formats
    const projectName = body.projectName || body.platformName;
    const githubRepoName = body.githubRepoName || body.githubRepo || body.repoName;
    const companyName = body.companyName || body.formData?.companyName || projectName;

    if (!projectName) {
      return NextResponse.json({ error: 'Project name required' }, { status: 400 });
    }
    if (!githubRepoName) {
      return NextResponse.json({ error: 'GitHub repo name required' }, { status: 400 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!vercelToken) {
      return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });
    }

    // Build env vars from multiple formats
    const envVars: Record<string, string> = {};
    if (body.envVars) Object.assign(envVars, body.envVars);
    if (body.supabase?.url) envVars.NEXT_PUBLIC_SUPABASE_URL = body.supabase.url;
    if (body.supabase?.anonKey) envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = body.supabase.anonKey;
    if (body.supabase?.serviceKey) envVars.SUPABASE_SERVICE_ROLE_KEY = body.supabase.serviceKey;
    if (body.elevenlabs?.agentId) envVars.ELEVENLABS_AGENT_ID = body.elevenlabs.agentId;
    if (companyName) envVars.NEXT_PUBLIC_COMPANY_NAME = companyName;
    if (process.env.ELEVENLABS_API_KEY) envVars.ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (process.env.ANTHROPIC_API_KEY) envVars.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').slice(0, 100);
    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

    // Check if exists
    const checkRes = await fetch(`https://api.vercel.com/v9/projects/${safeName}${teamQuery}`, {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      return NextResponse.json({ success: true, projectId: existing.id, projectName: safeName, url: `https://${safeName}.vercel.app`, alreadyExists: true });
    }

    // Create project
    const environmentVariables = Object.entries(envVars).filter(([_, v]) => v).map(([key, value]) => ({
      key, value, target: ['production', 'preview', 'development'],
      type: key.includes('SECRET') || key.includes('SERVICE') || key.includes('API_KEY') ? 'encrypted' : 'plain',
    }));

    const createRes = await fetch(`https://api.vercel.com/v10/projects${teamQuery}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: safeName,
        framework: 'nextjs',
        gitRepository: { type: 'github', repo: `${githubOwner}/${githubRepoName}` },
        environmentVariables,
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      return NextResponse.json({ error: error.error?.message || 'Failed to create' }, { status: 400 });
    }

    const project = await createRes.json();
    return NextResponse.json({ success: true, projectId: project.id, projectName: safeName, url: `https://${safeName}.vercel.app` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
'@

Set-Content -Path "app/api/setup/create-vercel/route.ts" -Value $createVercel
Write-Host "Fixed: create-vercel/route.ts" -ForegroundColor Green
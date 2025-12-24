// app/api/setup/create-vercel/route.ts
// ============================================================================
// CREATE VERCEL PROJECT - "Dumb Tool"
//
// This tool does ONE thing:
// 1. Creates a Vercel project
// 2. Links it to a GitHub repo
// 3. Sets environment variables
// 4. Returns project details
//
// It does NOT trigger deployment - that's trigger-deployment's job.
// Vercel will auto-deploy when trigger-deployment pushes a commit to GitHub.
//
// ACCEPTS MULTIPLE PARAMETER FORMATS for backward compatibility:
// - projectName OR platformName
// - githubRepoName OR githubRepo OR repoName
// - envVars OR supabase + elevenlabs objects
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

interface CreateVercelRequest {
  // Multiple formats accepted for project name
  projectName?: string;
  platformName?: string;

  // Multiple formats accepted for repo name
  githubRepoName?: string;
  githubRepo?: string;
  repoName?: string;

  // Company name (optional)
  companyName?: string;
  formData?: { companyName?: string };

  // Env vars - can be passed directly or as objects
  envVars?: Record<string, string>;
  supabase?: {
    url?: string;
    anonKey?: string;
    serviceKey?: string;
    projectId?: string;
  };
  elevenlabs?: {
    agentId?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateVercelRequest = await request.json();

    // ========================================================================
    // FLEXIBLE PARAMETER EXTRACTION
    // ========================================================================

    // Project name: accept multiple formats
    const projectName = body.projectName || body.platformName;

    // GitHub repo: accept multiple formats
    const githubRepoName = body.githubRepoName || body.githubRepo || body.repoName;

    // Company name
    const companyName = body.companyName || body.formData?.companyName || projectName;

    // Validate required fields
    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name required (projectName or platformName)' },
        { status: 400 }
      );
    }

    if (!githubRepoName) {
      return NextResponse.json(
        { error: 'GitHub repo name required (githubRepoName, githubRepo, or repoName)' },
        { status: 400 }
      );
    }

    // ========================================================================
    // BUILD ENVIRONMENT VARIABLES
    // ========================================================================

    // Accept env vars directly OR extract from supabase/elevenlabs objects
    const envVars: Record<string, string> = {};

    // From direct envVars object
    if (body.envVars) {
      Object.assign(envVars, body.envVars);
    }

    // From supabase object
    if (body.supabase) {
      if (body.supabase.url) envVars.NEXT_PUBLIC_SUPABASE_URL = body.supabase.url;
      if (body.supabase.anonKey) envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = body.supabase.anonKey;
      if (body.supabase.serviceKey) envVars.SUPABASE_SERVICE_ROLE_KEY = body.supabase.serviceKey;
    }

    // From elevenlabs object
    if (body.elevenlabs) {
      if (body.elevenlabs.agentId) envVars.ELEVENLABS_AGENT_ID = body.elevenlabs.agentId;
    }

    // Company name
    if (companyName) {
      envVars.NEXT_PUBLIC_COMPANY_NAME = companyName;
    }

    // ========================================================================
    // GET SERVER-SIDE API KEYS
    // ========================================================================

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';

    // Add API keys from server env (not passed from client for security)
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (elevenlabsApiKey) envVars.ELEVENLABS_API_KEY = elevenlabsApiKey;
    if (anthropicApiKey) envVars.ANTHROPIC_API_KEY = anthropicApiKey;

    if (!vercelToken) {
      return NextResponse.json(
        { error: 'VERCEL_TOKEN not configured' },
        { status: 500 }
      );
    }

    // ========================================================================
    // SANITIZE PROJECT NAME
    // ========================================================================

    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

    console.log(`[CreateVercel] Creating project: ${safeName}`);
    console.log(`[CreateVercel] GitHub repo: ${githubOwner}/${githubRepoName}`);
    console.log(`[CreateVercel] Env vars: ${Object.keys(envVars).join(', ')}`);

    // ========================================================================
    // CHECK IF PROJECT EXISTS
    // ========================================================================

    const checkRes = await fetch(
      `https://api.vercel.com/v9/projects/${safeName}${teamQuery}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );

    if (checkRes.ok) {
      const existing = await checkRes.json();
      console.log(`[CreateVercel] Project already exists: ${safeName}`);

      // Update env vars on existing project
      await updateProjectEnvVars(vercelToken, existing.id, envVars, vercelTeamId);

      return NextResponse.json({
        success: true,
        projectId: existing.id,
        projectName: safeName,
        url: `https://${safeName}.vercel.app`,
        alreadyExists: true,
      });
    }

    // ========================================================================
    // CREATE NEW PROJECT
    // ========================================================================

    // Build environment variables array for Vercel API
    const environmentVariables = Object.entries(envVars)
      .filter(([_, value]) => value) // Only non-empty values
      .map(([key, value]) => ({
        key,
        value,
        target: ['production', 'preview', 'development'],
        type: isSecretKey(key) ? 'encrypted' : 'plain',
      }));

    const createRes = await fetch(
      `https://api.vercel.com/v10/projects${teamQuery}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: safeName,
          framework: 'nextjs',
          gitRepository: {
            type: 'github',
            repo: `${githubOwner}/${githubRepoName}`,
          },
          environmentVariables,
        }),
      }
    );

    if (!createRes.ok) {
      const error = await createRes.json();
      console.error('[CreateVercel] Creation failed:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to create Vercel project' },
        { status: 400 }
      );
    }

    const project = await createRes.json();
    console.log(`[CreateVercel] Project created: ${project.id}`);

    // ========================================================================
    // RETURN SUCCESS
    // ========================================================================

    return NextResponse.json({
      success: true,
      projectId: project.id,
      projectName: safeName,
      url: `https://${safeName}.vercel.app`,
      githubLinked: true,
      envVarsSet: environmentVariables.length,
    });

  } catch (error: any) {
    console.error('[CreateVercel] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Vercel project' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER: Check if key should be encrypted
// ============================================================================

function isSecretKey(key: string): boolean {
  const secretPatterns = ['SECRET', 'SERVICE', 'API_KEY', 'PRIVATE', 'PASSWORD', 'TOKEN'];
  return secretPatterns.some(pattern => key.toUpperCase().includes(pattern));
}

// ============================================================================
// HELPER: Update env vars on existing project
// ============================================================================

async function updateProjectEnvVars(
  token: string,
  projectId: string,
  envVars: Record<string, string>,
  teamId?: string
): Promise<void> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;

    try {
      // Try to create env var
      const createRes = await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key,
            value,
            target: ['production', 'preview', 'development'],
            type: isSecretKey(key) ? 'encrypted' : 'plain',
          }),
        }
      );

      if (!createRes.ok) {
        // If exists, update it
        const listRes = await fetch(
          `https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (listRes.ok) {
          const { envs } = await listRes.json();
          const existing = envs?.find((e: any) => e.key === key);

          if (existing) {
            await fetch(
              `https://api.vercel.com/v10/projects/${projectId}/env/${existing.id}${teamQuery}`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value }),
              }
            );
          }
        }
      }
    } catch (err) {
      console.warn(`[CreateVercel] Could not set env var ${key}:`, err);
    }
  }
}

// ============================================================================
// GET - Documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    service: 'create-vercel',
    description: 'Creates Vercel project and links to GitHub. Does NOT trigger deployment.',
    method: 'POST',
    acceptedParams: {
      projectName: 'string (or platformName)',
      githubRepoName: 'string (or githubRepo, repoName)',
      companyName: 'string (optional)',
      envVars: 'object (optional) - direct env vars',
      supabase: '{ url, anonKey, serviceKey } (optional)',
      elevenlabs: '{ agentId } (optional)',
    },
    note: 'Multiple parameter formats accepted for backward compatibility',
  });
}
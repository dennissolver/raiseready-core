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
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

interface CreateVercelRequest {
  projectName: string;
  githubRepoName: string;
  envVars: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    ELEVENLABS_AGENT_ID?: string;
    // Additional env vars can be passed
    [key: string]: string | undefined;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateVercelRequest = await request.json();
    const { projectName, githubRepoName, envVars = {} } = body;

    if (!projectName || !githubRepoName) {
      return NextResponse.json(
        { error: 'Project name and GitHub repo name required' },
        { status: 400 }
      );
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';

    // Add API keys from server env (not passed from client)
    const serverEnvVars = {
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    };

    if (!vercelToken) {
      return NextResponse.json(
        { error: 'VERCEL_TOKEN not configured' },
        { status: 500 }
      );
    }

    // Sanitize project name
    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

    // ========================================================================
    // Step 1: Check if project already exists
    // ========================================================================
    console.log(`[CreateVercel] Checking for existing project: ${safeName}`);

    const checkRes = await fetch(
      `https://api.vercel.com/v9/projects/${safeName}${teamQuery}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );

    if (checkRes.ok) {
      const existing = await checkRes.json();
      console.log(`[CreateVercel] Project already exists: ${safeName}`);

      // Update env vars on existing project
      await updateProjectEnvVars(vercelToken, existing.id, { ...envVars, ...serverEnvVars }, vercelTeamId);

      return NextResponse.json({
        success: true,
        projectId: existing.id,
        projectName: safeName,
        url: `https://${safeName}.vercel.app`,
        alreadyExists: true,
      });
    }

    // ========================================================================
    // Step 2: Create new project linked to GitHub
    // ========================================================================
    console.log(`[CreateVercel] Creating project: ${safeName}`);

    // Build environment variables array
    const allEnvVars = { ...envVars, ...serverEnvVars };
    const environmentVariables = Object.entries(allEnvVars)
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
    // Return success - DO NOT trigger deployment here
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
  envVars: Record<string, string | undefined>,
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
// GET - Health check
// ============================================================================

export async function GET() {
  return NextResponse.json({
    service: 'create-vercel',
    description: 'Creates Vercel project and links to GitHub. Does NOT trigger deployment.',
    method: 'POST',
    params: {
      projectName: 'string (required)',
      githubRepoName: 'string (required)',
      envVars: 'object (optional) - environment variables to set',
    },
  });
}
// app/api/setup/create-vercel/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept multiple parameter formats
    const platformName = body.platformName || body.projectName;
    const githubRepoName = body.githubRepoName || body.githubRepo || body.repoName;
    const companyName = body.companyName || body.formData?.companyName;

    // Accept env vars in different formats
    const supabaseUrl = body.supabase?.url || body.envVars?.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = body.supabase?.anonKey || body.envVars?.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseServiceKey = body.supabase?.serviceKey || body.envVars?.SUPABASE_SERVICE_ROLE_KEY || '';
    const elevenlabsAgentId = body.elevenlabs?.agentId || body.envVars?.ELEVENLABS_AGENT_ID || '';

    if (!platformName || !githubRepoName) {
      return NextResponse.json(
        { error: 'Platform name and GitHub repo required' },
        { status: 400 }
      );
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!vercelToken) {
      return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });
    }

    const safeName = platformName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';
    const vercelUrl = `https://${safeName}.vercel.app`;

    // Build env vars
    const envVars: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
      NEXT_PUBLIC_PLATFORM_NAME: platformName,
      NEXT_PUBLIC_COMPANY_NAME: companyName || platformName,
      ELEVENLABS_API_KEY: elevenlabsApiKey || '',
      ELEVENLABS_AGENT_ID: elevenlabsAgentId,
      ANTHROPIC_API_KEY: anthropicApiKey || '',
    };

    // Check if project already exists
    console.log('Checking for existing Vercel project:', safeName);
    const checkRes = await fetch(
      `https://api.vercel.com/v9/projects/${safeName}${teamQuery}`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );

    if (checkRes.ok) {
      const existing = await checkRes.json();
      console.log('Vercel project already exists:', safeName);

      // Update env vars on existing project
      await updateEnvVars(vercelToken, existing.id, envVars, vercelTeamId);

      return NextResponse.json({
        success: true,
        projectId: existing.id,
        url: vercelUrl,
        alreadyExists: true,
      });
    }

    // Create new project linked to GitHub
    console.log('Creating Vercel project:', safeName);
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
          environmentVariables: Object.entries(envVars)
            .filter(([_, value]) => value) // Only include non-empty values
            .map(([key, value]) => ({
              key,
              value,
              target: ['production', 'preview', 'development'],
              type: key.includes('SECRET') || key.includes('SERVICE') || key.includes('API_KEY')
                ? 'encrypted'
                : 'plain',
            })),
        }),
      }
    );

    if (!createRes.ok) {
      const error = await createRes.json();
      console.error('Vercel creation failed:', error);
      return NextResponse.json(
        { error: error.error?.message || 'Failed to create Vercel project' },
        { status: 400 }
      );
    }

    const project = await createRes.json();
    console.log('Vercel project created:', project.id);

    // Trigger initial deployment
    console.log('Triggering deployment...');
    try {
      await fetch(
        `https://api.vercel.com/v13/deployments${teamQuery}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: safeName,
            project: project.id,
            target: 'production',
            gitSource: {
              type: 'github',
              repo: `${githubOwner}/${githubRepoName}`,
              ref: 'main',
            },
          }),
        }
      );
      console.log('Deployment triggered');
    } catch (deployErr) {
      console.warn('Deployment trigger warning:', deployErr);
      // Don't fail the whole request if deployment trigger fails
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      url: vercelUrl,
    });

  } catch (error: any) {
    console.error('Create Vercel error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create Vercel project' },
      { status: 500 }
    );
  }
}

// PATCH handler for updating env vars
export async function PATCH(request: NextRequest) {
  try {
    const { projectId, envVars } = await request.json();

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken || !projectId) {
      return NextResponse.json({ error: 'Token and project ID required' }, { status: 400 });
    }

    await updateEnvVars(vercelToken, projectId, envVars, vercelTeamId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update env vars error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function updateEnvVars(
  token: string,
  projectId: string,
  envVars: Record<string, string>,
  teamId?: string
): Promise<void> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;

    try {
      // Try to create, if exists it will fail and we update
      const res = await fetch(
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
            type: key.includes('SECRET') || key.includes('SERVICE') || key.includes('API_KEY')
              ? 'encrypted'
              : 'plain',
          }),
        }
      );

      if (!res.ok) {
        // Env var might already exist, try to get and update
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
      console.warn(`Could not set env var ${key}:`, err);
    }
  }
}
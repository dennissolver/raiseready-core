import { NextRequest, NextResponse } from 'next/server';

const VERCEL_API = 'https://api.vercel.com';

interface CreateVercelRequest {
  projectName: string;
  githubRepo: string;
  envVars?: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received body:', JSON.stringify(body, null, 2));

    const { projectName, githubRepo, envVars } = body as CreateVercelRequest;

    if (!projectName) {
      console.error('Missing projectName');
      return NextResponse.json({ error: 'Project name required', received: body }, { status: 400 });
    }

    if (!githubRepo) {
      console.error('Missing githubRepo');
      return NextResponse.json({ error: 'GitHub repo required', received: body }, { status: 400 });
    }

    const token = process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;

    if (!token) {
      return NextResponse.json({ error: 'Vercel token not configured' }, { status: 500 });
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const teamParam = teamId && teamId.length > 0 ? `?teamId=${teamId}` : '';

    // Step 1: Check if project already exists
    console.log(`Checking for existing Vercel project: ${projectName}`);

    let projectId = '';
    let isExistingProject = false;

    const checkResponse = await fetch(`${VERCEL_API}/v9/projects/${projectName}${teamParam}`, {
      headers,
    });

    if (checkResponse.ok) {
      const existingProject = await checkResponse.json();
      console.log(`Project already exists: ${existingProject.id}`);
      projectId = existingProject.id;
      isExistingProject = true;
    } else {
      // Step 2: Create the project
      console.log(`Creating Vercel project: ${projectName} linked to ${githubRepo}`);

      const createBody = {
        name: projectName,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: githubRepo,
        },
      };

      const createResponse = await fetch(`${VERCEL_API}/v10/projects${teamParam}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Vercel create error:', errorText);
        return NextResponse.json({ error: `Failed to create project: ${errorText}` }, { status: 500 });
      }

      const project = await createResponse.json();
      console.log('Project created:', project.id);
      projectId = project.id;
    }

    // Step 3: Set environment variables (ALWAYS - for both new and existing projects)
    const allEnvVars = {
      ...(envVars || {}),
      IS_ADMIN_PLATFORM: 'false',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_APP_URL: `https://${projectName}.vercel.app`,
    };

    console.log(`Setting ${Object.keys(allEnvVars).length} environment variables...`);

    for (const [key, value] of Object.entries(allEnvVars)) {
      if (!value) continue;

      try {
        // First, try to check if the env var already exists
        const checkEnvResponse = await fetch(
          `${VERCEL_API}/v10/projects/${projectId}/env${teamParam}`,
          { headers }
        );

        let existingEnvId: string | null = null;

        if (checkEnvResponse.ok) {
          const existingEnvs = await checkEnvResponse.json();
          const existingEnv = existingEnvs.envs?.find((env: any) => env.key === key);
          if (existingEnv) {
            existingEnvId = existingEnv.id;
          }
        }

        if (existingEnvId) {
          // Update existing env var
          const updateResponse = await fetch(
            `${VERCEL_API}/v10/projects/${projectId}/env/${existingEnvId}${teamParam}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                value,
                type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
                target: ['production', 'preview', 'development'],
              }),
            }
          );

          if (updateResponse.ok) {
            console.log(`Updated env var: ${key}`);
          } else {
            const errText = await updateResponse.text();
            console.warn(`Failed to update env var ${key}:`, errText);
          }
        } else {
          // Create new env var
          const createEnvResponse = await fetch(
            `${VERCEL_API}/v10/projects/${projectId}/env${teamParam}`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                key,
                value,
                type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
                target: ['production', 'preview', 'development'],
              }),
            }
          );

          if (createEnvResponse.ok) {
            console.log(`Created env var: ${key}`);
          } else {
            const errText = await createEnvResponse.text();
            // Don't fail on duplicate - might be a race condition
            if (!errText.includes('already exists')) {
              console.warn(`Failed to create env var ${key}:`, errText);
            } else {
              console.log(`Env var ${key} already exists, skipping`);
            }
          }
        }
      } catch (err) {
        console.warn(`Error setting env var ${key}:`, err);
        // Continue with other env vars
      }
    }

    console.log('Environment variables configured');

    // Note: We don't manually trigger deployment here.
    // The GitHub config push (which happens AFTER this) will auto-trigger deployment via webhook.

    const deploymentUrl = `https://${projectName}.vercel.app`;

    return NextResponse.json({
      success: true,
      projectId,
      projectName,
      url: deploymentUrl,
      deploymentId: '',
      isExistingProject,
      envVarsConfigured: Object.keys(allEnvVars).filter(k => allEnvVars[k as keyof typeof allEnvVars]).length,
    });

  } catch (error) {
    console.error('Create Vercel error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
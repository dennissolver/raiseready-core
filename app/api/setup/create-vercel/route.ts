import { NextRequest, NextResponse } from 'next/server';

const VERCEL_API = 'https://api.vercel.com';

interface CreateVercelRequest {
  projectName: string;
  githubRepo: string; // Full repo name: owner/repo
  envVars: {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateVercelRequest = await req.json();
    const { projectName, githubRepo, envVars } = body;

    if (!projectName || !githubRepo) {
      return NextResponse.json({ error: 'Project name and GitHub repo required' }, { status: 400 });
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

    const teamParam = teamId ? `?teamId=${teamId}` : '';

    // Step 1: Create the project
    console.log(`Creating Vercel project: ${projectName}`);

    const createResponse = await fetch(`${VERCEL_API}/v10/projects${teamParam}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: projectName,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: githubRepo,
        },
        buildCommand: 'npm run build',
        installCommand: 'npm install',
        outputDirectory: '.next',
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Vercel create error:', error);
      return NextResponse.json({ error: `Failed to create project: ${error}` }, { status: 500 });
    }

    const project = await createResponse.json();
    console.log('Project created:', project.id);

    // Step 2: Set environment variables
    const allEnvVars = {
      ...envVars,
      IS_ADMIN_PLATFORM: 'false',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GROK_API_KEY: process.env.GROK_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      NEXT_PUBLIC_APP_URL: `https://${projectName}.vercel.app`,
    };

    for (const [key, value] of Object.entries(allEnvVars)) {
      if (!value) continue;

      await fetch(`${VERCEL_API}/v10/projects/${project.id}/env${teamParam}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key,
          value,
          type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
          target: ['production', 'preview', 'development'],
        }),
      });
    }

    console.log('Environment variables set');

    // Step 3: Trigger deployment
    const deployResponse = await fetch(`${VERCEL_API}/v13/deployments${teamParam}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: projectName,
        project: project.id,
        gitSource: {
          type: 'github',
          repo: githubRepo,
          ref: 'main',
        },
        target: 'production',
      }),
    });

    let deploymentUrl = `https://${projectName}.vercel.app`;
    let deploymentId = '';

    if (deployResponse.ok) {
      const deployment = await deployResponse.json();
      deploymentId = deployment.id;
      deploymentUrl = deployment.url ? `https://${deployment.url}` : deploymentUrl;
      console.log('Deployment triggered:', deploymentId);
    } else {
      console.warn('Deployment trigger failed, project will deploy on next push');
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      projectName: project.name,
      url: deploymentUrl,
      deploymentId,
    });

  } catch (error) {
    console.error('Create Vercel error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

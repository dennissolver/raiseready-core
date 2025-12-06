import { NextRequest, NextResponse } from 'next/server';

const VERCEL_API = 'https://api.vercel.com';

interface CreateVercelRequest {
  projectName: string;
  githubRepo: string;
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

    const teamParam = teamId && teamId.length > 0 ? `?teamId=${teamId}` : '';

    // Step 1: Check if project already exists
    console.log(`Checking for existing Vercel project: ${projectName}`);
    
    const checkResponse = await fetch(`${VERCEL_API}/v9/projects/${projectName}${teamParam}`, {
      headers,
    });

    if (checkResponse.ok) {
      const existingProject = await checkResponse.json();
      console.log(`Project already exists: ${existingProject.id}`);
      
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Project already exists',
        projectId: existingProject.id,
        projectName: existingProject.name,
        url: `https://${projectName}.vercel.app`,
      });
    }

    // Step 2: Create the project
    console.log(`Creating Vercel project: ${projectName}`);

    const createBody: any = {
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
      
      if (errorText.includes('already exists') || errorText.includes('already linked')) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'Project already exists',
          url: `https://${projectName}.vercel.app`,
        });
      }
      
      return NextResponse.json({ error: `Failed to create project: ${errorText}` }, { status: 500 });
    }

    const project = await createResponse.json();
    console.log('Project created:', project.id);

    // Step 3: Set environment variables
    const allEnvVars = {
      ...envVars,
      IS_ADMIN_PLATFORM: 'false',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_APP_URL: `https://${projectName}.vercel.app`,
    };

    for (const [key, value] of Object.entries(allEnvVars)) {
      if (!value) continue;

      try {
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
      } catch (err) {
        console.warn(`Failed to set env var ${key}:`, err);
      }
    }

    console.log('Environment variables set');

    return NextResponse.json({
      success: true,
      projectId: project.id,
      projectName: project.name,
      url: `https://${projectName}.vercel.app`,
    });

  } catch (error) {
    console.error('Create Vercel error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
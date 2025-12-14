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
    [key: string]: string | undefined;
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received body:', JSON.stringify(body, null, 2));

    const { projectName, githubRepo, envVars } = body as CreateVercelRequest;

    if (!projectName) {
      return NextResponse.json({ error: 'Project name required' }, { status: 400 });
    }

    if (!githubRepo) {
      return NextResponse.json({ error: 'GitHub repo required' }, { status: 400 });
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

    // Ensure repo name includes owner
    const owner = process.env.GITHUB_OWNER || 'dennissolver';
    const fullRepoName = githubRepo.includes('/') ? githubRepo : `${owner}/${githubRepo}`;
    const [repoOwner, repoName] = fullRepoName.split('/');

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

      // Check if Git is linked
      if (!existingProject.link?.type) {
        console.log('Project exists but no Git link, will link now');
      }
    } else {
      // Step 2: Create the project with GitHub integration
      console.log(`Creating Vercel project: ${projectName} linked to ${fullRepoName}`);

      const createBody = {
        name: projectName,
        framework: 'nextjs',
        gitRepository: {
          type: 'github',
          repo: fullRepoName,
        },
        // Enable auto-deploys from GitHub
        autoAssignCustomDomains: true,
        autoAssignCustomDomainsUpdatedBy: "api",
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
      console.log('Git link:', project.link);
      projectId = project.id;
    }

    // Small delay to ensure project is ready
    await sleep(2000);

    // Step 3: Set environment variables
    const allEnvVars: Record<string, string | undefined> = {
      ...(envVars || {}),
      IS_ADMIN_PLATFORM: 'false',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_APP_URL: `https://${projectName}.vercel.app`,
    };

    console.log(`Setting ${Object.keys(allEnvVars).filter(k => allEnvVars[k]).length} environment variables...`);

    // Get existing env vars
    const existingEnvsResponse = await fetch(
      `${VERCEL_API}/v10/projects/${projectId}/env${teamParam}`,
      { headers }
    );

    const existingEnvs = existingEnvsResponse.ok
      ? (await existingEnvsResponse.json()).envs || []
      : [];

    for (const [key, value] of Object.entries(allEnvVars)) {
      if (!value) continue;

      try {
        const existingEnv = existingEnvs.find((env: any) => env.key === key);
        const envType = key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted';

        if (existingEnv) {
          // Update existing env var
          const updateResponse = await fetch(
            `${VERCEL_API}/v10/projects/${projectId}/env/${existingEnv.id}${teamParam}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                value,
                type: envType,
                target: ['production', 'preview', 'development'],
              }),
            }
          );
          console.log(`Updated env var: ${key} - ${updateResponse.ok ? 'success' : 'failed'}`);
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
                type: envType,
                target: ['production', 'preview', 'development'],
              }),
            }
          );

          if (createEnvResponse.ok) {
            console.log(`Created env var: ${key}`);
          } else {
            const errText = await createEnvResponse.text();
            if (!errText.includes('already exists')) {
              console.warn(`Failed to create env var ${key}:`, errText);
            }
          }
        }
      } catch (err) {
        console.warn(`Error setting env var ${key}:`, err);
      }
    }

    console.log('Environment variables configured');

    // Small delay before triggering deployment
    await sleep(1000);

    // Step 4: Trigger deployment using the v13/deployments endpoint with gitSource
    // This ensures the deployment uses the GitHub integration properly
    console.log('Triggering initial deployment...');
    let deploymentId = '';
    let deploymentUrl = '';
    let deploymentState = '';

    try {
      // First try: Create deployment via git source (triggers GitHub integration flow)
      const deployResponse = await fetch(
        `${VERCEL_API}/v13/deployments${teamParam}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: projectName,
            project: projectId,
            target: 'production',
            gitSource: {
              type: 'github',
              repo: fullRepoName,
              ref: 'main',
            },
          }),
        }
      );

      if (deployResponse.ok) {
        const deployment = await deployResponse.json();
        deploymentId = deployment.id || deployment.uid || '';
        deploymentUrl = deployment.url || `${projectName}.vercel.app`;
        deploymentState = deployment.readyState || 'QUEUED';
        console.log('✅ Deployment triggered via gitSource:', deploymentId);
        console.log('Deployment state:', deploymentState);
      } else {
        const deployError = await deployResponse.text();
        console.warn('gitSource deployment failed:', deployError);

        // Fallback: Try triggering via GitHub webhook endpoint
        console.log('Trying webhook trigger...');

        const webhookResponse = await fetch(
          `${VERCEL_API}/v1/integrations/deploy/${projectId}/${repoName}${teamParam}`,
          {
            method: 'POST',
            headers,
          }
        );

        if (webhookResponse.ok) {
          const webhookResult = await webhookResponse.json();
          console.log('✅ Deployment triggered via webhook:', webhookResult);
        } else {
          // Final fallback: just redeploy whatever is there
          console.log('Trying production redeploy...');

          const redeployResponse = await fetch(
            `${VERCEL_API}/v13/deployments${teamParam}`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                name: projectName,
                project: projectId,
                target: 'production',
              }),
            }
          );

          if (redeployResponse.ok) {
            const redeploy = await redeployResponse.json();
            deploymentId = redeploy.id || redeploy.uid || '';
            deploymentUrl = redeploy.url || `${projectName}.vercel.app`;
            console.log('✅ Redeployment triggered:', deploymentId);
          } else {
            console.warn('All deployment methods failed - manual deploy may be needed');
          }
        }
      }
    } catch (deployErr) {
      console.warn('Deployment trigger error:', deployErr);
    }

    const finalUrl = `https://${projectName}.vercel.app`;

    return NextResponse.json({
      success: true,
      projectId,
      projectName,
      url: finalUrl,
      deploymentId,
      deploymentUrl: deploymentUrl ? `https://${deploymentUrl}` : finalUrl,
      deploymentState,
      isExistingProject,
      envVarsConfigured: Object.keys(allEnvVars).filter(k => allEnvVars[k]).length,
      githubRepo: fullRepoName,
      message: deploymentId
        ? 'Project created and deployment triggered'
        : 'Project created - first push to main branch will trigger deployment',
    });

  } catch (error) {
    console.error('Create Vercel error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
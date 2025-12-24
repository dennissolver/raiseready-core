// app/api/setup/trigger-deployment/route.ts
// ============================================================================
// TRIGGER DEPLOYMENT - Calls Vercel API directly to create deployment
//
// Don't rely on GitHub webhooks - they're async and unreliable for initial deploy
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

interface TriggerDeploymentRequest {
  repoName: string;
  projectName?: string; // Vercel project name (defaults to repoName)
  commitMessage?: string;
  branch?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TriggerDeploymentRequest = await request.json();
    const { repoName, projectName, branch = 'main' } = body;

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!githubToken) {
      return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 500 });
    }
    if (!vercelToken) {
      return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });
    }

    const vercelProjectName = projectName || repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

    console.log(`[TriggerDeployment] Project: ${vercelProjectName}`);
    console.log(`[TriggerDeployment] Repo: ${githubOwner}/${repoName}`);

    // ========================================================================
    // Step 1: Get latest commit SHA from GitHub
    // ========================================================================
    console.log(`[TriggerDeployment] Getting latest commit...`);

    const refRes = await fetch(
      `https://api.github.com/repos/${githubOwner}/${repoName}/git/ref/heads/${branch}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (!refRes.ok) {
      const error = await refRes.json();
      return NextResponse.json(
        { error: `Failed to get branch: ${error.message}` },
        { status: 400 }
      );
    }

    const refData = await refRes.json();
    const gitSha = refData.object.sha;
    console.log(`[TriggerDeployment] Commit SHA: ${gitSha}`);

    // ========================================================================
    // Step 2: Create deployment via Vercel API
    // ========================================================================
    console.log(`[TriggerDeployment] Creating Vercel deployment...`);

    const deployRes = await fetch(`https://api.vercel.com/v13/deployments${teamQuery}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: vercelProjectName,
        target: 'production',
        gitSource: {
          type: 'github',
          org: githubOwner,
          repo: repoName,
          ref: branch,
          sha: gitSha,
        },
      }),
    });

    if (!deployRes.ok) {
      const error = await deployRes.json();
      console.error(`[TriggerDeployment] Vercel API error:`, error);

      // If deployment API fails, fall back to webhook method
      console.log(`[TriggerDeployment] Falling back to webhook trigger...`);
      return await triggerViaWebhook(githubToken, githubOwner, repoName, branch, body.commitMessage);
    }

    const deployment = await deployRes.json();
    console.log(`[TriggerDeployment] Deployment created: ${deployment.id}`);
    console.log(`[TriggerDeployment] URL: ${deployment.url}`);

    return NextResponse.json({
      success: true,
      deploymentId: deployment.id,
      url: deployment.url,
      inspectorUrl: deployment.inspectorUrl,
      method: 'vercel-api',
    });

  } catch (error: any) {
    console.error('[TriggerDeployment] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger deployment' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Fallback: Trigger via GitHub commit (webhook method)
// ============================================================================

async function triggerViaWebhook(
  githubToken: string,
  githubOwner: string,
  repoName: string,
  branch: string,
  commitMessage?: string
) {
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Get current commit
  const refRes = await fetch(
    `https://api.github.com/repos/${githubOwner}/${repoName}/git/ref/heads/${branch}`,
    { headers }
  );

  if (!refRes.ok) {
    return NextResponse.json({ error: 'Failed to get branch ref' }, { status: 400 });
  }

  const refData = await refRes.json();
  const currentSha = refData.object.sha;

  // Get tree SHA
  const commitRes = await fetch(
    `https://api.github.com/repos/${githubOwner}/${repoName}/git/commits/${currentSha}`,
    { headers }
  );
  const commitData = await commitRes.json();
  const treeSha = commitData.tree.sha;

  // Create empty commit
  const message = commitMessage || `Deploy: Trigger build [${new Date().toISOString()}]`;
  const newCommitRes = await fetch(
    `https://api.github.com/repos/${githubOwner}/${repoName}/git/commits`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, tree: treeSha, parents: [currentSha] }),
    }
  );
  const newCommit = await newCommitRes.json();

  // Update branch ref
  await fetch(
    `https://api.github.com/repos/${githubOwner}/${repoName}/git/refs/heads/${branch}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sha: newCommit.sha, force: false }),
    }
  );

  console.log(`[TriggerDeployment] Webhook fallback: pushed ${newCommit.sha}`);

  return NextResponse.json({
    success: true,
    commitSha: newCommit.sha,
    method: 'webhook-fallback',
  });
}

export async function GET() {
  return NextResponse.json({
    service: 'trigger-deployment',
    description: 'Triggers Vercel deployment via API (with webhook fallback)',
  });
}
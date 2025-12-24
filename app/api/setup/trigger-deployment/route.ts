/*
// app/api/setup/trigger-deployment/route.ts
// ============================================================================
// TRIGGER DEPLOYMENT - Pushes a commit to GitHub to trigger Vercel auto-deploy
//
// This is a "dumb tool" - it does ONE thing:
// 1. Pushes a trigger commit to the GitHub repo
// 2. This triggers the Vercel webhook for auto-deployment
// 3. Returns the commit SHA
//
// Why push a commit instead of calling Vercel API directly?
// - Vercel auto-deploy is more reliable than manual deployment API
// - Creates audit trail in git history
// - Ensures Vercel has latest code
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

interface TriggerDeploymentRequest {
  repoName: string;
  // Optional: custom commit message
  commitMessage?: string;
  // Optional: branch to push to (defaults to main)
  branch?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TriggerDeploymentRequest = await request.json();
    const { repoName, commitMessage, branch = 'main' } = body;

    if (!repoName) {
      return NextResponse.json(
        { error: 'Repository name required' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN not configured' },
        { status: 500 }
      );
    }

    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    // ========================================================================
    // Step 1: Get the current commit SHA for the branch
    // ========================================================================
    console.log(`[TriggerDeployment] Getting current HEAD for ${githubOwner}/${repoName}@${branch}`);

    const refRes = await fetch(
      `${GITHUB_API}/repos/${githubOwner}/${repoName}/git/ref/heads/${branch}`,
      { headers }
    );

    if (!refRes.ok) {
      const error = await refRes.json();
      return NextResponse.json(
        { error: `Failed to get branch ref: ${error.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    const refData = await refRes.json();
    const currentCommitSha = refData.object.sha;
    console.log(`[TriggerDeployment] Current commit: ${currentCommitSha}`);

    // ========================================================================
    // Step 2: Get the current commit to get the tree SHA
    // ========================================================================
    const commitRes = await fetch(
      `${GITHUB_API}/repos/${githubOwner}/${repoName}/git/commits/${currentCommitSha}`,
      { headers }
    );

    if (!commitRes.ok) {
      const error = await commitRes.json();
      return NextResponse.json(
        { error: `Failed to get commit: ${error.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    const commitData = await commitRes.json();
    const treeSha = commitData.tree.sha;

    // ========================================================================
    // Step 3: Create a new commit with the same tree (empty commit)
    // ========================================================================
    const timestamp = new Date().toISOString();
    const message = commitMessage || `Deploy: Trigger Vercel build [${timestamp}]`;

    console.log(`[TriggerDeployment] Creating trigger commit...`);

    const newCommitRes = await fetch(
      `${GITHUB_API}/repos/${githubOwner}/${repoName}/git/commits`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          tree: treeSha,
          parents: [currentCommitSha],
        }),
      }
    );

    if (!newCommitRes.ok) {
      const error = await newCommitRes.json();
      return NextResponse.json(
        { error: `Failed to create commit: ${error.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    const newCommit = await newCommitRes.json();
    const newCommitSha = newCommit.sha;
    console.log(`[TriggerDeployment] New commit created: ${newCommitSha}`);

    // ========================================================================
    // Step 4: Update the branch ref to point to new commit
    // ========================================================================
    console.log(`[TriggerDeployment] Updating branch ref...`);

    const updateRefRes = await fetch(
      `${GITHUB_API}/repos/${githubOwner}/${repoName}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
      }
    );

    if (!updateRefRes.ok) {
      const error = await updateRefRes.json();
      return NextResponse.json(
        { error: `Failed to update ref: ${error.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    console.log(`[TriggerDeployment] Branch updated, Vercel webhook should trigger`);

    // ========================================================================
    // Return success
    // ========================================================================
    return NextResponse.json({
      success: true,
      commitSha: newCommitSha,
      branch,
      message,
      repoUrl: `https://github.com/${githubOwner}/${repoName}`,
      commitUrl: `https://github.com/${githubOwner}/${repoName}/commit/${newCommitSha}`,
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
// GET - Health check
// ============================================================================

export async function GET() {
  return NextResponse.json({
    service: 'trigger-deployment',
    description: 'Pushes a commit to GitHub to trigger Vercel auto-deploy',
    method: 'POST',
    params: {
      repoName: 'string (required)',
      commitMessage: 'string (optional)',
      branch: 'string (optional, defaults to main)',
    },
  });
}*/

// app/api/setup/trigger-deployment/route.ts
// ============================================================================
// TRIGGER DEPLOYMENT - Pushes a commit to GitHub to trigger Vercel auto-deploy
//
// This is a "dumb tool" - it does ONE thing:
// 1. Pushes a trigger commit to the GitHub repo
// 2. This triggers the Vercel webhook for auto-deployment
// 3. Returns the commit SHA
//
// Why push a commit instead of calling Vercel API directly?
// - Vercel auto-deploy is more reliable than manual deployment API
// - Creates audit trail in git history
// - Ensures Vercel has latest code
// ============================================================================

import {NextRequest, NextResponse} from 'next/server';

const GITHUB_API = 'https://api.github.com';

interface TriggerDeploymentRequest {
    repoName: string;
    // Optional: custom commit message
    commitMessage?: string;
    // Optional: branch to push to (defaults to main)
    branch?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: TriggerDeploymentRequest = await request.json();
        const {repoName, commitMessage, branch = 'main'} = body;

        if (!repoName) {
            return NextResponse.json(
                {error: 'Repository name required'},
                {status: 400}
            );
        }

        const githubToken: string | undefined = process.env.GITHUB_TOKEN;
        const githubOwner: string = process.env.GITHUB_OWNER || 'dennissolver';

        if (!githubToken) {
            return NextResponse.json(
                {error: 'GITHUB_TOKEN not configured'},
                {status: 500}
            );
        }

        const headers = {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
        };

        // ========================================================================
        // Step 1: Get the current commit SHA for the branch
        // ========================================================================
        console.log(`[TriggerDeployment] Getting current HEAD for ${githubOwner}/${repoName}@${branch}`);

        const refRes = await fetch(
            `${GITHUB_API}/repos/${githubOwner}/${repoName}/git/ref/heads/${branch}`,
            {headers}
        );

        if (!refRes.ok) {
            const error = await refRes.json();
            return NextResponse.json(
                {error: `Failed to get branch ref: ${error.message || 'Unknown error'}`},
                {status: 400}
            );
        }

        const refData = await refRes.json();
        const currentCommitSha: string = refData.object.sha;
        console.log(`[TriggerDeployment] Current commit: ${currentCommitSha}`);

        // ========================================================================
        // Step 2: Get the current commit to get the tree SHA
        // ========================================================================
        const commitRes = await fetch(
            `${GITHUB_API}/repos/${githubOwner}/${repoName}/git/commits/${currentCommitSha}`,
            {headers}
        );

        if (!commitRes.ok) {
            const error = await commitRes.json();
            return NextResponse.json(
                {error: `Failed to get commit: ${error.message || 'Unknown error'}`},
                {status: 400}
            );
        }

        const commitData = await commitRes.json();
        const treeSha: string = commitData.tree.sha;

        // ========================================================================
        // Step 3: Create a new commit with the same tree (empty commit)
        // ========================================================================
        const timestamp: string = new Date().toISOString();
        const message: string = commitMessage || `Deploy: Trigger Vercel build [${timestamp}]`;

        console.log(`[TriggerDeployment] Creating trigger commit...`);

        const newCommitRes = await fetch(
            `${GITHUB_API}/repos/${githubOwner}/${repoName}/git/commits`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message,
                    tree: treeSha,
                    parents: [currentCommitSha],
                }),
            }
        );

        if (!newCommitRes.ok) {
            const error = await newCommitRes.json();
            return NextResponse.json(
                {error: `Failed to create commit: ${error.message || 'Unknown error'}`},
                {status: 400}
            );
        }

        const newCommit = await newCommitRes.json();
        const newCommitSha: string = newCommit.sha;
        console.log(`[TriggerDeployment] New commit created: ${newCommitSha}`);

        // ========================================================================
        // Step 4: Update the branch ref to point to new commit
        // ========================================================================
        console.log(`[TriggerDeployment] Updating branch ref...`);

        const updateRefRes = await fetch(
            `${GITHUB_API}/repos/${githubOwner}/${repoName}/git/refs/heads/${branch}`,
            {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    sha: newCommitSha,
                    force: false,
                }),
            }
        );

        if (!updateRefRes.ok) {
            const error = await updateRefRes.json();
            return NextResponse.json(
                {error: `Failed to update ref: ${error.message || 'Unknown error'}`},
                {status: 400}
            );
        }

        console.log(`[TriggerDeployment] Branch updated, Vercel webhook should trigger`);

        // ========================================================================
        // Return success
        // ========================================================================
        return NextResponse.json({
            success: true,
            commitSha: newCommitSha,
            branch,
            message,
            repoUrl: `https://github.com/${githubOwner}/${repoName}`,
            commitUrl: `https://github.com/${githubOwner}/${repoName}/commit/${newCommitSha}`,
        });

    } catch (error: any) {
        console.error('[TriggerDeployment] Error:', error);
        return NextResponse.json(
            {error: error.message || 'Failed to trigger deployment'},
            {status: 500}
        );
    }
}

// ============================================================================
// GET - Health check
// ============================================================================

export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        service: 'trigger-deployment',
        description: 'Pushes a commit to GitHub to trigger Vercel auto-deploy',
        method: 'POST',
        params: {
            repoName: 'string (required)',
            commitMessage: 'string (optional)',
            branch: 'string (optional, defaults to main)',
        },
    });
}
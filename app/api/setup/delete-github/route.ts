// app/api/setup/delete-github/route.ts
// ============================================================================
// DELETE GITHUB REPOSITORY - "Dumb Tool"
//
// Deletes a GitHub repository. Used for cleanup on failed deployments.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

interface DeleteGithubRequest {
  repoName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteGithubRequest = await request.json();
    const { repoName } = body;

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!githubToken) {
      return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 500 });
    }

    console.log(`[DeleteGitHub] Deleting repo: ${githubOwner}/${repoName}`);

    const res = await fetch(
      `https://api.github.com/repos/${githubOwner}/${repoName}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    if (res.status === 404) {
      console.log(`[DeleteGitHub] Repo not found (already deleted?): ${repoName}`);
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(
        { error: error.message || 'Failed to delete repository' },
        { status: res.status }
      );
    }

    console.log(`[DeleteGitHub] Deleted: ${repoName}`);
    return NextResponse.json({ success: true, deleted: repoName });

  } catch (error: any) {
    console.error('[DeleteGitHub] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'delete-github',
    description: 'Deletes a GitHub repository',
    method: 'POST',
    params: { repoName: 'string (required)' },
  });
}
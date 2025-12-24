import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { repoName } = await request.json();
    if (!repoName) return NextResponse.json({ error: 'Repository name required' }, { status: 400 });

    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';
    if (!githubToken) return NextResponse.json({ error: 'GITHUB_TOKEN not configured' }, { status: 500 });

    const res = await fetch(`https://api.github.com/repos/${githubOwner}/${repoName}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
    });

    if (res.status === 404) return NextResponse.json({ success: true, alreadyDeleted: true });
    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: res.status });
    }
    return NextResponse.json({ success: true, deleted: repoName });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

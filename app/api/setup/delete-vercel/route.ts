import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectName } = await request.json();
    const identifier = projectId || projectName;
    if (!identifier) return NextResponse.json({ error: 'projectId or projectName required' }, { status: 400 });

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    if (!vercelToken) return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });

    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';
    const res = await fetch(`https://api.vercel.com/v9/projects/${identifier}${teamQuery}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${vercelToken}` },
    });

    if (res.status === 404) return NextResponse.json({ success: true, alreadyDeleted: true });
    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json({ error: error.error?.message || 'Failed to delete' }, { status: res.status });
    }
    return NextResponse.json({ success: true, deleted: identifier });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

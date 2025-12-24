// app/api/setup/delete-vercel/route.ts
// ============================================================================
// DELETE VERCEL PROJECT - "Dumb Tool"
//
// Deletes a Vercel project. Used for cleanup on failed deployments.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

interface DeleteVercelRequest {
  projectId?: string;
  projectName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteVercelRequest = await request.json();
    const { projectId, projectName } = body;

    if (!projectId && !projectName) {
      return NextResponse.json(
        { error: 'Either projectId or projectName required' },
        { status: 400 }
      );
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken) {
      return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });
    }

    const teamQuery = vercelTeamId ? `?teamId=${vercelTeamId}` : '';
    const identifier = projectId || projectName;

    console.log(`[DeleteVercel] Deleting project: ${identifier}`);

    const res = await fetch(
      `https://api.vercel.com/v9/projects/${identifier}${teamQuery}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${vercelToken}` },
      }
    );

    if (res.status === 404) {
      console.log(`[DeleteVercel] Project not found (already deleted?): ${identifier}`);
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(
        { error: error.error?.message || 'Failed to delete project' },
        { status: res.status }
      );
    }

    console.log(`[DeleteVercel] Deleted: ${identifier}`);
    return NextResponse.json({ success: true, deleted: identifier });

  } catch (error: any) {
    console.error('[DeleteVercel] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'delete-vercel',
    description: 'Deletes a Vercel project',
    method: 'POST',
    params: {
      projectId: 'string (optional)',
      projectName: 'string (optional) - one of projectId or projectName required',
    },
  });
}
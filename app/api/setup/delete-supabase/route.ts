// app/api/setup/delete-supabase/route.ts
// ============================================================================
// DELETE SUPABASE PROJECT - DUMB TOOL
//
// Does ONE thing: Deletes a Supabase project by projectRef
// All lookup logic belongs in the orchestrator.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectRef } = await request.json();

    if (!projectRef) {
      return NextResponse.json({ error: 'projectRef required' }, { status: 400 });
    }

    const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!supabaseToken) {
      return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    const headers = {
      Authorization: `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json',
    };

    // Pause first (required before delete)
    console.log(`[DeleteSupabase] Pausing project: ${projectRef}`);
    await fetch(`https://api.supabase.com/v1/projects/${projectRef}/pause`, {
      method: 'POST',
      headers,
    });
    await new Promise(r => setTimeout(r, 2000));

    // Delete
    console.log(`[DeleteSupabase] Deleting project: ${projectRef}`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      method: 'DELETE',
      headers,
    });

    if (res.status === 404) {
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText || 'Failed to delete' }, { status: res.status });
    }

    return NextResponse.json({ success: true, deleted: projectRef });
  } catch (error: any) {
    console.error('[DeleteSupabase] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'delete-supabase',
    description: 'Deletes a Supabase project by projectRef',
    method: 'POST',
    params: { projectRef: 'string (required)' },
  });
}
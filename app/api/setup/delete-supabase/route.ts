import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectRef } = await request.json();
    if (!projectRef) return NextResponse.json({ error: 'Project reference required' }, { status: 400 });

    const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!supabaseToken) return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not configured' }, { status: 500 });

    // Pause first
    await fetch(`https://api.supabase.com/v1/projects/${projectRef}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${supabaseToken}`, 'Content-Type': 'application/json' },
    });
    await new Promise(r => setTimeout(r, 2000));

    // Delete
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supabaseToken}`, 'Content-Type': 'application/json' },
    });

    if (res.status === 404) return NextResponse.json({ success: true, alreadyDeleted: true });
    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: errorText || 'Failed to delete' }, { status: res.status });
    }
    return NextResponse.json({ success: true, deleted: projectRef });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

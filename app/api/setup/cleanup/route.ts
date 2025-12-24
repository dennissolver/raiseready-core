import { NextRequest, NextResponse } from 'next/server';

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

async function callDelete(baseUrl: string, tool: string, payload: any) {
  try {
    const res = await fetch(`${baseUrl}/api/setup/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { success: res.ok || res.status === 404, error: data.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const baseUrl = getBaseUrl(request);
    const results: any = {};
    const errors: string[] = [];

    const { projectSlug, resources = {} } = body;

    // Delete Vercel
    if (resources.vercel?.projectId || resources.vercel?.projectName || projectSlug) {
      const r = await callDelete(baseUrl, 'delete-vercel', { projectName: resources.vercel?.projectId || projectSlug });
      results.vercel = r;
      if (!r.success) errors.push(`Vercel: ${r.error}`);
    }

    // Delete GitHub
    if (resources.github?.repoName || projectSlug) {
      const r = await callDelete(baseUrl, 'delete-github', { repoName: resources.github?.repoName || projectSlug });
      results.github = r;
      if (!r.success) errors.push(`GitHub: ${r.error}`);
    }

    // Delete Supabase
    if (resources.supabase?.projectRef) {
      const r = await callDelete(baseUrl, 'delete-supabase', { projectRef: resources.supabase.projectRef });
      results.supabase = r;
      if (!r.success) errors.push(`Supabase: ${r.error}`);
    }

    // Delete ElevenLabs
    if (resources.elevenlabs?.agentId) {
      const r = await callDelete(baseUrl, 'delete-elevenlabs', { agentId: resources.elevenlabs.agentId });
      results.elevenlabs = r;
      if (!r.success) errors.push(`ElevenLabs: ${r.error}`);
    }

    return NextResponse.json({ success: errors.length === 0, results, errors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

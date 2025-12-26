// app/api/setup/cleanup/route.ts
// ============================================================================
// CLEANUP - Deletes all resources by project slug/name
//
// Looks up resources by name pattern before deleting, so it works even
// without knowing explicit IDs from previous failed runs.
// ============================================================================

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
    return { success: res.ok || res.status === 404, data, error: data.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// LOOKUP FUNCTIONS - Find resources by name pattern
// ============================================================================

async function findSupabaseProject(projectSlug: string): Promise<string | null> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const projects = await res.json();

    // Look for project with matching name (convert slug to expected name format)
    // e.g., "lionhearted-business-solutions" -> matches "Lionhearted Business Solutions"
    const slugLower = projectSlug.toLowerCase().replace(/-/g, ' ');

    for (const project of projects) {
      const projectNameLower = (project.name || '').toLowerCase();
      const projectSlugFromName = projectNameLower.replace(/\s+/g, '-');

      // Match if names are similar
      if (
        projectNameLower.includes(slugLower) ||
        slugLower.includes(projectNameLower) ||
        projectSlugFromName === projectSlug.toLowerCase() ||
        project.name?.toLowerCase().replace(/[^a-z0-9]/g, '') === projectSlug.toLowerCase().replace(/[^a-z0-9]/g, '')
      ) {
        console.log(`[Cleanup] Found Supabase project: ${project.id} (${project.name})`);
        return project.id;
      }
    }

    return null;
  } catch (error) {
    console.error('[Cleanup] Error finding Supabase project:', error);
    return null;
  }
}

async function findElevenLabsAgent(companyName: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': apiKey },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const agents = data.agents || [];

    // Look for agent with matching name pattern
    const companyLower = companyName.toLowerCase().replace(/-/g, ' ');

    for (const agent of agents) {
      const agentNameLower = (agent.name || '').toLowerCase();

      // Match if agent name contains company name or vice versa
      if (
        agentNameLower.includes(companyLower) ||
        companyLower.includes(agentNameLower) ||
        agentNameLower.includes(companyName.toLowerCase().replace(/[^a-z0-9]/g, ''))
      ) {
        console.log(`[Cleanup] Found ElevenLabs agent: ${agent.agent_id} (${agent.name})`);
        return agent.agent_id;
      }
    }

    return null;
  } catch (error) {
    console.error('[Cleanup] Error finding ElevenLabs agent:', error);
    return null;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const baseUrl = getBaseUrl(request);
    const results: any = {};
    const errors: string[] = [];

    const { projectSlug, companyName, resources = {} } = body;

    if (!projectSlug) {
      return NextResponse.json({ error: 'projectSlug required' }, { status: 400 });
    }

    console.log(`[Cleanup] Starting cleanup for: ${projectSlug}`);

    // ========================================================================
    // 1. DELETE VERCEL (uses projectSlug as fallback)
    // ========================================================================
    const vercelProjectName = resources.vercel?.projectId || resources.vercel?.projectName || projectSlug;
    console.log(`[Cleanup] Checking Vercel: ${vercelProjectName}`);
    const vercelResult = await callDelete(baseUrl, 'delete-vercel', { projectName: vercelProjectName });
    results.vercel = vercelResult;
    if (!vercelResult.success && !vercelResult.error?.includes('not found')) {
      errors.push(`Vercel: ${vercelResult.error}`);
    }

    // ========================================================================
    // 2. DELETE GITHUB (uses projectSlug as fallback)
    // ========================================================================
    const githubRepoName = resources.github?.repoName || projectSlug;
    console.log(`[Cleanup] Checking GitHub: ${githubRepoName}`);
    const githubResult = await callDelete(baseUrl, 'delete-github', { repoName: githubRepoName });
    results.github = githubResult;
    if (!githubResult.success && !githubResult.error?.includes('not found')) {
      errors.push(`GitHub: ${githubResult.error}`);
    }

    // ========================================================================
    // 3. DELETE SUPABASE (lookup by name if projectRef not provided)
    // ========================================================================
    let supabaseProjectRef = resources.supabase?.projectRef;

    if (!supabaseProjectRef) {
      console.log(`[Cleanup] Looking up Supabase project by name: ${projectSlug}`);
      supabaseProjectRef = await findSupabaseProject(projectSlug);
    }

    if (supabaseProjectRef) {
      console.log(`[Cleanup] Deleting Supabase: ${supabaseProjectRef}`);
      const supabaseResult = await callDelete(baseUrl, 'delete-supabase', { projectRef: supabaseProjectRef });
      results.supabase = supabaseResult;
      if (!supabaseResult.success) {
        errors.push(`Supabase: ${supabaseResult.error}`);
      }
    } else {
      console.log(`[Cleanup] No Supabase project found for: ${projectSlug}`);
      results.supabase = { success: true, notFound: true };
    }

    // ========================================================================
    // 4. DELETE ELEVENLABS (lookup by name if agentId not provided)
    // ========================================================================
    let elevenlabsAgentId = resources.elevenlabs?.agentId;

    if (!elevenlabsAgentId) {
      const searchName = companyName || projectSlug;
      console.log(`[Cleanup] Looking up ElevenLabs agent by name: ${searchName}`);
      elevenlabsAgentId = await findElevenLabsAgent(searchName);
    }

    if (elevenlabsAgentId) {
      console.log(`[Cleanup] Deleting ElevenLabs agent: ${elevenlabsAgentId}`);
      const elevenlabsResult = await callDelete(baseUrl, 'delete-elevenlabs', { agentId: elevenlabsAgentId });
      results.elevenlabs = elevenlabsResult;
      if (!elevenlabsResult.success) {
        errors.push(`ElevenLabs: ${elevenlabsResult.error}`);
      }
    } else {
      console.log(`[Cleanup] No ElevenLabs agent found for: ${companyName || projectSlug}`);
      results.elevenlabs = { success: true, notFound: true };
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log(`[Cleanup] Complete. Errors: ${errors.length}`);

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors: errors.length > 0 ? errors : undefined,
      cleaned: {
        vercel: vercelProjectName,
        github: githubRepoName,
        supabase: supabaseProjectRef || null,
        elevenlabs: elevenlabsAgentId || null,
      },
    });

  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'cleanup',
    description: 'Deletes all resources (Vercel, GitHub, Supabase, ElevenLabs) by project slug',
    method: 'POST',
    params: {
      projectSlug: 'string (required) - e.g., "lionhearted-business-solutions"',
      companyName: 'string (optional) - helps find ElevenLabs agent',
      resources: {
        vercel: { projectId: 'string (optional)' },
        github: { repoName: 'string (optional)' },
        supabase: { projectRef: 'string (optional)' },
        elevenlabs: { agentId: 'string (optional)' },
      },
    },
  });
}
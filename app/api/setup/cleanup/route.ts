// app/api/setup/cleanup/route.ts
// ============================================================================
// CLEANUP v2 - Delete with verification loops
//
// Each component: Delete → Verify deleted → Retry if needed → Confirm
// Only returns success when ALL components are verified deleted
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const MAX_RETRIES = 5;
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 60000;

// ============================================================================
// EXISTENCE CHECK FUNCTIONS
// ============================================================================

async function findSupabaseProject(projectSlug: string): Promise<{ exists: boolean; id?: string; name?: string }> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return { exists: false };

  try {
    const res = await fetch('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { exists: false };

    const projects = await res.json();
    const slugLower = projectSlug.toLowerCase();
    const slugNormalized = slugLower.replace(/[^a-z0-9]/g, '');

    const match = projects.find((p: any) => {
      const pName = (p.name || '').toLowerCase();
      const pNormalized = pName.replace(/[^a-z0-9]/g, '');
      return pName === slugLower || pNormalized === slugNormalized || pName.replace(/\s+/g, '-') === slugLower;
    });

    return match ? { exists: true, id: match.id, name: match.name } : { exists: false };
  } catch (e) {
    console.error('[Cleanup] Error checking Supabase:', e);
    return { exists: false };
  }
}

async function findGitHubRepo(repoName: string): Promise<{ exists: boolean }> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'dennissolver';
  if (!token) return { exists: false };

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return { exists: res.status === 200 };
  } catch {
    return { exists: false };
  }
}

async function findVercelProject(projectName: string): Promise<{ exists: boolean; id?: string }> {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) return { exists: false };

  try {
    const url = teamId
      ? `https://api.vercel.com/v9/projects/${projectName}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectName}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 200) {
      const data = await res.json();
      return { exists: true, id: data.id };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function findElevenLabsAgent(companyName: string, projectSlug: string): Promise<{ exists: boolean; id?: string; name?: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return { exists: false };

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) return { exists: false };

    const data = await res.json();
    const agents = data.agents || [];

    const companyLower = companyName.toLowerCase();
    const slugLower = projectSlug.toLowerCase();
    const companyNormalized = companyLower.replace(/[^a-z0-9]/g, '');

    const match = agents.find((a: any) => {
      const agentName = (a.name || '').toLowerCase();
      const agentNormalized = agentName.replace(/[^a-z0-9]/g, '');
      return (
        agentName.includes(companyLower) ||
        agentName.includes(slugLower) ||
        agentNormalized.includes(companyNormalized) ||
        companyLower.includes(agentName)
      );
    });

    return match ? { exists: true, id: match.agent_id, name: match.name } : { exists: false };
  } catch {
    return { exists: false };
  }
}

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

async function deleteSupabase(projectRef: string): Promise<boolean> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function deleteGitHub(repoName: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'dennissolver';
  if (!token) return false;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function deleteVercel(projectName: string): Promise<boolean> {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) return false;

  try {
    const url = teamId
      ? `https://api.vercel.com/v9/projects/${projectName}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectName}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

async function deleteElevenLabs(agentId: string): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

// ============================================================================
// DELETE WITH VERIFICATION LOOP
// ============================================================================

interface DeleteResult {
  component: string;
  found: boolean;
  deleted: boolean;
  verified: boolean;
  attempts: number;
  id?: string;
  error?: string;
}

async function deleteAndVerify(
  component: string,
  findFn: () => Promise<{ exists: boolean; id?: string }>,
  deleteFn: (id: string) => Promise<boolean>
): Promise<DeleteResult> {
  const startTime = Date.now();
  let attempts = 0;

  // First check if it exists
  let existing = await findFn();

  if (!existing.exists) {
    console.log(`[Cleanup] ${component}: Not found, nothing to delete`);
    return { component, found: false, deleted: true, verified: true, attempts: 0 };
  }

  console.log(`[Cleanup] ${component}: Found (${existing.id}), starting delete-verify loop...`);

  while (attempts < MAX_RETRIES && (Date.now() - startTime) < MAX_WAIT_MS) {
    attempts++;

    // Delete
    console.log(`[Cleanup] ${component}: Delete attempt ${attempts}/${MAX_RETRIES}...`);
    const deleteSuccess = await deleteFn(existing.id!);

    if (!deleteSuccess) {
      console.log(`[Cleanup] ${component}: Delete call failed, retrying...`);
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      continue;
    }

    // Verify deletion with polling
    let verifyAttempts = 0;
    const maxVerifyAttempts = 10;

    while (verifyAttempts < maxVerifyAttempts) {
      verifyAttempts++;
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

      const check = await findFn();
      if (!check.exists) {
        console.log(`[Cleanup] ${component}: ✓ Verified deleted after ${attempts} delete attempt(s), ${verifyAttempts} verify check(s)`);
        return {
          component,
          found: true,
          deleted: true,
          verified: true,
          attempts,
          id: existing.id,
        };
      }

      console.log(`[Cleanup] ${component}: Still exists, verify check ${verifyAttempts}/${maxVerifyAttempts}...`);
    }

    // Still exists after verify attempts, will retry delete
    console.log(`[Cleanup] ${component}: Still exists after verify checks, retrying delete...`);
    existing = await findFn(); // Refresh the ID in case it changed
  }

  // Failed to delete after all retries
  console.error(`[Cleanup] ${component}: ✗ Failed to verify deletion after ${attempts} attempts`);
  return {
    component,
    found: true,
    deleted: false,
    verified: false,
    attempts,
    id: existing.id,
    error: `Failed to delete after ${attempts} attempts`,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { projectSlug, companyName } = body;

    if (!projectSlug) {
      return NextResponse.json({ error: 'projectSlug required' }, { status: 400 });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Cleanup] Starting verified cleanup for: ${projectSlug}`);
    console.log(`${'='.repeat(60)}`);

    const results: DeleteResult[] = [];

    // ========================================================================
    // 1. SUPABASE - Delete and verify
    // ========================================================================
    const supabaseResult = await deleteAndVerify(
      'Supabase',
      () => findSupabaseProject(projectSlug),
      (id) => deleteSupabase(id)
    );
    results.push(supabaseResult);

    // ========================================================================
    // 2. GITHUB - Delete and verify
    // ========================================================================
    const githubResult = await deleteAndVerify(
      'GitHub',
      () => findGitHubRepo(projectSlug),
      () => deleteGitHub(projectSlug) // GitHub uses name, not ID
    );
    results.push(githubResult);

    // ========================================================================
    // 3. VERCEL - Delete and verify
    // ========================================================================
    const vercelResult = await deleteAndVerify(
      'Vercel',
      () => findVercelProject(projectSlug),
      () => deleteVercel(projectSlug) // Vercel uses name, not ID
    );
    results.push(vercelResult);

    // ========================================================================
    // 4. ELEVENLABS - Delete and verify
    // ========================================================================
    const elevenlabsResult = await deleteAndVerify(
      'ElevenLabs',
      () => findElevenLabsAgent(companyName || projectSlug, projectSlug),
      (id) => deleteElevenLabs(id)
    );
    results.push(elevenlabsResult);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    const allVerified = results.every(r => r.verified);
    const duration = Date.now() - startTime;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Cleanup] ${allVerified ? '✓ ALL VERIFIED DELETED' : '✗ SOME DELETIONS FAILED'}`);
    results.forEach(r => {
      const status = r.verified ? '✓' : '✗';
      const detail = r.found ? `deleted (${r.attempts} attempts)` : 'not found';
      console.log(`  ${status} ${r.component}: ${detail}`);
    });
    console.log(`[Cleanup] Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`${'='.repeat(60)}\n`);

    return NextResponse.json({
      success: allVerified,
      allVerifiedDeleted: allVerified,
      results,
      summary: {
        supabase: supabaseResult.verified,
        github: githubResult.verified,
        vercel: vercelResult.verified,
        elevenlabs: elevenlabsResult.verified,
      },
      duration,
    });

  } catch (error: any) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'cleanup',
    version: 'v2-verified',
    description: 'Delete-verify-retry loop for each component',
    flow: 'Delete → Verify deleted → Retry if needed → Confirm',
    components: ['Supabase', 'GitHub', 'Vercel', 'ElevenLabs'],
    config: {
      maxRetries: MAX_RETRIES,
      pollIntervalMs: POLL_INTERVAL_MS,
      maxWaitMs: MAX_WAIT_MS,
    },
  });
}
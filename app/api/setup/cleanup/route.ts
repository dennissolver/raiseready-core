// app/api/setup/cleanup/route.ts
// ============================================================================
// CLEANUP v5 - Search using BOTH company name AND website domain
//
// The bug: orchestrator creates projects from website domain (e.g. "lionhearted-business-online")
// but cleanup was searching using company name (e.g. "lionhearted-business-solutions")
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 2000;
const VERIFY_CHECKS = 5;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// SLUG GENERATION - Extract all possible naming patterns
// ============================================================================

function generateSearchPatterns(companyName: string, companyWebsite?: string): string[] {
  const patterns: string[] = [];

  // Pattern 1: From company name
  const fromCompanyName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  patterns.push(fromCompanyName);

  // Pattern 2: Normalized company name (no separators)
  const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!patterns.includes(normalizedCompany)) {
    patterns.push(normalizedCompany);
  }

  // Pattern 3: From website URL
  if (companyWebsite) {
    try {
      const url = new URL(companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`);
      const hostname = url.hostname.replace(/^www\./, '');

      // Get domain without TLD
      const parts = hostname.split('.');
      const domainWithoutTld = parts.slice(0, -1).join('-');

      // Domain + TLD as slug (e.g., "lionhearted-business-online" from "lionheartedbusinesssolutions.online")
      const domainSlug = hostname
        .replace(/\./g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 40);

      if (!patterns.includes(domainSlug)) {
        patterns.push(domainSlug);
      }

      // Just the domain part
      if (domainWithoutTld && !patterns.includes(domainWithoutTld)) {
        patterns.push(domainWithoutTld);
      }

      // Split camelCase/joined words in domain
      // "lionheartedbusinesssolutions" → "lionhearted-business-solutions"
      const splitDomain = domainWithoutTld
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
      if (!patterns.includes(splitDomain) && splitDomain !== domainWithoutTld) {
        patterns.push(splitDomain);
      }

    } catch (e) {
      console.log(`[Cleanup] Failed to parse website URL: ${companyWebsite}`);
    }
  }

  // Remove empty patterns and dedupe
  return [...new Set(patterns.filter(p => p && p.length > 0))];
}

function normalizeForMatch(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ============================================================================
// FIND FUNCTIONS - Search for ANY matching pattern
// ============================================================================

interface FindResult {
  exists: boolean;
  id?: string;
  name?: string;
  matchedPattern?: string;
}

async function findSupabaseProject(patterns: string[]): Promise<FindResult> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return { exists: false };

  try {
    const res = await fetch('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { exists: false };

    const projects = await res.json();

    console.log(`[Cleanup] Supabase: Searching for patterns: ${patterns.join(', ')}`);
    console.log(`[Cleanup] Supabase: Found ${projects.length} projects`);

    for (const project of projects) {
      const projectName = (project.name || '').toLowerCase();
      const projectNormalized = normalizeForMatch(projectName);

      for (const pattern of patterns) {
        const patternNormalized = normalizeForMatch(pattern);

        // Check various match conditions
        if (
          projectName === pattern ||
          projectNormalized === patternNormalized ||
          projectName.includes(pattern) ||
          pattern.includes(projectName) ||
          projectNormalized.includes(patternNormalized) ||
          patternNormalized.includes(projectNormalized)
        ) {
          console.log(`[Cleanup] Supabase: ✓ MATCHED "${project.name}" via pattern "${pattern}"`);
          return { exists: true, id: project.id, name: project.name, matchedPattern: pattern };
        }
      }
    }

    console.log('[Cleanup] Supabase: No matching project found');
    return { exists: false };
  } catch (e) {
    console.error('[Cleanup] Supabase error:', e);
    return { exists: false };
  }
}

async function findGitHubRepo(patterns: string[]): Promise<FindResult> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'dennissolver';
  if (!token) return { exists: false };

  console.log(`[Cleanup] GitHub: Searching for patterns: ${patterns.join(', ')}`);

  // Try each pattern directly first (faster)
  for (const pattern of patterns) {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${pattern}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (res.status === 200) {
        const data = await res.json();
        console.log(`[Cleanup] GitHub: ✓ Found repo "${data.name}" via direct pattern "${pattern}"`);
        return { exists: true, id: data.name, name: data.name, matchedPattern: pattern };
      }
    } catch {}
  }

  // Fall back to listing repos and searching
  try {
    const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return { exists: false };

    const repos = await res.json();
    console.log(`[Cleanup] GitHub: Checking ${repos.length} repos for pattern matches...`);

    for (const repo of repos) {
      const repoName = (repo.name || '').toLowerCase();
      const repoNormalized = normalizeForMatch(repoName);

      for (const pattern of patterns) {
        const patternNormalized = normalizeForMatch(pattern);

        if (
          repoName === pattern ||
          repoNormalized === patternNormalized ||
          repoName.includes(pattern) ||
          pattern.includes(repoName) ||
          repoNormalized.includes(patternNormalized) ||
          patternNormalized.includes(repoNormalized)
        ) {
          console.log(`[Cleanup] GitHub: ✓ MATCHED "${repo.name}" via pattern "${pattern}"`);
          return { exists: true, id: repo.name, name: repo.name, matchedPattern: pattern };
        }
      }
    }
  } catch (e) {
    console.error('[Cleanup] GitHub error:', e);
  }

  console.log('[Cleanup] GitHub: No matching repo found');
  return { exists: false };
}

async function findVercelProject(patterns: string[]): Promise<FindResult> {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) return { exists: false };

  console.log(`[Cleanup] Vercel: Searching for patterns: ${patterns.join(', ')}`);

  // Try direct lookup first (faster)
  for (const pattern of patterns) {
    try {
      const url = teamId
        ? `https://api.vercel.com/v9/projects/${pattern}?teamId=${teamId}`
        : `https://api.vercel.com/v9/projects/${pattern}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200) {
        const data = await res.json();
        console.log(`[Cleanup] Vercel: ✓ Found project "${data.name}" via direct pattern "${pattern}"`);
        return { exists: true, id: data.id, name: data.name, matchedPattern: pattern };
      }
    } catch {}
  }

  // Fall back to listing all projects
  try {
    const url = teamId
      ? `https://api.vercel.com/v9/projects?teamId=${teamId}&limit=100`
      : `https://api.vercel.com/v9/projects?limit=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { exists: false };

    const data = await res.json();
    const projects = data.projects || [];
    console.log(`[Cleanup] Vercel: Checking ${projects.length} projects for pattern matches...`);

    for (const project of projects) {
      const projectName = (project.name || '').toLowerCase();
      const projectNormalized = normalizeForMatch(projectName);

      for (const pattern of patterns) {
        const patternNormalized = normalizeForMatch(pattern);

        if (
          projectName === pattern ||
          projectNormalized === patternNormalized ||
          projectName.includes(pattern) ||
          pattern.includes(projectName) ||
          projectNormalized.includes(patternNormalized) ||
          patternNormalized.includes(projectNormalized)
        ) {
          console.log(`[Cleanup] Vercel: ✓ MATCHED "${project.name}" via pattern "${pattern}"`);
          return { exists: true, id: project.id, name: project.name, matchedPattern: pattern };
        }
      }
    }
  } catch (e) {
    console.error('[Cleanup] Vercel error:', e);
  }

  console.log('[Cleanup] Vercel: No matching project found');
  return { exists: false };
}

async function findAllElevenLabsAgents(patterns: string[]): Promise<Array<{agent_id: string, name: string}>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const agents = data.agents || [];

    console.log(`[Cleanup] ElevenLabs: Searching for patterns: ${patterns.join(', ')}`);
    console.log(`[Cleanup] ElevenLabs: Found ${agents.length} agents`);

    const matches: Array<{agent_id: string, name: string}> = [];

    for (const agent of agents) {
      const agentName = (agent.name || '').toLowerCase();
      const agentNormalized = normalizeForMatch(agentName);

      for (const pattern of patterns) {
        const patternNormalized = normalizeForMatch(pattern);

        if (
          agentName.includes(pattern) ||
          pattern.includes(agentName) ||
          agentNormalized.includes(patternNormalized) ||
          patternNormalized.includes(agentNormalized)
        ) {
          console.log(`[Cleanup] ElevenLabs: ✓ MATCHED "${agent.name}" via pattern "${pattern}"`);
          matches.push({ agent_id: agent.agent_id, name: agent.name });
          break; // Don't add same agent multiple times
        }
      }
    }

    if (matches.length === 0) {
      console.log('[Cleanup] ElevenLabs: No matching agents found');
    }

    return matches;
  } catch (e) {
    console.error('[Cleanup] ElevenLabs error:', e);
    return [];
  }
}

// ============================================================================
// DELETE FUNCTIONS
// ============================================================================

async function deleteSupabase(projectId: string): Promise<boolean> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return false;

  try {
    console.log(`[Cleanup] Supabase: Deleting project ${projectId}...`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[Cleanup] Supabase: DELETE response: ${res.status}`);
    return res.ok || res.status === 404;
  } catch (e) {
    console.error('[Cleanup] Supabase DELETE error:', e);
    return false;
  }
}

async function deleteGitHub(repoName: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'dennissolver';
  if (!token) return false;

  try {
    console.log(`[Cleanup] GitHub: Deleting ${owner}/${repoName}...`);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log(`[Cleanup] GitHub: DELETE response: ${res.status}`);
    return res.ok || res.status === 404;
  } catch (e) {
    console.error('[Cleanup] GitHub DELETE error:', e);
    return false;
  }
}

async function deleteVercel(projectId: string): Promise<boolean> {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) return false;

  try {
    const url = teamId
      ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}`;

    console.log(`[Cleanup] Vercel: Deleting project ${projectId}...`);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[Cleanup] Vercel: DELETE response: ${res.status}`);
    return res.ok || res.status === 404;
  } catch (e) {
    console.error('[Cleanup] Vercel DELETE error:', e);
    return false;
  }
}

async function deleteElevenLabsAgent(agentId: string): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return false;

  try {
    console.log(`[Cleanup] ElevenLabs: Deleting agent ${agentId}...`);
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
    });
    console.log(`[Cleanup] ElevenLabs: DELETE response: ${res.status}`);
    return res.ok || res.status === 404;
  } catch (e) {
    console.error('[Cleanup] ElevenLabs DELETE error:', e);
    return false;
  }
}

// ============================================================================
// DELETE & VERIFY
// ============================================================================

interface DeleteResult {
  component: string;
  found: boolean;
  deleted: boolean;
  verified: boolean;
  attempts: number;
  resourceName?: string;
  resourceId?: string;
  matchedPattern?: string;
  error?: string;
}

async function deleteAndVerifySupabase(patterns: string[]): Promise<DeleteResult> {
  const result: DeleteResult = { component: 'Supabase', found: false, deleted: false, verified: false, attempts: 0 };

  const found = await findSupabaseProject(patterns);
  if (!found.exists) {
    return { ...result, verified: true };
  }

  result.found = true;
  result.resourceName = found.name;
  result.resourceId = found.id;
  result.matchedPattern = found.matchedPattern;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    result.attempts = attempt;

    await deleteSupabase(found.id!);
    result.deleted = true;

    for (let i = 1; i <= VERIFY_CHECKS; i++) {
      await wait(POLL_INTERVAL_MS);
      const stillExists = await findSupabaseProject(patterns);
      if (!stillExists.exists) {
        console.log(`[Cleanup] Supabase: ✓ Verified deleted`);
        return { ...result, verified: true };
      }
      console.log(`[Cleanup] Supabase: Still exists, check ${i}/${VERIFY_CHECKS}`);
    }
  }

  result.error = 'Failed to verify deletion';
  return result;
}

async function deleteAndVerifyGitHub(patterns: string[]): Promise<DeleteResult> {
  const result: DeleteResult = { component: 'GitHub', found: false, deleted: false, verified: false, attempts: 0 };

  const found = await findGitHubRepo(patterns);
  if (!found.exists) {
    return { ...result, verified: true };
  }

  result.found = true;
  result.resourceName = found.name;
  result.resourceId = found.id;
  result.matchedPattern = found.matchedPattern;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    result.attempts = attempt;

    await deleteGitHub(found.name!);
    result.deleted = true;

    for (let i = 1; i <= VERIFY_CHECKS; i++) {
      await wait(POLL_INTERVAL_MS);
      const stillExists = await findGitHubRepo(patterns);
      if (!stillExists.exists) {
        console.log(`[Cleanup] GitHub: ✓ Verified deleted`);
        return { ...result, verified: true };
      }
      console.log(`[Cleanup] GitHub: Still exists, check ${i}/${VERIFY_CHECKS}`);
    }
  }

  result.error = 'Failed to verify deletion';
  return result;
}

async function deleteAndVerifyVercel(patterns: string[]): Promise<DeleteResult> {
  const result: DeleteResult = { component: 'Vercel', found: false, deleted: false, verified: false, attempts: 0 };

  const found = await findVercelProject(patterns);
  if (!found.exists) {
    return { ...result, verified: true };
  }

  result.found = true;
  result.resourceName = found.name;
  result.resourceId = found.id;
  result.matchedPattern = found.matchedPattern;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    result.attempts = attempt;

    await deleteVercel(found.id!);
    result.deleted = true;

    for (let i = 1; i <= VERIFY_CHECKS; i++) {
      await wait(POLL_INTERVAL_MS);
      const stillExists = await findVercelProject(patterns);
      if (!stillExists.exists) {
        console.log(`[Cleanup] Vercel: ✓ Verified deleted`);
        return { ...result, verified: true };
      }
      console.log(`[Cleanup] Vercel: Still exists, check ${i}/${VERIFY_CHECKS}`);
    }
  }

  result.error = 'Failed to verify deletion';
  return result;
}

async function deleteAndVerifyElevenLabs(patterns: string[]): Promise<DeleteResult> {
  const result: DeleteResult = { component: 'ElevenLabs', found: false, deleted: false, verified: false, attempts: 0 };

  const agents = await findAllElevenLabsAgents(patterns);
  if (agents.length === 0) {
    return { ...result, verified: true };
  }

  result.found = true;
  result.resourceName = agents.map(a => a.name).join(', ');
  result.resourceId = agents.map(a => a.agent_id).join(', ');

  const agentIds = new Set(agents.map(a => a.agent_id));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    result.attempts = attempt;

    // Delete all known agents
    for (const id of agentIds) {
      await deleteElevenLabsAgent(id);
    }
    result.deleted = true;

    for (let i = 1; i <= VERIFY_CHECKS; i++) {
      await wait(POLL_INTERVAL_MS);
      const remaining = await findAllElevenLabsAgents(patterns);

      if (remaining.length === 0) {
        console.log(`[Cleanup] ElevenLabs: ✓ All agents verified deleted`);
        return { ...result, verified: true };
      }

      // Add any newly found agents to delete list
      for (const a of remaining) {
        if (!agentIds.has(a.agent_id)) {
          console.log(`[Cleanup] ElevenLabs: Adding new agent to delete: ${a.name}`);
          agentIds.add(a.agent_id);
        }
      }

      console.log(`[Cleanup] ElevenLabs: ${remaining.length} agent(s) remain, check ${i}/${VERIFY_CHECKS}`);
    }
  }

  result.error = 'Failed to verify all agents deleted';
  return result;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { projectSlug, companyName, companyWebsite } = body;

    if (!companyName) {
      return NextResponse.json(
        { success: false, error: 'Missing companyName' },
        { status: 400 }
      );
    }

    // Generate all possible search patterns
    const patterns = generateSearchPatterns(companyName, companyWebsite);

    console.log('============================================================');
    console.log('[Cleanup v5] Starting multi-pattern cleanup');
    console.log(`[Cleanup] Company Name: "${companyName}"`);
    console.log(`[Cleanup] Website: "${companyWebsite || 'not provided'}"`);
    console.log(`[Cleanup] Search Patterns: ${patterns.join(', ')}`);
    console.log('============================================================');

    // Run cleanup for each service
    const [supabaseResult, githubResult, vercelResult, elevenLabsResult] = await Promise.all([
      deleteAndVerifySupabase(patterns),
      deleteAndVerifyGitHub(patterns),
      deleteAndVerifyVercel(patterns),
      deleteAndVerifyElevenLabs(patterns),
    ]);

    const results = [supabaseResult, githubResult, vercelResult, elevenLabsResult];
    const allVerified = results.every(r => r.verified);
    const duration = Date.now() - startTime;

    console.log('============================================================');
    console.log(`[Cleanup] ${allVerified ? '✓ ALL VERIFIED' : '✗ SOME FAILED'}`);
    results.forEach(r => {
      const status = r.verified ? '✓' : '✗';
      const detail = r.found
        ? `found "${r.resourceName}" (pattern: ${r.matchedPattern}) → ${r.verified ? 'deleted' : r.error}`
        : 'not found';
      console.log(`  ${status} ${r.component}: ${detail}`);
    });
    console.log(`[Cleanup] Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log('============================================================');

    return NextResponse.json({
      success: allVerified,
      allVerifiedDeleted: allVerified,
      results,
      duration,
      searchPatterns: patterns,
    });

  } catch (error: any) {
    console.error('[Cleanup] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        allVerifiedDeleted: false,
        error: error.message || 'Cleanup failed',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
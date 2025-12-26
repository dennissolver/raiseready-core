// app/api/setup/cleanup/route.ts
// ============================================================================
// CLEANUP v6 - AGGRESSIVE MATCHING
//
// Key insight: "lionhearted-business-solutions" vs "lionhearted-business-online"
// Both share prefix "lionhearted-business" - use prefix matching!
//
// This version:
// 1. Logs ALL resources found in each service
// 2. Uses prefix matching (first 2 words of company name)
// 3. Uses fuzzy matching (shared character sequences)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 2000;
const VERIFY_CHECKS = 5;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// PATTERN GENERATION - More patterns including prefixes
// ============================================================================

function generateSearchPatterns(companyName: string, companyWebsite?: string): string[] {
  const patterns: string[] = [];

  // Pattern 1: Full company name slug
  const fullSlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  patterns.push(fullSlug);

  // Pattern 2: First 2 words (PREFIX MATCHING) - KEY FIX!
  // "lionhearted-business-solutions" → "lionhearted-business"
  const words = fullSlug.split('-');
  if (words.length >= 2) {
    patterns.push(words.slice(0, 2).join('-')); // first 2 words
  }
  if (words.length >= 1) {
    patterns.push(words[0]); // first word only
  }

  // Pattern 3: Normalized (no separators)
  const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  patterns.push(normalized);

  // Pattern 4: From website
  if (companyWebsite) {
    try {
      const url = new URL(companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`);
      const hostname = url.hostname.replace(/^www\./, '');

      // Full domain with TLD: lionheartedbusinesssolutions-online
      patterns.push(hostname.replace(/\./g, '-'));

      // Domain without TLD
      const parts = hostname.split('.');
      const domainOnly = parts[0];
      patterns.push(domainOnly);

      // TLD as suffix: lionhearted-business-online
      if (parts.length >= 2) {
        const tld = parts[parts.length - 1];
        // Try: first-two-words-tld
        if (words.length >= 2) {
          patterns.push(`${words.slice(0, 2).join('-')}-${tld}`);
        }
        // Try: first-word-tld
        if (words.length >= 1) {
          patterns.push(`${words[0]}-${tld}`);
        }
      }
    } catch (e) {
      console.log(`[Cleanup] Could not parse website: ${companyWebsite}`);
    }
  }

  // Dedupe and clean
  return [...new Set(patterns.filter(p => p && p.length > 2))];
}

// ============================================================================
// MATCHING FUNCTION - Check if a resource name matches any pattern
// ============================================================================

function matchesAnyPattern(resourceName: string, patterns: string[]): { matches: boolean; pattern?: string; reason?: string } {
  const nameLower = resourceName.toLowerCase();
  const nameNormalized = nameLower.replace(/[^a-z0-9]/g, '');

  for (const pattern of patterns) {
    const patternNormalized = pattern.replace(/[^a-z0-9]/g, '');

    // Exact match
    if (nameLower === pattern) {
      return { matches: true, pattern, reason: 'exact' };
    }

    // Normalized exact match
    if (nameNormalized === patternNormalized) {
      return { matches: true, pattern, reason: 'normalized-exact' };
    }

    // Prefix match (resource starts with pattern)
    if (nameLower.startsWith(pattern)) {
      return { matches: true, pattern, reason: 'prefix' };
    }

    // Contains match
    if (nameLower.includes(pattern) && pattern.length >= 8) {
      return { matches: true, pattern, reason: 'contains' };
    }

    // Normalized contains (for patterns without hyphens)
    if (nameNormalized.includes(patternNormalized) && patternNormalized.length >= 8) {
      return { matches: true, pattern, reason: 'normalized-contains' };
    }

    // Reverse contains (pattern contains name) - for short resource names
    if (pattern.includes(nameLower) && nameLower.length >= 8) {
      return { matches: true, pattern, reason: 'reverse-contains' };
    }
  }

  return { matches: false };
}

// ============================================================================
// FIND FUNCTIONS - List all and match
// ============================================================================

interface FindResult {
  exists: boolean;
  id?: string;
  name?: string;
  matchReason?: string;
  matchedPattern?: string;
}

async function findSupabaseProject(patterns: string[]): Promise<FindResult> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.log('[Cleanup] Supabase: No access token');
    return { exists: false };
  }

  try {
    const res = await fetch('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.log(`[Cleanup] Supabase: API error ${res.status}`);
      return { exists: false };
    }

    const projects = await res.json();

    console.log(`[Cleanup] Supabase: Checking ${projects.length} projects against patterns: [${patterns.join(', ')}]`);
    projects.forEach((p: any) => console.log(`  - "${p.name}" (${p.id})`));

    for (const project of projects) {
      const match = matchesAnyPattern(project.name || '', patterns);
      if (match.matches) {
        console.log(`[Cleanup] Supabase: ✓ MATCHED "${project.name}" via ${match.reason} (pattern: ${match.pattern})`);
        return {
          exists: true,
          id: project.id,
          name: project.name,
          matchReason: match.reason,
          matchedPattern: match.pattern
        };
      }
    }

    console.log('[Cleanup] Supabase: No match found');
    return { exists: false };
  } catch (e) {
    console.error('[Cleanup] Supabase error:', e);
    return { exists: false };
  }
}

async function findGitHubRepo(patterns: string[]): Promise<FindResult> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'dennissolver';
  if (!token) {
    console.log('[Cleanup] GitHub: No token');
    return { exists: false };
  }

  try {
    const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100&sort=updated`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) {
      console.log(`[Cleanup] GitHub: API error ${res.status}`);
      return { exists: false };
    }

    const repos = await res.json();

    console.log(`[Cleanup] GitHub: Checking ${repos.length} repos against patterns: [${patterns.join(', ')}]`);
    repos.slice(0, 30).forEach((r: any) => console.log(`  - "${r.name}"`));

    for (const repo of repos) {
      const match = matchesAnyPattern(repo.name || '', patterns);
      if (match.matches) {
        console.log(`[Cleanup] GitHub: ✓ MATCHED "${repo.name}" via ${match.reason} (pattern: ${match.pattern})`);
        return {
          exists: true,
          id: repo.name,
          name: repo.name,
          matchReason: match.reason,
          matchedPattern: match.pattern
        };
      }
    }

    console.log('[Cleanup] GitHub: No match found');
    return { exists: false };
  } catch (e) {
    console.error('[Cleanup] GitHub error:', e);
    return { exists: false };
  }
}

async function findVercelProject(patterns: string[]): Promise<FindResult> {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) {
    console.log('[Cleanup] Vercel: No token');
    return { exists: false };
  }

  try {
    const url = teamId
      ? `https://api.vercel.com/v9/projects?teamId=${teamId}&limit=100`
      : `https://api.vercel.com/v9/projects?limit=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.log(`[Cleanup] Vercel: API error ${res.status}`);
      return { exists: false };
    }

    const data = await res.json();
    const projects = data.projects || [];

    console.log(`[Cleanup] Vercel: Checking ${projects.length} projects against patterns: [${patterns.join(', ')}]`);
    projects.forEach((p: any) => console.log(`  - "${p.name}" (${p.id})`));

    for (const project of projects) {
      const match = matchesAnyPattern(project.name || '', patterns);
      if (match.matches) {
        console.log(`[Cleanup] Vercel: ✓ MATCHED "${project.name}" via ${match.reason} (pattern: ${match.pattern})`);
        return {
          exists: true,
          id: project.id,
          name: project.name,
          matchReason: match.reason,
          matchedPattern: match.pattern
        };
      }
    }

    console.log('[Cleanup] Vercel: No match found');
    return { exists: false };
  } catch (e) {
    console.error('[Cleanup] Vercel error:', e);
    return { exists: false };
  }
}

async function findAllElevenLabsAgents(patterns: string[]): Promise<Array<{agent_id: string, name: string, matchReason?: string}>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.log('[Cleanup] ElevenLabs: No API key');
    return [];
  }

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) {
      console.log(`[Cleanup] ElevenLabs: API error ${res.status}`);
      return [];
    }

    const data = await res.json();
    const agents = data.agents || [];

    console.log(`[Cleanup] ElevenLabs: Checking ${agents.length} agents against patterns: [${patterns.join(', ')}]`);
    agents.forEach((a: any) => console.log(`  - "${a.name}" (${a.agent_id})`));

    const matches: Array<{agent_id: string, name: string, matchReason?: string}> = [];

    for (const agent of agents) {
      const match = matchesAnyPattern(agent.name || '', patterns);
      if (match.matches) {
        console.log(`[Cleanup] ElevenLabs: ✓ MATCHED "${agent.name}" via ${match.reason} (pattern: ${match.pattern})`);
        matches.push({ agent_id: agent.agent_id, name: agent.name, matchReason: match.reason });
      }
    }

    if (matches.length === 0) {
      console.log('[Cleanup] ElevenLabs: No matches found');
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
    console.log(`[Cleanup] Supabase: DELETE ${projectId}`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[Cleanup] Supabase: Response ${res.status}`);
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
    console.log(`[Cleanup] GitHub: DELETE ${owner}/${repoName}`);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    console.log(`[Cleanup] GitHub: Response ${res.status}`);
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

    console.log(`[Cleanup] Vercel: DELETE ${projectId}`);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`[Cleanup] Vercel: Response ${res.status}`);
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
    console.log(`[Cleanup] ElevenLabs: DELETE ${agentId}`);
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': apiKey },
    });
    console.log(`[Cleanup] ElevenLabs: Response ${res.status}`);
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
  matchReason?: string;
  error?: string;
}

async function deleteAndVerify(
  component: string,
  patterns: string[],
  findFn: (patterns: string[]) => Promise<FindResult>,
  deleteFn: (id: string) => Promise<boolean>
): Promise<DeleteResult> {
  const result: DeleteResult = { component, found: false, deleted: false, verified: false, attempts: 0 };

  const found = await findFn(patterns);
  if (!found.exists) {
    return { ...result, verified: true };
  }

  result.found = true;
  result.resourceName = found.name;
  result.resourceId = found.id;
  result.matchReason = found.matchReason;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    result.attempts = attempt;

    const deleteSuccess = await deleteFn(found.id!);
    if (!deleteSuccess) {
      result.error = 'DELETE request failed';
      continue;
    }
    result.deleted = true;

    for (let i = 1; i <= VERIFY_CHECKS; i++) {
      await wait(POLL_INTERVAL_MS);
      const stillExists = await findFn(patterns);
      if (!stillExists.exists) {
        console.log(`[Cleanup] ${component}: ✓ Verified deleted`);
        return { ...result, verified: true };
      }
      console.log(`[Cleanup] ${component}: Still exists, check ${i}/${VERIFY_CHECKS}`);
    }
  }

  result.error = result.error || 'Failed to verify deletion';
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

      for (const a of remaining) {
        if (!agentIds.has(a.agent_id)) {
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
    const { companyName, companyWebsite } = body;

    if (!companyName) {
      return NextResponse.json(
        { success: false, error: 'Missing companyName' },
        { status: 400 }
      );
    }

    const patterns = generateSearchPatterns(companyName, companyWebsite);

    console.log('============================================================');
    console.log('[Cleanup v6] AGGRESSIVE PATTERN MATCHING');
    console.log(`[Cleanup] Company: "${companyName}"`);
    console.log(`[Cleanup] Website: "${companyWebsite || 'not provided'}"`);
    console.log(`[Cleanup] Generated ${patterns.length} patterns:`);
    patterns.forEach((p, i) => console.log(`  ${i + 1}. "${p}"`));
    console.log('============================================================');

    // Run cleanup sequentially for better logging
    const supabaseResult = await deleteAndVerify('Supabase', patterns, findSupabaseProject, deleteSupabase);
    const githubResult = await deleteAndVerify('GitHub', patterns, findGitHubRepo, deleteGitHub);
    const vercelResult = await deleteAndVerify('Vercel', patterns, findVercelProject, deleteVercel);
    const elevenLabsResult = await deleteAndVerifyElevenLabs(patterns);

    const results = [supabaseResult, githubResult, vercelResult, elevenLabsResult];
    const allVerified = results.every(r => r.verified);
    const duration = Date.now() - startTime;

    console.log('============================================================');
    console.log(`[Cleanup] RESULT: ${allVerified ? '✓ ALL VERIFIED' : '✗ SOME FAILED'}`);
    results.forEach(r => {
      const status = r.verified ? '✓' : '✗';
      const detail = r.found
        ? `"${r.resourceName}" (${r.matchReason}) → ${r.verified ? 'DELETED' : r.error}`
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
      patterns,
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
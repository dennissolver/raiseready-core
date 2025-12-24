// app/api/setup/cleanup/route.ts
// ============================================================================
// CLEANUP ORCHESTRATOR
//
// Deletes all resources created for a platform deployment.
// Use when deployment fails and you need to start fresh.
//
// Can be called with:
// 1. projectSlug - derives all resource names from the slug
// 2. Explicit resource IDs - for partial cleanup
//
// Order matters! Delete in reverse order of creation:
// 1. Vercel (depends on GitHub)
// 2. GitHub
// 3. Supabase
// 4. ElevenLabs
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

interface CleanupRequest {
  // Option 1: Just the project slug (will derive names)
  projectSlug?: string;

  // Option 2: Explicit resource identifiers
  resources?: {
    vercel?: { projectId?: string; projectName?: string };
    github?: { repoName?: string };
    supabase?: { projectRef?: string };
    elevenlabs?: { agentId?: string };
  };

  // Options
  skipVercel?: boolean;
  skipGitHub?: boolean;
  skipSupabase?: boolean;
  skipElevenLabs?: boolean;
}

interface CleanupResult {
  success: boolean;
  results: {
    vercel?: { success: boolean; error?: string };
    github?: { success: boolean; error?: string };
    supabase?: { success: boolean; error?: string };
    elevenlabs?: { success: boolean; error?: string };
  };
  errors: string[];
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

async function callDeleteTool(
  baseUrl: string,
  tool: string,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/setup/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok && res.status !== 404) {
      return { success: false, error: data.error || `${tool} failed` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CleanupRequest = await request.json();
    const baseUrl = getBaseUrl(request);

    const results: CleanupResult['results'] = {};
    const errors: string[] = [];

    // Derive resource names from slug if provided
    const projectSlug = body.projectSlug;
    const resources = body.resources || {};

    // Determine what to delete
    const vercelId = resources.vercel?.projectId || resources.vercel?.projectName || projectSlug;
    const githubRepo = resources.github?.repoName || projectSlug;
    const supabaseRef = resources.supabase?.projectRef; // Can't derive this from slug
    const elevenlabsAgent = resources.elevenlabs?.agentId; // Can't derive this from slug

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Cleanup] Starting cleanup${projectSlug ? ` for: ${projectSlug}` : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    // ========================================================================
    // Step 1: Delete Vercel (do first - it depends on GitHub)
    // ========================================================================
    if (!body.skipVercel && vercelId) {
      console.log(`[Cleanup] Deleting Vercel project: ${vercelId}`);
      const result = await callDeleteTool(baseUrl, 'delete-vercel', {
        projectName: vercelId,
      });
      results.vercel = result;
      if (!result.success) {
        errors.push(`Vercel: ${result.error}`);
      }
    } else if (!body.skipVercel) {
      console.log(`[Cleanup] Skipping Vercel - no identifier provided`);
    }

    // ========================================================================
    // Step 2: Delete GitHub
    // ========================================================================
    if (!body.skipGitHub && githubRepo) {
      console.log(`[Cleanup] Deleting GitHub repo: ${githubRepo}`);
      const result = await callDeleteTool(baseUrl, 'delete-github', {
        repoName: githubRepo,
      });
      results.github = result;
      if (!result.success) {
        errors.push(`GitHub: ${result.error}`);
      }
    } else if (!body.skipGitHub) {
      console.log(`[Cleanup] Skipping GitHub - no identifier provided`);
    }

    // ========================================================================
    // Step 3: Delete Supabase
    // ========================================================================
    if (!body.skipSupabase && supabaseRef) {
      console.log(`[Cleanup] Deleting Supabase project: ${supabaseRef}`);
      const result = await callDeleteTool(baseUrl, 'delete-supabase', {
        projectRef: supabaseRef,
      });
      results.supabase = result;
      if (!result.success) {
        errors.push(`Supabase: ${result.error}`);
      }
    } else if (!body.skipSupabase && !supabaseRef) {
      console.log(`[Cleanup] Skipping Supabase - no projectRef provided (can't derive from slug)`);
    }

    // ========================================================================
    // Step 4: Delete ElevenLabs
    // ========================================================================
    if (!body.skipElevenLabs && elevenlabsAgent) {
      console.log(`[Cleanup] Deleting ElevenLabs agent: ${elevenlabsAgent}`);
      const result = await callDeleteTool(baseUrl, 'delete-elevenlabs', {
        agentId: elevenlabsAgent,
      });
      results.elevenlabs = result;
      if (!result.success) {
        errors.push(`ElevenLabs: ${result.error}`);
      }
    } else if (!body.skipElevenLabs && !elevenlabsAgent) {
      console.log(`[Cleanup] Skipping ElevenLabs - no agentId provided (can't derive from slug)`);
    }

    // ========================================================================
    // Summary
    // ========================================================================
    const allSuccess = errors.length === 0;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Cleanup] ${allSuccess ? 'Complete' : 'Completed with errors'}`);
    if (errors.length > 0) {
      console.log(`[Cleanup] Errors: ${errors.join(', ')}`);
    }
    console.log(`${'='.repeat(60)}\n`);

    return NextResponse.json({
      success: allSuccess,
      results,
      errors,
    } as CleanupResult);

  } catch (error: any) {
    console.error('[Cleanup] Fatal error:', error);
    return NextResponse.json(
      { success: false, results: {}, errors: [error.message] },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    service: 'cleanup',
    description: 'Deletes all resources created for a platform deployment',
    method: 'POST',
    params: {
      projectSlug: 'string (optional) - derives Vercel/GitHub names from this',
      resources: {
        vercel: '{ projectId?, projectName? }',
        github: '{ repoName? }',
        supabase: '{ projectRef? } - required for Supabase cleanup',
        elevenlabs: '{ agentId? } - required for ElevenLabs cleanup',
      },
      skipVercel: 'boolean (optional)',
      skipGitHub: 'boolean (optional)',
      skipSupabase: 'boolean (optional)',
      skipElevenLabs: 'boolean (optional)',
    },
    examples: [
      {
        description: 'Cleanup by project slug (Vercel + GitHub only)',
        body: { projectSlug: 'acme-corp' },
      },
      {
        description: 'Full cleanup with all resource IDs',
        body: {
          projectSlug: 'acme-corp',
          resources: {
            supabase: { projectRef: 'abcdefghijkl' },
            elevenlabs: { agentId: 'xyz123' },
          },
        },
      },
    ],
  });
}
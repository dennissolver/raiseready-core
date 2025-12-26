// app/api/setup/orchestrate/route.ts
// ============================================================================
// PLATFORM CREATION ORCHESTRATOR v12
//
// Flow:
// 1. Call cleanup route → Wait for allVerifiedDeleted: true
// 2. Create each component → Verify ready before next
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

interface OrchestrationRequest {
  companyName: string;
  companyWebsite?: string;
  companyEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone?: string;
  agentName?: string;
  voiceGender?: 'female' | 'male';
  branding?: any;
  platformType?: 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';
  platformMode?: 'screening' | 'coaching';
  rollbackOnFailure?: boolean;
  skipPreCleanup?: boolean;
}

interface StepResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'skipped';
  message?: string;
  error?: string;
  duration?: number;
  verified?: boolean;
}

interface Resources {
  supabase: { projectId: string; url: string; anonKey: string; serviceKey: string } | null;
  github: { repoUrl: string; repoName: string; owner: string } | null;
  vercel: { projectId: string; url: string; deploymentId?: string } | null;
  elevenlabs: { agentId: string } | null;
}

// ============================================================================
// READINESS CHECK FUNCTIONS
// ============================================================================

async function isSupabaseReady(url: string, serviceKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function isSupabaseSchemaReady(url: string, serviceKey: string): Promise<{ ready: boolean; missing?: string }> {
  try {
    for (const table of ['founders', 'pitch_decks', 'superadmins']) {
      const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (res.status === 404) return { ready: false, missing: table };
    }
    return { ready: true };
  } catch {
    return { ready: false };
  }
}

async function isSupabaseAuthReady(projectRef: string): Promise<boolean> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function isGitHubReady(owner: string, repoName: string): Promise<{ ready: boolean; fileCount?: number }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ready: false };

  try {
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' };

    const configRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/config/client.ts`, { headers });
    if (!configRes.ok) return { ready: false };

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/main?recursive=1`, { headers });
    if (!treeRes.ok) return { ready: false };

    const treeData = await treeRes.json();
    const fileCount = treeData.tree?.filter((item: any) => item.type === 'blob').length || 0;

    return { ready: fileCount >= 50, fileCount };
  } catch {
    return { ready: false };
  }
}

async function isVercelDeploymentReady(projectId: string): Promise<{ ready: boolean; state?: string; deploymentId?: string }> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return { ready: false };

  try {
    const res = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return { ready: false };

    const data = await res.json();
    const deployment = data.deployments?.[0];

    if (!deployment) return { ready: false, state: 'NO_DEPLOYMENT' };

    const state = deployment.readyState || deployment.state;
    return { ready: state === 'READY', state, deploymentId: deployment.id };
  } catch {
    return { ready: false };
  }
}

async function isSiteResponding(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// POLLING HELPER
// ============================================================================

async function pollUntil(
  checkFn: () => Promise<boolean>,
  description: string,
  maxWaitMs: number = 60000,
  pollIntervalMs: number = 3000
): Promise<{ success: boolean; waitedMs: number }> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await checkFn()) {
      const waitedMs = Date.now() - startTime;
      console.log(`[Orchestrator] ✓ ${description} (${(waitedMs/1000).toFixed(1)}s)`);
      return { success: true, waitedMs };
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Orchestrator] Waiting: ${description}... (${elapsed}s)`);
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  console.log(`[Orchestrator] ✗ Timeout: ${description}`);
  return { success: false, waitedMs: Date.now() - startTime };
}

// ============================================================================
// HELPERS
// ============================================================================

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

async function callTool(baseUrl: string, tool: string, payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/setup/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return (res.ok && !data.error) ? { success: true, data } : { success: false, error: data.error || `${tool} failed`, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function getDefaultBranding(body: OrchestrationRequest): any {
  return {
    company: { name: body.companyName, tagline: 'AI-Powered Pitch Coaching', description: `${body.companyName} helps founders perfect their pitch.`, website: body.companyWebsite || '' },
    colors: { primary: '#8B5CF6', accent: '#10B981', background: '#0F172A', text: '#F8FAFC' },
    contact: { email: body.companyEmail },
  };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const steps: StepResult[] = [];
  const resources: Resources = { supabase: null, github: null, vercel: null, elevenlabs: null };

  let projectSlug = '';
  let body: OrchestrationRequest;

  try {
    body = await request.json();
    const baseUrl = getBaseUrl(request);

    if (!body.companyName || !body.companyEmail || !body.adminEmail) {
      return NextResponse.json({ error: 'companyName, companyEmail, and adminEmail required' }, { status: 400 });
    }

    projectSlug = generateSlug(body.companyName);
    const branding = body.branding || getDefaultBranding(body);
    const githubOwner = process.env.GITHUB_OWNER || 'dennissolver';

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[Orchestrator v12] Starting: ${body.companyName} (${projectSlug})`);
    console.log(`${'='.repeat(70)}`);

    // ========================================================================
    // PHASE 1: CLEANUP - Call cleanup route and wait for verified deletion
    // ========================================================================
    if (body.skipPreCleanup !== true) {
      const stepStart = Date.now();
      console.log(`\n[PHASE 1] CLEANUP - Verified deletion of all components`);

      const cleanupRes = await callTool(baseUrl, 'cleanup', {
        projectSlug,
        companyName: body.companyName,
      });

      if (!cleanupRes.success || !cleanupRes.data?.allVerifiedDeleted) {
        const failedComponents = cleanupRes.data?.results
          ?.filter((r: any) => !r.verified)
          ?.map((r: any) => r.component)
          ?.join(', ') || 'unknown';

        steps.push({
          step: 'cleanup',
          status: 'error',
          error: `Cleanup failed for: ${failedComponents}`,
          duration: Date.now() - stepStart,
        });
        throw new Error(`Cleanup verification failed: ${failedComponents}`);
      }

      steps.push({
        step: 'cleanup',
        status: 'success',
        message: 'All components verified deleted',
        duration: Date.now() - stepStart,
        verified: true,
      });
    }

    // ========================================================================
    // PHASE 2: CREATE - Create each component and verify ready
    // ========================================================================
    console.log(`\n[PHASE 2] CREATE - Build all components`);

    // ------------------------------------------------------------------------
    // 2.1 SUPABASE - Create and verify ready
    // ------------------------------------------------------------------------
    let stepStart = Date.now();
    console.log(`\n[2.1] Creating Supabase...`);

    const supabaseRes = await callTool(baseUrl, 'create-supabase', {
      projectName: projectSlug,
      organizationId: process.env.SUPABASE_ORG_ID,
    });

    if (!supabaseRes.success) {
      steps.push({ step: 'supabase', status: 'error', error: supabaseRes.error, duration: Date.now() - stepStart });
      throw new Error(`Supabase: ${supabaseRes.error}`);
    }

    resources.supabase = {
      projectId: supabaseRes.data.projectRef || supabaseRes.data.projectId,
      url: supabaseRes.data.url,
      anonKey: supabaseRes.data.anonKey,
      serviceKey: supabaseRes.data.serviceRoleKey || supabaseRes.data.serviceKey,
    };

    // Verify Supabase is ready for connections
    const supabaseReadyResult = await pollUntil(
      () => isSupabaseReady(resources.supabase!.url, resources.supabase!.serviceKey),
      'Supabase accepting connections',
      60000, 2000
    );

    if (!supabaseReadyResult.success) {
      throw new Error('Supabase did not become ready');
    }

    // Run migrations
    console.log(`[Orchestrator] Running migrations...`);
    const migrationsRes = await callTool(baseUrl, 'run-migrations', {
      supabaseUrl: resources.supabase.url,
      supabaseServiceKey: resources.supabase.serviceKey,
    });

    if (!migrationsRes.success) {
      steps.push({ step: 'supabase', status: 'error', error: migrationsRes.error, duration: Date.now() - stepStart });
      throw new Error(`Migrations: ${migrationsRes.error}`);
    }

    // Verify schema
    const schemaResult = await isSupabaseSchemaReady(resources.supabase.url, resources.supabase.serviceKey);
    if (!schemaResult.ready) {
      throw new Error(`Schema missing table: ${schemaResult.missing}`);
    }

    steps.push({ step: 'supabase', status: 'success', message: `Created: ${resources.supabase.projectId}`, duration: Date.now() - stepStart, verified: true });

    // ------------------------------------------------------------------------
    // 2.2 ELEVENLABS - Create (non-fatal)
    // ------------------------------------------------------------------------
    stepStart = Date.now();
    console.log(`\n[2.2] Creating ElevenLabs agent...`);

    const elevenlabsRes = await callTool(baseUrl, 'create-elevenlabs', {
      agentName: body.agentName || 'Maya',
      voiceGender: body.voiceGender || 'female',
      companyName: body.companyName,
    });

    if (elevenlabsRes.success && elevenlabsRes.data?.agentId) {
      resources.elevenlabs = { agentId: elevenlabsRes.data.agentId };
      steps.push({ step: 'elevenlabs', status: 'success', message: `Agent: ${resources.elevenlabs.agentId}`, duration: Date.now() - stepStart, verified: true });
    } else {
      steps.push({ step: 'elevenlabs', status: 'warning', message: elevenlabsRes.error || 'Skipped', duration: Date.now() - stepStart, verified: true });
    }

    // ------------------------------------------------------------------------
    // 2.3 GITHUB - Create and verify ready
    // ------------------------------------------------------------------------
    stepStart = Date.now();
    console.log(`\n[2.3] Creating GitHub repo...`);

    const githubRes = await callTool(baseUrl, 'create-github', {
      repoName: projectSlug,
      branding,
      companyName: body.companyName,
      admin: { firstName: body.adminFirstName, lastName: body.adminLastName, email: body.adminEmail, phone: body.adminPhone },
      platformMode: body.platformMode || 'screening',
    });

    if (!githubRes.success) {
      steps.push({ step: 'github', status: 'error', error: githubRes.error, duration: Date.now() - stepStart });
      throw new Error(`GitHub: ${githubRes.error}`);
    }

    resources.github = {
      repoUrl: githubRes.data?.repoUrl || `https://github.com/${githubOwner}/${projectSlug}`,
      repoName: githubRes.data?.repoName || projectSlug,
      owner: githubRes.data?.owner || githubOwner,
    };

    // Verify GitHub ready
    const githubReadyResult = await pollUntil(
      async () => (await isGitHubReady(resources.github!.owner, resources.github!.repoName)).ready,
      'GitHub repo ready',
      60000, 3000
    );

    if (!githubReadyResult.success) {
      throw new Error('GitHub repo did not become ready');
    }

    const githubStatus = await isGitHubReady(resources.github.owner, resources.github.repoName);
    steps.push({ step: 'github', status: 'success', message: `${githubStatus.fileCount} files`, duration: Date.now() - stepStart, verified: true });

    // ------------------------------------------------------------------------
    // 2.4 VERCEL - Create project
    // ------------------------------------------------------------------------
    stepStart = Date.now();
    console.log(`\n[2.4] Creating Vercel project...`);

    const vercelRes = await callTool(baseUrl, 'create-vercel', {
      projectName: projectSlug,
      githubRepoName: resources.github.repoName,
      envVars: {
        NEXT_PUBLIC_SUPABASE_URL: resources.supabase.url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: resources.supabase.anonKey,
        SUPABASE_SERVICE_ROLE_KEY: resources.supabase.serviceKey,
        ELEVENLABS_AGENT_ID: resources.elevenlabs?.agentId || '',
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        NEXT_PUBLIC_COMPANY_NAME: body.companyName,
        NEXT_PUBLIC_TAGLINE: branding?.company?.tagline || 'AI-Powered Pitch Coaching',
        NEXT_PUBLIC_PLATFORM_URL: `https://${projectSlug}.vercel.app`,
        NEXT_PUBLIC_SUPABASE_PROJECT_ID: resources.supabase.projectId,
        NEXT_PUBLIC_PLATFORM_TYPE: body.platformType || 'founder_service_provider',
        NEXT_PUBLIC_PLATFORM_MODE: body.platformMode || 'screening',
        NEXT_PUBLIC_COLOR_PRIMARY: branding?.colors?.primary || '#8B5CF6',
        NEXT_PUBLIC_COLOR_ACCENT: branding?.colors?.accent || '#10B981',
        NEXT_PUBLIC_COLOR_BACKGROUND: branding?.colors?.background || '#0F172A',
        NEXT_PUBLIC_COLOR_TEXT: branding?.colors?.text || '#F8FAFC',
        ADMIN_EMAIL: body.adminEmail,
        NEXT_PUBLIC_ADMIN_FIRST_NAME: body.adminFirstName,
        NEXT_PUBLIC_ADMIN_LAST_NAME: body.adminLastName,
        NEXT_PUBLIC_SUPPORT_EMAIL: body.companyEmail,
        NEXT_PUBLIC_COACH_NAME: body.agentName || 'Maya',
      },
    });

    if (!vercelRes.success) {
      steps.push({ step: 'vercel', status: 'error', error: vercelRes.error, duration: Date.now() - stepStart });
      throw new Error(`Vercel: ${vercelRes.error}`);
    }

    resources.vercel = { projectId: vercelRes.data.projectId, url: vercelRes.data.url };
    steps.push({ step: 'vercel', status: 'success', message: 'Project created', duration: Date.now() - stepStart, verified: true });

    // ------------------------------------------------------------------------
    // 2.5 AUTH CONFIG - Wait for auth service ready, then configure
    // ------------------------------------------------------------------------
    stepStart = Date.now();
    console.log(`\n[2.5] Configuring Supabase auth...`);

    const authReadyResult = await pollUntil(
      () => isSupabaseAuthReady(resources.supabase!.projectId),
      'Auth service ready',
      60000, 3000
    );

    if (authReadyResult.success) {
      const authRes = await callTool(baseUrl, 'configure-supabase-auth', {
        projectRef: resources.supabase.projectId,
        siteUrl: resources.vercel.url,
      });
      steps.push({ step: 'auth', status: authRes.success ? 'success' : 'warning', message: authRes.success ? 'Configured' : authRes.error, duration: Date.now() - stepStart, verified: authRes.success });
    } else {
      steps.push({ step: 'auth', status: 'warning', message: 'Auth service not ready', duration: Date.now() - stepStart, verified: false });
    }

    // ------------------------------------------------------------------------
    // 2.6 DEPLOY - Trigger and wait for ready
    // ------------------------------------------------------------------------
    stepStart = Date.now();
    console.log(`\n[2.6] Triggering deployment...`);

    const deployRes = await callTool(baseUrl, 'trigger-deployment', {
      repoName: resources.github.repoName,
      commitMessage: `Initial deployment for ${body.companyName}`,
    });

    if (!deployRes.success) {
      steps.push({ step: 'deploy', status: 'error', error: deployRes.error, duration: Date.now() - stepStart });
      throw new Error(`Deploy: ${deployRes.error}`);
    }

    // Wait for deployment ready
    const deployReadyResult = await pollUntil(
      async () => {
        const status = await isVercelDeploymentReady(resources.vercel!.projectId);
        if (status.state === 'ERROR') throw new Error('Deployment failed');
        return status.ready;
      },
      'Deployment ready',
      180000, 5000
    );

    if (!deployReadyResult.success) {
      steps.push({ step: 'deploy', status: 'error', error: 'Deployment timed out', duration: Date.now() - stepStart });
      throw new Error('Deployment timed out');
    }

    // Verify site responds
    const siteReadyResult = await pollUntil(
      () => isSiteResponding(resources.vercel!.url),
      'Site responding',
      30000, 2000
    );

    steps.push({
      step: 'deploy',
      status: siteReadyResult.success ? 'success' : 'warning',
      message: siteReadyResult.success ? 'Site is live' : 'Deployed but not responding',
      duration: Date.now() - stepStart,
      verified: siteReadyResult.success,
    });

    // ------------------------------------------------------------------------
    // 2.7 WELCOME EMAIL (only if site is live)
    // ------------------------------------------------------------------------
    if (siteReadyResult.success && body.adminEmail) {
      stepStart = Date.now();
      console.log(`\n[2.7] Sending welcome email...`);

      const emailRes = await callTool(baseUrl, 'send-welcome-email', {
        adminEmail: body.adminEmail,
        firstName: body.adminFirstName || 'Admin',
        companyName: body.companyName,
        platformUrl: resources.vercel.url,
        githubUrl: resources.github.repoUrl,
      });

      steps.push({ step: 'email', status: emailRes.success ? 'success' : 'warning', message: emailRes.success ? 'Sent' : 'Skipped', duration: Date.now() - stepStart, verified: true });
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    const criticalSteps = ['supabase', 'github', 'vercel', 'deploy'];
    const allCriticalSuccess = criticalSteps.every(s => steps.find(st => st.step === s)?.status === 'success');
    const totalDuration = Date.now() - startTime;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[Orchestrator] ${allCriticalSuccess ? '✅ SUCCESS' : '❌ ISSUES'}`);
    console.log(`[Orchestrator] Platform: ${resources.vercel.url}`);
    console.log(`[Orchestrator] Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    steps.forEach(s => console.log(`  ${s.status === 'success' ? '✓' : s.status === 'warning' ? '⚠' : '✗'} ${s.step}: ${s.message || s.error || ''}`));
    console.log(`${'='.repeat(70)}\n`);

    return NextResponse.json({
      success: allCriticalSuccess,
      platformUrl: resources.vercel.url,
      steps,
      resources,
      duration: totalDuration,
    });

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`\n[Orchestrator] ❌ FAILED: ${error.message}`);

    // Rollback
    if (projectSlug && body?.rollbackOnFailure !== false) {
      console.log(`[Orchestrator] Rolling back...`);
      await callTool(getBaseUrl(request), 'cleanup', { projectSlug, companyName: body?.companyName });
      steps.push({ step: 'rollback', status: 'success', message: 'Cleaned up' });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      steps,
      resources,
      duration: totalDuration,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'orchestrate',
    version: 'v12',
    flow: [
      'Phase 1: Cleanup → Wait for allVerifiedDeleted',
      'Phase 2: Create Supabase → Verify ready',
      'Phase 2: Create ElevenLabs → Verify ready',
      'Phase 2: Create GitHub → Verify ready',
      'Phase 2: Create Vercel → Verify ready',
      'Phase 2: Configure Auth → Verify ready',
      'Phase 2: Deploy → Verify live',
      'Phase 2: Send email',
    ],
  });
}
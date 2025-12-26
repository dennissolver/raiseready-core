// app/api/setup/orchestrate/route.ts
// ============================================================================
// PLATFORM CREATION ORCHESTRATOR v10
//
// SIMPLIFIED: Calls /api/setup/cleanup for pre-flight cleanup
// Single source of truth for cleanup logic
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';
type StepStatus = 'pending' | 'in_progress' | 'verifying' | 'success' | 'error' | 'skipped' | 'warning';

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
  status: StepStatus;
  message?: string;
  data?: any;
  error?: string;
  duration?: number;
  verified?: boolean;
  verificationDetails?: string;
}

interface Resources {
  supabase: { projectId: string; url: string; anonKey: string; serviceKey: string } | null;
  github: { repoUrl: string; repoName: string; owner: string } | null;
  vercel: { projectId: string; url: string; deploymentId?: string } | null;
  elevenlabs: { agentId: string } | null;
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

async function verifySupabase(
  url: string,
  serviceKey: string,
  projectRef: string
): Promise<{ verified: boolean; details: string }> {
  try {
    const testQuery = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    if (!testQuery.ok) {
      return { verified: false, details: 'Cannot connect to Supabase REST API' };
    }

    const foundersCheck = await fetch(`${url}/rest/v1/founders?select=id&limit=1`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    if (foundersCheck.status === 404) {
      return { verified: false, details: 'Schema not applied - founders table missing' };
    }

    const decksCheck = await fetch(`${url}/rest/v1/pitch_decks?select=id&limit=1`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    if (decksCheck.status === 404) {
      return { verified: false, details: 'Schema partially applied - pitch_decks table missing' };
    }

    const adminsCheck = await fetch(`${url}/rest/v1/superadmins?select=id&limit=1`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    if (adminsCheck.status === 404) {
      return { verified: false, details: 'Schema partially applied - superadmins table missing' };
    }

    const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (supabaseToken) {
      const authConfig = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
        { headers: { Authorization: `Bearer ${supabaseToken}` } }
      );

      if (!authConfig.ok) {
        return { verified: false, details: 'Auth configuration not accessible' };
      }
    }

    return { verified: true, details: 'Database connected, schema exists, auth configured' };
  } catch (error: any) {
    return { verified: false, details: `Verification failed: ${error.message}` };
  }
}

async function verifyGitHub(
  owner: string,
  repoName: string,
  githubToken: string
): Promise<{ verified: boolean; details: string }> {
  try {
    console.log(`[verifyGitHub] Checking: ${owner}/${repoName}`);

    const headers = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    const repoCheck = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}`,
      { headers }
    );

    if (!repoCheck.ok) {
      const errorText = await repoCheck.text();
      console.log(`[verifyGitHub] Repo check failed: ${repoCheck.status} - ${errorText}`);
      return { verified: false, details: `Repository not found (${repoCheck.status})` };
    }

    const branchCheck = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/branches/main`,
      { headers }
    );

    if (!branchCheck.ok) {
      return { verified: false, details: 'Main branch not found or empty' };
    }

    const branchData = await branchCheck.json();
    if (!branchData.commit?.sha) {
      return { verified: false, details: 'Main branch has no commits' };
    }

    const configCheck = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/contents/config/client.ts`,
      { headers }
    );

    if (!configCheck.ok) {
      return { verified: false, details: 'config/client.ts not found - files may not have been pushed' };
    }

    const treeCheck = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/main?recursive=1`,
      { headers }
    );

    let fileCount = 0;
    if (treeCheck.ok) {
      const treeData = await treeCheck.json();
      fileCount = treeData.tree?.filter((item: any) => item.type === 'blob').length || 0;
    }

    if (fileCount < 10) {
      return { verified: false, details: `Only ${fileCount} files found - expected 50+` };
    }

    return { verified: true, details: `Repository ready with ${fileCount} files` };
  } catch (error: any) {
    return { verified: false, details: `Verification failed: ${error.message}` };
  }
}

async function verifyVercel(
  projectId: string,
  expectedUrl: string,
  vercelToken: string,
  maxWaitMs: number = 180000
): Promise<{ verified: boolean; details: string; deploymentId?: string }> {
  const startTime = Date.now();
  const pollInterval = 5000;

  try {
    while (Date.now() - startTime < maxWaitMs) {
      const deploymentsRes = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`,
        { headers: { Authorization: `Bearer ${vercelToken}` } }
      );

      if (!deploymentsRes.ok) {
        return { verified: false, details: 'Cannot fetch deployments' };
      }

      const deploymentsData = await deploymentsRes.json();
      const latestDeployment = deploymentsData.deployments?.[0];

      if (!latestDeployment) {
        await new Promise(r => setTimeout(r, pollInterval));
        continue;
      }

      const { state, readyState, id: deploymentId } = latestDeployment;

      if (readyState === 'READY' || state === 'READY') {
        const siteCheck = await fetch(expectedUrl, {
          method: 'HEAD',
          redirect: 'follow',
        });

        if (siteCheck.ok || siteCheck.status === 308) {
          return {
            verified: true,
            details: `Deployment complete, site responding`,
            deploymentId
          };
        } else {
          return {
            verified: false,
            details: `Deployment ready but site returned ${siteCheck.status}`,
            deploymentId
          };
        }
      }

      if (readyState === 'ERROR' || state === 'ERROR') {
        return {
          verified: false,
          details: 'Deployment failed - check Vercel dashboard for build errors',
          deploymentId
        };
      }

      if (readyState === 'CANCELED' || state === 'CANCELED') {
        return { verified: false, details: 'Deployment was canceled', deploymentId };
      }

      console.log(`[Verify Vercel] Deployment state: ${readyState || state}, waiting...`);
      await new Promise(r => setTimeout(r, pollInterval));
    }

    return { verified: false, details: `Deployment timed out after ${maxWaitMs / 1000}s` };
  } catch (error: any) {
    return { verified: false, details: `Verification failed: ${error.message}` };
  }
}

async function verifyElevenLabs(
  agentId: string,
  apiKey: string
): Promise<{ verified: boolean; details: string }> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      { headers: { 'xi-api-key': apiKey } }
    );

    if (!response.ok) {
      return { verified: false, details: 'Agent not found' };
    }

    const agent = await response.json();

    if (agent.status === 'published' || agent.is_published === true) {
      return { verified: true, details: `Agent "${agent.name}" is published and active` };
    }

    if (agent.status === 'draft' || agent.is_published === false) {
      return { verified: false, details: `Agent created but not published (status: draft)` };
    }

    return { verified: true, details: `Agent exists (status: ${agent.status || 'unknown'})` };
  } catch (error: any) {
    return { verified: false, details: `Verification failed: ${error.message}` };
  }
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

async function callTool(
  baseUrl: string,
  tool: string,
  payload: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/setup/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error || `${tool} failed`, data };
    }
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function getDefaultBranding(body: OrchestrationRequest): any {
  return {
    company: {
      name: body.companyName,
      tagline: 'AI-Powered Pitch Coaching',
      description: `${body.companyName} helps founders perfect their pitch.`,
      website: body.companyWebsite || '',
    },
    colors: { primary: '#8B5CF6', accent: '#10B981', background: '#0F172A', text: '#F8FAFC' },
    logo: { url: null, base64: null },
    thesis: { focusAreas: [], sectors: [], stages: [], philosophy: '', idealFounder: '' },
    contact: { email: body.companyEmail, phone: null, linkedin: null },
    platformType: 'commercial_investor',
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
    const skipPreCleanup = body.skipPreCleanup === true;

    if (!body.companyName || !body.companyEmail || !body.adminEmail) {
      return NextResponse.json({ error: 'companyName, companyEmail, and adminEmail required' }, { status: 400 });
    }

    projectSlug = generateSlug(body.companyName);
    const branding = body.branding || getDefaultBranding(body);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[Orchestrator v10] Starting: ${body.companyName} (${projectSlug})`);
    console.log(`${'='.repeat(70)}\n`);

    // ========================================================================
    // PRE-FLIGHT CLEANUP - Call cleanup route (handles all 4 resources)
    // ========================================================================
    if (!skipPreCleanup) {
      const stepStart = Date.now();
      console.log(`[Orchestrator] Calling cleanup route for: ${projectSlug}`);

      const cleanupRes = await callTool(baseUrl, 'cleanup', {
        projectSlug,
        companyName: body.companyName,
      });

      const cleaned = cleanupRes.data?.cleaned || {};
      const cleanedSummary = Object.entries(cleaned)
        .filter(([_, v]) => v !== null)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || 'None found';

      steps.push({
        step: 'pre-cleanup',
        status: cleanupRes.success ? 'success' : 'warning',
        message: cleanedSummary,
        duration: Date.now() - stepStart,
        data: cleanupRes.data,
      });

      // Wait for deletions to propagate
      if (cleanupRes.success && (cleaned.supabase || cleaned.elevenlabs)) {
        console.log(`[Orchestrator] Waiting 5s for deletions to propagate...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    // ========================================================================
    // STEP 1: Create Supabase + Verify
    // ========================================================================
    let stepStart = Date.now();
    console.log(`[Orchestrator] Creating Supabase project...`);

    const supabaseRes = await callTool(baseUrl, 'create-supabase', {
      projectName: projectSlug,
      organizationId: process.env.SUPABASE_ORG_ID,
    });

    if (!supabaseRes.success) {
      steps.push({ step: 'create-supabase', status: 'error', error: supabaseRes.error, duration: Date.now() - stepStart });
      throw new Error(`Supabase: ${supabaseRes.error}`);
    }

    resources.supabase = {
      projectId: supabaseRes.data.projectRef || supabaseRes.data.projectId,
      url: supabaseRes.data.url,
      anonKey: supabaseRes.data.anonKey,
      serviceKey: supabaseRes.data.serviceRoleKey || supabaseRes.data.serviceKey,
    };

    if (!resources.supabase.serviceKey) {
      steps.push({ step: 'create-supabase', status: 'error', error: 'No service key returned', duration: Date.now() - stepStart });
      throw new Error('Supabase created but no service key');
    }

    steps.push({
      step: 'create-supabase',
      status: 'success',
      message: `Created: ${resources.supabase.projectId}`,
      duration: Date.now() - stepStart,
      verified: false,
      verificationDetails: 'Pending schema application',
    });

    // ========================================================================
    // STEP 2: Run Migrations + Verify Schema
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Running migrations...`);

    const migrationsRes = await callTool(baseUrl, 'run-migrations', {
      supabaseUrl: resources.supabase.url,
      supabaseServiceKey: resources.supabase.serviceKey,
    });

    if (!migrationsRes.success) {
      steps.push({ step: 'run-migrations', status: 'error', error: migrationsRes.error, duration: Date.now() - stepStart });
      throw new Error(`Migrations: ${migrationsRes.error}`);
    }

    console.log(`[Orchestrator] Verifying Supabase schema...`);
    const supabaseVerification = await verifySupabase(
      resources.supabase.url,
      resources.supabase.serviceKey,
      resources.supabase.projectId
    );

    steps.push({
      step: 'run-migrations',
      status: supabaseVerification.verified ? 'success' : 'error',
      message: 'Schema applied',
      duration: Date.now() - stepStart,
      verified: supabaseVerification.verified,
      verificationDetails: supabaseVerification.details,
    });

    if (!supabaseVerification.verified) {
      throw new Error(`Schema verification failed: ${supabaseVerification.details}`);
    }

    // ========================================================================
    // STEP 3: Create ElevenLabs + Verify (non-fatal)
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Creating ElevenLabs agent...`);

    const elevenlabsRes = await callTool(baseUrl, 'create-elevenlabs', {
      agentName: body.agentName || 'Maya',
      voiceGender: body.voiceGender || 'female',
      companyName: body.companyName,
    });

    if (elevenlabsRes.success && elevenlabsRes.data?.agentId) {
      resources.elevenlabs = { agentId: elevenlabsRes.data.agentId };

      console.log(`[Orchestrator] Verifying ElevenLabs agent...`);
      const elevenLabsVerification = await verifyElevenLabs(
        resources.elevenlabs.agentId,
        process.env.ELEVENLABS_API_KEY || ''
      );

      steps.push({
        step: 'create-elevenlabs',
        status: elevenLabsVerification.verified ? 'success' : 'warning',
        message: `Agent: ${resources.elevenlabs.agentId}`,
        duration: Date.now() - stepStart,
        verified: elevenLabsVerification.verified,
        verificationDetails: elevenLabsVerification.details,
      });
    } else {
      steps.push({
        step: 'create-elevenlabs',
        status: 'skipped',
        message: elevenlabsRes.error || 'Skipped',
        duration: Date.now() - stepStart,
        verified: false,
      });
    }

    // ========================================================================
    // STEP 4: Create GitHub + Verify
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Creating GitHub repo...`);

    const githubRes = await callTool(baseUrl, 'create-github', {
      repoName: projectSlug,
      branding,
      companyName: body.companyName,
      admin: { firstName: body.adminFirstName, lastName: body.adminLastName, email: body.adminEmail, phone: body.adminPhone },
      platformMode: body.platformMode || 'screening',
    });

    if (!githubRes.success) {
      steps.push({ step: 'create-github', status: 'error', error: githubRes.error, duration: Date.now() - stepStart });
      throw new Error(`GitHub: ${githubRes.error}`);
    }

    console.log(`[Orchestrator] GitHub response:`, JSON.stringify(githubRes.data, null, 2));

    const githubOwner = githubRes.data?.owner || githubRes.data?.repoOwner || process.env.GITHUB_OWNER || 'dennissolver';
    const githubRepoName = githubRes.data?.repoName || githubRes.data?.name || githubRes.data?.repo || projectSlug;
    const githubRepoUrl = githubRes.data?.repoUrl || githubRes.data?.url || githubRes.data?.html_url || `https://github.com/${githubOwner}/${githubRepoName}`;

    resources.github = { repoUrl: githubRepoUrl, repoName: githubRepoName, owner: githubOwner };

    console.log(`[Orchestrator] GitHub: ${githubOwner}/${githubRepoName}`);

    // Verify with retries
    console.log(`[Orchestrator] Verifying GitHub repository...`);
    let githubVerification = { verified: false, details: 'Not attempted' };

    for (let attempt = 1; attempt <= 5; attempt++) {
      const waitTime = attempt === 1 ? 3000 : 5000;
      console.log(`[Orchestrator] GitHub verification ${attempt}/5, waiting ${waitTime/1000}s...`);
      await new Promise(r => setTimeout(r, waitTime));

      githubVerification = await verifyGitHub(
        githubOwner,
        githubRepoName,
        process.env.GITHUB_TOKEN || ''
      );

      console.log(`[Orchestrator] Result: ${githubVerification.verified ? 'SUCCESS' : 'FAILED'} - ${githubVerification.details}`);
      if (githubVerification.verified) break;
    }

    steps.push({
      step: 'create-github',
      status: githubVerification.verified ? 'success' : 'error',
      message: `${githubRes.data?.stats?.filesCreated || 'Files'} pushed`,
      duration: Date.now() - stepStart,
      verified: githubVerification.verified,
      verificationDetails: githubVerification.details,
    });

    if (!githubVerification.verified) {
      throw new Error(`GitHub verification failed: ${githubVerification.details}`);
    }

    // ========================================================================
    // STEP 5: Create Vercel Project
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Creating Vercel project...`);

    const vercelRes = await callTool(baseUrl, 'create-vercel', {
      projectName: projectSlug,
      githubRepoName: resources.github.repoName,
      envVars: {
        // Supabase
        NEXT_PUBLIC_SUPABASE_URL: resources.supabase.url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: resources.supabase.anonKey,
        SUPABASE_SERVICE_ROLE_KEY: resources.supabase.serviceKey,

        // ElevenLabs
        ELEVENLABS_AGENT_ID: resources.elevenlabs?.agentId || '',
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',

        // AI
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

        // Platform Identity
        NEXT_PUBLIC_COMPANY_NAME: body.companyName,
        NEXT_PUBLIC_TAGLINE: branding?.company?.tagline || branding?.tagline || 'AI-Powered Pitch Coaching',
        NEXT_PUBLIC_DESCRIPTION: branding?.company?.description || branding?.description || '',
        NEXT_PUBLIC_WEBSITE_URL: body.companyWebsite || '',
        NEXT_PUBLIC_PLATFORM_URL: `https://${projectSlug}.vercel.app`,
        NEXT_PUBLIC_SUPABASE_PROJECT_ID: resources.supabase.projectId,

        // Platform Type
        NEXT_PUBLIC_PLATFORM_TYPE: body.platformType || 'founder_service_provider',
        NEXT_PUBLIC_PLATFORM_MODE: body.platformMode || 'screening',

        // Branding Colors
        NEXT_PUBLIC_COLOR_PRIMARY: branding?.colors?.primary || '#8B5CF6',
        NEXT_PUBLIC_COLOR_ACCENT: branding?.colors?.accent || '#10B981',
        NEXT_PUBLIC_COLOR_BACKGROUND: branding?.colors?.background || '#0F172A',
        NEXT_PUBLIC_COLOR_TEXT: branding?.colors?.text || '#F8FAFC',
        NEXT_PUBLIC_COLOR_SURFACE: branding?.colors?.surface || '#1E293B',
        NEXT_PUBLIC_COLOR_TEXT_MUTED: branding?.colors?.textMuted || '#94A3B8',
        NEXT_PUBLIC_COLOR_BORDER: branding?.colors?.border || '#334155',

        // Admin
        ADMIN_EMAIL: body.adminEmail,
        NEXT_PUBLIC_ADMIN_FIRST_NAME: body.adminFirstName,
        NEXT_PUBLIC_ADMIN_LAST_NAME: body.adminLastName,
        NEXT_PUBLIC_ADMIN_PHONE: body.adminPhone || '',
        NEXT_PUBLIC_SUPPORT_EMAIL: body.companyEmail,

        // Coach
        NEXT_PUBLIC_COACH_NAME: body.agentName || 'Maya',
      },
    });

    if (!vercelRes.success) {
      steps.push({ step: 'create-vercel', status: 'error', error: vercelRes.error, duration: Date.now() - stepStart });
      throw new Error(`Vercel: ${vercelRes.error}`);
    }

    resources.vercel = { projectId: vercelRes.data.projectId, url: vercelRes.data.url };

    steps.push({
      step: 'create-vercel',
      status: 'success',
      message: vercelRes.data.gitConnected ? 'GitHub linked' : 'Created',
      duration: Date.now() - stepStart,
      verified: false,
      verificationDetails: 'Deployment pending',
    });

    // ========================================================================
    // STEP 6: Configure Supabase Auth
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Configuring auth...`);

    const authRes = await callTool(baseUrl, 'configure-supabase-auth', {
      projectRef: resources.supabase.projectId,
      siteUrl: resources.vercel.url,
    });

    steps.push({
      step: 'configure-auth',
      status: authRes.success ? 'success' : 'warning',
      message: authRes.success ? 'Redirects configured' : authRes.error || 'Auth config issue (non-fatal)',
      duration: Date.now() - stepStart,
      verified: authRes.success,
    });

    // ========================================================================
    // STEP 7: Trigger Deployment
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Triggering deployment...`);

    const deployRes = await callTool(baseUrl, 'trigger-deployment', {
      repoName: resources.github.repoName,
      commitMessage: `Initial deployment for ${body.companyName}`,
    });

    steps.push({
      step: 'trigger-deployment',
      status: deployRes.success ? 'success' : 'error',
      message: deployRes.success ? 'Build triggered' : deployRes.error || 'Failed',
      duration: Date.now() - stepStart,
      verified: false,
      verificationDetails: 'Waiting for build',
    });

    // ========================================================================
    // STEP 8: Verify Deployment
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Waiting for deployment...`);

    const vercelVerification = await verifyVercel(
      resources.vercel.projectId,
      resources.vercel.url,
      process.env.VERCEL_TOKEN || '',
      180000 // 3 minutes
    );

    if (vercelVerification.deploymentId) {
      resources.vercel.deploymentId = vercelVerification.deploymentId;
    }

    steps.push({
      step: 'verify-deployment',
      status: vercelVerification.verified ? 'success' : 'error',
      message: vercelVerification.verified ? 'Site is live' : 'Deployment issue',
      duration: Date.now() - stepStart,
      verified: vercelVerification.verified,
      verificationDetails: vercelVerification.details,
    });

    if (!vercelVerification.verified) {
      console.warn(`[Orchestrator] Deployment issue: ${vercelVerification.details}`);
    }

    // ========================================================================
    // STEP 9: Send Welcome Email
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Sending welcome email...`);

    if (vercelVerification.verified && body.adminEmail && resources.vercel.url) {
      try {
        const emailRes = await callTool(baseUrl, 'send-welcome-email', {
          adminEmail: body.adminEmail,
          email: body.adminEmail,
          firstName: body.adminFirstName || 'Admin',
          companyName: body.companyName,
          platformUrl: resources.vercel.url,
          githubUrl: resources.github.repoUrl,
        });

        steps.push({
          step: 'send-welcome-email',
          status: emailRes.success ? 'success' : 'warning',
          message: emailRes.success ? 'Email sent' : 'Email skipped',
          duration: Date.now() - stepStart,
          verified: true,
        });
      } catch (emailError: any) {
        console.log('[Orchestrator] Email failed:', emailError.message);
        steps.push({
          step: 'send-welcome-email',
          status: 'warning',
          message: 'Email skipped',
          duration: Date.now() - stepStart,
          verified: true,
        });
      }
    } else {
      steps.push({
        step: 'send-welcome-email',
        status: 'skipped',
        message: 'Prerequisites not met',
        duration: Date.now() - stepStart,
        verified: true,
      });
    }

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    const verifiedSteps = steps.filter(s => s.verified === true).length;
    const totalVerifiableSteps = steps.filter(s => s.verified !== undefined).length;
    const allVerified = steps.every(s => s.verified !== false || s.status === 'skipped' || s.status === 'warning');

    const totalDuration = Date.now() - startTime;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[Orchestrator] ${allVerified ? '✅ SUCCESS' : '⚠️ COMPLETED WITH ISSUES'}`);
    console.log(`[Orchestrator] Platform: ${resources.vercel.url}`);
    console.log(`[Orchestrator] Verified: ${verifiedSteps}/${totalVerifiableSteps} steps`);
    console.log(`[Orchestrator] Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`${'='.repeat(70)}\n`);

    return NextResponse.json({
      success: allVerified,
      fullyVerified: allVerified,
      platformUrl: resources.vercel.url,
      steps,
      resources,
      verification: {
        passed: verifiedSteps,
        total: totalVerifiableSteps,
        allPassed: allVerified,
      },
      duration: totalDuration,
    });

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[Orchestrator] ❌ FAILED: ${error.message}`);

    // Rollback using cleanup route
    if (projectSlug && body?.rollbackOnFailure !== false) {
      console.log(`[Orchestrator] Rolling back via cleanup route...`);
      const baseUrl = getBaseUrl(request);

      steps.push({ step: 'rollback', status: 'in_progress', message: 'Cleaning up...' });

      const cleanupRes = await callTool(baseUrl, 'cleanup', {
        projectSlug,
        companyName: body?.companyName,
        resources: {
          supabase: resources.supabase ? { projectRef: resources.supabase.projectId } : undefined,
          github: resources.github ? { repoName: resources.github.repoName } : undefined,
          vercel: resources.vercel ? { projectId: resources.vercel.projectId } : undefined,
          elevenlabs: resources.elevenlabs ? { agentId: resources.elevenlabs.agentId } : undefined,
        },
      });

      steps[steps.length - 1] = {
        step: 'rollback',
        status: cleanupRes.success ? 'success' : 'warning',
        message: cleanupRes.success ? 'Resources cleaned up' : 'Partial cleanup',
        data: cleanupRes.data?.cleaned,
      };
    }

    return NextResponse.json({
      success: false,
      fullyVerified: false,
      error: error.message,
      steps,
      resources,
      rollback: { performed: body?.rollbackOnFailure !== false },
      duration: totalDuration,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'orchestrate',
    version: 'v10-cleanup-route',
    description: 'Uses /api/setup/cleanup for pre-flight and rollback',
    features: ['verification', 'deployment-polling', 'centralized-cleanup'],
  });
}
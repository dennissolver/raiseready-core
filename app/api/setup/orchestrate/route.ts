// app/api/setup/orchestrate/route.ts
// ============================================================================
// PLATFORM CREATION ORCHESTRATOR v7
//
// Each step reported individually including cleanup steps
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';

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
  platformMode?: 'screening' | 'coaching';
  rollbackOnFailure?: boolean;
  skipPreCleanup?: boolean;
}

interface StepResult {
  step: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
  data?: any;
  error?: string;
  duration?: number;
}

interface Resources {
  supabase: { projectId: string; url: string; anonKey: string; serviceKey: string } | null;
  github: { repoUrl: string; repoName: string } | null;
  vercel: { projectId: string; url: string } | null;
  elevenlabs: { agentId: string } | null;
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
    console.log(`[Orchestrator] Starting: ${body.companyName} (${projectSlug})`);
    console.log(`${'='.repeat(70)}\n`);

    // ========================================================================
    // CLEANUP STEP 1: Delete existing Supabase (by name lookup)
    // ========================================================================
    if (!skipPreCleanup) {
      let stepStart = Date.now();
      console.log(`[Orchestrator] Cleanup: Looking up Supabase project...`);

      const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
      let supabaseDeleted = false;
      let supabaseMessage = 'Not found';

      if (supabaseToken) {
        try {
          const listRes = await fetch('https://api.supabase.com/v1/projects', {
            headers: { Authorization: `Bearer ${supabaseToken}` },
          });

          if (listRes.ok) {
            const projects = await listRes.json();
            const existing = projects.find((p: any) => p.name === projectSlug);

            if (existing) {
              console.log(`[Orchestrator] Found Supabase: ${existing.id}, deleting...`);
              const delRes = await callTool(baseUrl, 'delete-supabase', { projectRef: existing.id });
              supabaseDeleted = delRes.success;
              supabaseMessage = supabaseDeleted ? `Deleted ${existing.id}` : delRes.error || 'Delete failed';
              if (supabaseDeleted) await new Promise(r => setTimeout(r, 2000));
            }
          }
        } catch (e: any) {
          supabaseMessage = e.message;
        }
      }

      steps.push({
        step: 'cleanup-supabase',
        status: 'success',
        message: supabaseMessage,
        duration: Date.now() - stepStart,
      });

      // ======================================================================
      // CLEANUP STEP 2: Delete existing Vercel
      // ======================================================================
      stepStart = Date.now();
      console.log(`[Orchestrator] Cleanup: Deleting Vercel project...`);

      const vercelRes = await callTool(baseUrl, 'delete-vercel', { projectName: projectSlug });
      const vercelDeleted = vercelRes.success && !vercelRes.data?.alreadyDeleted;

      steps.push({
        step: 'cleanup-vercel',
        status: 'success',
        message: vercelRes.data?.alreadyDeleted ? 'Not found' : vercelDeleted ? 'Deleted' : vercelRes.error || 'Not found',
        duration: Date.now() - stepStart,
      });

      // ======================================================================
      // CLEANUP STEP 3: Delete existing GitHub
      // ======================================================================
      stepStart = Date.now();
      console.log(`[Orchestrator] Cleanup: Deleting GitHub repo...`);

      const githubRes = await callTool(baseUrl, 'delete-github', { repoName: projectSlug });
      const githubDeleted = githubRes.success && !githubRes.data?.alreadyDeleted;

      steps.push({
        step: 'cleanup-github',
        status: 'success',
        message: githubRes.data?.alreadyDeleted ? 'Not found' : githubDeleted ? 'Deleted' : githubRes.error || 'Not found',
        duration: Date.now() - stepStart,
      });
    }

    // ========================================================================
    // STEP 1: Create Supabase
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
      message: supabaseRes.data.alreadyExists ? 'Already exists' : 'Created',
      duration: Date.now() - stepStart,
    });

    // ========================================================================
    // STEP 2: Run Migrations
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

    steps.push({ step: 'run-migrations', status: 'success', message: 'Schema applied', duration: Date.now() - stepStart });

    // ========================================================================
    // STEP 3: Create ElevenLabs (non-fatal)
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
      steps.push({ step: 'create-elevenlabs', status: 'success', message: 'Agent created', duration: Date.now() - stepStart });
    } else {
      steps.push({ step: 'create-elevenlabs', status: 'skipped', message: elevenlabsRes.error || 'Skipped', duration: Date.now() - stepStart });
    }

    // ========================================================================
    // STEP 4: Create GitHub
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

    resources.github = { repoUrl: githubRes.data.repoUrl, repoName: githubRes.data.repoName };
    steps.push({
      step: 'create-github',
      status: 'success',
      message: `${githubRes.data.filesCreated || 'Files'} pushed`,
      duration: Date.now() - stepStart,
    });

    // ========================================================================
    // STEP 5: Create Vercel
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Creating Vercel project...`);

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
      message: vercelRes.data.gitConnected ? 'GitHub linked' : 'Created (no Git)',
      duration: Date.now() - stepStart,
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
      status: authRes.success ? 'success' : 'skipped',
      message: authRes.success ? 'Redirects configured' : authRes.error || 'Skipped',
      duration: Date.now() - stepStart,
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
    });

    // ========================================================================
    // STEP 8: Send Welcome Email
    // ========================================================================
    stepStart = Date.now();
    console.log(`[Orchestrator] Sending welcome email...`);

    const emailRes = await callTool(baseUrl, 'send-welcome-email', {
      email: body.adminEmail,
      firstName: body.adminFirstName,
      companyName: body.companyName,
      platformUrl: resources.vercel.url,
      githubUrl: resources.github.repoUrl,
    });

    steps.push({
      step: 'send-welcome-email',
      status: emailRes.success ? 'success' : 'skipped',
      message: emailRes.success ? 'Email sent' : emailRes.error || 'Skipped',
      duration: Date.now() - stepStart,
    });

    // ========================================================================
    // SUCCESS
    // ========================================================================
    const totalDuration = Date.now() - startTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[Orchestrator] SUCCESS: ${resources.vercel.url}`);
    console.log(`[Orchestrator] Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`${'='.repeat(70)}\n`);

    return NextResponse.json({
      success: true,
      platformUrl: resources.vercel.url,
      steps,
      resources,
      duration: totalDuration,
    });

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[Orchestrator] FAILED: ${error.message}`);

    // Rollback
    if (projectSlug && body?.rollbackOnFailure !== false) {
      const baseUrl = getBaseUrl(request);
      if (resources.vercel) await callTool(baseUrl, 'delete-vercel', { projectName: projectSlug });
      if (resources.github) await callTool(baseUrl, 'delete-github', { repoName: resources.github.repoName });
      if (resources.elevenlabs) await callTool(baseUrl, 'delete-elevenlabs', { agentId: resources.elevenlabs.agentId });
      if (resources.supabase) await callTool(baseUrl, 'delete-supabase', { projectRef: resources.supabase.projectId });
    }

    return NextResponse.json({
      success: false,
      error: error.message,
      steps,
      resources,
      rollback: { performed: true },
      duration: totalDuration,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ service: 'orchestrate', version: 'v7' });
}
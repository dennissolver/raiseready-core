// app/api/setup/orchestrate/route.ts
// ============================================================================
// PLATFORM CREATION ORCHESTRATOR v4
//
// SEQUENCE:
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  1. create-supabase     → Creates DB project                             │
// │  2. run-migrations      → Applies schema + RLS + storage (NEW!)          │
// │  3. create-elevenlabs   → Creates voice agent                            │
// │  4. create-github       → Creates repo, pushes files                     │
// │  5. create-vercel       → Creates project, links GitHub, sets env vars   │
// │  6. configure-auth      → Sets Supabase redirect URLs                    │
// │  7. trigger-deployment  → Pushes commit → Vercel auto-deploys            │
// │  8. send-welcome-email  → Notifies admin                                 │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ON FAILURE: Automatically cleans up created resources.
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
  branding?: ExtractedBranding;
  skipExtraction?: boolean;
  platformMode?: 'screening' | 'coaching';
  rollbackOnFailure?: boolean;
}

interface ExtractedBranding {
  company: { name: string; tagline: string; description: string; website: string };
  colors: { primary: string; accent: string; background: string; text: string };
  logo: { url: string | null; base64: string | null };
  thesis: { focusAreas: string[]; sectors: string[]; stages: string[]; philosophy: string; idealFounder: string };
  contact: { email: string | null; phone: string | null; linkedin: string | null };
  platformType: PlatformType;
}

interface StepResult {
  step: string;
  status: 'success' | 'error' | 'skipped' | 'rolled_back';
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

interface OrchestrationResult {
  success: boolean;
  platformUrl: string | null;
  steps: StepResult[];
  resources: Resources;
  rollback?: { performed: boolean; results?: any };
  error?: string;
  duration?: number;
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
      return { success: false, error: data.error || `${tool} failed` };
    }
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || `${tool} failed` };
  }
}

async function executeStep(
  stepName: string,
  executor: () => Promise<any>
): Promise<StepResult> {
  const startTime = Date.now();
  try {
    console.log(`[Orchestrator] >>> Starting: ${stepName}`);
    const data = await executor();
    const duration = Date.now() - startTime;
    console.log(`[Orchestrator] <<< Completed: ${stepName} (${duration}ms)`);
    return { step: stepName, status: 'success', data, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Orchestrator] !!! Failed: ${stepName}`, error.message);
    return { step: stepName, status: 'error', error: error.message, duration };
  }
}

function getDefaultBranding(body: OrchestrationRequest): ExtractedBranding {
  return {
    company: {
      name: body.companyName,
      tagline: 'AI-Powered Pitch Coaching',
      description: `${body.companyName} helps founders perfect their pitch.`,
      website: body.companyWebsite || '',
    },
    colors: { primary: '#8B5CF6', accent: '#10B981', background: '#0F172A', text: '#F8FAFC' },
    logo: { url: null, base64: null },
    thesis: {
      focusAreas: ['Technology', 'Innovation'],
      sectors: ['Software', 'Fintech'],
      stages: ['Pre-Seed', 'Seed', 'Series A'],
      philosophy: 'We back exceptional founders.',
      idealFounder: '',
    },
    contact: { email: body.companyEmail, phone: null, linkedin: null },
    platformType: 'commercial_investor',
  };
}

// ============================================================================
// ROLLBACK
// ============================================================================

async function rollbackResources(
  baseUrl: string,
  resources: Resources,
  projectSlug: string
): Promise<any> {
  console.log(`\n[Orchestrator] !!! ROLLBACK INITIATED !!!`);

  const result = await callTool(baseUrl, 'cleanup', {
    projectSlug,
    resources: {
      vercel: resources.vercel ? { projectId: resources.vercel.projectId } : undefined,
      github: resources.github ? { repoName: resources.github.repoName } : undefined,
      supabase: resources.supabase ? { projectRef: resources.supabase.projectId } : undefined,
      elevenlabs: resources.elevenlabs ? { agentId: resources.elevenlabs.agentId } : undefined,
    },
  });

  console.log(`[Orchestrator] Rollback complete`);
  return result;
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const steps: StepResult[] = [];
  const resources: Resources = {
    supabase: null,
    github: null,
    vercel: null,
    elevenlabs: null,
  };

  let rollbackResult: any = null;
  let projectSlug = '';

  try {
    const body: OrchestrationRequest = await request.json();
    const baseUrl = getBaseUrl(request);
    const rollbackOnFailure = body.rollbackOnFailure !== false;

    if (!body.companyName || !body.companyEmail || !body.adminEmail) {
      return NextResponse.json(
        { error: 'companyName, companyEmail, and adminEmail required' },
        { status: 400 }
      );
    }

    projectSlug = generateSlug(body.companyName);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[Orchestrator] Creating platform: ${projectSlug}`);
    console.log(`${'='.repeat(70)}\n`);

    const branding = body.branding || getDefaultBranding(body);

    // ========================================================================
    // STEP 1: Create Supabase
    // ========================================================================
    const supabaseResult = await executeStep('create-supabase', async () => {
      const result = await callTool(baseUrl, 'create-supabase', { projectName: projectSlug });
      if (!result.success) throw new Error(result.error);
      return result.data;
    });
    steps.push(supabaseResult);

    if (supabaseResult.status === 'error') {
      throw new Error(`Supabase failed: ${supabaseResult.error}`);
    }
    resources.supabase = {
      projectId: supabaseResult.data.projectId,
      url: supabaseResult.data.url,
      anonKey: supabaseResult.data.anonKey,
      serviceKey: supabaseResult.data.serviceKey,
    };

    // ========================================================================
    // STEP 2: Run Migrations (NEW!)
    // ========================================================================
    const migrationsResult = await executeStep('run-migrations', async () => {
      const result = await callTool(baseUrl, 'run-migrations', {
        supabaseUrl: resources.supabase!.url,
        supabaseServiceKey: resources.supabase!.serviceKey,
        schemaType: 'client',
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    });
    steps.push(migrationsResult);

    if (migrationsResult.status === 'error') {
      throw new Error(`Migrations failed: ${migrationsResult.error}`);
    }

    // ========================================================================
    // STEP 3: Create ElevenLabs (optional)
    // ========================================================================
    const elevenlabsResult = await executeStep('create-elevenlabs', async () => {
      const result = await callTool(baseUrl, 'create-elevenlabs', {
        agentName: body.agentName || 'Maya',
        voiceGender: body.voiceGender || 'female',
        companyName: body.companyName,
      });
      if (!result.success) {
        console.warn('[Orchestrator] ElevenLabs failed, continuing without voice');
        return { agentId: '' };
      }
      return result.data;
    });
    steps.push(elevenlabsResult);

    if (elevenlabsResult.status === 'success' && elevenlabsResult.data?.agentId) {
      resources.elevenlabs = { agentId: elevenlabsResult.data.agentId };
    }

    // ========================================================================
    // STEP 4: Create GitHub
    // ========================================================================
    const githubResult = await executeStep('create-github', async () => {
      const result = await callTool(baseUrl, 'create-github', {
        repoName: projectSlug,
        branding,
        admin: {
          firstName: body.adminFirstName,
          lastName: body.adminLastName,
          email: body.adminEmail,
          phone: body.adminPhone,
        },
        platformMode: body.platformMode || 'screening',
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    });
    steps.push(githubResult);

    if (githubResult.status === 'error') {
      throw new Error(`GitHub failed: ${githubResult.error}`);
    }
    resources.github = {
      repoUrl: githubResult.data.repoUrl,
      repoName: githubResult.data.repoName,
    };

    // ========================================================================
    // STEP 5: Create Vercel
    // ========================================================================
    const vercelResult = await executeStep('create-vercel', async () => {
      const result = await callTool(baseUrl, 'create-vercel', {
        projectName: projectSlug,
        githubRepoName: resources.github!.repoName,
        envVars: {
          NEXT_PUBLIC_SUPABASE_URL: resources.supabase!.url,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: resources.supabase!.anonKey,
          SUPABASE_SERVICE_ROLE_KEY: resources.supabase!.serviceKey,
          ELEVENLABS_AGENT_ID: resources.elevenlabs?.agentId || '',
          NEXT_PUBLIC_COMPANY_NAME: body.companyName,
        },
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    });
    steps.push(vercelResult);

    if (vercelResult.status === 'error') {
      throw new Error(`Vercel failed: ${vercelResult.error}`);
    }
    resources.vercel = {
      projectId: vercelResult.data.projectId,
      url: vercelResult.data.url,
    };

    // ========================================================================
    // STEP 6: Configure Supabase Auth
    // ========================================================================
    const authResult = await executeStep('configure-auth', async () => {
      const result = await callTool(baseUrl, 'configure-supabase-auth', {
        projectRef: resources.supabase!.projectId,
        siteUrl: resources.vercel!.url,
        redirectUrls: [
          `${resources.vercel!.url}/auth/callback`,
          `${resources.vercel!.url}/callback`,
          `${resources.vercel!.url}/login`,
        ],
      });
      return result.success ? result.data : { configured: false };
    });
    steps.push(authResult);

    // ========================================================================
    // STEP 7: Trigger Deployment
    // ========================================================================
    const deployResult = await executeStep('trigger-deployment', async () => {
      const result = await callTool(baseUrl, 'trigger-deployment', {
        repoName: resources.github!.repoName,
        commitMessage: `Initial deployment for ${body.companyName}`,
      });
      if (!result.success) throw new Error(result.error);
      return result.data;
    });
    steps.push(deployResult);

    // ========================================================================
    // STEP 8: Send Welcome Email
    // ========================================================================
    const emailResult = await executeStep('send-welcome-email', async () => {
      const result = await callTool(baseUrl, 'send-welcome-email', {
        email: body.adminEmail,
        firstName: body.adminFirstName,
        companyName: body.companyName,
        platformUrl: resources.vercel!.url,
        githubUrl: resources.github!.repoUrl,
      });
      return result.success ? result.data : { sent: false };
    });
    steps.push(emailResult);

    // ========================================================================
    // SUCCESS
    // ========================================================================
    const totalDuration = Date.now() - startTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[Orchestrator] SUCCESS!`);
    console.log(`[Orchestrator] URL: ${resources.vercel?.url}`);
    console.log(`[Orchestrator] Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`${'='.repeat(70)}\n`);

    return NextResponse.json({
      success: true,
      platformUrl: resources.vercel?.url || null,
      steps,
      resources,
      duration: totalDuration,
    } as OrchestrationResult);

  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`\n[Orchestrator] FATAL: ${error.message}`);

    const body = await request.clone().json().catch(() => ({}));
    const rollbackOnFailure = body.rollbackOnFailure !== false;

    if (rollbackOnFailure && projectSlug) {
      try {
        const baseUrl = getBaseUrl(request);
        rollbackResult = await rollbackResources(baseUrl, resources, projectSlug);
      } catch (rollbackError: any) {
        console.error(`[Orchestrator] Rollback failed: ${rollbackError.message}`);
        rollbackResult = { performed: true, error: rollbackError.message };
      }
    }

    return NextResponse.json(
      {
        success: false,
        platformUrl: null,
        steps,
        resources,
        rollback: rollbackResult ? { performed: true, results: rollbackResult } : { performed: false },
        error: error.message,
        duration: totalDuration,
      } as OrchestrationResult,
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    service: 'orchestrate',
    version: 'v4',
    description: 'Creates complete child platform with database, auth, and deployment',
    sequence: [
      '1. create-supabase    → Creates database project',
      '2. run-migrations     → Applies schema + RLS + storage',
      '3. create-elevenlabs  → Creates voice agent (optional)',
      '4. create-github      → Creates repo with all platform files',
      '5. create-vercel      → Links to GitHub, sets env vars',
      '6. configure-auth     → Sets Supabase redirect URLs',
      '7. trigger-deployment → Pushes commit to trigger Vercel build',
      '8. send-welcome-email → Notifies admin',
    ],
    onFailure: 'Auto-rollback deletes all created resources',
  });
}
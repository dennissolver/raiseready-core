import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_MANAGEMENT_API = 'https://api.supabase.com/v1';

interface CreateSupabaseRequest {
  projectName: string;
  clientId?: string;
}

async function waitForProjectReady(
  projectRef: string,
  accessToken: string,
  maxAttempts = 30
): Promise<{ ready: boolean; status: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const statusResponse = await fetch(
        `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log(`Project status (attempt ${i + 1}/${maxAttempts}): ${statusData.status}`);

        if (statusData.status === 'ACTIVE_HEALTHY') {
          return { ready: true, status: statusData.status };
        }
      }
    } catch (err) {
      console.warn(`Status check attempt ${i + 1} failed:`, err);
    }

    await sleep(10000);
  }

  return { ready: false, status: 'TIMEOUT' };
}

async function waitForServicesHealthy(
  projectRef: string,
  accessToken: string,
  maxAttempts = 10
): Promise<{ healthy: boolean; services: any[] }> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const healthResponse = await fetch(
        `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/health`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (healthResponse.ok) {
        const services = await healthResponse.json();
        console.log(`Health check (attempt ${i + 1}):`, services.map((s: any) => `${s.name}: ${s.status}`).join(', '));

        const allHealthy = services.every((s: any) => s.status === 'ACTIVE_HEALTHY');
        const authHealthy = services.find((s: any) => s.name === 'auth')?.status === 'ACTIVE_HEALTHY';

        if (allHealthy || (authHealthy && i >= 3)) {
          return { healthy: true, services };
        }
      }
    } catch (err) {
      console.warn(`Health check attempt ${i + 1} failed:`, err);
    }

    await sleep(5000);
  }

  return { healthy: false, services: [] };
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateSupabaseRequest = await req.json();
    const { projectName } = body;

    if (!projectName) {
      return NextResponse.json({ error: 'Project name required' }, { status: 400 });
    }

    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    const orgId = process.env.SUPABASE_ORG_ID;

    if (!accessToken || !orgId) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    // Step 1: Check if project already exists
    console.log(`Checking for existing Supabase project: ${projectName}`);

    const listResponse = await fetch(`${SUPABASE_MANAGEMENT_API}/projects`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (listResponse.ok) {
      const projects = await listResponse.json();
      const existing = projects.find((p: any) => p.name === projectName);

      if (existing) {
        console.log(`Project already exists: ${existing.id}`);

        // Get API keys for existing project
        const keysResponse = await fetch(
          `${SUPABASE_MANAGEMENT_API}/projects/${existing.id}/api-keys`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (keysResponse.ok) {
          const keys = await keysResponse.json();
          const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
          const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

          return NextResponse.json({
            success: true,
            skipped: true,
            message: 'Project already exists',
            projectId: existing.id,
            url: `https://${existing.id}.supabase.co`,
            anonKey,
            serviceKey,
          });
        }
      }
    }

    // Step 2: Create new project
    const dbPassword = generateSecurePassword();
    console.log(`Creating Supabase project: ${projectName}`);

    const createResponse = await fetch(`${SUPABASE_MANAGEMENT_API}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        organization_id: orgId,
        db_pass: dbPassword,
        region: 'us-east-1',
        plan: 'free',
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Supabase create error:', error);

      if (error.includes('already exists')) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: 'Project already exists (could not fetch details)',
        });
      }

      return NextResponse.json({ error: `Failed to create project: ${error}` }, { status: 500 });
    }

    const project = await createResponse.json();
    console.log('Project created:', project.id);
    const projectRef = project.id;

    // Step 3: Wait for project to be ready
    console.log('Waiting for project to be ready...');
    const { ready, status } = await waitForProjectReady(projectRef, accessToken);

    if (!ready) {
      console.warn(`Project not fully ready (status: ${status}), but returning keys anyway...`);
    }

    // Step 4: Wait for services to be healthy (especially auth)
    console.log('Checking service health...');
    const { healthy, services } = await waitForServicesHealthy(projectRef, accessToken);

    if (!healthy) {
      console.warn('Not all services are healthy yet, but proceeding...');
    }

    // Step 5: Get API keys
    let anonKey = '';
    let serviceKey = '';

    for (let i = 0; i < 5; i++) {
      const keysResponse = await fetch(
        `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/api-keys`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (keysResponse.ok) {
        const keys = await keysResponse.json();
        anonKey = keys.find((k: any) => k.name === 'anon')?.api_key || '';
        serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key || '';

        if (anonKey && serviceKey) {
          console.log('API keys retrieved successfully');
          break;
        }
      }

      console.log(`Waiting for API keys (attempt ${i + 1})...`);
      await sleep(3000);
    }

    if (!anonKey || !serviceKey) {
      console.warn('Could not retrieve API keys');
    }

    return NextResponse.json({
      success: true,
      projectId: projectRef,
      url: `https://${projectRef}.supabase.co`,
      anonKey,
      serviceKey,
      dbPassword,
      status: ready ? 'ready' : 'initializing',
      servicesHealthy: healthy,
    });

  } catch (error) {
    console.error('Create Supabase error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
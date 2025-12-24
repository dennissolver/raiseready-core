// app/api/setup/create-supabase/route.ts
// ============================================================================
// CREATE SUPABASE PROJECT
// Wait for ACTIVE_HEALTHY before returning to ensure project is connectable
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_API = 'https://api.supabase.com/v1';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectName, region = 'ap-southeast-2' } = body;

    if (!projectName) {
      return NextResponse.json({ error: 'Project name required' }, { status: 400 });
    }

    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    const orgId = body.organizationId || process.env.SUPABASE_ORG_ID;

    if (!accessToken || !orgId) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').slice(0, 40);
    console.log(`[CreateSupabase] Project: ${safeName}`);

    // ========================================================================
    // Check if project already exists
    // ========================================================================
    const listRes = await fetch(`${SUPABASE_API}/projects`, { headers });
    if (listRes.ok) {
      const projects = await listRes.json();
      const existing = projects.find((p: any) => p.name === safeName);

      if (existing) {
        console.log(`[CreateSupabase] Already exists: ${existing.id}, status: ${existing.status}`);

        // Wait for existing project to be ready if needed
        if (existing.status !== 'ACTIVE_HEALTHY') {
          console.log(`[CreateSupabase] Waiting for existing project to be ready...`);
          for (let i = 0; i < 24; i++) {
            await sleep(5000);
            const statusRes = await fetch(`${SUPABASE_API}/projects/${existing.id}`, { headers });
            if (statusRes.ok) {
              const status = await statusRes.json();
              console.log(`[CreateSupabase] Status: ${status.status}`);
              if (status.status === 'ACTIVE_HEALTHY') break;
            }
          }
        }

        // Get keys
        const keysRes = await fetch(`${SUPABASE_API}/projects/${existing.id}/api-keys`, { headers });
        if (keysRes.ok) {
          const keys = await keysRes.json();
          const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key || '';
          const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key || '';

          return NextResponse.json({
            success: true,
            alreadyExists: true,
            projectRef: existing.id,
            projectId: existing.id,
            url: `https://${existing.id}.supabase.co`,
            anonKey,
            serviceKey,
            serviceRoleKey: serviceKey,
          });
        }
      }
    }

    // ========================================================================
    // Create new project
    // ========================================================================
    const dbPassword = generatePassword();
    console.log(`[CreateSupabase] Creating new project...`);

    const createRes = await fetch(`${SUPABASE_API}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: safeName,
        organization_id: orgId,
        db_pass: dbPassword,
        region,
        plan: 'free',
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      console.error('[CreateSupabase] Create failed:', error);
      return NextResponse.json({ error: `Failed to create: ${error}` }, { status: 500 });
    }

    const project = await createRes.json();
    const projectRef = project.id;
    console.log(`[CreateSupabase] Created: ${projectRef}`);

    // ========================================================================
    // Wait for ACTIVE_HEALTHY status (max 2 minutes)
    // This is REQUIRED - without this, migrations will fail
    // ========================================================================
    console.log(`[CreateSupabase] Waiting for ACTIVE_HEALTHY...`);

    let isReady = false;
    for (let i = 0; i < 24; i++) {
      await sleep(5000);

      const statusRes = await fetch(`${SUPABASE_API}/projects/${projectRef}`, { headers });
      if (statusRes.ok) {
        const status = await statusRes.json();
        console.log(`[CreateSupabase] Status (${i + 1}/24): ${status.status}`);

        if (status.status === 'ACTIVE_HEALTHY') {
          isReady = true;
          console.log(`[CreateSupabase] Project ready!`);
          break;
        }
      }
    }

    if (!isReady) {
      console.warn(`[CreateSupabase] Project not fully ready after 2 minutes, proceeding anyway...`);
    }

    // ========================================================================
    // Get API keys
    // ========================================================================
    console.log(`[CreateSupabase] Getting API keys...`);

    let anonKey = '';
    let serviceKey = '';

    for (let i = 0; i < 5; i++) {
      const keysRes = await fetch(`${SUPABASE_API}/projects/${projectRef}/api-keys`, { headers });

      if (keysRes.ok) {
        const keys = await keysRes.json();
        anonKey = keys.find((k: any) => k.name === 'anon')?.api_key || '';
        serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key || '';

        if (anonKey && serviceKey) {
          console.log(`[CreateSupabase] Keys retrieved!`);
          break;
        }
      }

      await sleep(2000);
    }

    if (!serviceKey) {
      return NextResponse.json({
        error: 'Project created but keys not available. Try again.'
      }, { status: 500 });
    }

    // ========================================================================
    // Return
    // ========================================================================
    return NextResponse.json({
      success: true,
      projectRef,
      projectId: projectRef,
      url: `https://${projectRef}.supabase.co`,
      anonKey,
      serviceKey,
      serviceRoleKey: serviceKey,
      dbPassword,
      region,
      ready: isReady,
    });

  } catch (error: any) {
    console.error('[CreateSupabase] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'create-supabase',
    description: 'Creates Supabase project and waits for ACTIVE_HEALTHY',
    maxWait: '2 minutes',
  });
}
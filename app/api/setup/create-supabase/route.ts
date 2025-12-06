import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_MANAGEMENT_API = 'https://api.supabase.com/v1';

interface CreateSupabaseRequest {
  projectName: string;
  clientId?: string;
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
        const keysResponse = await fetch(`${SUPABASE_MANAGEMENT_API}/projects/${existing.id}/api-keys`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

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
      
      // Check if it's an "already exists" error
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

    // Step 3: Wait for project to be ready
    const projectRef = project.id;
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!isReady && attempts < maxAttempts) {
      await sleep(10000);
      attempts++;

      const statusResponse = await fetch(`${SUPABASE_MANAGEMENT_API}/projects/${projectRef}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.status === 'ACTIVE_HEALTHY') {
          isReady = true;
          console.log('Project is ready');
        } else {
          console.log(`Project status: ${statusData.status} (attempt ${attempts}/${maxAttempts})`);
        }
      }
    }

    if (!isReady) {
      return NextResponse.json({ 
        success: true,
        projectId: projectRef,
        url: `https://${projectRef}.supabase.co`,
        status: 'pending',
        message: 'Project created but still initializing',
      });
    }

    // Step 4: Get API keys
    const keysResponse = await fetch(`${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/api-keys`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const keys = keysResponse.ok ? await keysResponse.json() : [];
    const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
    const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

    return NextResponse.json({
      success: true,
      projectId: projectRef,
      url: `https://${projectRef}.supabase.co`,
      anonKey,
      serviceKey,
      dbPassword,
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
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_MANAGEMENT_API = 'https://api.supabase.com/v1';

interface CreateSupabaseRequest {
  projectName: string;
  clientId?: string; // For logging
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateSupabaseRequest = await req.json();
    const { projectName, clientId } = body;

    if (!projectName) {
      return NextResponse.json({ error: 'Project name required' }, { status: 400 });
    }

    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    const orgId = process.env.SUPABASE_ORG_ID;

    if (!accessToken || !orgId) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    // Generate a secure database password
    const dbPassword = generateSecurePassword();

    // Step 1: Create the project
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
        region: 'us-east-1', // Or make configurable
        plan: 'free', // Or 'pro' for paid
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Supabase create error:', error);
      return NextResponse.json({ error: `Failed to create project: ${error}` }, { status: 500 });
    }

    const project = await createResponse.json();
    console.log('Project created:', project.id);

    // Step 2: Wait for project to be ready (polling)
    const projectRef = project.id;
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max

    while (!isReady && attempts < maxAttempts) {
      await sleep(10000); // Wait 10 seconds between checks
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
        error: 'Project creation timed out',
        projectId: projectRef,
        status: 'pending'
      }, { status: 202 });
    }

    // Step 3: Get API keys
    const keysResponse = await fetch(`${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/api-keys`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!keysResponse.ok) {
      return NextResponse.json({ error: 'Failed to get API keys' }, { status: 500 });
    }

    const keys = await keysResponse.json();
    const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key;
    const serviceKey = keys.find((k: any) => k.name === 'service_role')?.api_key;

    // Step 4: Run the client schema
    const supabaseUrl = `https://${projectRef}.supabase.co`;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Read and execute the client schema
    const schemaPath = path.join(process.cwd(), 'supabase', 'client-schema.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      
      // Split schema into statements and execute
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          const { error } = await adminClient.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.warn('Schema statement warning:', error.message);
          }
        } catch (err) {
          console.warn('Schema execution warning:', err);
        }
      }
      console.log('Schema executed');
    }

    return NextResponse.json({
      success: true,
      projectId: projectRef,
      url: supabaseUrl,
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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

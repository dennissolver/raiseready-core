import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateClientSecret } from '@/lib/proxy-utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RegisterClientRequest {
  name: string;
  slug: string;
  adminEmail: string;
  adminName: string;
  platformUrl?: string;
  supabaseProjectId?: string;
  vercelProjectId?: string;
  githubRepo?: string;
  monthlyTokenLimit?: number;
  monthlyCostLimitUsd?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: RegisterClientRequest = await req.json();
    const { name, slug, adminEmail, adminName } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug required' }, { status: 400 });
    }

    // Check if client already exists
    const { data: existing } = await supabase
      .from('proxy_clients')
      .select('id, client_secret')
      .eq('slug', slug)
      .single();

    if (existing) {
      console.log(`Client already exists: ${slug}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        clientId: slug,
        clientSecret: existing.client_secret,
        message: 'Client already registered',
      });
    }

    // Generate unique client secret
    const clientSecret = generateClientSecret();

    // Create client record
    const { data, error } = await supabase
      .from('proxy_clients')
      .insert({
        name,
        slug,
        client_secret: clientSecret,
        admin_email: adminEmail,
        admin_name: adminName,
        platform_url: body.platformUrl,
        supabase_project_id: body.supabaseProjectId,
        vercel_project_id: body.vercelProjectId,
        github_repo: body.githubRepo,
        monthly_token_limit: body.monthlyTokenLimit || 1000000,
        monthly_cost_limit_usd: body.monthlyCostLimitUsd || 50.00,
        billing_email: adminEmail,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to register client:', error);
      return NextResponse.json({ error: `Failed to register: ${error.message}` }, { status: 500 });
    }

    console.log(`Client registered: ${slug} (${data.id})`);

    return NextResponse.json({
      success: true,
      clientId: slug,
      clientSecret,
      internalId: data.id,
    });

  } catch (error) {
    console.error('Register client error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

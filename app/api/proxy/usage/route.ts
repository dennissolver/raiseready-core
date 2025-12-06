import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/proxy/usage - Get usage for all clients or specific client
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientSlug = searchParams.get('client');
  const yearMonth = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  // Get all clients with their usage
  if (!clientSlug) {
    const { data: clients, error } = await supabase
      .from('proxy_clients')
      .select(`
        id,
        name,
        slug,
        admin_email,
        platform_url,
        monthly_token_limit,
        monthly_cost_limit_usd,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get usage for each client
    const clientsWithUsage = await Promise.all(
      (clients || []).map(async (client) => {
        const { data: usage } = await supabase
          .from('proxy_usage_monthly')
          .select('total_requests, total_tokens, total_cost_usd')
          .eq('client_id', client.id)
          .eq('year_month', yearMonth)
          .single();

        return {
          ...client,
          usage: usage || { total_requests: 0, total_tokens: 0, total_cost_usd: 0 },
          usage_percentage: usage
            ? Math.round((usage.total_tokens / client.monthly_token_limit) * 100)
            : 0,
        };
      })
    );

    // Calculate totals
    const totals = clientsWithUsage.reduce(
      (acc, client) => ({
        total_requests: acc.total_requests + (client.usage.total_requests || 0),
        total_tokens: acc.total_tokens + (client.usage.total_tokens || 0),
        total_cost_usd: acc.total_cost_usd + parseFloat(client.usage.total_cost_usd || 0),
      }),
      { total_requests: 0, total_tokens: 0, total_cost_usd: 0 }
    );

    return NextResponse.json({
      month: yearMonth,
      clients: clientsWithUsage,
      totals,
    });
  }

  // Get specific client details
  const { data: client, error: clientError } = await supabase
    .from('proxy_clients')
    .select('*')
    .eq('slug', clientSlug)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Get monthly usage
  const { data: monthlyUsage } = await supabase
    .from('proxy_usage_monthly')
    .select('*')
    .eq('client_id', client.id)
    .order('year_month', { ascending: false })
    .limit(12);

  // Get recent logs
  const { data: recentLogs } = await supabase
    .from('proxy_usage_logs')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Get Resend key status
  const { data: resendKey } = await supabase
    .from('proxy_resend_keys')
    .select('api_key_preview, is_active, created_at')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .single();

  return NextResponse.json({
    client,
    monthlyUsage: monthlyUsage || [],
    recentLogs: recentLogs || [],
    resendKey: resendKey || null,
  });
}

// PATCH /api/proxy/usage - Update client limits
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { clientSlug, monthlyTokenLimit, monthlyCostLimitUsd, isActive } = body;

  if (!clientSlug) {
    return NextResponse.json({ error: 'clientSlug required' }, { status: 400 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (monthlyTokenLimit !== undefined) updates.monthly_token_limit = monthlyTokenLimit;
  if (monthlyCostLimitUsd !== undefined) updates.monthly_cost_limit_usd = monthlyCostLimitUsd;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data, error } = await supabase
    .from('proxy_clients')
    .update(updates)
    .eq('slug', clientSlug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, client: data });
}
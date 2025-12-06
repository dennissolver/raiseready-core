import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const RESEND_API_URL = 'https://api.resend.com';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateResendKeyRequest {
  clientSlug: string;
  clientName: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateResendKeyRequest = await req.json();
    const { clientSlug, clientName } = body;

    if (!clientSlug) {
      return NextResponse.json({ error: 'Client slug required' }, { status: 400 });
    }

    const masterResendKey = process.env.RESEND_API_KEY;
    if (!masterResendKey) {
      return NextResponse.json({
        error: 'Resend not configured',
        message: 'Set RESEND_API_KEY in environment variables',
      }, { status: 500 });
    }

    // Get client record
    const { data: client } = await supabase
      .from('proxy_clients')
      .select('id')
      .eq('slug', clientSlug)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if already has a key
    const { data: existingKey } = await supabase
      .from('proxy_resend_keys')
      .select('*')
      .eq('client_id', client.id)
      .eq('is_active', true)
      .single();

    if (existingKey) {
      return NextResponse.json({
        success: true,
        skipped: true,
        apiKeyPreview: existingKey.api_key_preview,
        message: 'Client already has Resend API key',
      });
    }

    // Create new API key via Resend Management API
    const createKeyResponse = await fetch(`${RESEND_API_URL}/api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${masterResendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${clientName} (${clientSlug})`,
        permission: 'sending_access', // Limited to sending only
      }),
    });

    if (!createKeyResponse.ok) {
      const error = await createKeyResponse.text();
      console.error('Failed to create Resend API key:', error);

      // Don't fail setup - email is optional
      return NextResponse.json({
        success: false,
        warning: `Could not create Resend key: ${error}`,
        message: 'Client can still function without dedicated email key',
      });
    }

    const keyData = await createKeyResponse.json();

    // Store key reference (not the full key - that's only shown once!)
    const { error: dbError } = await supabase
      .from('proxy_resend_keys')
      .insert({
        client_id: client.id,
        resend_api_key_id: keyData.id,
        api_key_preview: keyData.token?.slice(0, 12) + '...', // First 12 chars
        is_active: true,
      });

    if (dbError) {
      console.error('Failed to store Resend key reference:', dbError);
    }

    console.log(`Created Resend API key for client: ${clientSlug}`);

    // Return the full token - it's only available now!
    return NextResponse.json({
      success: true,
      apiKey: keyData.token,
      apiKeyId: keyData.id,
      apiKeyPreview: keyData.token?.slice(0, 12) + '...',
    });

  } catch (error) {
    console.error('Create Resend key error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Get key status (not the key itself)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientSlug = searchParams.get('clientSlug');

  if (!clientSlug) {
    return NextResponse.json({ error: 'clientSlug required' }, { status: 400 });
  }

  const { data: client } = await supabase
    .from('proxy_clients')
    .select('id')
    .eq('slug', clientSlug)
    .single();

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { data: keyData } = await supabase
    .from('proxy_resend_keys')
    .select('api_key_preview, is_active, created_at')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .single();

  return NextResponse.json({
    hasKey: !!keyData,
    keyPreview: keyData?.api_key_preview,
    createdAt: keyData?.created_at,
  });
}
import { NextRequest, NextResponse } from 'next/server';
import { validateClient, isOverLimit, logUsage, calculateCost } from '@/lib/proxy-utils';

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';

export async function POST(req: NextRequest) {
  try {
    // 1. Extract client credentials
    const clientId = req.headers.get('X-Client-ID');
    const clientSecret = req.headers.get('X-Client-Secret');

    // 2. Validate client
    const client = await validateClient(clientId, clientSecret);
    if (!client) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid client credentials' },
        { status: 401 }
      );
    }

    // 3. Check usage limits
    const limitCheck = await isOverLimit(client.id);
    if (limitCheck.over) {
      return NextResponse.json(
        { error: 'Usage limit exceeded', message: limitCheck.reason },
        { status: 429 }
      );
    }

    // 4. Parse request body
    const body = await req.json();
    const model = body.model || 'text-embedding-3-small';

    // 5. Forward to OpenAI
    const openaiResponse = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        model,
      }),
    });

    // 6. Parse response
    const responseData = await openaiResponse.json();

    // 7. Log usage if successful
    if (openaiResponse.ok && responseData.usage) {
      const totalTokens = responseData.usage.total_tokens || 0;
      const cost = calculateCost('openai', model, totalTokens, 0);

      await logUsage({
        client_id: client.id,
        endpoint: 'embeddings',
        model,
        provider: 'openai',
        input_tokens: totalTokens,
        output_tokens: 0,
        total_tokens: totalTokens,
        cost_usd: cost,
        request_metadata: {
          client_slug: client.slug,
          input_count: Array.isArray(body.input) ? body.input.length : 1,
        },
      });

      console.log(`Proxy [${client.slug}]: ${totalTokens} embedding tokens, $${cost.toFixed(6)}`);
    }

    // 8. Return response
    return NextResponse.json(responseData, { status: openaiResponse.status });

  } catch (error) {
    console.error('Proxy embeddings error:', error);
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Client-ID, X-Client-Secret',
    },
  });
}
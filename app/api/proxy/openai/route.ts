import { NextRequest, NextResponse } from 'next/server';
import { validateClient, isOverLimit, logUsage, calculateCost } from '@/lib/proxy-utils';

const OPENAI_API_URL = 'https://api.openai.com/v1';

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

    // 4. Parse request body and determine endpoint
    const body = await req.json();
    const endpoint = body._endpoint || 'chat/completions'; // Allow client to specify
    delete body._endpoint; // Remove our custom field before forwarding

    const model = body.model || 'gpt-4o-mini';

    // 5. Forward to OpenAI
    const openaiResponse = await fetch(`${OPENAI_API_URL}/${endpoint}`, {
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
      const inputTokens = responseData.usage.prompt_tokens || 0;
      const outputTokens = responseData.usage.completion_tokens || 0;
      const totalTokens = responseData.usage.total_tokens || inputTokens + outputTokens;
      const cost = calculateCost('openai', model, inputTokens, outputTokens);

      await logUsage({
        client_id: client.id,
        endpoint: endpoint.includes('embedding') ? 'embeddings' : 'chat',
        model,
        provider: 'openai',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: cost,
        request_metadata: {
          client_slug: client.slug,
        },
      });

      console.log(`Proxy [${client.slug}]: ${totalTokens} tokens, $${cost.toFixed(6)} (OpenAI)`);
    }

    // 8. Return response
    return NextResponse.json(responseData, { status: openaiResponse.status });

  } catch (error) {
    console.error('Proxy OpenAI error:', error);
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
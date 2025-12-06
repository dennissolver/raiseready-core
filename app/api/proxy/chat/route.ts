import { NextRequest, NextResponse } from 'next/server';
import { validateClient, isOverLimit, logUsage, calculateCost } from '@/lib/proxy-utils';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function POST(req: NextRequest) {
  try {
    // 1. Extract client credentials from headers
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
    const model = body.model || 'claude-sonnet-4-20250514';

    // 5. Forward to Anthropic
    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        model,
      }),
    });

    // 6. Parse response
    const responseData = await anthropicResponse.json();

    // 7. Log usage if successful
    if (anthropicResponse.ok && responseData.usage) {
      const inputTokens = responseData.usage.input_tokens || 0;
      const outputTokens = responseData.usage.output_tokens || 0;
      const totalTokens = inputTokens + outputTokens;
      const cost = calculateCost('anthropic', model, inputTokens, outputTokens);

      await logUsage({
        client_id: client.id,
        endpoint: 'chat',
        model,
        provider: 'anthropic',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: cost,
        request_metadata: {
          client_slug: client.slug,
        },
      });

      console.log(`Proxy [${client.slug}]: ${totalTokens} tokens, $${cost.toFixed(6)}`);
    }

    // 8. Return response with same status
    return NextResponse.json(responseData, { status: anthropicResponse.status });

  } catch (error) {
    console.error('Proxy chat error:', error);
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support streaming
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
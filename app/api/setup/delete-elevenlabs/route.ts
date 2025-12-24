// app/api/setup/delete-elevenlabs/route.ts
// ============================================================================
// DELETE ELEVENLABS AGENT - "Dumb Tool"
//
// Deletes an ElevenLabs conversational AI agent. Used for cleanup.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

interface DeleteElevenLabsRequest {
  agentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DeleteElevenLabsRequest = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`[DeleteElevenLabs] Deleting agent: ${agentId}`);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        method: 'DELETE',
        headers: {
          'xi-api-key': elevenlabsApiKey,
        },
      }
    );

    if (res.status === 404) {
      console.log(`[DeleteElevenLabs] Agent not found (already deleted?): ${agentId}`);
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = 'Failed to delete agent';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return NextResponse.json({ error: errorMessage }, { status: res.status });
    }

    console.log(`[DeleteElevenLabs] Deleted: ${agentId}`);
    return NextResponse.json({ success: true, deleted: agentId });

  } catch (error: any) {
    console.error('[DeleteElevenLabs] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'delete-elevenlabs',
    description: 'Deletes an ElevenLabs conversational AI agent',
    method: 'POST',
    params: { agentId: 'string (required)' },
  });
}
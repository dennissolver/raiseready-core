// app/api/voice-coach/webhook/route.ts
// ============================================================================
// ELEVENLABS WEBHOOK ENDPOINT
//
// Receives events from ElevenLabs Conversational AI:
// - conversation.started
// - conversation.ended
// - message.received
// - transcript.updated
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

interface ElevenLabsWebhookEvent {
  type: string;
  conversation_id: string;
  agent_id: string;
  timestamp: string;
  data: {
    transcript?: Array<{
      role: 'user' | 'agent';
      message: string;
      timestamp: string;
    }>;
    message?: {
      role: 'user' | 'agent';
      content: string;
    };
    metadata?: Record<string, any>;
    duration_seconds?: number;
  };
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const event: ElevenLabsWebhookEvent = await request.json();

    console.log(`[ElevenLabs Webhook] ${event.type}:`, {
      conversation_id: event.conversation_id,
      timestamp: event.timestamp,
    });

    const supabase = await createClient();

    switch (event.type) {
      case 'conversation.started':
        await handleConversationStarted(supabase, event);
        break;

      case 'conversation.ended':
        await handleConversationEnded(supabase, event);
        break;

      case 'transcript.updated':
        await handleTranscriptUpdated(supabase, event);
        break;

      case 'message.received':
        // Real-time message - could be used for live updates
        console.log('[Webhook] Message:', event.data.message);
        break;

      default:
        console.log('[Webhook] Unknown event type:', event.type);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[ElevenLabs Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleConversationStarted(supabase: any, event: ElevenLabsWebhookEvent) {
  const { conversation_id, agent_id, data } = event;

  // Extract founder ID from metadata if available
  const founderId = data.metadata?.founder_id;
  const mode = data.metadata?.coaching_mode || 'discovery';

  if (founderId) {
    await supabase.from('voice_sessions').upsert({
      session_id: conversation_id,
      founder_id: founderId,
      agent_id,
      mode,
      status: 'active',
      started_at: event.timestamp,
      metadata: data.metadata,
    }, {
      onConflict: 'session_id',
    });
  }

  console.log(`[Webhook] Conversation started: ${conversation_id}`);
}

async function handleConversationEnded(supabase: any, event: ElevenLabsWebhookEvent) {
  const { conversation_id, data } = event;

  // Update session with final transcript and duration
  const updateData: any = {
    status: 'completed',
    ended_at: event.timestamp,
    duration_seconds: data.duration_seconds,
  };

  if (data.transcript) {
    updateData.transcript = data.transcript;
  }

  await supabase
    .from('voice_sessions')
    .update(updateData)
    .eq('session_id', conversation_id);

  // If this was a discovery session, update founder profile
  const { data: session } = await supabase
    .from('voice_sessions')
    .select('founder_id, mode')
    .eq('session_id', conversation_id)
    .single();

  if (session?.mode === 'discovery' && session?.founder_id) {
    // Check transcript for completion markers
    const hasCompletionMarker = data.transcript?.some(
      (t: any) => t.message?.toLowerCase().includes('story summary') ||
                  t.message?.toLowerCase().includes('ready for the next step')
    );

    if (hasCompletionMarker) {
      await supabase
        .from('founder_profiles')
        .update({
          discovery_completeness: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('founder_id', session.founder_id);

      await supabase
        .from('founders')
        .update({
          profile_completed_at: new Date().toISOString(),
        })
        .eq('id', session.founder_id);
    }
  }

  console.log(`[Webhook] Conversation ended: ${conversation_id}, duration: ${data.duration_seconds}s`);
}

async function handleTranscriptUpdated(supabase: any, event: ElevenLabsWebhookEvent) {
  const { conversation_id, data } = event;

  if (data.transcript) {
    await supabase
      .from('voice_sessions')
      .update({
        transcript: data.transcript,
        updated_at: event.timestamp,
      })
      .eq('session_id', conversation_id);
  }
}

// ============================================================================
// WEBHOOK VERIFICATION (optional - for security)
// ============================================================================

export async function GET(request: NextRequest) {
  // ElevenLabs might send a verification request
  const challenge = request.nextUrl.searchParams.get('challenge');

  if (challenge) {
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'ElevenLabs webhook endpoint ready',
  });
}
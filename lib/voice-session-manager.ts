// lib/voice-session-manager.ts
import type {
  VoiceSessionInsert,
  VoiceMessageInsert,
  VoiceFeedbackInsert,
  CoachingMode,
  InvestorPersona
} from '@/types/voice-coaching';
import { createClient } from '@/lib/supabase/client';

export class VoiceSessionManager {
  private supabase = createClient();

  async createSession(
    userId: string,
    projectId: string,
    mode: CoachingMode,
    persona?: InvestorPersona
  ) {
    const session: VoiceSessionInsert = {
      user_id: userId,           // ✅ snake_case matches DB
      project_id: projectId,     // ✅ snake_case
      coaching_mode: mode,       // ✅ snake_case
      investor_persona: persona, // ✅ snake_case
      status: 'active',
      started_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('voice_sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    audioUrl?: string
  ) {
    const message: VoiceMessageInsert = {
      session_id: sessionId,  // ✅ snake_case
      role,
      content,
      audio_url: audioUrl,    // ✅ snake_case
      timestamp: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('voice_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async endSession(sessionId: string) {
    const { data, error } = await this.supabase
      .from('voice_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async generateFeedback(sessionId: string, transcript: any[]) {
    // Call Claude API to analyze transcript
    // Generate scores and recommendations
    // Store in voice_feedback table
  }
}
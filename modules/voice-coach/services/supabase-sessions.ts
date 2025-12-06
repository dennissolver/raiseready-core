/**
 * Supabase Sessions Service
 * Handles persistence of voice coaching sessions to Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  VoiceSessionState,
  VoiceSessionRecord,
  SessionFeedback,
  Message
} from '../types/voice-session';

export class SupabaseSessionsService {
  private supabase: SupabaseClient;
  
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabase = createClient(
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  }
  
  /**
   * Save a new session to the database
   */
  async createSession(state: VoiceSessionState): Promise<VoiceSessionRecord | null> {
    try {
      const record: Partial<VoiceSessionRecord> = {
        id: state.id,
        user_id: state.config.userId,
        session_type: state.config.sessionType,
        coaching_mode: state.config.mode,
        investor_persona: state.config.persona,
        transcript: state.transcript,
        metrics: state.metrics,
        pitch_deck_id: state.config.pitchDeckId,
        project_id: state.config.projectId,
        created_at: state.startTime.toISOString(),
      };
      
      const { data, error } = await this.supabase
        .from('voice_coaching_sessions')
        .insert(record)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating session:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Exception creating session:', error);
      return null;
    }
  }
  
  /**
   * Update an existing session
   */
  async updateSession(
    sessionId: string,
    updates: Partial<VoiceSessionRecord>
  ): Promise<VoiceSessionRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('voice_coaching_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating session:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Exception updating session:', error);
      return null;
    }
  }
  
  /**
   * Complete a session with final data
   */
  async completeSession(
    sessionId: string,
    state: VoiceSessionState,
    feedback: SessionFeedback
  ): Promise<VoiceSessionRecord | null> {
    try {
      const updates: Partial<VoiceSessionRecord> = {
        transcript: state.transcript,
        feedback: feedback,
        metrics: state.metrics,
        duration_seconds: state.metrics?.duration,
        completed_at: state.endTime?.toISOString() || new Date().toISOString()
      };
      
      return await this.updateSession(sessionId, updates);
    } catch (error) {
      console.error('Exception completing session:', error);
      return null;
    }
  }
  
  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<VoiceSessionRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('voice_coaching_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Exception getting session:', error);
      return null;
    }
  }
  
  /**
   * Get all sessions for a user
   */
  async getUserSessions(
    userId: string,
    options?: {
      sessionType?: 'discovery' | 'pitch_practice';
      limit?: number;
      offset?: number;
    }
  ): Promise<VoiceSessionRecord[]> {
    try {
      let query = this.supabase
        .from('voice_coaching_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (options?.sessionType) {
        query = query.eq('session_type', options.sessionType);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error getting user sessions:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception getting user sessions:', error);
      return [];
    }
  }
  
  /**
   * Get sessions for a specific project
   */
  async getProjectSessions(projectId: string): Promise<VoiceSessionRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('voice_coaching_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error getting project sessions:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception getting project sessions:', error);
      return [];
    }
  }
  
  /**
   * Get session statistics for a user
   */
  async getUserSessionStats(userId: string): Promise<{
    totalSessions: number;
    totalDuration: number;
    averageScore: number;
    sessionsByType: Record<string, number>;
    recentSessions: VoiceSessionRecord[];
  }> {
    try {
      const sessions = await this.getUserSessions(userId);
      
      const stats = {
        totalSessions: sessions.length,
        totalDuration: sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0),
        averageScore: 0,
        sessionsByType: {} as Record<string, number>,
        recentSessions: sessions.slice(0, 5)
      };
      
      // Calculate average score
      const sessionsWithScores = sessions.filter(s => s.feedback?.overallScore);
      if (sessionsWithScores.length > 0) {
        stats.averageScore = sessionsWithScores.reduce(
          (sum, s) => sum + (s.feedback?.overallScore || 0),
          0
        ) / sessionsWithScores.length;
      }
      
      // Count sessions by type
      sessions.forEach(s => {
        const type = s.session_type;
        stats.sessionsByType[type] = (stats.sessionsByType[type] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Exception getting user session stats:', error);
      return {
        totalSessions: 0,
        totalDuration: 0,
        averageScore: 0,
        sessionsByType: {},
        recentSessions: []
      };
    }
  }
  
  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('voice_coaching_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) {
        console.error('Error deleting session:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception deleting session:', error);
      return false;
    }
  }
  
  /**
   * Upload audio file to storage
   */
  async uploadAudio(
    sessionId: string,
    audioBlob: Blob
  ): Promise<string | null> {
    try {
      const fileName = `${sessionId}_${Date.now()}.webm`;
      const filePath = `voice-sessions/${sessionId}/${fileName}`;
      
      const { data, error } = await this.supabase.storage
        .from('voice-recordings')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading audio:', error);
        return null;
      }
      
      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('voice-recordings')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Exception uploading audio:', error);
      return null;
    }
  }
  
  /**
   * Upload video file to storage
   */
  async uploadVideo(
    sessionId: string,
    videoBlob: Blob
  ): Promise<string | null> {
    try {
      const fileName = `${sessionId}_${Date.now()}.webm`;
      const filePath = `voice-sessions/${sessionId}/${fileName}`;
      
      const { data, error } = await this.supabase.storage
        .from('video-recordings')
        .upload(filePath, videoBlob, {
          contentType: 'video/webm',
          upsert: false
        });
      
      if (error) {
        console.error('Error uploading video:', error);
        return null;
      }
      
      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('video-recordings')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Exception uploading video:', error);
      return null;
    }
  }
}

// Export singleton instance
let supabaseSessionsService: SupabaseSessionsService | null = null;

export function getSupabaseSessionsService(): SupabaseSessionsService {
  if (!supabaseSessionsService) {
    supabaseSessionsService = new SupabaseSessionsService();
  }
  return supabaseSessionsService;
}

export default SupabaseSessionsService;

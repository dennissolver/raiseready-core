/**
 * Voice Coaching Session Types
 * Core type definitions for the RaiseReady voice coaching system
 */

export type CoachingMode = 'interrupt' | 'full_listen' | 'investor_sim';

export type InvestorPersona = 'easy_going' | 'enthusiastic' | 'aggressive';

export type SessionType = 'discovery' | 'pitch_practice';

export type SessionStatus = 'initializing' | 'active' | 'paused' | 'completed' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  metadata?: {
    confidence?: number;
    duration?: number;
    interrupted?: boolean;
  };
}

export interface VoiceSessionConfig {
  userId: string;
  sessionType: SessionType;
  mode: CoachingMode;
  persona?: InvestorPersona;
  pitchDeckId?: string;
  projectId?: string;
  
  // Optional context data
  projectData?: {
    name: string;
    sdgs: number[];
    impact_thesis: string;
    funding_target: number;
    blended_returns?: {
      financial: number;
      impact: number;
      total: number;
    };
  };
  
  // Session preferences
  preferences?: {
    interruptionLevel?: 'low' | 'medium' | 'high';
    feedbackDetail?: 'brief' | 'detailed' | 'comprehensive';
    recordAudio?: boolean;
    recordVideo?: boolean;
  };
}

export interface VoiceSessionState {
  id: string;
  config: VoiceSessionConfig;
  status: SessionStatus;
  transcript: Message[];
  startTime: Date;
  endTime?: Date;
  audioStream?: MediaStream;
  videoStream?: MediaStream;
  
  // Real-time metrics
  metrics?: {
    duration: number;
    wordCount: number;
    speakingPace?: number; // words per minute
    pauseCount?: number;
    interruptionCount?: number;
  };
  
  // Error handling
  error?: {
    code: string;
    message: string;
    timestamp: Date;
  };
}

export interface SessionFeedback {
  sessionId: string;
  overallScore?: number;
  
  // Detailed feedback categories
  content: {
    score: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  };
  
  delivery: {
    score: number;
    pace: 'too_fast' | 'good' | 'too_slow';
    clarity: number;
    confidence: number;
    strengths: string[];
    improvements: string[];
  };
  
  impact: {
    score: number;
    sdgAlignment: number;
    impactClarity: number;
    theoryOfChange: number;
    strengths: string[];
    improvements: string[];
  };
  
  // Mode-specific feedback
  investorQuestions?: {
    question: string;
    response: string;
    quality: 'excellent' | 'good' | 'needs_work';
    feedback: string;
  }[];
  
  // Overall recommendations
  nextSteps: string[];
  practiceAreas: string[];
  
  generatedAt: Date;
}

export interface VoiceStreamConfig {
  sampleRate: number;
  channels: number;
  encoding: 'pcm16' | 'opus';
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  duration: number;
}

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  timestamp: number;
  confidence: number;
}

// Database types (matching Supabase schema)
export interface VoiceSessionRecord {
  id: string;
  user_id: string;
  session_type: SessionType;
  coaching_mode: CoachingMode;
  investor_persona?: InvestorPersona;
  
  transcript: Message[];
  audio_url?: string;
  video_url?: string;
  
  feedback?: SessionFeedback;
  metrics?: VoiceSessionState['metrics'];
  duration_seconds?: number;
  
  created_at: string;
  completed_at?: string;
  
  pitch_deck_id?: string;
  project_id?: string;
}

// Event types for session management
export type SessionEvent =
  | { type: 'session_started'; data: VoiceSessionState }
  | { type: 'message_received'; data: Message }
  | { type: 'transcription_update'; data: TranscriptionChunk }
  | { type: 'audio_chunk'; data: AudioChunk }
  | { type: 'session_paused' }
  | { type: 'session_resumed' }
  | { type: 'session_completed'; data: SessionFeedback }
  | { type: 'error'; data: { code: string; message: string } };

export type SessionEventHandler = (event: SessionEvent) => void;

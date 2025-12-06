import { clientConfig } from '@/config';
// types/voice-coaching.ts
import type { Database } from './database';

// Extract database types (use snake_case - matches DB)
export type VoiceSession = Database['public']['Tables']['voice_sessions']['Row'];
export type VoiceSessionInsert = Database['public']['Tables']['voice_sessions']['Insert'];
export type VoiceSessionUpdate = Database['public']['Tables']['voice_sessions']['Update'];

export type VoiceMessage = Database['public']['Tables']['voice_messages']['Row'];
export type VoiceMessageInsert = Database['public']['Tables']['voice_messages']['Insert'];

export type VoiceFeedback = Database['public']['Tables']['voice_feedback']['Row'];
export type VoiceFeedbackInsert = Database['public']['Tables']['voice_feedback']['Insert'];

// Coaching mode definitions
export const COACHING_MODES = {
  'pitch-practice': {
    name: 'Pitch Practice',
    description: 'Practice your full pitch with comprehensive feedback',
    icon: '🎤',
    color: 'blue'
  },
  'investor-simulation': {
    name: 'Investor Simulation',
    description: 'Face realistic investor personalities',
    icon: '👔',
    color: 'purple'
  },
  'q-and-a': {
    name: 'Q&A Drilling',
    description: 'Practice answering tough investor questions',
    icon: '❓',
    color: 'orange'
  },
  'impact-storytelling': {
    name: 'Impact Storytelling',
    description: 'Craft your compelling impact narrative',
    icon: '🌍',
    color: 'green'
  }
} as const;

export type CoachingMode = keyof typeof COACHING_MODES;

// Investor persona definitions
export const INVESTOR_PERSONAS = {
  'supportive': {
    name: 'Sarah Chen',
    title: 'Supportive Impact Investor',
    description: 'Encouraging, looks for reasons to invest',
    style: 'Warm and enthusiastic, asks leading questions',
    color: 'green'
  },
  'skeptical': {
    name: 'Sam Rodriguez',
    title: 'Skeptical Venture Partner',
    description: 'Critical, needs convincing',
    style: 'Challenges assumptions, demands evidence',
    color: 'red'
  },
  'technical': {
    name: 'Tom Williams',
    title: 'Technical Investor',
    description: 'Deep dives into product and technology',
    style: 'Focuses on implementation and scalability',
    color: 'blue'
  },
  'impact-focused': {
    name: 'Irene Patel',
    title: 'Impact Fund Manager',
    description: 'Laser-focused on measurable impact',
    style: 'Questions theory of change and impact metrics',
    color: 'purple'
  }
} as const;

export type InvestorPersona = keyof typeof INVESTOR_PERSONAS;

// Session configuration
export interface VoiceCoachConfig {
  userId: string;
  projectId: string;
  mode: CoachingMode;
  persona?: InvestorPersona;
  projectData: {
    name: string;
    sdgs: number[];
    summary: string;
  };
}

// Session result
export interface VoiceSessionResult {
  sessionId: string;
  messageCount: number;
  duration: number;
}
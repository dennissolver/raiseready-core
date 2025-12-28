'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useConversation } from '@11labs/react';

// ============================================================================
// TYPES
// ============================================================================

export type CoachingMode =
  | 'discovery'      // Narrative/background discovery
  | 'materials'      // Deck improvement coaching
  | 'pitch_practice' // Pitch practice with investor simulation
  | 'investor_sim';  // Investor persona simulation

export interface VoiceInterfaceProps {
  mode: CoachingMode;
  agentId?: string;
  // Context to send to the agent
  context?: {
    founderName?: string;
    companyName?: string;
    deckId?: string;
    deckTitle?: string;
    readinessScore?: number;
    weaknesses?: string[];
    strengths?: string[];
    investorPersona?: string;
    platformType?: string;
  };
  // Callbacks
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string, transcript: any[]) => void;
  onMessage?: (message: { role: string; content: string }) => void;
  onError?: (error: Error) => void;
  // Styling
  className?: string;
  minimized?: boolean;
}

// ============================================================================
// MODE CONFIGURATIONS
// ============================================================================

const MODE_CONFIG: Record<CoachingMode, {
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  discovery: {
    title: 'Story Discovery',
    description: 'Tell me about your journey and what drives you',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: '🎯',
  },
  materials: {
    title: 'Deck Coaching',
    description: 'Let\'s improve your pitch materials together',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: '📊',
  },
  pitch_practice: {
    title: 'Pitch Practice',
    description: 'Practice your pitch with real-time feedback',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: '🎤',
  },
  investor_sim: {
    title: 'Investor Simulation',
    description: 'Face tough questions from a simulated investor',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: '💼',
  },
};

// ============================================================================
// VOICE INTERFACE COMPONENT
// ============================================================================

export function VoiceInterface({
  mode,
  agentId,
  context,
  onSessionStart,
  onSessionEnd,
  onMessage,
  onError,
  className = '',
  minimized = false,
}: VoiceInterfaceProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: string; content: string }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Get agent ID from props or environment
  const effectiveAgentId = agentId || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('[Voice] Connected to ElevenLabs');
      setIsInitialized(true);
    },
    onDisconnect: () => {
      console.log('[Voice] Disconnected from ElevenLabs');
      if (sessionId && onSessionEnd) {
        onSessionEnd(sessionId, transcript);
      }
    },
    onMessage: (message) => {
      console.log('[Voice] Message:', message);
      const newMessage = {
        role: message.source === 'user' ? 'user' : 'assistant',
        content: message.message,
      };
      setTranscript(prev => [...prev, newMessage]);
      onMessage?.(newMessage);
    },
    onError: (error) => {
      console.error('[Voice] Error:', error);
      onError?.(new Error(error.message || 'Voice connection error'));
    },
  });

  const { status, isSpeaking } = conversation;

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Build dynamic variables for the agent
  const buildDynamicVariables = useCallback(() => {
    const vars: Record<string, string> = {
      coaching_mode: mode,
      platform_type: context?.platformType || 'impact_investor',
    };

    if (context?.founderName) vars.founder_name = context.founderName;
    if (context?.companyName) vars.company_name = context.companyName;
    if (context?.deckTitle) vars.deck_title = context.deckTitle;
    if (context?.readinessScore) vars.readiness_score = String(context.readinessScore);
    if (context?.weaknesses?.length) vars.weaknesses = context.weaknesses.join('; ');
    if (context?.strengths?.length) vars.strengths = context.strengths.join('; ');
    if (context?.investorPersona) vars.investor_persona = context.investorPersona;

    return vars;
  }, [mode, context]);

  // Start conversation
  const handleStart = async () => {
    if (!effectiveAgentId) {
      onError?.(new Error('No ElevenLabs agent ID configured'));
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Generate session ID
      const newSessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      onSessionStart?.(newSessionId);

      // Start the conversation with dynamic variables
      await conversation.startSession({
        agentId: effectiveAgentId,
        dynamicVariables: buildDynamicVariables(),
      });

      setTranscript([]);
    } catch (error) {
      console.error('[Voice] Failed to start:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to start voice session'));
    }
  };

  // End conversation
  const handleEnd = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('[Voice] Failed to end:', error);
    }
  };

  // Toggle mute
  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // Note: ElevenLabs SDK handles muting internally
  };

  const modeConfig = MODE_CONFIG[mode];
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // Minimized floating button view
  if (minimized) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          size="lg"
          className={`rounded-full w-16 h-16 shadow-lg ${
            isConnected 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-purple-600 hover:bg-purple-700'
          } ${isSpeaking ? 'animate-pulse' : ''}`}
          onClick={isConnected ? handleEnd : handleStart}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isConnected ? (
            <PhoneOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>
        {isConnected && (
          <Badge
            className="absolute -top-2 -right-2 bg-green-500"
            variant="default"
          >
            Live
          </Badge>
        )}
      </div>
    );
  }

  // Full interface view
  return (
    <Card className={`${modeConfig.bgColor} ${modeConfig.borderColor} border ${className}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{modeConfig.icon}</span>
            <div>
              <h3 className={`font-semibold ${modeConfig.color}`}>{modeConfig.title}</h3>
              <p className="text-sm text-gray-400">{modeConfig.description}</p>
            </div>
          </div>
          {isConnected && (
            <Badge variant="default" className="bg-green-500 animate-pulse">
              <Volume2 className="w-3 h-3 mr-1" />
              Live
            </Badge>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center py-8">
          <div className={`relative ${isSpeaking ? 'animate-pulse' : ''}`}>
            {/* Outer ring */}
            <div className={`absolute inset-0 rounded-full ${
              isConnected 
                ? 'bg-green-500/20 animate-ping' 
                : 'bg-gray-500/20'
            }`} style={{ transform: 'scale(1.5)' }} />

            {/* Main circle */}
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
              isConnected
                ? isSpeaking 
                  ? 'bg-green-500' 
                  : 'bg-green-600'
                : 'bg-gray-700'
            }`}>
              {isConnecting ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : isConnected ? (
                <Volume2 className={`w-10 h-10 text-white ${isSpeaking ? 'animate-bounce' : ''}`} />
              ) : (
                <Mic className="w-10 h-10 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="mb-4 max-h-48 overflow-y-auto bg-black/20 rounded-lg p-3">
            {transcript.slice(-6).map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm mb-2 ${
                  msg.role === 'user' ? 'text-blue-300' : 'text-gray-300'
                }`}
              >
                <span className="font-medium">
                  {msg.role === 'user' ? 'You: ' : 'Coach: '}
                </span>
                {msg.content}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleMute}
                className={isMuted ? 'bg-red-500/20 border-red-500' : ''}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={handleEnd}
                className="px-8"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Session
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              onClick={handleStart}
              disabled={isConnecting || !effectiveAgentId}
              className={`px-8 ${modeConfig.bgColor} hover:opacity-90`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-2" />
                  Start Voice Session
                </>
              )}
            </Button>
          )}
        </div>

        {/* No agent warning */}
        {!effectiveAgentId && (
          <p className="text-center text-sm text-red-400 mt-4">
            Voice coaching not available - no agent configured
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// FLOATING VOICE BUTTON (for embedding in any page)
// ============================================================================

export function FloatingVoiceButton({
  mode,
  context,
  onSessionEnd,
}: {
  mode: CoachingMode;
  context?: VoiceInterfaceProps['context'];
  onSessionEnd?: VoiceInterfaceProps['onSessionEnd'];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-96">
        <VoiceInterface
          mode={mode}
          context={context}
          onSessionEnd={(sessionId, transcript) => {
            onSessionEnd?.(sessionId, transcript);
            setIsExpanded(false);
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2"
          onClick={() => setIsExpanded(false)}
        >
          ✕
        </Button>
      </div>
    );
  }

  return (
    <VoiceInterface
      mode={mode}
      context={context}
      minimized
      onSessionEnd={onSessionEnd}
    />
  );
}

export default VoiceInterface;
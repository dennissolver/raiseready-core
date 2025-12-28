'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { clientConfig } from '@/config';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send, Loader2, Mic, MessageSquare, ArrowLeft,
  CheckCircle, Sparkles, User
} from 'lucide-react';
import { VoiceInterface } from '@/components/voice-coach/VoiceInterface';

// ============================================================================
// FOUNDER DISCOVERY PAGE - Dual Mode (Voice + Text)
// ============================================================================

export default function FounderDiscoveryPage() {
  const router = useRouter();
  const supabase = createClient();

  const { isLoading: authLoading, user } = useAuth({
    requireAuth: true,
    requiredRole: 'founder',
  });

  // State
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [founderData, setFounderData] = useState<any>(null);

  // Load founder data for context
  useEffect(() => {
    const loadFounderData = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('founders')
        .select('*')
        .eq('id', user.id)
        .single();

      setFounderData(data);

      // Check if discovery already complete
      const { data: profile } = await supabase
        .from('founder_profiles')
        .select('discovery_completeness')
        .eq('founder_id', user.id)
        .single();

      if (profile?.discovery_completeness >= 100) {
        setIsComplete(true);
      }
    };

    loadFounderData();
  }, [user?.id, supabase]);

  // Initialize text chat with opening message
  useEffect(() => {
    if (mode === 'text' && messages.length === 0 && founderData) {
      const openingMessage = {
        role: 'assistant',
        content: `Welcome to ${clientConfig.company.name} Story Discovery! 🎯

I'm here to help you discover and articulate your authentic founder story. This will make your pitch materials much more compelling.

${founderData?.company_name ? `I see you're building **${founderData.company_name}**. ` : ''}Let's start with the most important question:

**What's the personal experience that made you realize this problem needed to be solved?** Tell me about that moment.`,
      };
      setMessages([openingMessage]);
    }
  }, [mode, messages.length, founderData]);

  // Handle text message send
  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/founder-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: user.id,
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
      }]);

      if (data.completed) {
        setIsComplete(true);
        setTimeout(() => {
          router.push('/founder/dashboard?discovery=complete');
        }, 3000);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle voice session end
  const handleVoiceSessionEnd = async (voiceSessionId: string, transcript: any[]) => {
    console.log('[Discovery] Voice session ended:', voiceSessionId, transcript);

    // Save transcript to database
    try {
      await supabase
        .from('voice_sessions')
        .insert({
          session_id: voiceSessionId,
          founder_id: user?.id,
          mode: 'discovery',
          transcript,
          created_at: new Date().toISOString(),
        });

      // Check if discovery marked as complete
      const { data: profile } = await supabase
        .from('founder_profiles')
        .select('discovery_completeness')
        .eq('founder_id', user?.id)
        .single();

      if (profile?.discovery_completeness >= 100) {
        setIsComplete(true);
      }
    } catch (error) {
      console.error('Error saving voice session:', error);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Completion state
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Discovery Complete!</h2>
            <p className="text-gray-600 mb-6">
              Your story has been captured. This will help make your pitch materials more authentic and compelling.
            </p>
            <Button onClick={() => router.push('/founder/dashboard')}>
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/founder/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-purple-600" />
                Story Discovery
              </h1>
              <p className="text-gray-600">
                Let's uncover your authentic founder narrative
              </p>
            </div>
            {founderData?.company_name && (
              <Badge variant="secondary" className="text-sm">
                <User className="w-3 h-3 mr-1" />
                {founderData.company_name}
              </Badge>
            )}
          </div>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'voice' | 'text')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Voice Chat
              <Badge variant="secondary" className="ml-1 text-xs">Recommended</Badge>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Text Chat
            </TabsTrigger>
          </TabsList>

          {/* Voice Mode */}
          <TabsContent value="voice" className="mt-6">
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Voice Discovery Session
                </CardTitle>
                <p className="text-sm text-purple-100">
                  Have a natural conversation about your founder journey
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <VoiceInterface
                  mode="discovery"
                  context={{
                    founderName: founderData?.name || user?.email?.split('@')[0],
                    companyName: founderData?.company_name,
                    platformType: clientConfig.platformType,
                  }}
                  onSessionStart={(sid) => setSessionId(sid)}
                  onSessionEnd={handleVoiceSessionEnd}
                  onMessage={(msg) => setMessages(prev => [...prev, msg])}
                />

                <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Tips for a great session:</h4>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• Find a quiet space for clear audio</li>
                    <li>• Speak naturally - this is a conversation, not an interview</li>
                    <li>• Share specific moments and experiences</li>
                    <li>• Don't worry about being polished - authenticity matters most</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Text Mode */}
          <TabsContent value="text" className="mt-6">
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Text Discovery Session
                </CardTitle>
                <p className="text-sm text-purple-100">
                  Type your responses to discover your story
                </p>
              </CardHeader>
              <CardContent className="p-4">
                {/* Messages */}
                <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Share your thoughts... (Press Enter to send)"
                    className="flex-1"
                    rows={3}
                    disabled={loading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    size="icon"
                    className="h-auto bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
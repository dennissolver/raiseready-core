/**
 * Voice Session Manager
 * Core class that manages voice coaching sessions
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  VoiceSessionConfig,
  VoiceSessionState,
  SessionStatus,
  Message,
  SessionEvent,
  SessionEventHandler,
  SessionFeedback,
  TranscriptionChunk,
  AudioChunk
} from '../types/voice-session';
import { COACHING_MODES } from '../config/coaching-modes';
import { buildInvestorSimPrompt } from '../config/personas';

export class VoiceSessionManager {
  private client: Anthropic;
  private state: VoiceSessionState;
  private eventHandlers: Set<SessionEventHandler> = new Set();
  private conversationHistory: Anthropic.MessageParam[] = [];
  
  // Stream management
  private currentStream: any = null;
  private audioContext: AudioContext | null = null;
  
  constructor(config: VoiceSessionConfig) {
    this.client = new Anthropic({
      apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
    });
    
    // Initialize session state
    this.state = {
      id: this.generateSessionId(),
      config,
      status: 'initializing',
      transcript: [],
      startTime: new Date(),
      metrics: {
        duration: 0,
        wordCount: 0,
        pauseCount: 0,
        interruptionCount: 0
      }
    };
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Build the system prompt based on configuration
   */
  private buildSystemPrompt(): string {
    const { mode, persona, projectData } = this.state.config;
    
    // Base prompt for all sessions
    let systemPrompt = `You are an expert impact investing coach integrated into RaiseReady Impact, a platform connecting impact investors with social enterprises.

**Your Core Knowledge:**
- Deep understanding of impact investing and blended returns
- UN Sustainable Development Goals (SDGs) and impact measurement
- Theory of Change development and validation
- Financial modeling for social enterprises
- Investor expectations in the impact space
- RealChange Impact SDG Valuation Index (quantifies social impact in USD equivalents)

**RaiseReady Context:**
RaiseReady helps founders quantify their impact using the RealChange framework, which assigns dollar values to SDG outcomes. For example:
- SDG 1 (No Poverty): $500 per household with property tenure
- SDG 4 (Quality Education): $2,000 per child educated
- SDG 7 (Clean Energy): $150 per household with clean energy access

This allows calculation of "blended returns" = Financial Returns + Impact Returns (in USD equivalents).
`;

    // Add mode-specific behavior
    const modeConfig = COACHING_MODES[mode];
    systemPrompt += `\n\n**Your Current Role:**\n${modeConfig.systemPromptModifier}`;
    
    // Add persona-specific behavior for investor simulation
    if (mode === 'investor_sim' && persona) {
      systemPrompt += `\n\n${buildInvestorSimPrompt(persona, projectData)}`;
    }
    
    // Add project context if available
    if (projectData) {
      systemPrompt += this.buildProjectContext(projectData);
    }
    
    return systemPrompt;
  }
  
  /**
   * Build project context section of the prompt
   */
  private buildProjectContext(projectData: any): string {
    return `

**PROJECT CONTEXT YOU'RE COACHING ON:**
- Project Name: ${projectData.name}
- SDG Alignment: ${projectData.sdgs?.map((n: number) => `SDG ${n}`).join(', ')}
- Impact Thesis: ${projectData.impact_thesis}
- Funding Target: $${projectData.funding_target?.toLocaleString()}
${projectData.blended_returns ? `
- Projected Returns:
  * Financial: ${projectData.blended_returns.financial}% annually
  * Impact Equivalent: ${projectData.blended_returns.impact}% annually
  * Blended Total: ${projectData.blended_returns.total}% annually
` : ''}

Use this context to provide specific, relevant coaching.`;
  }
  
  /**
   * Start the voice coaching session
   */
  async startSession(): Promise<void> {
    try {
      this.updateStatus('initializing');
      
      // Build initial system prompt
      const systemPrompt = this.buildSystemPrompt();
      
      // Add system message to conversation history
      this.conversationHistory = [
        {
          role: 'user',
          content: `${systemPrompt}\n\nThe session is starting now. Greet the founder and let them know you're ready to help them practice their pitch.`
        }
      ];
      
      // Get initial greeting from Claude
      const greeting = await this.sendMessage('session_start', true);
      
      // Update status to active
      this.updateStatus('active');
      
      // Emit session started event
      this.emitEvent({
        type: 'session_started',
        data: this.state
      });
      
      // Add greeting to transcript
      this.addMessage({
        id: this.generateMessageId(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.handleError('session_start_failed', error);
    }
  }
  
  /**
   * Send a message and get response
   */
  async sendMessage(content: string, isSystemMessage: boolean = false): Promise<string> {
    try {
      // Add user message to history (unless it's a system message)
      if (!isSystemMessage) {
        this.conversationHistory.push({
          role: 'user',
          content
        });
        
        // Add to transcript
        this.addMessage({
          id: this.generateMessageId(),
          role: 'user',
          content,
          timestamp: new Date()
        });
      }
      
      // Get response from Claude
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: this.conversationHistory,
        system: this.buildSystemPrompt()
      });
      
      // Extract text from response
      const assistantMessage = response.content
        .filter(block => block.type === 'text')
        .map(block => ('text' in block ? block.text : ''))
        .join('\n');
      
      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });
      
      // Update metrics
      this.updateMetrics(content, assistantMessage);
      
      return assistantMessage;
      
    } catch (error) {
      this.handleError('message_send_failed', error);
      throw error;
    }
  }
  
  /**
   * Process incoming audio chunk
   */
  async processAudioChunk(chunk: AudioChunk): Promise<void> {
    try {
      // Emit audio chunk event
      this.emitEvent({
        type: 'audio_chunk',
        data: chunk
      });
      
      // Audio processing will be handled by the audio processor module
      // This is a placeholder for the integration point
      
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }
  
  /**
   * Process transcription update
   */
  async processTranscription(chunk: TranscriptionChunk): Promise<void> {
    try {
      // Emit transcription event
      this.emitEvent({
        type: 'transcription_update',
        data: chunk
      });
      
      // If this is a final transcription, send to Claude
      if (chunk.isFinal && chunk.text.trim()) {
        const response = await this.sendMessage(chunk.text);
        
        // Add assistant response to transcript
        this.addMessage({
          id: this.generateMessageId(),
          role: 'assistant',
          content: response,
          timestamp: new Date()
        });
      }
      
    } catch (error) {
      console.error('Error processing transcription:', error);
    }
  }
  
  /**
   * Pause the session
   */
  pauseSession(): void {
    if (this.state.status === 'active') {
      this.updateStatus('paused');
      this.emitEvent({ type: 'session_paused' });
    }
  }
  
  /**
   * Resume the session
   */
  resumeSession(): void {
    if (this.state.status === 'paused') {
      this.updateStatus('active');
      this.emitEvent({ type: 'session_resumed' });
    }
  }
  
  /**
   * Complete the session and generate feedback
   */
  async completeSession(): Promise<SessionFeedback> {
    try {
      this.updateStatus('completed');
      this.state.endTime = new Date();
      
      // Calculate final duration
      const duration = Math.floor((this.state.endTime.getTime() - this.state.startTime.getTime()) / 1000);
      if (this.state.metrics) {
        this.state.metrics.duration = duration;
      }
      
      // Generate comprehensive feedback
      const feedback = await this.generateFeedback();
      
      // Emit completion event
      this.emitEvent({
        type: 'session_completed',
        data: feedback
      });
      
      return feedback;
      
    } catch (error) {
      this.handleError('session_completion_failed', error);
      throw error;
    }
  }
  
  /**
   * Generate feedback based on the session
   */
  private async generateFeedback(): Promise<SessionFeedback> {
    const { mode } = this.state.config;
    
    // Build feedback prompt based on mode
    let feedbackPrompt = `Based on our coaching session, please provide comprehensive feedback.

**Session Details:**
- Duration: ${this.state.metrics?.duration} seconds
- Total messages: ${this.state.transcript.length}
- Mode: ${mode}

**Transcript:**
${this.state.transcript.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Please provide feedback in the following JSON format:
{
  "overallScore": <number 1-10>,
  "content": {
    "score": <number 1-10>,
    "strengths": [<array of strings>],
    "improvements": [<array of strings>],
    "suggestions": [<array of strings>]
  },
  "delivery": {
    "score": <number 1-10>,
    "pace": "<too_fast|good|too_slow>",
    "clarity": <number 1-10>,
    "confidence": <number 1-10>,
    "strengths": [<array of strings>],
    "improvements": [<array of strings>]
  },
  "impact": {
    "score": <number 1-10>,
    "sdgAlignment": <number 1-10>,
    "impactClarity": <number 1-10>,
    "theoryOfChange": <number 1-10>,
    "strengths": [<array of strings>],
    "improvements": [<array of strings>]
  },
  "nextSteps": [<array of strings>],
  "practiceAreas": [<array of strings>]
}`;
    
    // Get feedback from Claude
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: feedbackPrompt
      }],
      system: 'You are an expert pitch coach providing detailed feedback. Always respond with valid JSON only.'
    });
    
    // Parse JSON response
    const feedbackText = response.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('\n');
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = feedbackText.match(/\{[\s\S]*\}/);
    const feedbackData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    return {
      sessionId: this.state.id,
      ...feedbackData,
      generatedAt: new Date()
    };
  }
  
  /**
   * Add a message to the transcript
   */
  private addMessage(message: Message): void {
    this.state.transcript.push(message);
    
    // Emit message event
    this.emitEvent({
      type: 'message_received',
      data: message
    });
  }
  
  /**
   * Update session metrics
   */
  private updateMetrics(userMessage: string, assistantMessage: string): void {
    if (!this.state.metrics) return;
    
    // Update word count
    const wordCount = userMessage.split(/\s+/).length + assistantMessage.split(/\s+/).length;
    this.state.metrics.wordCount += wordCount;
    
    // Update duration
    const duration = Math.floor((Date.now() - this.state.startTime.getTime()) / 1000);
    this.state.metrics.duration = duration;
    
    // Calculate speaking pace (words per minute)
    if (duration > 0) {
      this.state.metrics.speakingPace = Math.floor((this.state.metrics.wordCount / duration) * 60);
    }
  }
  
  /**
   * Update session status
   */
  private updateStatus(status: SessionStatus): void {
    this.state.status = status;
  }
  
  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Handle errors
   */
  private handleError(code: string, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.state.error = {
      code,
      message: errorMessage,
      timestamp: new Date()
    };
    
    this.updateStatus('error');
    
    this.emitEvent({
      type: 'error',
      data: { code, message: errorMessage }
    });
  }
  
  /**
   * Subscribe to session events
   */
  on(handler: SessionEventHandler): () => void {
    this.eventHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers.delete(handler);
    };
  }
  
  /**
   * Emit an event to all subscribers
   */
  private emitEvent(event: SessionEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });
  }
  
  /**
   * Get current session state
   */
  getState(): VoiceSessionState {
    return { ...this.state };
  }
  
  /**
   * Get session transcript
   */
  getTranscript(): Message[] {
    return [...this.state.transcript];
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.eventHandlers.clear();
    this.conversationHistory = [];
    if (this.currentStream) {
      this.currentStream = null;
    }
  }
}

export default VoiceSessionManager;

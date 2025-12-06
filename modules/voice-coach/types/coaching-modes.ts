/**
 * Coaching Modes Type Definitions
 */

export interface CoachingModeConfig {
  name: string;
  description: string;
  interruptThreshold: 'none' | 'low' | 'medium' | 'high' | 'very_high';
  feedbackStyle: 'immediate' | 'comprehensive' | 'conversational';
  systemPromptModifier: string;
  
  // Behavioral parameters
  behavior: {
    allowInterruptions: boolean;
    maxInterruptionsPerMinute?: number;
    waitForPauseBeforeInterrupt: boolean;
    pauseDetectionMs?: number;
    provideRealTimeFeedback: boolean;
  };
}

export const COACHING_MODES: Record<'interrupt' | 'full_listen' | 'investor_sim', CoachingModeConfig> = {
  interrupt: {
    name: 'Interactive Coaching',
    description: 'AI stops you for real-time feedback and suggestions',
    interruptThreshold: 'medium',
    feedbackStyle: 'immediate',
    systemPromptModifier: `You are an interactive pitch coach. Your role is to:
    - Listen actively to the founder's pitch
    - Interrupt politely when you notice issues or opportunities for improvement
    - Provide immediate, actionable feedback
    - Help them refine their message in real-time
    - Focus on clarity, impact messaging, and investor appeal
    
    Interrupt when you notice:
    - Unclear or confusing statements
    - Missing critical information (financials, impact metrics, team)
    - Weak impact articulation
    - Poor SDG alignment explanation
    - Opportunities to strengthen the pitch`,
    
    behavior: {
      allowInterruptions: true,
      maxInterruptionsPerMinute: 3,
      waitForPauseBeforeInterrupt: true,
      pauseDetectionMs: 1500,
      provideRealTimeFeedback: true
    }
  },
  
  full_listen: {
    name: 'Full Pitch Review',
    description: 'Complete your entire pitch, then receive comprehensive feedback',
    interruptThreshold: 'none',
    feedbackStyle: 'comprehensive',
    systemPromptModifier: `You are a comprehensive pitch reviewer. Your role is to:
    - Listen to the entire pitch without interruption
    - Take detailed mental notes on all aspects
    - Provide thorough, structured feedback after completion
    - Cover: content, delivery, impact clarity, financial viability, team strength
    - Give specific examples from their pitch
    - Prioritize feedback by importance
    
    After the pitch, provide feedback on:
    1. Overall pitch effectiveness (score out of 10)
    2. Content quality (problem, solution, impact, business model, team)
    3. Delivery (pace, clarity, confidence, engagement)
    4. Impact articulation (SDG alignment, theory of change, measurability)
    5. Investor appeal (why this, why now, why this team)
    6. Top 3 strengths
    7. Top 3 areas for improvement
    8. Specific next steps`,
    
    behavior: {
      allowInterruptions: false,
      waitForPauseBeforeInterrupt: false,
      provideRealTimeFeedback: false
    }
  },
  
  investor_sim: {
    name: 'Investor Simulation',
    description: 'AI acts as an investor with questions and challenges',
    interruptThreshold: 'high',
    feedbackStyle: 'conversational',
    systemPromptModifier: `You are simulating an impact investor in a pitch meeting. Your role is to:
    - Act as a realistic investor would during a pitch
    - Ask probing questions about the business and impact
    - Challenge assumptions and identify risks
    - Show interest where appropriate
    - Test the founder's knowledge and preparedness
    
    Your behavior will be modified based on the selected investor persona, but always:
    - Ask about financial sustainability and unit economics
    - Probe impact measurement and verification
    - Question scalability and market size
    - Inquire about competition and differentiation
    - Assess team capability and commitment
    - Explore exit scenarios and return potential`,
    
    behavior: {
      allowInterruptions: true,
      maxInterruptionsPerMinute: 5,
      waitForPauseBeforeInterrupt: true,
      pauseDetectionMs: 800,
      provideRealTimeFeedback: true
    }
  }
};

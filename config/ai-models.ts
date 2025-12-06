export const AI_MODELS = {
  primary: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    specialty: 'Primary coaching and analysis',
  },
  analyst: {
    provider: 'openai',
    model: 'gpt-4o',
    name: 'GPT-4o',
    specialty: 'Market analysis and validation',
  },
  visual: {
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    name: 'Gemini Flash',
    specialty: 'Visual design feedback',
  },
}

export const COACH_TYPES = {
  PRIMARY: 'primary',
  MARKET_ANALYST: 'market_analyst',
  IMPACT_SPECIALIST: 'impact_specialist',
} as const

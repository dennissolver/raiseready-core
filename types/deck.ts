import { Database } from './database'

// ============================================================================
// DATABASE TYPES - Single Source of Truth
// ============================================================================

export type PitchDeck = Database['public']['Tables']['pitch_decks']['Row']
export type PitchDeckInsert = Database['public']['Tables']['pitch_decks']['Insert']
export type PitchDeckUpdate = Database['public']['Tables']['pitch_decks']['Update']

export type DeckAnalysis = Database['public']['Tables']['deck_analysis']['Row']
export type DeckAnalysisInsert = Database['public']['Tables']['deck_analysis']['Insert']
export type DeckAnalysisUpdate = Database['public']['Tables']['deck_analysis']['Update']

// ============================================================================
// CUSTOM TYPES (Not in database)
// ============================================================================

// For file uploads (browser only)
export interface DeckUpload {
  file: File
  title: string
  founderId: string
}

// Scores structure for the JSONB field in deck_analysis
export interface DeckScores {
  [key: string]: number  // Index signature required for Json compatibility
  problemClarity: number
  solutionFit: number
  marketOpportunity: number
  teamCredibility: number
  impactPotential: number
  financialViability: number
}

// For API responses (combines database data with computed fields)
export interface DeckAnalysisResult {
  deckId: string
  overallScore: number
  scores: DeckScores
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  readinessLevel: 'not-ready' | 'needs-work' | 'ready' | 'investor-ready'
}

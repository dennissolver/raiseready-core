import { Database } from './database';

type Tables = Database['public']['Tables'];

// Composite types for manual joins (used in pages)
export type WatchlistWithProject = Tables['investor_watchlist']['Row'] & {
  projects: Tables['pitch_decks']['Row'] | null;
};

export type NetworkWatchlistWithInvestor = Tables['founder_watchlist']['Row'] & {
  investor_profiles: Tables['investor_profiles']['Row'] | null;
};

export type NetworkWatchlistWithProject = Tables['founder_watchlist']['Row'] & {
  pitch_decks: Tables['pitch_decks']['Row'] | null;
};

// Simple table types
export type InvestorProfile = Tables['investor_profiles']['Row'];
export type PitchDeck = Tables['pitch_decks']['Row'];
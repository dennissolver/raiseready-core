// types/platform.ts
// TypeScript types for RaiseReady platform type expansion
// Generated from schema_platform_types.sql

// ============================================================================
// ENUMS
// ============================================================================

export type PlatformType =
  | 'impact_investor'
  | 'commercial_investor'
  | 'family_office'
  | 'founder_service_provider';

export type PlatformMode = 'screening' | 'coaching';

export type ScoringFramework =
  | 'sdg_alignment'
  | 'growth_metrics'
  | 'pitch_quality'
  | 'values_alignment';

export type OutputType =
  | 'fit_score'
  | 'improvement_roadmap'
  | 'blended_assessment';

export type InvestorType =
  | 'impact_investor'
  | 'commercial_investor'
  | 'family_office'
  | 'angel'
  | 'vc'
  | 'pe'
  | 'corporate_vc';

export type ServiceProviderType =
  | 'law_firm'
  | 'accelerator'
  | 'incubator'
  | 'consultancy'
  | 'advisory'
  | 'accounting_firm'
  | 'other';

export type InvestmentHorizon =
  | '3-5 years'
  | '5-10 years'
  | '10-20 years'
  | 'generational'
  | 'perpetual';

export type ReputationSensitivity = 'low' | 'moderate' | 'high' | 'paramount';

export type DecisionMakerType =
  | 'single_principal'
  | 'family_council'
  | 'investment_committee'
  | 'hybrid';

export type InvolvementLevel = 'passive' | 'advisory' | 'active_board' | 'operational';

export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive' | 'mission_dependent';

export type CapitalPreservationPriority = 'primary' | 'secondary' | 'flexible';

export type InvestorReadinessLevel =
  | 'not_ready'
  | 'needs_work'
  | 'almost_there'
  | 'investor_ready'
  | 'exceptional';

export type ClientStatus = 'invited' | 'active' | 'completed' | 'churned';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PlatformConfig {
  id: string;
  platform_type: PlatformType;
  platform_mode: PlatformMode;
  uses_sdg_framework: boolean;
  uses_impact_scoring: boolean;
  uses_fit_scoring: boolean;
  uses_pitch_coaching: boolean;
  uses_investor_matching: boolean;
  primary_scoring_framework: ScoringFramework;
  primary_output_type: OutputType;
  created_at: string;
  updated_at: string;
}

export interface FamilyOfficeCriteria {
  id: string;
  investor_profile_id: string;

  // Time Horizon
  investment_horizon: InvestmentHorizon | null;

  // Family Values & Legacy
  family_mission: string | null;
  legacy_priorities: string[] | null;
  reputation_sensitivity: ReputationSensitivity;

  // Decision Process
  decision_maker_type: DecisionMakerType | null;
  typical_decision_timeline: string | null;

  // Relationship Preferences
  involvement_level: InvolvementLevel | null;
  prefers_direct_relationships: boolean;
  open_to_co_investment: boolean;
  preferred_co_investors: string[] | null;

  // Return Expectations
  target_irr_min: number | null;
  target_irr_max: number | null;
  accepts_below_market_returns: boolean;
  below_market_rationale: string | null;

  // Risk Profile
  risk_tolerance: RiskTolerance | null;
  capital_preservation_priority: CapitalPreservationPriority | null;

  // Succession & Continuity
  next_generation_involved: boolean;
  succession_planning_stage: string | null;

  created_at: string;
  updated_at: string;
}

export interface ServiceProviderConfig {
  id: string;
  user_id: string;
  company_name: string;
  company_type: ServiceProviderType;

  // Branding
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  website_url: string | null;

  // Service Context
  target_client_stages: string[] | null;
  target_client_sectors: string[] | null;
  target_client_geographies: string[] | null;

  // Coaching Customization
  coaching_focus_areas: string[];
  custom_evaluation_criteria: Record<string, any> | null;
  custom_coaching_prompts: Record<string, any> | null;
  branded_terminology: Record<string, string> | null;

  // Integration
  referral_tracking_enabled: boolean;
  investor_network_ids: string[] | null;

  // Limits
  monthly_client_limit: number | null;
  client_count_current: number;

  created_at: string;
  updated_at: string;
}

export interface PitchQualityScores {
  id: string;
  founder_id: string;
  pitch_deck_id: string;
  service_provider_id: string | null;

  // Core Pitch Quality Dimensions (0-100)
  problem_clarity_score: number | null;
  solution_clarity_score: number | null;
  market_sizing_score: number | null;
  business_model_score: number | null;
  competitive_positioning_score: number | null;
  team_credibility_score: number | null;
  traction_evidence_score: number | null;
  ask_clarity_score: number | null;
  storytelling_score: number | null;
  visual_design_score: number | null;

  // Aggregate
  overall_pitch_score: number | null;

  // AI Analysis
  strengths: string[] | null;
  weaknesses: string[] | null;
  improvement_priorities: ImprovementPriority[] | null;
  investor_readiness_level: InvestorReadinessLevel | null;

  // Coaching Outputs
  recommended_next_steps: string[] | null;
  suggested_practice_areas: string[] | null;
  estimated_improvement_timeline: string | null;

  // Metadata
  analysis_version: string | null;
  analyzed_at: string;
  created_at: string;
}

export interface ImprovementPriority {
  dimension: string;
  current_score: number;
  target_score: number;
  specific_actions: string[];
  resources?: string[];
  estimated_effort: 'low' | 'medium' | 'high';
}

export interface ServiceProviderClient {
  id: string;
  service_provider_id: string;
  founder_id: string;

  // Engagement Status
  status: ClientStatus;

  // Progress Tracking
  sessions_completed: number;
  last_session_at: string | null;
  initial_pitch_score: number | null;
  current_pitch_score: number | null;
  improvement_percentage: number | null;

  // Referral Tracking
  referred_to_investors: boolean;
  investor_referral_ids: string[] | null;
  referral_outcome: string | null;

  // Engagement Metrics
  first_activity_at: string | null;
  last_activity_at: string | null;
  total_coaching_minutes: number;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// UTILITY TYPES FOR UI
// ============================================================================

export interface PlatformTypeConfig {
  type: PlatformType;
  label: string;
  description: string;
  mode: PlatformMode;
  features: {
    sdg: boolean;
    impact: boolean;
    fitScoring: boolean;
    coaching: boolean;
    matching: boolean;
  };
  scoringFramework: ScoringFramework;
  outputType: OutputType;
}

export const PLATFORM_TYPE_CONFIGS: Record<PlatformType, PlatformTypeConfig> = {
  impact_investor: {
    type: 'impact_investor',
    label: 'Impact Investor',
    description: 'SDG-aligned impact investing with RealChange Index',
    mode: 'screening',
    features: {
      sdg: true,
      impact: true,
      fitScoring: true,
      coaching: true,
      matching: true,
    },
    scoringFramework: 'sdg_alignment',
    outputType: 'blended_assessment',
  },
  commercial_investor: {
    type: 'commercial_investor',
    label: 'Commercial Investor',
    description: 'Growth-focused investing with traditional metrics',
    mode: 'screening',
    features: {
      sdg: false,
      impact: false,
      fitScoring: true,
      coaching: true,
      matching: true,
    },
    scoringFramework: 'growth_metrics',
    outputType: 'fit_score',
  },
  family_office: {
    type: 'family_office',
    label: 'Family Office',
    description: 'Values-aligned, long-term wealth stewardship',
    mode: 'screening',
    features: {
      sdg: false,
      impact: true, // Values/mission alignment
      fitScoring: true,
      coaching: true,
      matching: true,
    },
    scoringFramework: 'values_alignment',
    outputType: 'blended_assessment',
  },
  founder_service_provider: {
    type: 'founder_service_provider',
    label: 'Founder Service Provider',
    description: 'Pitch coaching for law firms, accelerators, advisories',
    mode: 'coaching',
    features: {
      sdg: false,
      impact: false,
      fitScoring: false,
      coaching: true,
      matching: false, // No investor matching
    },
    scoringFramework: 'pitch_quality',
    outputType: 'improvement_roadmap',
  },
};

// Default coaching focus areas for service providers
export const DEFAULT_COACHING_FOCUS_AREAS = [
  'problem_solution_clarity',
  'market_sizing',
  'business_model',
  'team_credibility',
  'ask_clarity',
  'competitive_positioning',
  'traction_evidence',
] as const;

// Dimension labels for UI
export const PITCH_DIMENSION_LABELS: Record<string, string> = {
  problem_clarity_score: 'Problem Clarity',
  solution_clarity_score: 'Solution Clarity',
  market_sizing_score: 'Market Sizing',
  business_model_score: 'Business Model',
  competitive_positioning_score: 'Competitive Positioning',
  team_credibility_score: 'Team Credibility',
  traction_evidence_score: 'Traction Evidence',
  ask_clarity_score: 'Ask Clarity',
  storytelling_score: 'Storytelling',
  visual_design_score: 'Visual Design',
};

// Readiness level config for UI
export const READINESS_LEVEL_CONFIG: Record<InvestorReadinessLevel, {
  label: string;
  color: string;
  description: string;
}> = {
  not_ready: {
    label: 'Not Ready',
    color: 'red',
    description: 'Significant improvements needed before approaching investors',
  },
  needs_work: {
    label: 'Needs Work',
    color: 'orange',
    description: 'Several areas require attention before fundraising',
  },
  almost_there: {
    label: 'Almost There',
    color: 'yellow',
    description: 'Minor refinements will make this investor-ready',
  },
  investor_ready: {
    label: 'Investor Ready',
    color: 'green',
    description: 'Ready to approach investors with confidence',
  },
  exceptional: {
    label: 'Exceptional',
    color: 'emerald',
    description: 'Outstanding pitch that will stand out to investors',
  },
};
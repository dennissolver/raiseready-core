// config/index.ts
// ============================================================================
// Re-exports clientConfig with defaults for platform-specific fields
// Supports 6 platform types with config-driven labels
// ============================================================================

import { clientConfig as baseConfig } from './client';

// ============================================================================
// PLATFORM TYPE CONFIGURATION
// ============================================================================

type PlatformType = 
  | 'impact_investor' 
  | 'commercial_vc' 
  | 'family_office' 
  | 'accelerator' 
  | 'corporate_innovation' 
  | 'founder_services';

interface PlatformTypeConfig {
  ownerLabel: string;
  thesisLabel: string;
  matchActionLabel: string;
  founderLabel: string;
  hasInvestorMatching: boolean;
  welcomeMessage: string;
  coachingEmphasis: string[];
}

const PLATFORM_TYPE_DEFAULTS: Record<PlatformType, PlatformTypeConfig> = {
  impact_investor: {
    ownerLabel: 'Investor',
    thesisLabel: 'Investment Thesis',
    matchActionLabel: 'Invest',
    founderLabel: 'Founder',
    hasInvestorMatching: true,
    welcomeMessage: "I'll help you articulate your impact thesis and connect with mission-aligned investors.",
    coachingEmphasis: ['SDG alignment', 'Impact measurement', 'Theory of change', 'Blended value'],
  },
  commercial_vc: {
    ownerLabel: 'Investor',
    thesisLabel: 'Investment Thesis',
    matchActionLabel: 'Invest',
    founderLabel: 'Founder',
    hasInvestorMatching: true,
    welcomeMessage: "I'll help you sharpen your pitch to highlight the metrics and growth story VCs care about.",
    coachingEmphasis: ['Growth metrics', 'Unit economics', 'Market sizing', 'Competitive positioning'],
  },
  family_office: {
    ownerLabel: 'Principal',
    thesisLabel: 'Investment Philosophy',
    matchActionLabel: 'Invest',
    founderLabel: 'Founder',
    hasInvestorMatching: true,
    welcomeMessage: "I'll help you craft a narrative that resonates with patient capital investors.",
    coachingEmphasis: ['Long-term vision', 'Values demonstration', 'Sustainable growth', 'Relationship building'],
  },
  accelerator: {
    ownerLabel: 'Program Director',
    thesisLabel: 'Program Criteria',
    matchActionLabel: 'Accept',
    founderLabel: 'Applicant',
    hasInvestorMatching: true,
    welcomeMessage: "I'll help you prepare a compelling application and get demo day ready.",
    coachingEmphasis: ['Demo day preparation', 'Problem/solution framing', 'Early traction', 'Team narrative'],
  },
  corporate_innovation: {
    ownerLabel: 'Innovation Lead',
    thesisLabel: 'Strategic Focus',
    matchActionLabel: 'Partner',
    founderLabel: 'Founder',
    hasInvestorMatching: true,
    welcomeMessage: "I'll help you position your solution for corporate partnerships.",
    coachingEmphasis: ['Enterprise value proposition', 'Strategic alignment', 'Implementation roadmap', 'ROI articulation'],
  },
  founder_services: {
    ownerLabel: 'Service Provider',
    thesisLabel: 'Client Focus',
    matchActionLabel: 'Engage',
    founderLabel: 'Client',
    hasInvestorMatching: false,
    welcomeMessage: "I'll help you develop a compelling pitch and become investor-ready.",
    coachingEmphasis: ['Pitch fundamentals', 'Problem/solution framing', 'Presentation skills', 'Investor readiness'],
  },
};

// Legacy type mapping (for backwards compatibility)
const LEGACY_TYPE_MAP: Record<string, PlatformType> = {
  'commercial_investor': 'commercial_vc',
  'founder_service_provider': 'founder_services',
};

// ============================================================================
// MERGED CONFIG WITH DEFAULTS
// ============================================================================

// Normalize platform type (handle legacy values)
const rawPlatformType = (baseConfig as any).platformType || 'commercial_vc';
const normalizedPlatformType = (LEGACY_TYPE_MAP[rawPlatformType] || rawPlatformType) as PlatformType;

// Get platform type config from baseConfig or defaults
const basePlatformTypeConfig = (baseConfig as any).platformTypeConfig;
const defaultTypeConfig = PLATFORM_TYPE_DEFAULTS[normalizedPlatformType] || PLATFORM_TYPE_DEFAULTS.commercial_vc;

export const clientConfig = {
  ...baseConfig,
  // Normalized platform type
  platformType: normalizedPlatformType,
  platformMode: (baseConfig as any).platformMode || 'screening',
  // Merged platform type config (baseConfig takes precedence)
  platformTypeConfig: {
    ...defaultTypeConfig,
    ...basePlatformTypeConfig,
  },
};

// ============================================================================
// RE-EXPORT HELPERS FROM CLIENT
// ============================================================================

export {
  getCompanyName,
  getAdminName,
  getAdminRole,
  getUrlPrefix,
  getCoachName,
  getPortalRoute,
  getThemeColor,
  replaceTemplateVars,
  isFeatureEnabled
} from './client';

// ============================================================================
// PLATFORM TYPE HELPERS
// ============================================================================

export const getPlatformType = () => clientConfig.platformType;
export const getPlatformMode = () => clientConfig.platformMode;
export const getPlatformTypeConfig = () => clientConfig.platformTypeConfig;

// Labels
export const getOwnerLabel = () => clientConfig.platformTypeConfig.ownerLabel;
export const getThesisLabel = () => clientConfig.platformTypeConfig.thesisLabel;
export const getMatchActionLabel = () => clientConfig.platformTypeConfig.matchActionLabel;
export const getFounderLabel = () => clientConfig.platformTypeConfig.founderLabel;
export const getWelcomeMessage = () => clientConfig.platformTypeConfig.welcomeMessage;
export const getCoachingEmphasis = () => clientConfig.platformTypeConfig.coachingEmphasis;

// Mode checks
export const isScreeningMode = () => clientConfig.platformMode === 'screening';
export const isCoachingMode = () => clientConfig.platformMode === 'coaching';

// Type checks (all 6 types)
export const isImpactInvestor = () => clientConfig.platformType === 'impact_investor';
export const isCommercialVC = () => clientConfig.platformType === 'commercial_vc';
export const isFamilyOffice = () => clientConfig.platformType === 'family_office';
export const isAccelerator = () => clientConfig.platformType === 'accelerator';
export const isCorporateInnovation = () => clientConfig.platformType === 'corporate_innovation';
export const isFounderServices = () => clientConfig.platformType === 'founder_services';

// Legacy aliases (backwards compatibility)
export const isCommercialInvestor = isCommercialVC;
export const isServiceProvider = isFounderServices;

// ============================================================================
// FEATURE CHECKS
// ============================================================================

export const hasInvestorMatching = () =>
  clientConfig.platformTypeConfig.hasInvestorMatching !== false &&
  clientConfig.platform?.features?.investorMatching !== false;

export const hasSDGScoring = () =>
  isImpactInvestor() && clientConfig.platform?.features?.sdgScoring !== false;

export const hasValuesScoring = () =>
  isFamilyOffice() || (clientConfig.platform?.features as any)?.valuesScoring;

export const hasClientPortfolio = () =>
  isFounderServices() || (clientConfig.platform?.features as any)?.clientPortfolio;

export const hasCohortManagement = () =>
  isAccelerator() || (clientConfig.platform?.features as any)?.cohortManagement;

export const hasEnterpriseFeatures = () =>
  isCorporateInnovation() || (clientConfig.platform?.features as any)?.enterpriseFeatures;

// ============================================================================
// ADMIN CHECK
// ============================================================================

export const isAdminEmail = (email: string): boolean => {
  const adminEmail = clientConfig.admin?.email?.toLowerCase();
  return adminEmail ? email.toLowerCase() === adminEmail : false;
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { ClientConfig } from './client';
export type { PlatformType, PlatformTypeConfig };

// config/index.ts
// Re-exports clientConfig with defaults for platform-specific fields

import { clientConfig as baseConfig } from './client';

// Ensure backwards compatibility for older configs without platform fields
export const clientConfig = {
  ...baseConfig,
  // Default platform type if not set
  platformType: (baseConfig as any).platformType || 'commercial_investor',
  platformMode: (baseConfig as any).platformMode || 'screening',
};

// Re-export all helpers
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

// New platform-aware helpers
export const getPlatformType = () => clientConfig.platformType;
export const getPlatformMode = () => clientConfig.platformMode;
export const isScreeningMode = () => clientConfig.platformMode === 'screening';
export const isCoachingMode = () => clientConfig.platformMode === 'coaching';
export const isImpactInvestor = () => clientConfig.platformType === 'impact_investor';
export const isFamilyOffice = () => clientConfig.platformType === 'family_office';
export const isServiceProvider = () => clientConfig.platformType === 'founder_service_provider';
export const isCommercialInvestor = () => clientConfig.platformType === 'commercial_investor';

// Feature checks with fallbacks
export const hasInvestorMatching = () =>
  clientConfig.platform?.features?.investorMatching !== false && !isServiceProvider();

export const hasSDGScoring = () =>
  isImpactInvestor() || (clientConfig as any).impactInvestor?.usesRealChangeIndex;

export const hasValuesScoring = () =>
  isFamilyOffice() || (clientConfig.platform?.features as any)?.valuesScoring;

export const hasClientPortfolio = () =>
  isServiceProvider() || (clientConfig.platform?.features as any)?.clientPortfolio;

export type { ClientConfig } from './client';
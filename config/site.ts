// config/site.ts
// ============================================================================
// SITE CONFIG - Backwards Compatibility Layer
//
// Re-exports from client.ts for legacy imports.
// New code should import directly from './client' or './index'
// ============================================================================

import { clientConfig } from './client';

export const siteConfig = {
  // Basic info
  name: clientConfig.company.name,
  description: clientConfig.company.description,

  // Company details
  company: {
    name: clientConfig.company.legalName,
    tagline: clientConfig.company.tagline,
  },

  // Contact info
  contact: {
    website: clientConfig.company.website,
    linkedin: clientConfig.company.social.linkedin,
    twitter: clientConfig.company.social.twitter,
    email: clientConfig.company.supportEmail,
  },

  // Platform config
  platform: {
    type: clientConfig.platformType,
    mode: clientConfig.platformMode,
    focus: clientConfig.thesis.focusAreas,
    valueProps: clientConfig.landing.valueProps,
  },

  // Theme
  theme: {
    mode: clientConfig.theme.mode,
    colors: clientConfig.theme.colors,
  },

  // URLs
  urls: {
    platform: clientConfig.company.platformUrl,
    privacy: clientConfig.legal.privacyUrl,
    terms: clientConfig.legal.termsUrl,
  },
};

// Re-export type for consumers
export type SiteConfig = typeof siteConfig;
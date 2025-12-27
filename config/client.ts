// config/client.ts
// ============================================================================
// PLACEHOLDER - This file is overwritten by child template during deployment
// Provides minimal defaults for Core development/testing
// ============================================================================

export const clientConfig = {
  platformType: 'commercial_vc' as const,
  platformMode: 'screening' as 'screening' | 'coaching',
  
  platformTypeConfig: {
    ownerLabel: 'Investor',
    thesisLabel: 'Investment Thesis',
    matchActionLabel: 'Invest',
    founderLabel: 'Founder',
    hasInvestorMatching: true,
    welcomeMessage: "I'll help you perfect your pitch.",
    coachingEmphasis: ['Growth metrics', 'Market sizing'],
  },
  
  company: {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'RaiseReady',
    legalName: 'RaiseReady',
    tagline: 'AI Pitch Coaching',
    description: '',
    website: '',
    platformUrl: '',
    supportEmail: '',
    salesEmail: '',
    social: { linkedin: '', twitter: '', youtube: '' },
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg', favicon: '/favicon.ico' },
  },
  
  admin: {
    firstName: 'Admin',
    lastName: '',
    email: '',
    phone: '',
    position: 'Admin',
    linkedIn: '',
  },
  
  offices: [],
  
  theme: {
    mode: 'dark' as 'dark' | 'light',
    colors: {
      primary: process.env.NEXT_PUBLIC_COLOR_PRIMARY || '#8B5CF6',
      primaryHover: '#7C3AED',
      accent: process.env.NEXT_PUBLIC_COLOR_ACCENT || '#10B981',
      accentHover: '#059669',
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      border: '#334155',
      gradient: { from: '#8B5CF6', via: '#0F172A', to: '#10B981' },
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    gradients: {
      hero: 'from-purple-600 via-violet-700 to-indigo-800',
      button: 'from-purple-500 to-violet-600',
      card: 'from-slate-800 to-slate-900',
    },
    fonts: { heading: 'Inter', body: 'Inter' },
    borderRadius: '0.5rem',
  },
  
  landing: {
    hero: { headline: '', subHeadline: '', ctaText: '', ctaLink: '', secondaryCtaText: '', secondaryCtaLink: '' },
    stats: [],
    valueProps: [],
    howItWorks: [],
  },
  
  coaching: {
    coachName: 'Maya',
    coachPersonality: 'Supportive',
    sessionTypes: ['discovery', 'practice'],
    emphasis: [],
  },
  
  thesis: {
    focusAreas: [],
    sectors: [],
    stages: [],
    geographies: [],
    ticketSize: { min: '', max: '', sweet: '' },
    welcomeMessages: { discovery: '', practice: '', simulation: '' },
  },
  
  platform: {
    urlPrefix: 'portal',
    adminRole: 'portal_admin',
    features: {
      voiceCoaching: true,
      investorMatching: true,
      deckVersioning: true,
      teamMembers: false,
      analytics: true,
      apiAccess: false,
      sdgScoring: false,
      impactMetrics: false,
      blendedReturns: false,
    },
    founderJourney: [],
    readinessLevels: [],
  },
  
  footer: {
    description: '',
    serviceLinks: [],
    companyLinks: [],
    legalLinks: [],
    copyright: '',
  },
  
  legal: {
    privacyUrl: '/privacy',
    termsUrl: '/terms',
    copyrightYear: new Date().getFullYear(),
    complianceRegions: [],
  },
  
  services: {
    supabase: { projectId: '', url: '' },
    vercel: { projectId: '', deploymentUrl: '' },
    elevenlabs: { agentId: '', voiceId: '' },
    anthropic: {},
  },
};

// ==========================================================================
// HELPER FUNCTIONS (stubs for Core - real implementation in child)
// ==========================================================================

export const getCompanyName = () => clientConfig.company.name;
export const getAdminName = () => `${clientConfig.admin.firstName} ${clientConfig.admin.lastName}`;
export const getAdminRole = () => clientConfig.platform.adminRole;
export const getUrlPrefix = () => clientConfig.platform.urlPrefix;
export const getCoachName = () => clientConfig.coaching.coachName;
export const getPortalRoute = (path: string) => `/${clientConfig.platform.urlPrefix}${path}`;
export const getThemeColor = (color: keyof typeof clientConfig.theme.colors) => clientConfig.theme.colors[color];
export const replaceTemplateVars = (text: string) => text;
export const isFeatureEnabled = (feature: keyof typeof clientConfig.platform.features) => clientConfig.platform.features[feature];

export type ClientConfig = typeof clientConfig;

// config/site.ts - Re-exports from client.ts for backwards compatibility
import { clientConfig } from './client';

export const siteConfig = {
  name: clientConfig.company.name,
  description: clientConfig.company.description,
  company: {
    name: clientConfig.company.legalName,
    tagline: clientConfig.company.tagline,
  },
  contact: {
    website: clientConfig.company.website,
    linkedin: clientConfig.company.social.linkedin,
    email: clientConfig.company.supportEmail,
  },
  platform: {
    focus: clientConfig.thesis.focusAreas,
    valueProps: clientConfig.landing.valueProps,
  },
};

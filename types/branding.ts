// Create a shared types file or import from the new route
// types/branding.ts
export type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';

export interface ExtractedBranding {
  company: {
    name: string;
    tagline: string;
    description: string;
    website: string;
  };
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  logo: {
    url: string | null;
    base64: string | null;
    type: string | null;
    source: string | null;
  };
  ogImage: {
    url: string | null;
    base64: string | null;
  };
  thesis: {
    focusAreas: string[];
    sectors: string[];
    stages: string[];
    philosophy: string;
    idealFounder: string;
  };
  contact: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
  };
  platformType: PlatformType;
}

export interface ExtractBrandingResponse {
  success: boolean;
  branding: ExtractedBranding;
  // Backwards compatibility
  theme: { colors: ExtractedBranding['colors'] };
  thesis: string;
  sectors: string[];
  stages: string[];
  description: string;
  logoUrl: string | null;
  logoBase64: string | null;
  logoType: string | null;
  ogImageUrl: string | null;
  ogImageBase64: string | null;
}
import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

// ============================================================================
// COLOR VALIDATION HELPERS - Added to prevent invalid color values in config
// ============================================================================

// Default colors for when extraction fails or returns invalid values
const DEFAULT_COLORS = {
  primary: '#3B82F6',    // Blue
  accent: '#10B981',     // Green
  background: '#0F172A', // Dark slate
};

// Validate hex color - must be #XXXXXX format
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Ensure we always return valid hex colors - CRITICAL for config generation
function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();

  // If it's already a valid 6-char hex
  if (isValidHexColor(trimmed)) return trimmed;

  // If it's a 3-char hex, expand it
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }

  // If it's missing the #, add it
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }

  // If it contains any non-hex characters (like "Unable to confirm"), return fallback
  console.warn(`Invalid color value "${color}", using fallback "${fallback}"`);
  return fallback;
}

// ============================================================================
// INTERFACES
// ============================================================================

interface CreateGithubRequest {
  repoName: string;
  formData: {
    companyName: string;
    companyWebsite: string;
    companyPhone: string;
    companyEmail: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminPhone: string;
    agentName: string;
    voiceGender: string;
    voiceLanguage: string;
    voiceType: string;
    llmProvider: string;
    extractedThesis: string;
    extractedColors: {
      primary: string;
      accent: string;
      background: string;
    };
  };
  createdResources: {
    supabaseUrl: string;
    supabaseProjectId: string;
    elevenlabsAgentId: string;
  };
  logoData?: {
    logoBase64: string | null;    // Base64 encoded logo
    logoType: string | null;      // 'svg', 'png', 'jpg', etc.
    ogImageBase64: string | null; // Base64 encoded OG image
  };
  skipConfigUpdate?: boolean;  // Create repo only, don't push config
  pushConfigOnly?: boolean;    // Skip repo creation, just push config
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateGithubRequest = await req.json();
    const { repoName, formData, createdResources, logoData, skipConfigUpdate, pushConfigOnly } = body;

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const templateOwner = process.env.GITHUB_TEMPLATE_OWNER || 'dennissolver';
    const templateRepo = process.env.GITHUB_TEMPLATE_REPO || 'RaiseReadyTemplate';
    const owner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    let repoCreated = false;

    // Skip repo creation if pushConfigOnly is true
    if (!pushConfigOnly) {
      // Step 1: Create repo from template
      console.log(`Creating repo ${owner}/${repoName} from template ${templateOwner}/${templateRepo}...`);

      const createResponse = await fetch(`${GITHUB_API}/repos/${templateOwner}/${templateRepo}/generate`, {
        method: 'POST',
        headers: { ...headers, 'Accept': 'application/vnd.github.baptiste-preview+json' },
        body: JSON.stringify({
          owner,
          name: repoName,
          description: `White-label pitch coaching platform for ${formData.companyName}`,
          private: false,
          include_all_branches: false,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        // If repo already exists, that's okay for pushConfigOnly scenarios
        if (error.message?.includes('already exists')) {
          console.log('Repository already exists, continuing...');
        } else {
          console.error('Failed to create repo:', error);
          return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: 400 });
        }
      } else {
        repoCreated = true;
        console.log('Repository created successfully');
      }

      // Wait for repo to be ready
      await sleep(3000);
    }

    // Skip config update if skipConfigUpdate is true
    if (skipConfigUpdate) {
      return NextResponse.json({
        success: true,
        repoFullName: `${owner}/${repoName}`,
        repoUrl: `https://github.com/${owner}/${repoName}`,
        cloneUrl: `https://github.com/${owner}/${repoName}.git`,
        configUpdated: false,
        phase: 'repo-created',
      });
    }

    // Step 2: Get current file SHA (needed for updates)
    const configPath = 'config/client.ts';
    let fileSha: string | undefined;

    try {
      const fileResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${configPath}`, {
        headers,
      });
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        fileSha = fileData.sha;
      }
    } catch {
      console.log('Config file does not exist yet, will create');
    }

    // Step 3: Generate and push client config
    const configContent = generateClientConfig(formData, createdResources, repoName);
    const encodedContent = Buffer.from(configContent).toString('base64');

    const updateResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${configPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Configure platform for ${formData.companyName}`,
        content: encodedContent,
        sha: fileSha,
        branch: 'main',
      }),
    });

    const fileUpdated = updateResponse.ok;
    if (!fileUpdated) {
      const error = await updateResponse.json();
      console.error('Failed to update config:', error);
    }

    // Step 4: Upload logo files if provided
    let logoUpdated = false;
    let ogImageUpdated = false;

    if (logoData?.logoBase64) {
      // Determine file extension
      const logoExt = logoData.logoType === 'svg' ? 'svg' :
                     logoData.logoType === 'png' ? 'png' :
                     logoData.logoType === 'jpg' ? 'jpg' : 'png';

      // Upload as both light and dark versions
      for (const variant of ['light', 'dark']) {
        const logoPath = `public/logo-${variant}.${logoExt}`;

        // Get existing file SHA if it exists
        let logoSha: string | undefined;
        try {
          const logoFileResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${logoPath}`, {
            headers,
          });
          if (logoFileResponse.ok) {
            const logoFileData = await logoFileResponse.json();
            logoSha = logoFileData.sha;
          }
        } catch {
          // File doesn't exist, that's fine
        }

        // Extract base64 data (remove data URL prefix if present)
        const base64Data = logoData.logoBase64.includes(',')
          ? logoData.logoBase64.split(',')[1]
          : logoData.logoBase64;

        const logoUpdateResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${logoPath}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: `Add ${variant} logo for ${formData.companyName}`,
            content: base64Data,
            sha: logoSha,
            branch: 'main',
          }),
        });

        if (logoUpdateResponse.ok) {
          logoUpdated = true;
          console.log(`Logo uploaded: ${logoPath}`);
        } else {
          const error = await logoUpdateResponse.json();
          console.error(`Failed to upload logo ${logoPath}:`, error);
        }
      }
    }

    // Upload OG image if provided
    if (logoData?.ogImageBase64) {
      const ogPath = 'public/og-image.png';

      let ogSha: string | undefined;
      try {
        const ogFileResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${ogPath}`, {
          headers,
        });
        if (ogFileResponse.ok) {
          const ogFileData = await ogFileResponse.json();
          ogSha = ogFileData.sha;
        }
      } catch {
        // File doesn't exist
      }

      const base64Data = logoData.ogImageBase64.includes(',')
        ? logoData.ogImageBase64.split(',')[1]
        : logoData.ogImageBase64;

      const ogUpdateResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${ogPath}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Add OG image for ${formData.companyName}`,
          content: base64Data,
          sha: ogSha,
          branch: 'main',
        }),
      });

      if (ogUpdateResponse.ok) {
        ogImageUpdated = true;
        console.log('OG image uploaded');
      }
    }

    return NextResponse.json({
      success: true,
      repoFullName: `${owner}/${repoName}`,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      cloneUrl: `https://github.com/${owner}/${repoName}.git`,
      configUpdated: fileUpdated,
      logoUpdated,
      ogImageUpdated,
      phase: pushConfigOnly ? 'config-pushed' : 'complete',
    });

  } catch (error) {
    console.error('Create GitHub error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateClientConfig(
  formData: CreateGithubRequest['formData'],
  resources: CreateGithubRequest['createdResources'],
  repoName: string
): string {
  // =========================================================================
  // FIX: Validate all colors BEFORE using them in the config template
  // This prevents invalid values like "Unable to confirm from HTML" from
  // being interpolated into the generated config file
  // =========================================================================
  const validatedColors = {
    primary: sanitizeColor(formData.extractedColors?.primary, DEFAULT_COLORS.primary),
    accent: sanitizeColor(formData.extractedColors?.accent, DEFAULT_COLORS.accent),
    background: sanitizeColor(formData.extractedColors?.background, DEFAULT_COLORS.background),
  };

  console.log('Generating config with validated colors:', validatedColors);

  return `// config/client.ts
// Auto-generated for: ${formData.companyName}
// Generated: ${new Date().toISOString()}

export const clientConfig = {
  company: {
    name: "${formData.companyName}",
    legalName: "${formData.companyName}",
    tagline: "AI-Powered Pitch Coaching",
    description: "Perfect your investor pitch with AI coaching",
    website: "${formData.companyWebsite}",
    platformUrl: "https://${repoName}.vercel.app",
    supportEmail: "${formData.companyEmail || formData.adminEmail}",
    salesEmail: "${formData.adminEmail}",
    social: { linkedin: "", twitter: "", youtube: "" },
    logo: { light: "/logo-light.svg", dark: "/logo-dark.svg", favicon: "/favicon.ico" },
  },
  admin: {
    firstName: "${formData.adminFirstName}",
    lastName: "${formData.adminLastName}",
    email: "${formData.adminEmail}",
    phone: "${formData.adminPhone || ''}",
    position: "Managing Partner",
    linkedIn: "",
  },
  offices: [{ city: "Office", country: "", address: "", phone: "${formData.companyPhone}", isPrimary: true }],
  theme: {
    mode: "dark" as const,
    colors: {
      primary: "${validatedColors.primary}",
      primaryHover: "#2563EB",
      accent: "${validatedColors.accent}",
      accentHover: "#059669",
      background: "${validatedColors.background}",
      surface: "#1E293B",
      text: "#F8FAFC",
      textMuted: "#94A3B8",
      border: "#334155",
      gradient: { from: "${validatedColors.primary}", via: "#0F172A", to: "${validatedColors.accent}" },
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
    },
    gradients: { hero: "from-blue-600 to-purple-600", button: "from-blue-500 to-blue-600", card: "from-slate-800 to-slate-900" },
    fonts: { heading: "Inter", body: "Inter" },
    borderRadius: "0.5rem",
  },
  coaching: {
    coachName: "${formData.agentName}",
    coachPersonality: "${formData.voiceType}",
    voiceAgentId: "${resources.elevenlabsAgentId || ''}",
    scoringFocus: "storytelling" as const,
    scoringCriteria: [
      { key: "narrative", label: "Narrative Clarity", weight: 0.20 },
      { key: "problem", label: "Problem Definition", weight: 0.15 },
      { key: "solution", label: "Solution Fit", weight: 0.15 },
      { key: "market", label: "Market Opportunity", weight: 0.15 },
      { key: "traction", label: "Traction & Proof", weight: 0.15 },
      { key: "team", label: "Team Credibility", weight: 0.10 },
      { key: "financials", label: "Financial Viability", weight: 0.10 },
    ],
    welcomeMessages: {
      discovery: "Welcome! I'm ${formData.agentName}, and I'll help you uncover the compelling narrative behind your startup.",
      practice: "Ready to practice? I'm ${formData.agentName}, and I'll give you real-time feedback to sharpen your pitch.",
      simulation: "Let's simulate an investor meeting. I'll play different investor types to prepare you for the real thing.",
    },
  },
  platform: {
    urlPrefix: "${repoName.replace('-pitch', '')}",
    adminRole: "portal_admin",
    features: { voiceCoaching: true, investorMatching: true, deckVersioning: true, teamMembers: false, analytics: true, apiAccess: false },
    founderJourney: [
      { id: "upload", label: "Upload Deck", icon: "Upload" },
      { id: "profile", label: "Complete Profile", icon: "User" },
      { id: "discovery", label: "Story Discovery", icon: "MessageSquare" },
      { id: "refine", label: "Refine Materials", icon: "FileEdit" },
      { id: "practice", label: "Practice Pitch", icon: "Mic" },
    ],
    readinessLevels: [
      { key: "not-ready", label: "Not Ready", minScore: 0, color: "red" },
      { key: "needs-work", label: "Needs Work", minScore: 40, color: "orange" },
      { key: "almost-ready", label: "Almost Ready", minScore: 60, color: "yellow" },
      { key: "investor-ready", label: "Investor Ready", minScore: 80, color: "green" },
    ],
  },
  services: {
    supabase: { projectId: "${resources.supabaseProjectId || ''}", url: "${resources.supabaseUrl || ''}" },
    vercel: { projectId: "", deploymentUrl: "https://${repoName}.vercel.app" },
    elevenlabs: { agentId: "${resources.elevenlabsAgentId || ''}", voiceId: "" },
  },
  footer: {
    description: "AI-powered pitch coaching platform",
    serviceLinks: [{ label: "For Founders", href: "/signup/founder" }, { label: "For Investors", href: "/login" }],
    companyLinks: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }],
    legalLinks: [{ label: "Privacy Policy", href: "/privacy" }, { label: "Terms of Service", href: "/terms" }],
    copyright: "© ${new Date().getFullYear()} ${formData.companyName}. All rights reserved.",
  },
  legal: { privacyUrl: "/privacy", termsUrl: "/terms", copyrightYear: ${new Date().getFullYear()}, complianceRegions: ["GDPR", "CCPA"] },
  thesis: {
    focusAreas: ["Compelling founder story", "Clear problem-solution fit", "Scalable business model"],
    sectors: ["Technology", "Healthcare", "Fintech", "Consumer"],
    stages: ["Pre-Seed", "Seed", "Series A"],
    geographies: ["Global"],
    ticketSize: { min: "$100K", max: "$5M", sweet: "$500K - $2M" },
    philosophy: "${formData.extractedThesis || 'We invest in exceptional founders building transformative companies.'}",
    idealFounder: "Passionate, resilient, and coachable founders with deep domain expertise.",
    dealBreakers: ["No clear differentiation", "Unrealistic valuations", "Weak founding team"],
  },
  landing: {
    hero: { headline: "Perfect Your Pitch", subHeadline: "AI-powered coaching to help you nail your investor presentation", ctaText: "Get Started", ctaLink: "/signup/founder", secondaryCtaText: "Learn More", secondaryCtaLink: "#how-it-works" },
    stats: [{ value: "500+", label: "Founders Coached" }, { value: "$2B+", label: "Capital Raised" }, { value: "85%", label: "Success Rate" }, { value: "50+", label: "Countries" }],
    valueProps: [
      { icon: "Brain", title: "AI-Powered Coaching", description: "Get personalized feedback on your pitch deck and presentation skills." },
      { icon: "Target", title: "Investor Matching", description: "Connect with investors who match your stage, sector, and geography." },
      { icon: "TrendingUp", title: "Track Progress", description: "Monitor your readiness score and improvement over time." },
    ],
    howItWorks: [
      { step: 1, title: "Upload Your Deck", description: "Submit your pitch deck for AI analysis." },
      { step: 2, title: "Get Coached", description: "Receive personalized feedback and practice with AI." },
      { step: 3, title: "Meet Investors", description: "Get matched with relevant investors when ready." },
    ],
  },
};

export const getCompanyName = () => clientConfig.company.name;
export const getAdminName = () => \`\${clientConfig.admin.firstName} \${clientConfig.admin.lastName}\`;
export const getAdminRole = () => clientConfig.platform.adminRole;
export const getUrlPrefix = () => clientConfig.platform.urlPrefix;
export const getCoachName = () => clientConfig.coaching.coachName;
export const getPortalRoute = (path: string) => \`/\${clientConfig.platform.urlPrefix}\${path}\`;
export const getThemeColor = (color: keyof typeof clientConfig.theme.colors) => clientConfig.theme.colors[color];
export const replaceTemplateVars = (text: string): string => {
  return text
    .replace(/{company}/g, clientConfig.company.name)
    .replace(/{coach}/g, clientConfig.coaching.coachName)
    .replace(/{year}/g, String(clientConfig.legal.copyrightYear))
    .replace(/{admin}/g, getAdminName())
    .replace(/{email}/g, clientConfig.company.supportEmail);
};
export const isFeatureEnabled = (feature: keyof typeof clientConfig.platform.features) => clientConfig.platform.features[feature];
export type ClientConfig = typeof clientConfig;
`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
import { NextRequest, NextResponse } from 'next/server';
import sodium from 'libsodium-wrappers';

const GITHUB_API = 'https://api.github.com';

// ============================================================================
// COLOR VALIDATION HELPERS
// ============================================================================

const DEFAULT_COLORS = {
  primary: '#3B82F6',
  accent: '#10B981',
  background: '#0F172A',
};

function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (isValidHexColor(trimmed)) return trimmed;
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  console.warn(`Invalid color value "${color}", using fallback "${fallback}"`);
  return fallback;
}

// ============================================================================
// GITHUB SECRETS HELPER
// ============================================================================

async function setGithubRepoSecret(
  owner: string,
  repo: string,
  secretName: string,
  secretValue: string,
  headers: HeadersInit
): Promise<boolean> {
  try {
    // Ensure sodium is ready
    await sodium.ready;

    // Step 1: Get the repo's public key for encrypting secrets
    const keyResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/actions/secrets/public-key`,
      { headers }
    );

    if (!keyResponse.ok) {
      console.error(`Failed to get public key for ${owner}/${repo}:`, await keyResponse.text());
      return false;
    }

    const { key, key_id } = await keyResponse.json();

    // Step 2: Encrypt the secret using libsodium sealed box
    const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
    const binsec = sodium.from_string(secretValue);
    const encBytes = sodium.crypto_box_seal(binsec, binkey);
    const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

    // Step 3: Create or update the secret
    const createResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/actions/secrets/${secretName}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          encrypted_value: encryptedValue,
          key_id: key_id,
        }),
      }
    );

    if (!createResponse.ok && createResponse.status !== 201 && createResponse.status !== 204) {
      console.error(`Failed to set secret ${secretName}:`, await createResponse.text());
      return false;
    }

    console.log(`✅ Set GitHub secret: ${secretName} for ${owner}/${repo}`);
    return true;
  } catch (error) {
    console.error(`Error setting secret ${secretName}:`, error);
    return false;
  }
}

// ============================================================================
// INTERFACES
// ============================================================================

interface PlatformConfig {
  platformType: 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';
  platformMode: 'screening' | 'coaching';
  // Impact investor
  prioritySdgs?: number[];
  targetFinancialReturn?: number;
  targetImpactReturn?: number;
  // Family office
  investmentHorizon?: string;
  familyMission?: string;
  legacyPriorities?: string[];
  reputationSensitivity?: string;
  decisionMakerType?: string;
  involvementLevel?: string;
  acceptsBelowMarketReturns?: boolean;
  riskTolerance?: string;
  // Service provider
  serviceProviderType?: string;
  targetClientStages?: string[];
  targetClientSectors?: string[];
  coachingFocusAreas?: string[];
  referralTrackingEnabled?: boolean;
  // Commercial
  minimumRevenue?: string;
  preferredGrowthRate?: string;
}

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
  platformConfig?: PlatformConfig;
  logoData?: {
    logoBase64: string | null;
    logoType: string | null;
    ogImageBase64: string | null;
  };
  skipConfigUpdate?: boolean;
  pushConfigOnly?: boolean;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: CreateGithubRequest = await req.json();
    const { repoName, formData, createdResources, platformConfig, logoData, skipConfigUpdate, pushConfigOnly } = body;

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const templateOwner = process.env.GITHUB_TEMPLATE_OWNER || 'dennissolver';
    const templateRepo = process.env.GITHUB_TEMPLATE_REPO || 'raiseready-template';
    const owner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    let secretsConfigured = false;

    // Skip repo creation if pushConfigOnly is true
    if (!pushConfigOnly) {
      console.log(`Creating repo ${owner}/${repoName} from template ${templateOwner}/${templateRepo}...`);

      const createResponse = await fetch(`${GITHUB_API}/repos/${templateOwner}/${templateRepo}/generate`, {
        method: 'POST',
        headers: { ...headers, 'Accept': 'application/vnd.github.baptiste-preview+json' },
        body: JSON.stringify({
          owner,
          name: repoName,
          description: `${getPlatformDescription(platformConfig?.platformType)} for ${formData.companyName}`,
          private: false,
          include_all_branches: false,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        if (!error.message?.includes('already exists')) {
          console.error('Failed to create repo:', error);
          return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: 400 });
        }
        console.log('Repository already exists, continuing...');
      } else {
        console.log('Repository created successfully');
      }

      await sleep(3000);

      // ========================================================================
      // SET GITHUB ACTIONS SECRETS
      // ========================================================================
      console.log('Setting GitHub Actions secrets...');

      const secretsToSet: { name: string; value: string | undefined }[] = [
        {
          name: 'SUPABASE_ACCESS_TOKEN',
          value: process.env.SUPABASE_ACCESS_TOKEN,
        },
        // Add any other secrets your client repos need:
        // {
        //   name: 'ANOTHER_SECRET',
        //   value: process.env.ANOTHER_SECRET,
        // },
      ];

      let allSecretsSet = true;
      for (const secret of secretsToSet) {
        if (secret.value) {
          const success = await setGithubRepoSecret(
            owner,
            repoName,
            secret.name,
            secret.value,
            headers
          );
          if (!success) {
            console.warn(`⚠️ Failed to set secret: ${secret.name}`);
            allSecretsSet = false;
          }
        } else {
          console.warn(`⚠️ Skipping ${secret.name} - no value in environment`);
          allSecretsSet = false;
        }
      }
      secretsConfigured = allSecretsSet;
    }

    if (skipConfigUpdate) {
      return NextResponse.json({
        success: true,
        repoFullName: `${owner}/${repoName}`,
        repoUrl: `https://github.com/${owner}/${repoName}`,
        repoName: repoName,
        cloneUrl: `https://github.com/${owner}/${repoName}.git`,
        configUpdated: false,
        secretsConfigured,
        phase: 'repo-created',
      });
    }

    // Get current file SHA
    const configPath = 'config/client.ts';
    let fileSha: string | undefined;

    try {
      const fileResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${configPath}`, { headers });
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        fileSha = fileData.sha;
      }
    } catch {
      console.log('Config file does not exist yet, will create');
    }

    // Generate and push client config
    const configContent = generateClientConfig(formData, createdResources, repoName, platformConfig);
    const encodedContent = Buffer.from(configContent).toString('base64');

    const updateResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${configPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Configure ${platformConfig?.platformType || 'platform'} for ${formData.companyName}`,
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

    // Upload logo files if provided
    let logoUpdated = false;
    let ogImageUpdated = false;

    if (logoData?.logoBase64) {
      const logoExt = logoData.logoType === 'svg' ? 'svg' : logoData.logoType === 'png' ? 'png' : 'png';

      for (const variant of ['light', 'dark']) {
        const logoPath = `public/logo-${variant}.${logoExt}`;
        let logoSha: string | undefined;

        try {
          const logoFileResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${logoPath}`, { headers });
          if (logoFileResponse.ok) {
            const logoFileData = await logoFileResponse.json();
            logoSha = logoFileData.sha;
          }
        } catch { /* File doesn't exist */ }

        const base64Data = logoData.logoBase64.includes(',') ? logoData.logoBase64.split(',')[1] : logoData.logoBase64;

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
        }
      }
    }

    if (logoData?.ogImageBase64) {
      const ogPath = 'public/og-image.png';
      let ogSha: string | undefined;

      try {
        const ogFileResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/contents/${ogPath}`, { headers });
        if (ogFileResponse.ok) {
          const ogFileData = await ogFileResponse.json();
          ogSha = ogFileData.sha;
        }
      } catch { /* File doesn't exist */ }

      const base64Data = logoData.ogImageBase64.includes(',') ? logoData.ogImageBase64.split(',')[1] : logoData.ogImageBase64;

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
      repoName: repoName,
      cloneUrl: `https://github.com/${owner}/${repoName}.git`,
      configUpdated: fileUpdated,
      logoUpdated,
      ogImageUpdated,
      secretsConfigured,
      phase: pushConfigOnly ? 'config-pushed' : 'complete',
    });

  } catch (error) {
    console.error('Create GitHub error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ============================================================================
// PLATFORM-AWARE CONFIG GENERATION
// ============================================================================

function getPlatformDescription(platformType?: string): string {
  const descriptions: Record<string, string> = {
    'impact_investor': 'Impact investing platform',
    'commercial_investor': 'Investor deal flow platform',
    'family_office': 'Family office deal screening platform',
    'founder_service_provider': 'Pitch coaching platform',
  };
  return descriptions[platformType || ''] || 'White-label pitch coaching platform';
}

function getProviderLabel(providerType: string): string {
  const labels: Record<string, string> = {
    'law_firm': 'Law Firm',
    'accelerator': 'Accelerator',
    'incubator': 'Incubator',
    'consultancy': 'Consultancy',
    'advisory': 'Advisory',
    'accounting_firm': 'Accounting Firm',
  };
  return labels[providerType] || 'Professional Services';
}

function generateClientConfig(
  formData: CreateGithubRequest['formData'],
  resources: CreateGithubRequest['createdResources'],
  repoName: string,
  platformConfig?: PlatformConfig
): string {
  const validatedColors = {
    primary: sanitizeColor(formData.extractedColors?.primary, DEFAULT_COLORS.primary),
    accent: sanitizeColor(formData.extractedColors?.accent, DEFAULT_COLORS.accent),
    background: sanitizeColor(formData.extractedColors?.background, DEFAULT_COLORS.background),
  };

  const platformType = platformConfig?.platformType || 'commercial_investor';
  const platformMode = platformConfig?.platformMode || 'screening';
  const content = getPlatformSpecificContent(platformType, platformConfig, formData);

  console.log('Generating config for platform type:', platformType);

  return `// config/client.ts
// Auto-generated for: ${formData.companyName}
// Platform Type: ${platformType}
// Platform Mode: ${platformMode}
// Generated: ${new Date().toISOString()}

export const clientConfig = {
  // Platform Configuration
  platformType: "${platformType}" as const,
  platformMode: "${platformMode}" as const,

  company: {
    name: "${formData.companyName}",
    legalName: "${formData.companyName}",
    tagline: "${content.tagline}",
    description: "${content.description}",
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
    position: "${content.adminPosition}",
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
    scoringFocus: "${content.scoringFocus}" as const,
    scoringCriteria: ${JSON.stringify(content.scoringCriteria, null, 6).replace(/\n/g, '\n    ')},
    welcomeMessages: {
      discovery: \`${content.welcomeMessages.discovery}\`,
      practice: \`${content.welcomeMessages.practice}\`,
      simulation: \`${content.welcomeMessages.simulation}\`,
    },
    features: ${JSON.stringify(content.features, null, 6).replace(/\n/g, '\n    ')},
  },

  founderJourney: ${JSON.stringify(content.founderJourney, null, 4).replace(/\n/g, '\n  ')},

  readinessLevels: ${JSON.stringify(content.readinessLevels, null, 4).replace(/\n/g, '\n  ')},

  footer: {
    description: "${content.footerDescription}",
  },

  services: {
    links: ${JSON.stringify(content.serviceLinks, null, 6).replace(/\n/g, '\n    ')},
  },

  thesis: ${JSON.stringify(content.thesis, null, 4).replace(/\n/g, '\n  ')},

  hero: ${JSON.stringify(content.hero, null, 4).replace(/\n/g, '\n  ')},

  stats: ${JSON.stringify(content.stats, null, 4).replace(/\n/g, '\n  ')},

  valueProps: ${JSON.stringify(content.valueProps, null, 4).replace(/\n/g, '\n  ')},

  howItWorks: ${JSON.stringify(content.howItWorks, null, 4).replace(/\n/g, '\n  ')},

  ${content.extraConfig || ''}
} as const;

export type ClientConfig = typeof clientConfig;
`;
}

// ============================================================================
// PLATFORM-SPECIFIC CONTENT
// ============================================================================

interface PlatformContent {
  tagline: string;
  description: string;
  adminPosition: string;
  scoringFocus: string;
  scoringCriteria: Array<{ key: string; label: string; weight: number }>;
  welcomeMessages: { discovery: string; practice: string; simulation: string };
  features: Record<string, boolean>;
  founderJourney: Array<{ id: string; label: string; icon: string }>;
  readinessLevels: Array<{ key: string; label: string; minScore: number; color: string }>;
  footerDescription: string;
  serviceLinks: Array<{ label: string; href: string }>;
  thesis: {
    focusAreas: string[];
    sectors: string[];
    stages: string[];
    geographies: string[];
    ticketSize: { min: string; max: string; sweet: string };
    philosophy: string;
    idealFounder: string;
    dealBreakers: string[];
  };
  hero: {
    headline: string;
    subHeadline: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
  };
  stats: Array<{ value: string; label: string }>;
  valueProps: Array<{ icon: string; title: string; description: string }>;
  howItWorks: Array<{ step: number; title: string; description: string }>;
  extraConfig?: string;
}

function getPlatformSpecificContent(
  platformType: string,
  platformConfig: PlatformConfig | undefined,
  formData: CreateGithubRequest['formData']
): PlatformContent {
  const companyName = formData.companyName;
  const coachName = formData.agentName;

  // ============================================================================
  // FOUNDER SERVICE PROVIDER (Law firms, accelerators, etc.)
  // ============================================================================
  if (platformType === 'founder_service_provider') {
    const providerType = platformConfig?.serviceProviderType || 'advisory';
    const providerLabel = getProviderLabel(providerType);

    return {
      tagline: `${providerLabel} Pitch Coaching`,
      description: `Help your clients perfect their investor pitches with AI-powered coaching`,
      adminPosition: "Managing Partner",
      scoringFocus: "presentation_quality",
      scoringCriteria: [
        { key: "clarity", label: "Message Clarity", weight: 0.20 },
        { key: "story", label: "Story Compelling", weight: 0.20 },
        { key: "confidence", label: "Confidence", weight: 0.15 },
        { key: "structure", label: "Pitch Structure", weight: 0.15 },
        { key: "q_and_a", label: "Q&A Readiness", weight: 0.15 },
        { key: "time_management", label: "Time Management", weight: 0.10 },
        { key: "visual_aids", label: "Visual Presentation", weight: 0.05 },
      ],
      welcomeMessages: {
        discovery: `Welcome! I'm ${coachName} from ${companyName}. I'll help you craft a compelling story that resonates with investors.`,
        practice: `Ready to practice? Let's rehearse your pitch and polish your delivery.`,
        simulation: `Let's do a full pitch simulation. I'll play the role of a skeptical investor.`,
      },
      features: {
        voiceCoaching: true,
        investorMatching: false,
        deckVersioning: true,
        teamMembers: true,
        analytics: true,
        apiAccess: false,
        clientManagement: true,
        referralTracking: platformConfig?.referralTrackingEnabled || false,
      },
      founderJourney: [
        { id: "upload", label: "Upload Deck", icon: "Upload" },
        { id: "profile", label: "Complete Profile", icon: "User" },
        { id: "discovery", label: "Story Discovery", icon: "MessageSquare" },
        { id: "refine", label: "Refine Message", icon: "Edit" },
        { id: "practice", label: "Practice Pitch", icon: "Mic" },
      ],
      readinessLevels: [
        { key: "developing", label: "Developing", minScore: 0, color: "red" },
        { key: "progressing", label: "Progressing", minScore: 40, color: "orange" },
        { key: "proficient", label: "Proficient", minScore: 60, color: "yellow" },
        { key: "excellent", label: "Excellent", minScore: 80, color: "green" },
      ],
      footerDescription: `AI-powered pitch coaching for ${providerLabel.toLowerCase()} clients`,
      serviceLinks: [
        { label: "For Founders", href: "/signup/founder" },
        { label: "Partner Portal", href: "/login" },
      ],
      thesis: {
        focusAreas: platformConfig?.coachingFocusAreas || ["Pitch Delivery", "Storytelling", "Investor Q&A"],
        sectors: platformConfig?.targetClientSectors || ["All Sectors"],
        stages: platformConfig?.targetClientStages || ["Pre-Seed", "Seed", "Series A"],
        geographies: ["Global"],
        ticketSize: { min: "N/A", max: "N/A", sweet: "N/A" },
        philosophy: formData.extractedThesis || `${companyName} helps founders tell their story with confidence and clarity.`,
        idealFounder: "Founders preparing for investor conversations who want to maximize their chances of success.",
        dealBreakers: [],
      },
      hero: {
        headline: "Perfect Your Pitch",
        subHeadline: `${companyName} helps founders craft compelling investor presentations`,
        ctaText: "Start Coaching",
        ctaLink: "/signup/founder",
        secondaryCtaText: "Learn More",
        secondaryCtaLink: "#features",
      },
      stats: [
        { value: "500+", label: "Founders Coached" },
        { value: "85%", label: "Success Rate" },
        { value: "2hrs", label: "Avg. Prep Time" },
        { value: "4.9", label: "Client Rating" },
      ],
      valueProps: [
        { icon: "Mic", title: "Voice Coaching", description: "Practice your pitch with AI that gives real-time feedback on delivery and content." },
        { icon: "Target", title: "Personalized Focus", description: "Coaching tailored to your industry, stage, and specific investor targets." },
        { icon: "TrendingUp", title: "Track Progress", description: "See your improvement over time with detailed analytics and scoring." },
      ],
      howItWorks: [
        { step: 1, title: "Upload Your Deck", description: "Share your current pitch materials for AI analysis." },
        { step: 2, title: "Discover Your Story", description: "Work with our AI coach to refine your narrative." },
        { step: 3, title: "Practice & Perfect", description: "Rehearse with voice coaching until you're investor-ready." },
      ],
      extraConfig: `serviceProvider: {
    providerType: "${providerType}",
    targetClientStages: ${JSON.stringify(platformConfig?.targetClientStages || [])},
    targetClientSectors: ${JSON.stringify(platformConfig?.targetClientSectors || [])},
    coachingFocusAreas: ${JSON.stringify(platformConfig?.coachingFocusAreas || [])},
    referralTrackingEnabled: ${platformConfig?.referralTrackingEnabled || false},
  },`,
    };
  }

  // ============================================================================
  // IMPACT INVESTOR (SDG-focused)
  // ============================================================================
  if (platformType === 'impact_investor') {
    const prioritySdgs = platformConfig?.prioritySdgs || [1, 2, 3, 7, 13];

    return {
      tagline: "Impact-First Investing",
      description: `Screen startups for both financial returns and measurable social/environmental impact`,
      adminPosition: "Impact Partner",
      scoringFocus: "impact_potential",
      scoringCriteria: [
        { key: "sdg_alignment", label: "SDG Alignment", weight: 0.25 },
        { key: "impact_measurability", label: "Impact Measurability", weight: 0.20 },
        { key: "financial_sustainability", label: "Financial Sustainability", weight: 0.15 },
        { key: "scalability", label: "Impact Scalability", weight: 0.15 },
        { key: "team", label: "Team & Mission Fit", weight: 0.10 },
        { key: "theory_of_change", label: "Theory of Change", weight: 0.10 },
        { key: "additionality", label: "Additionality", weight: 0.05 },
      ],
      welcomeMessages: {
        discovery: `Welcome! I'm ${coachName} from ${companyName}. I'm excited to learn about your impact story and how you're creating positive change.`,
        practice: `Let's practice your impact pitch. I'll help you articulate both your financial and impact thesis clearly.`,
        simulation: `I'll play the role of an impact investor. Be ready to discuss your theory of change and impact measurement.`,
      },
      features: {
        voiceCoaching: true,
        investorMatching: true,
        deckVersioning: true,
        teamMembers: false,
        analytics: true,
        apiAccess: false,
        impactScoring: true,
        sdgMapping: true,
      },
      founderJourney: [
        { id: "upload", label: "Upload Deck", icon: "Upload" },
        { id: "impact", label: "Impact Assessment", icon: "Target" },
        { id: "discovery", label: "Story Discovery", icon: "MessageSquare" },
        { id: "practice", label: "Practice Pitch", icon: "Mic" },
        { id: "match", label: "Investor Matching", icon: "Users" },
      ],
      readinessLevels: [
        { key: "early-impact", label: "Early Impact", minScore: 0, color: "red" },
        { key: "developing", label: "Developing", minScore: 40, color: "orange" },
        { key: "impact-ready", label: "Impact Ready", minScore: 60, color: "yellow" },
        { key: "investment-ready", label: "Investment Ready", minScore: 80, color: "green" },
      ],
      footerDescription: "Connecting impact-driven founders with aligned capital",
      serviceLinks: [
        { label: "For Founders", href: "/signup/founder" },
        { label: "Investor Portal", href: "/login" },
      ],
      thesis: {
        focusAreas: ["Climate Action", "Financial Inclusion", "Health Access", "Education"],
        sectors: ["CleanTech", "FinTech for Good", "HealthTech", "EdTech", "AgriTech"],
        stages: ["Seed", "Series A", "Series B"],
        geographies: ["Global", "Emerging Markets"],
        ticketSize: { min: "$250K", max: "$5M", sweet: "$1M - $3M" },
        philosophy: formData.extractedThesis || `${companyName} invests in founders building solutions to humanity's greatest challenges.`,
        idealFounder: "Mission-driven founders with clear impact metrics and sustainable business models.",
        dealBreakers: ["Impact washing", "No measurable outcomes", "Misaligned incentives"],
      },
      hero: {
        headline: "Invest in What Matters",
        subHeadline: `${companyName} backs founders creating measurable positive impact`,
        ctaText: "Submit Your Impact Venture",
        ctaLink: "/signup/founder",
        secondaryCtaText: "Our Impact Thesis",
        secondaryCtaLink: "#thesis",
      },
      stats: [
        { value: "$50M+", label: "Impact Capital" },
        { value: "30+", label: "Portfolio Companies" },
        { value: "12", label: "SDGs Addressed" },
        { value: "10M+", label: "Lives Impacted" },
      ],
      valueProps: [
        { icon: "Globe", title: "Impact First", description: "We evaluate ventures on their potential for positive social and environmental change." },
        { icon: "BarChart", title: "Measurable Outcomes", description: "Our AI assesses your impact metrics and theory of change." },
        { icon: "Users", title: "Mission Alignment", description: "Connect with investors who share your commitment to making a difference." },
      ],
      howItWorks: [
        { step: 1, title: "Share Your Impact", description: "Upload your deck and complete our impact assessment." },
        { step: 2, title: "Get Scored", description: "Our AI evaluates SDG alignment and impact potential." },
        { step: 3, title: "Connect", description: "High-scoring ventures connect directly with our impact team." },
      ],
      extraConfig: `impactInvestor: {
    prioritySdgs: ${JSON.stringify(prioritySdgs)},
    targetFinancialReturn: ${platformConfig?.targetFinancialReturn || 15},
    targetImpactReturn: ${platformConfig?.targetImpactReturn || 20},
    impactFramework: "SDG-aligned",
  },`,
    };
  }

  // ============================================================================
  // FAMILY OFFICE (Values & legacy focused)
  // ============================================================================
  if (platformType === 'family_office') {
    return {
      tagline: "Values-Aligned Investing",
      description: `Screen opportunities aligned with family values and long-term legacy goals`,
      adminPosition: "Family Office Principal",
      scoringFocus: "values_alignment",
      scoringCriteria: [
        { key: "values_fit", label: "Values Alignment", weight: 0.25 },
        { key: "long_term_vision", label: "Long-term Vision", weight: 0.20 },
        { key: "reputation_risk", label: "Reputation Risk", weight: 0.15 },
        { key: "financial_stability", label: "Financial Stability", weight: 0.15 },
        { key: "team_integrity", label: "Team Integrity", weight: 0.10 },
        { key: "exit_flexibility", label: "Exit Flexibility", weight: 0.10 },
        { key: "governance", label: "Governance Quality", weight: 0.05 },
      ],
      welcomeMessages: {
        discovery: `Welcome! I'm ${coachName} from ${companyName}. Let's explore how your company aligns with our family's values and long-term vision.`,
        practice: `Let's practice presenting your company to a family office. I'll focus on values alignment and long-term potential.`,
        simulation: `I'll play the role of a family office principal. Be prepared to discuss governance, values, and your long-term vision.`,
      },
      features: {
        voiceCoaching: true,
        investorMatching: true,
        deckVersioning: true,
        teamMembers: false,
        analytics: true,
        apiAccess: false,
        valuesScoring: true,
        reputationAnalysis: true,
        longTermModeling: true,
      },
      founderJourney: [
        { id: "upload", label: "Upload Deck", icon: "Upload" },
        { id: "values", label: "Values Assessment", icon: "Heart" },
        { id: "discovery", label: "Story Discovery", icon: "MessageSquare" },
        { id: "practice", label: "Practice Pitch", icon: "Mic" },
        { id: "review", label: "Family Review", icon: "Users" },
      ],
      readinessLevels: [
        { key: "not-aligned", label: "Not Aligned", minScore: 0, color: "red" },
        { key: "partial", label: "Partial Alignment", minScore: 40, color: "orange" },
        { key: "aligned", label: "Values Aligned", minScore: 60, color: "yellow" },
        { key: "exemplary", label: "Exemplary Fit", minScore: 80, color: "green" },
      ],
      footerDescription: "Values-aligned investing for generational wealth",
      serviceLinks: [
        { label: "For Founders", href: "/signup/founder" },
        { label: "Family Portal", href: "/login" },
      ],
      thesis: {
        focusAreas: ["Values Alignment", "Long-term Vision", "Governance Excellence"],
        sectors: ["Technology", "Healthcare", "Real Assets", "Consumer"],
        stages: ["Series A", "Series B", "Growth"],
        geographies: ["Global"],
        ticketSize: { min: "$1M", max: "$25M", sweet: "$5M - $15M" },
        philosophy: formData.extractedThesis || platformConfig?.familyMission || `${companyName} seeks founders who share our commitment to building enduring businesses with integrity.`,
        idealFounder: "Founders with long-term vision, strong ethics, and commitment to building lasting value.",
        dealBreakers: ["Governance concerns", "Reputational risk", "Short-term focus"],
      },
      hero: {
        headline: "Building Generational Value",
        subHeadline: `${companyName} partners with founders who share our commitment to long-term, values-aligned growth`,
        ctaText: "Submit Your Company",
        ctaLink: "/signup/founder",
        secondaryCtaText: "Our Values",
        secondaryCtaLink: "#values",
      },
      stats: [
        { value: "20+", label: "Years Investing" },
        { value: "15", label: "Portfolio Companies" },
        { value: "10yr+", label: "Average Hold Period" },
        { value: "3", label: "Generations Served" },
      ],
      valueProps: [
        { icon: "Heart", title: "Values First", description: "We prioritize alignment with our family's core values and mission." },
        { icon: "Clock", title: "Patient Capital", description: "We take a generational view, not quarterly. Build for the long term." },
        { icon: "Shield", title: "Reputation Matters", description: "We protect our family name and expect the same from partners." },
      ],
      howItWorks: [
        { step: 1, title: "Submit Your Story", description: "Share your company's vision and values through our platform." },
        { step: 2, title: "Values Assessment", description: "Our AI assesses alignment with family priorities and reputation factors." },
        { step: 3, title: "Family Introduction", description: "Aligned founders meet with family principals for deeper discussion." },
      ],
      extraConfig: `familyOffice: {
    investmentHorizon: "${platformConfig?.investmentHorizon || '10+ years'}",
    familyMission: "${platformConfig?.familyMission || ''}",
    legacyPriorities: ${JSON.stringify(platformConfig?.legacyPriorities || [])},
    reputationSensitivity: "${platformConfig?.reputationSensitivity || 'high'}",
    decisionMakerType: "${platformConfig?.decisionMakerType || 'family_council'}",
    involvementLevel: "${platformConfig?.involvementLevel || 'advisory'}",
    acceptsBelowMarketReturns: ${platformConfig?.acceptsBelowMarketReturns || false},
    riskTolerance: "${platformConfig?.riskTolerance || 'moderate'}",
  },`,
    };
  }

  // ============================================================================
  // COMMERCIAL INVESTOR (Default - growth metrics focused)
  // ============================================================================
  return {
    tagline: "Growth-Focused Investing",
    description: `Screen high-potential startups based on growth metrics and market opportunity`,
    adminPosition: "Managing Partner",
    scoringFocus: "growth_potential",
    scoringCriteria: [
      { key: "revenue_growth", label: "Revenue Growth", weight: 0.20 },
      { key: "market_size", label: "Market Size", weight: 0.15 },
      { key: "unit_economics", label: "Unit Economics", weight: 0.15 },
      { key: "team", label: "Team Strength", weight: 0.15 },
      { key: "competitive_moat", label: "Competitive Moat", weight: 0.10 },
      { key: "traction", label: "Traction", weight: 0.10 },
      { key: "scalability", label: "Scalability", weight: 0.10 },
      { key: "exit_potential", label: "Exit Potential", weight: 0.05 },
    ],
    welcomeMessages: {
      discovery: `Welcome! I'm ${coachName} from ${companyName}. Let's dive into your growth story and market opportunity.`,
      practice: `Ready to practice? I'll help you nail your metrics, traction, and growth narrative.`,
      simulation: `Let's simulate a VC pitch. I'll ask tough questions about your unit economics and path to scale.`,
    },
    features: {
      voiceCoaching: true,
      investorMatching: true,
      deckVersioning: true,
      teamMembers: false,
      analytics: true,
      apiAccess: false,
      metricsTracking: true,
      dealFlow: true,
    },
    founderJourney: [
      { id: "upload", label: "Upload Deck", icon: "Upload" },
      { id: "profile", label: "Complete Profile", icon: "User" },
      { id: "discovery", label: "Story Discovery", icon: "MessageSquare" },
      { id: "practice", label: "Practice Pitch", icon: "Mic" },
      { id: "match", label: "Investor Matching", icon: "Target" },
    ],
    readinessLevels: [
      { key: "not-ready", label: "Not Ready", minScore: 0, color: "red" },
      { key: "needs-work", label: "Needs Work", minScore: 40, color: "orange" },
      { key: "almost-ready", label: "Almost Ready", minScore: 60, color: "yellow" },
      { key: "investor-ready", label: "Investor Ready", minScore: 80, color: "green" },
    ],
    footerDescription: "AI-powered deal flow and founder screening",
    serviceLinks: [
      { label: "For Founders", href: "/signup/founder" },
      { label: "Investor Portal", href: "/login" },
    ],
    thesis: {
      focusAreas: ["Strong unit economics", "Large market opportunity", "Exceptional team"],
      sectors: platformConfig?.targetClientSectors || ["SaaS", "FinTech", "HealthTech", "Enterprise"],
      stages: platformConfig?.targetClientStages || ["Seed", "Series A", "Series B"],
      geographies: ["Global"],
      ticketSize: { min: "$500K", max: "$10M", sweet: "$2M - $5M" },
      philosophy: formData.extractedThesis || `${companyName} backs exceptional founders building category-defining companies.`,
      idealFounder: "Data-driven founders with clear path to scale and strong execution ability.",
      dealBreakers: ["No clear differentiation", "Weak unit economics", "Small market"],
    },
    hero: {
      headline: "Fund Your Growth",
      subHeadline: `${companyName} backs founders building the next generation of category leaders`,
      ctaText: "Submit Your Pitch",
      ctaLink: "/signup/founder",
      secondaryCtaText: "Our Thesis",
      secondaryCtaLink: "#thesis",
    },
    stats: [
      { value: "$100M+", label: "Capital Deployed" },
      { value: "50+", label: "Portfolio Companies" },
      { value: "3x", label: "Average MOIC" },
      { value: "5", label: "Unicorns" },
    ],
    valueProps: [
      { icon: "TrendingUp", title: "Growth Focus", description: "We look for founders with exceptional growth metrics and clear path to scale." },
      { icon: "Target", title: "Smart Matching", description: "Our AI matches you with investors aligned to your stage and sector." },
      { icon: "Zap", title: "Fast Process", description: "Get feedback in days, not months. We respect founder time." },
    ],
    howItWorks: [
      { step: 1, title: "Submit Your Pitch", description: "Upload your deck and key metrics for AI analysis." },
      { step: 2, title: "Get Scored", description: "Our AI evaluates growth potential and investor fit." },
      { step: 3, title: "Meet Investors", description: "High-scoring founders connect directly with our investment team." },
    ],
    extraConfig: `commercialInvestor: {
    targetStages: ${JSON.stringify(platformConfig?.targetClientStages || ["Seed", "Series A"])},
    targetSectors: ${JSON.stringify(platformConfig?.targetClientSectors || ["SaaS", "FinTech"])},
    minimumRevenue: "${platformConfig?.minimumRevenue || '$0'}",
    preferredGrowthRate: "${platformConfig?.preferredGrowthRate || '100%+ YoY'}",
  },`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
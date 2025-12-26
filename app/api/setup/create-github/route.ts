// app/api/setup/create-github/route.ts
// ============================================================================
// GITHUB REPOSITORY CREATION - Pulls from raiseready-child-template
//
// REFACTORED: No more hardcoded files. Pulls from template repo and only
// customizes config/client.ts with branding.
//
// FIX APPLIED: Added Step 1.5 to bootstrap empty repos before using Git Data API
// FIX APPLIED: Added complete landing section to generated config
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';
const TEMPLATE_OWNER = 'dennissolver';
const TEMPLATE_REPO = 'raiseready-child-template';
const TEMPLATE_BRANCH = 'main';

// Files/folders to exclude when copying from template
const EXCLUDED_PATHS = [
  '.git',
  '.venv',
  '.idea',
  'node_modules',
  '.next',
  '.env',
  '.env.local',
  '__pycache__',
];

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';
type PlatformMode = 'screening' | 'coaching';

interface ExtractedBranding {
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
    base64?: string | null;
    favicon?: string | null;
  };
  thesis: {
    focusAreas: string[];
    sectors: string[];
    stages?: string[];
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

interface AdminInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface CreateGithubRequest {
  repoName: string;
  branding: ExtractedBranding;
  companyName: string;
  admin?: AdminInfo;
  platformMode?: PlatformMode;
}

interface TreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: CreateGithubRequest = await request.json();
    const { repoName, branding, companyName, admin, platformMode = 'screening' } = body;

    if (!repoName || !branding) {
      return NextResponse.json(
        { error: 'Missing required fields: repoName, branding' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GITHUB_TOKEN not configured' },
        { status: 500 }
      );
    }

    const headers = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    console.log(`[create-github] Starting for: ${repoName}`);

    // ========================================================================
    // STEP 1: Create the new repository
    // ========================================================================
    console.log(`[create-github] Creating repository...`);

    const createRepoResponse = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: repoName,
        description: `${companyName || branding.company.name} - AI-Powered Pitch Coaching Platform`,
        private: false,
        auto_init: false,
      }),
    });

    let owner = TEMPLATE_OWNER;

    if (!createRepoResponse.ok) {
      const error = await createRepoResponse.json();
      if (!error.message?.includes('already exists')) {
        throw new Error(`Failed to create repository: ${error.message}`);
      }
      console.log(`[create-github] Repository already exists, will update...`);
    } else {
      const repoData = await createRepoResponse.json();
      owner = repoData.owner?.login || TEMPLATE_OWNER;
    }

    // ========================================================================
    // STEP 1.5: Initialize empty repository with bootstrap commit
    // ========================================================================
    console.log(`[create-github] Checking if repository needs initialization...`);

    await new Promise(r => setTimeout(r, 1000));

    const checkBranchResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/main`,
      { headers }
    );

    if (!checkBranchResponse.ok) {
      console.log(`[create-github] Repository is empty, creating bootstrap commit...`);

      const bootstrapResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repoName}/contents/.gitkeep`,
        {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Initialize repository',
            content: Buffer.from('# Generated platform\n').toString('base64'),
          }),
        }
      );

      if (!bootstrapResponse.ok) {
        const err = await bootstrapResponse.json();
        console.error(`[create-github] Bootstrap failed:`, err);
        throw new Error(`Failed to initialize repository: ${err.message}`);
      }

      console.log(`[create-github] Repository initialized with bootstrap commit`);
      await new Promise(r => setTimeout(r, 500));
    } else {
      console.log(`[create-github] Repository already has commits, skipping bootstrap`);
    }

    // ========================================================================
    // STEP 2: Fetch template repository tree
    // ========================================================================
    console.log(`[create-github] Fetching template from ${TEMPLATE_OWNER}/${TEMPLATE_REPO}...`);

    const treeResponse = await fetch(
      `${GITHUB_API}/repos/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/git/trees/${TEMPLATE_BRANCH}?recursive=1`,
      { headers }
    );

    if (!treeResponse.ok) {
      throw new Error(`Failed to fetch template: ${treeResponse.statusText}`);
    }

    const treeData = await treeResponse.json();
    const templateTree: TreeItem[] = treeData.tree;

    console.log(`[create-github] Found ${templateTree.length} items in template`);

    // ========================================================================
    // STEP 3: Filter and fetch file contents
    // ========================================================================
    const filesToCreate: { path: string; content: string }[] = [];
    let processedCount = 0;

    for (const item of templateTree) {
      if (item.type !== 'blob') continue;
      if (EXCLUDED_PATHS.some(excluded => item.path.startsWith(excluded))) continue;
      if (item.size && item.size > 1000000) continue;

      try {
        const blobResponse = await fetch(item.url, { headers });
        if (!blobResponse.ok) continue;

        const blobData = await blobResponse.json();
        let content: string;

        try {
          content = Buffer.from(blobData.content, 'base64').toString('utf-8');
        } catch {
          continue;
        }

        // Customize config/client.ts with branding
        if (item.path === 'config/client.ts') {
          content = generateClientConfig(branding, admin, platformMode);
        }

        // Customize package.json name
        if (item.path === 'package.json') {
          content = customizePackageJson(content, repoName, companyName || branding.company.name);
        }

        filesToCreate.push({ path: item.path, content });
        processedCount++;

        if (processedCount % 20 === 0) {
          console.log(`[create-github] Processed ${processedCount} files...`);
        }
      } catch (err) {
        console.warn(`[create-github] Skipped ${item.path}: ${err}`);
      }
    }

    console.log(`[create-github] Total files to create: ${filesToCreate.length}`);

    // ========================================================================
    // STEP 4: Create blobs for all files
    // ========================================================================
    console.log(`[create-github] Creating blobs...`);

    const treeItems: { path: string; mode: string; type: string; sha: string }[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < filesToCreate.length; i += BATCH_SIZE) {
      const batch = filesToCreate.slice(i, i + BATCH_SIZE);

      const blobPromises = batch.map(async (file) => {
        try {
          const blobResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/blobs`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: Buffer.from(file.content).toString('base64'),
              encoding: 'base64',
            }),
          });

          if (!blobResponse.ok) {
            console.warn(`[create-github] Failed to create blob for ${file.path}`);
            return null;
          }

          const blobData = await blobResponse.json();
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha,
          };
        } catch (err) {
          console.warn(`[create-github] Error creating blob for ${file.path}: ${err}`);
          return null;
        }
      });

      const results = await Promise.all(blobPromises);
      treeItems.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));

      if (i + BATCH_SIZE < filesToCreate.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    console.log(`[create-github] Created ${treeItems.length} blobs`);

    // ========================================================================
    // STEP 5: Create tree
    // ========================================================================
    console.log(`[create-github] Creating tree...`);

    const createTreeResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/trees`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tree: treeItems }),
    });

    if (!createTreeResponse.ok) {
      const err = await createTreeResponse.json();
      throw new Error(`Failed to create tree: ${err.message}`);
    }

    const newTree = await createTreeResponse.json();

    // ========================================================================
    // STEP 6: Create commit
    // ========================================================================
    console.log(`[create-github] Creating commit...`);

    let parentSha: string | undefined;
    const headResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/main`,
      { headers }
    );
    if (headResponse.ok) {
      const headData = await headResponse.json();
      parentSha = headData.object?.sha;
    }

    const createCommitResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/commits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Initial setup: ${companyName || branding.company.name} platform\n\nGenerated from raiseready-child-template`,
        tree: newTree.sha,
        parents: parentSha ? [parentSha] : [],
      }),
    });

    if (!createCommitResponse.ok) {
      const err = await createCommitResponse.json();
      throw new Error(`Failed to create commit: ${err.message}`);
    }

    const newCommit = await createCommitResponse.json();

    // ========================================================================
    // STEP 7: Update main branch reference
    // ========================================================================
    console.log(`[create-github] Updating main branch...`);

    const updateRefResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommit.sha, force: true }),
    });

    if (!updateRefResponse.ok) {
      const createRefResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/refs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: 'refs/heads/main',
          sha: newCommit.sha,
        }),
      });

      if (!createRefResponse.ok) {
        const err = await createRefResponse.json();
        throw new Error(`Failed to create/update ref: ${err.message}`);
      }
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[create-github] ✅ Complete in ${duration}s`);

    return NextResponse.json({
      success: true,
      repository: {
        name: repoName,
        owner,
        url: `https://github.com/${owner}/${repoName}`,
        cloneUrl: `https://github.com/${owner}/${repoName}.git`,
      },
      stats: {
        filesCreated: treeItems.length,
        duration: `${duration}s`,
      },
    });

  } catch (error) {
    console.error('[create-github] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: 'github-creation',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER: Customize package.json
// ============================================================================

function customizePackageJson(content: string, repoName: string, companyName: string): string {
  try {
    const pkg = JSON.parse(content);
    pkg.name = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    pkg.description = `${companyName} - AI-Powered Pitch Coaching Platform`;
    return JSON.stringify(pkg, null, 2);
  } catch {
    return content;
  }
}

// ============================================================================
// HELPER: Generate client config - COMPLETE VERSION WITH LANDING
// ============================================================================

function generateClientConfig(
  branding: ExtractedBranding,
  admin?: AdminInfo,
  platformMode: PlatformMode = 'screening'
): string {
  const { company, colors, logo, thesis, contact, platformType } = branding;
  const isImpact = platformType === 'impact_investor';
  const companyName = escapeString(company.name);
  const tagline = escapeString(company.tagline || '');

  return `// config/client.ts
// ============================================================================
// CLIENT CONFIGURATION - Auto-generated by Setup Wizard
// ============================================================================

export const clientConfig = {
  // ==========================================================================
  // PLATFORM TYPE
  // ==========================================================================
  platformType: "${platformType}" as 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider',
  platformMode: "${platformMode}" as 'screening' | 'coaching',

  // ==========================================================================
  // COMPANY INFORMATION
  // ==========================================================================
  company: {
    name: "${companyName}",
    legalName: "${companyName}",
    tagline: "${tagline}",
    description: "${escapeString(company.description || '')}",
    website: "${company.website || ''}",
    platformUrl: "",
    supportEmail: "${contact.email || ''}",
    salesEmail: "${contact.email || ''}",
    social: {
      linkedin: "${contact.linkedin || ''}",
      twitter: "",
      youtube: "",
    },
    logo: {
      light: "/logo-light.svg",
      dark: "/logo-dark.svg",
      favicon: "/favicon.ico",
    },
  },

  // ==========================================================================
  // ADMIN USER
  // ==========================================================================
  admin: {
    firstName: "${escapeString(admin?.firstName || '')}",
    lastName: "${escapeString(admin?.lastName || '')}",
    email: "${admin?.email || ''}",
    phone: "${admin?.phone || ''}",
    position: "CEO",
    linkedIn: "",
  },

  // ==========================================================================
  // OFFICE LOCATIONS
  // ==========================================================================
  offices: [
    {
      city: "Brisbane",
      country: "Australia",
      address: "Brisbane, Queensland",
      phone: "${admin?.phone || ''}",
      isPrimary: true,
    },
  ],

  // ==========================================================================
  // THEME & BRANDING
  // ==========================================================================
  theme: {
    mode: "dark" as "dark" | "light",
    colors: {
      primary: "${colors.primary || '#8B5CF6'}",
      primaryHover: "${colors.primary || '#7C3AED'}",
      accent: "${colors.accent || '#10B981'}",
      accentHover: "${colors.accent || '#059669'}",
      background: "${colors.background || '#0F172A'}",
      surface: "#1E293B",
      text: "${colors.text || '#F8FAFC'}",
      textMuted: "#94A3B8",
      border: "#334155",
      gradient: { from: "${colors.primary || '#8B5CF6'}", via: "${colors.background || '#0F172A'}", to: "${colors.accent || '#10B981'}" },
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
    },
    gradients: {
      hero: "from-purple-600 via-violet-700 to-indigo-800",
      button: "from-purple-500 to-violet-600",
      card: "from-slate-800 to-slate-900",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
    },
    borderRadius: "0.5rem",
  },

  // ==========================================================================
  // LANDING PAGE CONTENT
  // ==========================================================================
  landing: {
    hero: {
      headline: "Perfect Your Pitch with ${companyName}",
      subHeadline: "${tagline || 'AI-powered coaching to help founders tell their story and connect with aligned investors.'}",
      ctaText: "Start Your Pitch",
      ctaLink: "/signup/founder",
      secondaryCtaText: "For Investors",
      secondaryCtaLink: "/signup/investor",
    },
    stats: [
      { value: "500+", label: "Founders Coached" },
      { value: "$50M+", label: "Capital Raised" },
      { value: "85%", label: "Pitch Improvement" },
      { value: "24h", label: "Response Time" },
    ],
    valueProps: [
      {
        icon: "Brain",
        title: "AI Pitch Analysis",
        description: "Get instant feedback on your pitch deck from our AI coaching system.",
      },
      {
        icon: "Target",
        title: "Investor Alignment",
        description: "Match with investors whose thesis aligns with your business.",
      },
      {
        icon: "TrendingUp",
        title: "Track Progress",
        description: "Watch your pitch scores improve over time with actionable insights.",
      },
      {
        icon: "Mic",
        title: "Voice Coaching",
        description: "Practice your pitch with AI and get real-time feedback on delivery.",
      },
      {
        icon: "Users",
        title: "Expert Matching",
        description: "Connect with investors who understand your market.",
      },
      {
        icon: "Shield",
        title: "Investor Ready Score",
        description: "Know exactly where you stand before you pitch.",
      },
    ],
    howItWorks: [
      {
        step: "1",
        title: "Submit Your Pitch",
        description: "Upload your deck and tell us about your business.",
      },
      {
        step: "2",
        title: "Get AI Coaching",
        description: "Receive detailed analysis and improvement recommendations.",
      },
      {
        step: "3",
        title: "Practice & Improve",
        description: "Use voice coaching to perfect your delivery.",
      },
      {
        step: "4",
        title: "Connect",
        description: "When ready, get introduced to aligned investors.",
      },
    ],
  },

  // ==========================================================================
  // INVESTMENT THESIS
  // ==========================================================================
  thesis: {
    focusAreas: ${JSON.stringify(thesis.focusAreas || ['Technology', 'Healthcare', 'Climate'])},
    sectors: ${JSON.stringify(thesis.sectors || ['Technology', 'Healthcare', 'FinTech'])},
    stages: ${JSON.stringify(thesis.stages || ['Pre-Seed', 'Seed', 'Series A'])},
    geographies: ["Global", "Asia-Pacific", "North America", "Europe"],
    ticketSize: {
      min: "$100K",
      max: "$2M",
      sweet: "$500K",
    },
    philosophy: "${escapeString(thesis.philosophy || '')}",
    idealFounder: "${escapeString(thesis.idealFounder || '')}",
    scoringFocus: "${isImpact ? 'impact' : 'growth'}" as "storytelling" | "impact" | "growth",
    scoringCriteria: [
      { key: "problem_clarity", label: "Problem Clarity", weight: 0.10 },
      { key: "solution_clarity", label: "Solution Clarity", weight: 0.10 },
      { key: "market_opportunity", label: "Market Opportunity", weight: 0.08 },
      { key: "business_model", label: "Business Model", weight: 0.10 },
      { key: "traction", label: "Traction & Validation", weight: 0.08 },
      { key: "team", label: "Team & Execution", weight: 0.08 },
      { key: "financials", label: "Financial Projections", weight: 0.06 },
      { key: "ask_clarity", label: "Ask & Use of Funds", weight: 0.06 },
      { key: "sdg_alignment", label: "SDG Alignment", weight: ${isImpact ? '0.12' : '0.08'} },
      { key: "impact_measurability", label: "Impact Measurability", weight: ${isImpact ? '0.12' : '0.08'} },
      { key: "theory_of_change", label: "Theory of Change", weight: 0.05 },
      { key: "storytelling", label: "Storytelling", weight: 0.05 },
    ],
    welcomeMessages: {
      discovery: "Welcome to ${companyName} Story Discovery! I'll help you uncover the compelling narrative behind your startup.",
      practice: "Ready to practice your pitch? I'll give you real-time feedback to sharpen your delivery.",
      simulation: "Let's simulate an investor meeting. I'll play different investor types to prepare you.",
    },
  },

  // ==========================================================================
  // COACHING
  // ==========================================================================
  coaching: {
    coachName: "Maya",
    coachPersonality: "friendly and supportive",
    voiceId: "",
    agentId: "",
  },

  // ==========================================================================
  // PLATFORM SETTINGS
  // ==========================================================================
  platform: {
    urlPrefix: "portal",
    adminRole: "portal_admin",
    features: {
      voiceCoaching: true,
      investorMatching: ${platformType !== 'founder_service_provider'},
      deckVersioning: true,
      teamMembers: false,
      analytics: true,
      apiAccess: false,
      sdgScoring: ${isImpact},
      impactMetrics: ${isImpact},
      blendedReturns: ${isImpact},
    },
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
    autoReplyTemplate: \`
Thank you for submitting your pitch to ${companyName}!

We've received your deck and our AI coaching system is analyzing it now.
You'll receive your initial feedback within 24 hours.

Best regards,
The ${companyName} Team
    \`,
  },

  // ==========================================================================
  // FOOTER CONTENT
  // ==========================================================================
  footer: {
    description: "${tagline || 'AI-powered pitch coaching platform.'}",
    serviceLinks: [
      { label: "For Founders", href: "/signup/founder" },
      { label: "For Investors", href: "/signup/investor" },
      { label: "Pricing", href: "/pricing" },
    ],
    companyLinks: [
      { label: "About", href: "/about" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Contact", href: "/contact" },
    ],
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
    copyright: "© {year} ${companyName}. All rights reserved.",
  },

  // ==========================================================================
  // LEGAL & COMPLIANCE
  // ==========================================================================
  legal: {
    privacyUrl: "/privacy",
    termsUrl: "/terms",
    copyrightYear: new Date().getFullYear(),
    complianceRegions: ["GDPR", "CCPA"],
  },

  // ==========================================================================
  // EXTERNAL SERVICE IDS
  // ==========================================================================
  services: {
    supabase: {
      projectId: "",
      url: "",
    },
    vercel: {
      projectId: "",
      deploymentUrl: "",
    },
    elevenlabs: {
      agentId: "",
      voiceId: "",
    },
    anthropic: {},
  },
};

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

export const getCompanyName = () => clientConfig.company.name;

export const getAdminName = () =>
  \`\${clientConfig.admin.firstName} \${clientConfig.admin.lastName}\`;

export const getAdminRole = () => clientConfig.platform.adminRole;

export const getUrlPrefix = () => clientConfig.platform.urlPrefix;

export const getCoachName = () => clientConfig.coaching.coachName;

export const getPortalRoute = (path: string) =>
  \`/\${clientConfig.platform.urlPrefix}\${path}\`;

export const getThemeColor = (color: keyof typeof clientConfig.theme.colors) =>
  clientConfig.theme.colors[color];

export const replaceTemplateVars = (text: string): string => {
  return text
    .replace(/{company}/g, clientConfig.company.name)
    .replace(/{coach}/g, clientConfig.coaching.coachName)
    .replace(/{year}/g, String(clientConfig.legal.copyrightYear))
    .replace(/{admin}/g, getAdminName())
    .replace(/{email}/g, clientConfig.company.supportEmail);
};

export const isFeatureEnabled = (feature: keyof typeof clientConfig.platform.features) =>
  clientConfig.platform.features[feature];

export const getPlatformType = () => clientConfig.platformType;
export const isServiceProvider = () => clientConfig.platformType === 'founder_service_provider';
export const isImpactInvestor = () => clientConfig.platformType === 'impact_investor';
export const isFamilyOffice = () => clientConfig.platformType === 'family_office';
export const isCommercialInvestor = () => clientConfig.platformType === 'commercial_investor';
export const hasInvestorMatching = () =>
  clientConfig.platform.features.investorMatching && !isServiceProvider();
export const hasSDGScoring = () =>
  isImpactInvestor() && clientConfig.platform.features.sdgScoring;
export const isScreeningMode = () => clientConfig.platformMode === 'screening';
export const isCoachingMode = () => clientConfig.platformMode === 'coaching';

export type ClientConfig = typeof clientConfig;
export default clientConfig;
`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
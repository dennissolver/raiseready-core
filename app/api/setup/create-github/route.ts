// app/api/setup/create-github/route.ts
// ============================================================================
// GITHUB REPOSITORY CREATION - Pulls from raiseready-child-template
//
// REFACTORED: No more hardcoded files. Pulls from template repo and only
// customizes config/client.ts with branding.
//
// FIX: Added Step 1.5 to bootstrap empty repos before using Git Data API
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
    // GitHub's Git Data API (blobs, trees, commits) requires at least one commit.
    // The "create or update file contents" API uniquely works on empty repos.

    console.log(`[create-github] Checking if repository needs initialization...`);

    // Small delay to ensure repo is ready after creation
    await new Promise(r => setTimeout(r, 1000));

    // Check if repo is empty by trying to get the main branch
    const checkBranchResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/main`,
      { headers }
    );

    if (!checkBranchResponse.ok) {
      console.log(`[create-github] Repository is empty, creating bootstrap commit...`);

      // Repo is empty - create initial commit using contents API (works on empty repos)
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

      // Small delay to ensure commit is processed
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
      // Skip directories
      if (item.type !== 'blob') continue;

      // Skip excluded paths
      if (EXCLUDED_PATHS.some(excluded => item.path.startsWith(excluded))) continue;

      // Skip large binary files
      if (item.size && item.size > 1000000) continue;

      try {
        // Fetch file content
        const blobResponse = await fetch(item.url, { headers });
        if (!blobResponse.ok) continue;

        const blobData = await blobResponse.json();
        let content: string;

        try {
          content = Buffer.from(blobData.content, 'base64').toString('utf-8');
        } catch {
          // Skip binary files that can't be decoded
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

        // Progress logging every 20 files
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

    // Process in batches to avoid rate limits
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

      // Small delay between batches
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
    // STEP 6: Create commit (with parent from bootstrap)
    // ========================================================================
    console.log(`[create-github] Creating commit...`);

    // Get the current HEAD to use as parent
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
    console.log(`[create-github] Setting up main branch...`);

    // Since we bootstrapped, the ref should exist - try updating first
    const updateRefResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: newCommit.sha, force: true }),
    });

    if (!updateRefResponse.ok) {
      // Fallback: try creating the ref
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
        throw new Error(`Failed to update ref: ${err.message}`);
      }
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    const duration = Date.now() - startTime;
    console.log(`[create-github] SUCCESS: ${owner}/${repoName} (${duration}ms)`);

    return NextResponse.json({
      success: true,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      repoName: repoName,
      owner: owner,
      filesCreated: treeItems.length,
      templateSource: `${TEMPLATE_OWNER}/${TEMPLATE_REPO}`,
      duration,
    });

  } catch (error: any) {
    console.error(`[create-github] ERROR: ${error.message}`);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'create-github',
    version: 'v2-template-based',
    templateRepo: `${TEMPLATE_OWNER}/${TEMPLATE_REPO}`,
  });
}

// ============================================================================
// HELPER: Customize package.json
// ============================================================================

function customizePackageJson(original: string, repoName: string, companyName: string): string {
  try {
    const pkg = JSON.parse(original);
    pkg.name = repoName;
    pkg.description = `${companyName} - AI-Powered Pitch Coaching Platform`;
    return JSON.stringify(pkg, null, 2);
  } catch {
    return original;
  }
}

// ============================================================================
// HELPER: Generate config/client.ts with branding
// ============================================================================

function generateClientConfig(
  branding: ExtractedBranding,
  admin?: AdminInfo,
  platformMode: PlatformMode = 'screening'
): string {
  const company = branding.company;
  const colors = branding.colors;
  const thesis = branding.thesis;
  const contact = branding.contact;
  const platformType = branding.platformType || 'commercial_investor';

  const adminFirst = admin?.firstName || 'Admin';
  const adminLast = admin?.lastName || '';
  const adminEmail = admin?.email || contact.email || 'admin@example.com';
  const adminPhone = admin?.phone || contact.phone || '';

  const isImpact = platformType === 'impact_investor';

  return `// config/client.ts
// ============================================================================
// CLIENT CONFIGURATION - Generated for ${company.name}
// Generated: ${new Date().toISOString()}
// ============================================================================

export const clientConfig = {
  // Platform Type
  platformType: '${platformType}' as 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider',
  platformMode: '${platformMode}' as 'screening' | 'coaching',

  // Company Information
  company: {
    name: "${escapeString(company.name)}",
    legalName: "${escapeString(company.name)}",
    tagline: "${escapeString(company.tagline || 'AI-Powered Pitch Coaching')}",
    description: "${escapeString(company.description || `${company.name} helps founders perfect their pitch.`)}",
    website: "${escapeString(company.website || '')}",
    platformUrl: "${escapeString(company.website || '')}",
    supportEmail: "${escapeString(contact.email || adminEmail)}",
    salesEmail: "${escapeString(adminEmail)}",
    social: {
      linkedin: "${escapeString(contact.linkedin || '')}",
      twitter: "",
      youtube: "",
    },
    logo: {
      light: "${escapeString(branding.logo.url || '/logo-light.svg')}",
      dark: "${escapeString(branding.logo.url || '/logo-dark.svg')}",
      favicon: "/favicon.ico",
    },
  },

  // Admin User
  admin: {
    firstName: "${escapeString(adminFirst)}",
    lastName: "${escapeString(adminLast)}",
    email: "${escapeString(adminEmail)}",
    phone: "${escapeString(adminPhone)}",
    position: "Administrator",
    linkedIn: "",
  },

  // Office Locations
  offices: [
    {
      city: "Remote",
      country: "Global",
      address: "",
      phone: "${escapeString(adminPhone)}",
      isPrimary: true,
    },
  ],

  // Theme & Branding
  theme: {
    mode: "dark" as "dark" | "light",
    colors: {
      primary: "${colors.primary || '#8B5CF6'}",
      primaryHover: "${adjustColor(colors.primary || '#8B5CF6', -10)}",
      accent: "${colors.accent || '#10B981'}",
      accentHover: "${adjustColor(colors.accent || '#10B981', -10)}",
      background: "${colors.background || '#0F172A'}",
      surface: "#1E293B",
      text: "${colors.text || '#F8FAFC'}",
      textMuted: "#94A3B8",
      border: "#334155",
      gradient: { from: "${colors.primary || '#8B5CF6'}", via: "#0F172A", to: "${colors.accent || '#10B981'}" },
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

  // Landing Page
  landing: {
    hero: {
      headline: "Perfect Your Pitch",
      subHeadline: "${escapeString(company.tagline || 'AI-powered coaching to help founders tell their story.')}",
      ctaText: "Start Your Pitch",
      ctaLink: "/signup/founder",
      secondaryCtaText: "For Investors",
      secondaryCtaLink: "/signup/investor",
    },
    stats: [
      { value: "500+", label: "Founders Coached" },
      { value: "$50M+", label: "Capital Raised" },
      { value: "85%", label: "Pitch Improvement" },
    ],
    valueProps: [
      { icon: "Brain", title: "AI Pitch Analysis", description: "Get instant feedback on your pitch deck." },
      { icon: "Target", title: "Investor Alignment", description: "Match with investors who share your vision." },
      { icon: "Mic", title: "Voice Coaching", description: "Practice your pitch with AI feedback." },
    ],
    howItWorks: [
      { step: "1", title: "Submit Your Pitch", description: "Upload your deck." },
      { step: "2", title: "Get AI Coaching", description: "Receive detailed analysis." },
      { step: "3", title: "Practice & Improve", description: "Refine with voice coaching." },
      { step: "4", title: "Connect", description: "Get matched with investors." },
    ],
  },

  // Investment Thesis
  thesis: {
    focusAreas: ${JSON.stringify(thesis.focusAreas || ['Technology', 'Healthcare', 'Climate'])},
    sectors: ${JSON.stringify(thesis.sectors || ['Technology', 'Healthcare', 'FinTech'])},
    stages: ${JSON.stringify(thesis.stages || ['Pre-Seed', 'Seed', 'Series A'])},
    geographies: ["Global"],
    ticketSize: { min: "$100K", max: "$2M" },
    philosophy: "${escapeString(thesis.philosophy || '')}",
    idealFounder: "${escapeString(thesis.idealFounder || '')}",
    scoringFocus: "${isImpact ? 'impact' : 'growth'}" as "storytelling" | "impact" | "growth",
    scoringCriteria: [
      { key: "problem_clarity", label: "Problem Clarity", weight: 0.12 },
      { key: "solution_clarity", label: "Solution Clarity", weight: 0.12 },
      { key: "market_opportunity", label: "Market Opportunity", weight: 0.10 },
      { key: "business_model", label: "Business Model", weight: 0.12 },
      { key: "traction", label: "Traction", weight: 0.10 },
      { key: "team", label: "Team", weight: 0.10 },
      { key: "financials", label: "Financials", weight: 0.08 },
      { key: "ask_clarity", label: "Ask Clarity", weight: 0.08 },
      { key: "storytelling", label: "Storytelling", weight: 0.10 },
      { key: "${isImpact ? 'sdg_alignment' : 'growth_potential'}", label: "${isImpact ? 'SDG Alignment' : 'Growth Potential'}", weight: 0.08 },
    ],
    welcomeMessages: {
      discovery: "Welcome! I'll help you uncover your compelling narrative.",
      practice: "Ready to practice your pitch? Let's refine your delivery.",
      simulation: "Let's simulate an investor meeting.",
    },
  },

  // Coaching Settings
  coaching: {
    coachName: "Alex",
    coachPersonality: "Supportive and strategic pitch coach",
  },

  // Platform Settings
  platform: {
    urlPrefix: "portal",
    adminRole: "portal_admin",
    features: {
      voiceCoaching: true,
      investorMatching: true,
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
    autoReplyTemplate: \`Thank you for submitting your pitch to ${escapeString(company.name)}!

We've received your deck and our AI coaching system is analyzing it now.
You'll receive your initial feedback within 24 hours.

Best regards,
The ${escapeString(company.name)} Team\`,
  },

  // Footer
  footer: {
    description: "${escapeString(company.tagline || 'AI-powered pitch coaching platform.')}",
    serviceLinks: [
      { label: "For Founders", href: "/signup/founder" },
      { label: "For Investors", href: "/signup/investor" },
    ],
    companyLinks: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
    copyright: "© {year} ${escapeString(company.name)}",
  },

  // Legal
  legal: {
    privacyUrl: "/privacy",
    termsUrl: "/terms",
    copyrightYear: new Date().getFullYear(),
    complianceRegions: ["GDPR"],
  },

  // External Services (populated during setup)
  services: {
    supabase: { projectId: "", url: "" },
    vercel: { projectId: "", deploymentUrl: "" },
    elevenlabs: { agentId: "", voiceId: "" },
    anthropic: {},
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getCompanyName = () => clientConfig.company.name;
export const getAdminName = () => \`\${clientConfig.admin.firstName} \${clientConfig.admin.lastName}\`.trim();
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

export const isFeatureEnabled = (feature: keyof typeof clientConfig.platform.features) =>
  clientConfig.platform.features[feature];

// Platform Type Helpers
export const getPlatformType = () => clientConfig.platformType;
export const isServiceProvider = () => clientConfig.platformType === 'founder_service_provider';
export const isImpactInvestor = () => clientConfig.platformType === 'impact_investor';
export const isFamilyOffice = () => clientConfig.platformType === 'family_office';
export const isCommercialInvestor = () => clientConfig.platformType === 'commercial_investor';
export const hasInvestorMatching = () => clientConfig.platform.features.investorMatching && !isServiceProvider();
export const hasSDGScoring = () => isImpactInvestor() && clientConfig.platform.features.sdgScoring;
export const isScreeningMode = () => clientConfig.platformMode === 'screening';
export const isCoachingMode = () => clientConfig.platformMode === 'coaching';

export type ClientConfig = typeof clientConfig;
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

function adjustColor(hex: string, percent: number): string {
  try {
    if (!hex.startsWith('#')) return hex;
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1).toUpperCase();
  } catch {
    return hex;
  }
}
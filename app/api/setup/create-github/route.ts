import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

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
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateGithubRequest = await req.json();
    const { repoName, formData, createdResources } = body;

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'dennissolver';
    const templateRepo = process.env.GITHUB_TEMPLATE_REPO || 'raiseready-template';

    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // Step 1: Create repo from template
    console.log(`Creating GitHub repo: ${repoName} from template ${templateRepo}`);

    const createResponse = await fetch(`${GITHUB_API}/repos/${owner}/${templateRepo}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        owner,
        name: repoName,
        description: `${formData.companyName} Pitch Coaching Platform`,
        private: true, // Or false based on preference
        include_all_branches: false,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('GitHub create error:', error);
      return NextResponse.json({ error: `Failed to create repo: ${error}` }, { status: 500 });
    }

    const repo = await createResponse.json();
    console.log('Repo created:', repo.full_name);

    // Wait for repo to be ready
    await sleep(3000);

    // Step 2: Generate and update config/client.ts
    const clientConfig = generateClientConfig(formData, createdResources, repoName);
    
    // Get the current file to get its SHA (required for update)
    const getFileResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/contents/config/client.ts`,
      { headers }
    );

    let fileSha = '';
    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      fileSha = fileData.sha;
    }

    // Update the file
    const updateResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/contents/config/client.ts`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Configure platform for ${formData.companyName}`,
          content: Buffer.from(clientConfig).toString('base64'),
          sha: fileSha || undefined,
        }),
      }
    );

    if (!updateResponse.ok) {
      console.warn('Failed to update client.ts, continuing anyway');
    }

    // Step 3: Remove /setup route from client repo (or disable it)
    // We do this by updating the setup page to redirect
    const setupPageContent = `'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  return null;
}`;

    const getSetupResponse = await fetch(
      `${GITHUB_API}/repos/${owner}/${repoName}/contents/app/setup/page.tsx`,
      { headers }
    );

    if (getSetupResponse.ok) {
      const setupData = await getSetupResponse.json();
      await fetch(
        `${GITHUB_API}/repos/${owner}/${repoName}/contents/app/setup/page.tsx`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: 'Disable setup route for client platform',
            content: Buffer.from(setupPageContent).toString('base64'),
            sha: setupData.sha,
          }),
        }
      );
    }

    return NextResponse.json({
      success: true,
      repoUrl: repo.html_url,
      repoFullName: repo.full_name,
      cloneUrl: repo.clone_url,
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
  const urlPrefix = repoName.replace('-pitch', '');
  
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
    social: {
      linkedin: "",
      twitter: "",
      youtube: "",
    },
    logo: {
      light: "/logo-light.svg",
      dark: "/logo-dark.svg",
      favicon: "/favicon.ico",
    },
  },

  admin: {
    firstName: "${formData.adminFirstName}",
    lastName: "${formData.adminLastName}",
    email: "${formData.adminEmail}",
    phone: "${formData.adminPhone || ''}",
    position: "Managing Partner",
    linkedIn: "",
  },

  offices: [
    {
      city: "Office",
      country: "",
      address: "",
      phone: "${formData.companyPhone}",
      isPrimary: true,
    },
  ],

  theme: {
    mode: "dark" as "dark" | "light",
    colors: {
      primary: "${formData.extractedColors?.primary || '#3B82F6'}",
      primaryHover: "${adjustColor(formData.extractedColors?.primary || '#3B82F6', -20)}",
      accent: "${formData.extractedColors?.accent || '#10B981'}",
      accentHover: "${adjustColor(formData.extractedColors?.accent || '#10B981', -20)}",
      background: "${formData.extractedColors?.background || '#0F172A'}",
      surface: "#1E293B",
      text: "#F8FAFC",
      textMuted: "#94A3B8",
      border: "#334155",
      gradient: { 
        from: "${formData.extractedColors?.primary || '#3B82F6'}", 
        via: "${formData.extractedColors?.background || '#0F172A'}", 
        to: "${formData.extractedColors?.accent || '#10B981'}" 
      },
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
    },
    gradients: {
      hero: "from-blue-600 to-purple-600",
      button: "from-blue-500 to-blue-600",
      card: "from-slate-800 to-slate-900",
    },
    fonts: {
      heading: "Inter",
      body: "Inter",
    },
    borderRadius: "0.5rem",
  },

  landing: {
    hero: {
      headline: "Perfect Your Pitch",
      subHeadline: "AI-powered coaching to help you nail your investor presentation",
      ctaText: "Get Started",
      ctaLink: "/signup/founder",
      secondaryCtaText: "Learn More",
      secondaryCtaLink: "#how-it-works",
    },
    stats: [
      { value: "500+", label: "Founders Coached" },
      { value: "$2B+", label: "Capital Raised" },
      { value: "85%", label: "Success Rate" },
      { value: "50+", label: "Countries" },
    ],
    valueProps: [
      {
        icon: "Brain",
        title: "AI-Powered Coaching",
        description: "Get personalized feedback on your pitch deck and presentation skills.",
      },
      {
        icon: "Target",
        title: "Investor Matching",
        description: "Connect with investors who match your stage, sector, and geography.",
      },
      {
        icon: "TrendingUp",
        title: "Track Progress",
        description: "Monitor your readiness score and improvement over time.",
      },
    ],
    howItWorks: [
      { step: 1, title: "Upload Your Deck", description: "Submit your pitch deck for AI analysis." },
      { step: 2, title: "Get Coached", description: "Receive personalized feedback and practice with AI." },
      { step: 3, title: "Meet Investors", description: "Get matched with relevant investors when ready." },
    ],
  },

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

  coaching: {
    coachName: "${formData.agentName}",
    coachPersonality: "${formData.voiceType}",
    voiceAgentId: "${resources.elevenlabsAgentId || ''}",
    scoringFocus: "storytelling" as "storytelling" | "impact" | "growth",
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
      discovery: \`Welcome! I'm ${formData.agentName}, and I'll help you uncover the compelling narrative behind your startup.\`,
      practice: \`Ready to practice? I'm ${formData.agentName}, and I'll give you real-time feedback to sharpen your pitch.\`,
      simulation: \`Let's simulate an investor meeting. I'll play different investor types to prepare you for the real thing.\`,
    },
  },

  platform: {
    urlPrefix: "${urlPrefix}",
    adminRole: "portal_admin",
    features: {
      voiceCoaching: true,
      investorMatching: true,
      deckVersioning: true,
      teamMembers: false,
      analytics: true,
      apiAccess: false,
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
Thank you for submitting your pitch to ${formData.companyName}!

We've received your deck and our AI coaching system is analyzing it now.
You'll receive your initial feedback within 24 hours.

Best regards,
The ${formData.companyName} Team
    \`,
  },

  footer: {
    description: "AI-powered pitch coaching platform",
    serviceLinks: [
      { label: "For Founders", href: "/signup/founder" },
      { label: "For Investors", href: "/login" },
    ],
    companyLinks: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
    copyright: "© {year} ${formData.companyName}. All rights reserved.",
  },

  legal: {
    privacyUrl: "/privacy",
    termsUrl: "/terms",
    copyrightYear: new Date().getFullYear(),
    complianceRegions: ["GDPR", "CCPA"],
  },

  services: {
    supabase: {
      projectId: "${resources.supabaseProjectId || ''}",
      url: "${resources.supabaseUrl || ''}",
    },
    vercel: {
      projectId: "",
      deploymentUrl: "https://${repoName}.vercel.app",
    },
    elevenlabs: {
      agentId: "${resources.elevenlabsAgentId || ''}",
      voiceId: "",
    },
    anthropic: {},
  },
};

// Helper exports
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

function adjustColor(hex: string, percent: number): string {
  // Simple color adjustment - darken or lighten
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

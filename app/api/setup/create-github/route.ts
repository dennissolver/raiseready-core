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

    // Step 1: Check if repo already exists
    console.log(`Checking for existing repo: ${owner}/${repoName}`);
    
    const checkResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}`, { headers });
    
    let repoUrl = '';
    let repoFullName = '';
    let repoExists = false;

    if (checkResponse.ok) {
      const existingRepo = await checkResponse.json();
      console.log(`Repo already exists: ${existingRepo.html_url}`);
      repoUrl = existingRepo.html_url;
      repoFullName = existingRepo.full_name;
      repoExists = true;
    } else {
      // Step 2: Create repo from template
      console.log(`Creating GitHub repo: ${repoName} from template ${templateRepo}`);

      const createResponse = await fetch(`${GITHUB_API}/repos/${owner}/${templateRepo}/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          owner,
          name: repoName,
          description: `${formData.companyName} Pitch Coaching Platform`,
          private: true,
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
      repoUrl = repo.html_url;
      repoFullName = repo.full_name;

      // Wait for repo to initialize
      await sleep(5000);
    }

    // Step 3: Update config/client.ts to trigger Vercel deploy
    console.log('Updating config to trigger deployment...');
    
    const clientConfig = generateClientConfig(formData, createdResources, repoName);
    
    // Get current file SHA
    let attempts = 0;
    let fileUpdated = false;
    
    while (attempts < 5 && !fileUpdated) {
      attempts++;
      await sleep(2000);
      
      try {
        const getFileResponse = await fetch(
          `${GITHUB_API}/repos/${owner}/${repoName}/contents/config/client.ts`,
          { headers }
        );

        if (getFileResponse.ok) {
          const fileData = await getFileResponse.json();
          
          const updateResponse = await fetch(
            `${GITHUB_API}/repos/${owner}/${repoName}/contents/config/client.ts`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                message: `Configure platform for ${formData.companyName}`,
                content: Buffer.from(clientConfig).toString('base64'),
                sha: fileData.sha,
              }),
            }
          );

          if (updateResponse.ok) {
            console.log('Config updated - this will trigger Vercel deployment');
            fileUpdated = true;
          } else {
            console.warn('Update attempt failed, retrying...');
          }
        }
      } catch (err) {
        console.warn(`Attempt ${attempts} failed:`, err);
      }
    }

    if (!fileUpdated) {
      console.warn('Could not update config file - manual push may be needed');
    }

    return NextResponse.json({
      success: true,
      repoUrl,
      repoFullName,
      cloneUrl: `https://github.com/${owner}/${repoName}.git`,
      configUpdated: fileUpdated,
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
      primary: "${formData.extractedColors?.primary || '#3B82F6'}",
      primaryHover: "#2563EB",
      accent: "${formData.extractedColors?.accent || '#10B981'}",
      accentHover: "#059669",
      background: "${formData.extractedColors?.background || '#0F172A'}",
      surface: "#1E293B",
      text: "#F8FAFC",
      textMuted: "#94A3B8",
      border: "#334155",
      gradient: { from: "${formData.extractedColors?.primary || '#3B82F6'}", via: "#0F172A", to: "${formData.extractedColors?.accent || '#10B981'}" },
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
// app/api/setup/create-github/route.ts
// ============================================================================
// GITHUB REPOSITORY CREATION - Creates RaiseReady White-Label Platform
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

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

interface CreateGithubRequest {
  repoName: string;
  branding: ExtractedBranding;
  admin?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  platformMode?: PlatformMode;
  supabase?: {
    projectId: string;
    url: string;
  };
  elevenlabs?: {
    agentId: string;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'example.com';
  }
}

function adjustColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1).toUpperCase();
  } catch {
    return hex;
  }
}

function escapeString(str: string): string {
  return (str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// ============================================================================
// CLIENT CONFIG GENERATOR
// ============================================================================

function generateClientConfig(branding: ExtractedBranding, admin: any, platformMode: PlatformMode): string {
  const isImpact = branding.platformType === 'impact_investor';
  const isServiceProvider = branding.platformType === 'founder_service_provider';
  const isFamilyOffice = branding.platformType === 'family_office';

  const scoringFocus = isImpact ? 'impact' : isServiceProvider ? 'storytelling' : 'growth';

  const features = {
    voiceCoaching: true,
    investorMatching: !isServiceProvider && platformMode === 'screening',
    deckVersioning: true,
    teamMembers: false,
    analytics: true,
    apiAccess: false,
    sdgScoring: isImpact,
    impactMetrics: isImpact,
    blendedReturns: isImpact,
    valuesScoring: isFamilyOffice,
    clientPortfolio: isServiceProvider,
  };

  const coachPersonalities: Record<PlatformType, string> = {
    impact_investor: 'A supportive but direct pitch coach with deep experience in impact investing. Maya helps founders articulate their impact thesis clearly and practice their delivery with confidence.',
    commercial_investor: 'A sharp, results-focused pitch coach who has helped hundreds of founders raise capital. Maya provides actionable feedback to sharpen your pitch and maximize investor interest.',
    family_office: 'An experienced advisor who understands the nuances of family office investing. Maya helps founders present their vision in a way that resonates with values-driven investors.',
    founder_service_provider: 'A supportive mentor who helps founders at every stage of their journey. Maya provides encouragement while pushing founders to refine their story and presentation.',
  };

  const headlines: Record<PlatformType, string> = {
    impact_investor: `Perfect Your Impact Pitch`,
    commercial_investor: `Get Investor-Ready`,
    family_office: `Connect with Aligned Investors`,
    founder_service_provider: `AI-Powered Pitch Coaching`,
  };

  const subheadlines: Record<PlatformType, string> = {
    impact_investor: 'AI-powered coaching to help impact founders tell their story, prove their thesis, and connect with aligned investors.',
    commercial_investor: 'AI-powered pitch coaching to help founders sharpen their story, validate their market, and raise capital.',
    family_office: 'AI-powered preparation to help founders present their vision to values-aligned investors.',
    founder_service_provider: 'Get personalized AI coaching to perfect your pitch deck, refine your story, and become investor-ready.',
  };

  const defaultFocusAreas: Record<PlatformType, string[]> = {
    impact_investor: ['Climate Tech', 'Financial Inclusion', 'Healthcare Access', 'Education', 'Sustainable Agriculture'],
    commercial_investor: ['SaaS', 'Fintech', 'Healthcare', 'Enterprise Software', 'Consumer Tech'],
    family_office: ['Technology', 'Real Estate', 'Healthcare', 'Consumer', 'Industrial'],
    founder_service_provider: ['Early Stage Startups', 'First-Time Founders', 'Technical Founders', 'Growth Stage'],
  };

  const defaultSectors: Record<PlatformType, string[]> = {
    impact_investor: ['CleanTech', 'FinTech', 'HealthTech', 'EdTech', 'AgTech'],
    commercial_investor: ['Software', 'Fintech', 'Healthcare', 'AI/ML', 'Marketplace'],
    family_office: ['Technology', 'Real Estate', 'Healthcare', 'Consumer', 'Industrial'],
    founder_service_provider: ['Technology', 'Services', 'Consumer', 'B2B', 'Deep Tech'],
  };

  const defaultPhilosophy: Record<PlatformType, string> = {
    impact_investor: 'We believe the best investments create both financial returns and measurable positive impact.',
    commercial_investor: 'We back exceptional founders building category-defining companies with strong unit economics.',
    family_office: 'We invest in founders who share our values and build businesses that stand the test of time.',
    founder_service_provider: 'We help founders at every stage of their journey, from idea to investor-ready.',
  };

  const focusAreas = branding.thesis.focusAreas?.length ? branding.thesis.focusAreas : defaultFocusAreas[branding.platformType];
  const sectors = branding.thesis.sectors?.length ? branding.thesis.sectors : defaultSectors[branding.platformType];
  const philosophy = branding.thesis.philosophy || defaultPhilosophy[branding.platformType];

  return `// config/client.ts
// Generated by RaiseReady Setup Wizard
// Platform: ${branding.company.name}
// Type: ${branding.platformType}
// Generated: ${new Date().toISOString()}

export const clientConfig = {
  platformType: '${branding.platformType}' as 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider',
  platformMode: '${platformMode}' as 'screening' | 'coaching',

  company: {
    name: "${escapeString(branding.company.name)}",
    tagline: "${escapeString(branding.company.tagline)}",
    description: "${escapeString(branding.company.description)}",
    website: "${branding.company.website}",
    supportEmail: "${branding.contact.email || 'support@' + extractDomain(branding.company.website)}",
    logo: {
      url: ${branding.logo.url ? `"${branding.logo.url}"` : 'null'},
      favicon: "/favicon.ico",
    },
  },

  admin: {
    firstName: "${escapeString(admin?.firstName || 'Admin')}",
    lastName: "${escapeString(admin?.lastName || 'User')}",
    email: "${admin?.email || branding.contact.email || ''}",
    phone: "${admin?.phone || branding.contact.phone || ''}",
  },

  theme: {
    colors: {
      primary: "${branding.colors.primary}",
      primaryHover: "${adjustColor(branding.colors.primary, -10)}",
      accent: "${branding.colors.accent}",
      accentHover: "${adjustColor(branding.colors.accent, -10)}",
      background: "${branding.colors.background}",
      surface: "${adjustColor(branding.colors.background, 10)}",
      text: "${branding.colors.text}",
      textMuted: "${adjustColor(branding.colors.text, -30)}",
      border: "${adjustColor(branding.colors.background, 20)}",
      success: "#22C55E",
      warning: "#F59E0B",
      error: "#EF4444",
    },
  },

  landing: {
    headline: "${escapeString(headlines[branding.platformType])}",
    subHeadline: "${escapeString(subheadlines[branding.platformType])}",
    ctaText: "Start Your Pitch",
    ctaLink: "/signup/founder",
  },

  thesis: {
    focusAreas: ${JSON.stringify(focusAreas)},
    sectors: ${JSON.stringify(sectors)},
    stages: ["Pre-Seed", "Seed", "Series A"],
    philosophy: "${escapeString(philosophy)}",
  },

  coaching: {
    coachName: "Maya",
    coachPersonality: "${escapeString(coachPersonalities[branding.platformType])}",
    scoringFocus: "${scoringFocus}" as 'storytelling' | 'impact' | 'growth',
  },

  features: ${JSON.stringify(features, null, 4)},
};

export const getCompanyName = () => clientConfig.company.name;
export const getCoachName = () => clientConfig.coaching.coachName;
export const isFeatureEnabled = (feature: keyof typeof clientConfig.features) => clientConfig.features[feature];
export const isImpactInvestor = () => clientConfig.platformType === 'impact_investor';
export const isServiceProvider = () => clientConfig.platformType === 'founder_service_provider';

export type ClientConfig = typeof clientConfig;
`;
}

// ============================================================================
// TEMPLATE FILES - All essential files for a working Next.js app
// ============================================================================

function getTemplateFiles(branding: ExtractedBranding, admin: any, platformMode: PlatformMode): Record<string, string> {
  const clientConfig = generateClientConfig(branding, admin, platformMode);

  return {
    // ========================================================================
    // ROOT CONFIG FILES
    // ========================================================================
    'package.json': `{
  "name": "raiseready-platform",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.460.0",
    "next": "15.1.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.2.3",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20.17.6",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3"
  }
}`,

    'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};
module.exports = nextConfig;`,

    'tsconfig.json': `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,

    'tailwind.config.ts': `import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;`,

    'postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,

    '.gitignore': `node_modules
.next
.env*.local
.env
.vercel
*.tsbuildinfo
next-env.d.ts`,

    '.env.example': `NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=`,

    // ========================================================================
    // CONFIG
    // ========================================================================
    'config/client.ts': clientConfig,

    // ========================================================================
    // LIB UTILITIES
    // ========================================================================
    'lib/utils.ts': `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,

    'lib/supabase/client.ts': `import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}`,

    'lib/supabase/server.ts': `import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}`,

    // ========================================================================
    // APP DIRECTORY - CRITICAL FOR NEXT.JS BUILD
    // ========================================================================
    'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222 47% 6%;
    --foreground: 210 40% 98%;
    --card: 222 47% 8%;
    --card-foreground: 210 40% 98%;
    --primary: 262 83% 58%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;
    --accent: 160 84% 39%;
    --accent-foreground: 210 40% 98%;
    --border: 217 33% 17%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`,

    'app/layout.tsx': `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { clientConfig } from '@/config/client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: clientConfig.company.name,
  description: clientConfig.company.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}`,

    'app/page.tsx': `import Link from 'next/link';
import { clientConfig } from '@/config/client';
import { ArrowRight, Brain, Mic, Target, Users, Shield, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const { company, landing, theme, features } = clientConfig;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {company.name.charAt(0)}
            </div>
            <span className="font-semibold text-lg">{company.name}</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-slate-400 hover:text-white transition">
              Sign In
            </Link>
            <Link 
              href="/signup/founder"
              className="px-4 py-2 rounded-lg text-white transition"
              style={{ backgroundColor: theme.colors.primary }}
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            {landing.headline}
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            {landing.subHeadline}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href={landing.ctaLink}
              className="px-8 py-3 rounded-lg text-white font-medium flex items-center gap-2 transition hover:opacity-90"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {landing.ctaText}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 rounded-lg border border-slate-700 text-white font-medium hover:bg-slate-800 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title="AI Pitch Analysis"
              description="Get instant, comprehensive feedback on your pitch deck from our AI coach."
              color={theme.colors.primary}
            />
            <FeatureCard
              icon={<Mic className="w-8 h-8" />}
              title="Voice Coaching"
              description="Practice your pitch with AI and get real-time feedback on your delivery."
              color={theme.colors.accent}
            />
            <FeatureCard
              icon={<Target className="w-8 h-8" />}
              title="Get Investor Ready"
              description="Track your progress and know exactly when you're ready to pitch."
              color={theme.colors.primary}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Perfect Your Pitch?</h2>
          <p className="text-slate-400 mb-8">
            Join hundreds of founders who have improved their pitches with {company.name}.
          </p>
          <Link
            href="/signup/founder"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-medium transition hover:opacity-90"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Start Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {company.name.charAt(0)}
            </div>
            <span className="text-slate-400">{company.name}</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>
          <p className="text-sm text-slate-500">
            (c) {new Date().getFullYear()} {company.name}. Powered by RaiseReady.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
      <div 
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: color + '20', color }}
      >
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}`,

    // ========================================================================
    // AUTH PAGES
    // ========================================================================
    'app/login/page.tsx': `'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clientConfig } from '@/config/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement Supabase auth
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4"
            style={{ backgroundColor: clientConfig.theme.colors.primary }}
          >
            {clientConfig.company.name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-2">Sign in to {clientConfig.company.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-medium transition disabled:opacity-50"
            style={{ backgroundColor: clientConfig.theme.colors.primary }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link href="/signup/founder" className="text-purple-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}`,

    'app/signup/founder/page.tsx': `'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clientConfig } from '@/config/client';

export default function FounderSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement Supabase auth
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4"
            style={{ backgroundColor: clientConfig.theme.colors.primary }}
          >
            {clientConfig.company.name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 mt-2">Start your pitch coaching journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              placeholder="John Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              placeholder="Create a password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-medium transition disabled:opacity-50"
            style={{ backgroundColor: clientConfig.theme.colors.primary }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}`,

    // ========================================================================
    // FOUNDER DASHBOARD
    // ========================================================================
    'app/founder/dashboard/page.tsx': `import { clientConfig } from '@/config/client';
import { Upload, MessageSquare, Mic, FileEdit, CheckCircle } from 'lucide-react';

export default function FounderDashboard() {
  const journey = [
    { id: 'upload', label: 'Upload Deck', icon: Upload, complete: false },
    { id: 'profile', label: 'Complete Profile', icon: CheckCircle, complete: false },
    { id: 'discovery', label: 'Story Discovery', icon: MessageSquare, complete: false },
    { id: 'refine', label: 'Refine Materials', icon: FileEdit, complete: false },
    { id: 'practice', label: 'Practice Pitch', icon: Mic, complete: false },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{clientConfig.company.name}</h1>
          <span className="text-slate-400">Founder Dashboard</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome, Founder!</h2>
          <p className="text-slate-400">Complete your journey to become investor-ready.</p>
        </div>

        <div className="space-y-4">
          {journey.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ 
                    backgroundColor: step.complete 
                      ? clientConfig.theme.colors.accent + '20'
                      : clientConfig.theme.colors.primary + '20',
                    color: step.complete 
                      ? clientConfig.theme.colors.accent
                      : clientConfig.theme.colors.primary,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{step.label}</div>
                  <div className="text-sm text-slate-500">Step {index + 1}</div>
                </div>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={{ 
                    backgroundColor: clientConfig.theme.colors.primary,
                    color: 'white',
                  }}
                >
                  {step.complete ? 'Review' : 'Start'}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}`,

    // ========================================================================
    // SIMPLE PAGES
    // ========================================================================
    'app/privacy/page.tsx': `import { clientConfig } from '@/config/client';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-invert">
          <p className="text-slate-400">
            {clientConfig.company.name} is committed to protecting your privacy.
            This policy outlines how we collect, use, and protect your information.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-4">Information We Collect</h2>
          <p className="text-slate-400">
            We collect information you provide directly, including your name, email,
            and pitch deck materials when you use our platform.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
          <p className="text-slate-400">
            Your information is used to provide AI coaching services, improve our
            platform, and communicate with you about your account.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-4">Contact</h2>
          <p className="text-slate-400">
            Questions? Contact us at {clientConfig.company.supportEmail}
          </p>
        </div>
      </div>
    </div>
  );
}`,

    'app/terms/page.tsx': `import { clientConfig } from '@/config/client';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-invert">
          <p className="text-slate-400">
            By using {clientConfig.company.name}, you agree to these terms of service.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-4">Use of Service</h2>
          <p className="text-slate-400">
            Our AI coaching platform is provided to help founders improve their pitch
            materials and presentation skills. You retain ownership of all materials
            you upload.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-4">Acceptable Use</h2>
          <p className="text-slate-400">
            You agree not to misuse our services or help anyone else do so.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-4">Contact</h2>
          <p className="text-slate-400">
            Questions? Contact us at {clientConfig.company.supportEmail}
          </p>
        </div>
      </div>
    </div>
  );
}`,

    // ========================================================================
    // README
    // ========================================================================
    'README.md': `# ${branding.company.name}

AI-Powered Pitch Coaching Platform

## Platform Type
${branding.platformType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Features
- Pitch Deck Upload & Analysis
- AI Coaching (Maya)
- Voice Coaching
- Progress Tracking
${branding.platformType !== 'founder_service_provider' ? '- Investor Matching\n' : ''}${branding.platformType === 'impact_investor' ? '- SDG Impact Scoring\n' : ''}

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

---
Powered by RaiseReady
`,
  };
}

// ============================================================================
// GITHUB API HELPERS
// ============================================================================

async function pushFileToRepo(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  headers: HeadersInit
): Promise<boolean> {
  try {
    // Check if file exists
    const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
    let sha: string | undefined;
    if (checkRes.ok) {
      sha = (await checkRes.json()).sha;
    }

    // Push file
    const body: any = {
      message,
      content: Buffer.from(content).toString('base64'),
    };
    if (sha) body.sha = sha;

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error(`Failed to push ${path}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error pushing ${path}:`, error);
    return false;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: CreateGithubRequest = await request.json();
    const { repoName, branding, admin, platformMode = 'screening' } = body;

    if (!repoName || !branding) {
      return NextResponse.json(
        { error: 'Repository name and branding required' },
        { status: 400 }
      );
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!token) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    // Sanitize repo name
    const safeName = repoName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };

    // Check if repo exists
    console.log('Checking for existing repo:', safeName);
    const checkRes = await fetch(`${GITHUB_API}/repos/${owner}/${safeName}`, { headers });

    if (checkRes.ok) {
      console.log('Repo already exists:', safeName);
      return NextResponse.json({
        success: true,
        repoUrl: `https://github.com/${owner}/${safeName}`,
        repoName: safeName,
        alreadyExists: true,
      });
    }

    // Create new repo (without auto_init to avoid conflicts)
    console.log('Creating repo:', safeName);
    const createRes = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: safeName,
        description: `${branding.company.name} - AI Pitch Coaching Platform`,
        private: false,
        auto_init: false, // Don't auto-init, we'll push files
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      return NextResponse.json(
        { error: error.message || 'Failed to create repository' },
        { status: 400 }
      );
    }

    // Wait for repo to be ready
    console.log('Repo created, waiting for initialization...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate all template files
    const templateFiles = getTemplateFiles(branding, admin, platformMode);

    // Push all files
    console.log(`Pushing ${Object.keys(templateFiles).length} template files...`);
    let successCount = 0;
    let failCount = 0;

    for (const [path, content] of Object.entries(templateFiles)) {
      const success = await pushFileToRepo(
        owner,
        safeName,
        path,
        content,
        `Add ${path}`,
        headers
      );

      if (success) {
        successCount++;
        console.log(`  [OK] ${path}`);
      } else {
        failCount++;
        console.log(`  [FAIL] ${path}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Pushed ${successCount} files, ${failCount} failed`);

    if (successCount === 0) {
      return NextResponse.json(
        { error: 'Failed to push any files to repository' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      repoUrl: `https://github.com/${owner}/${safeName}`,
      repoName: safeName,
      filesCreated: successCount,
      filesFailed: failCount,
    });

  } catch (error: any) {
    console.error('Create GitHub error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create repository' },
      { status: 500 }
    );
  }
}
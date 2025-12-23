// app/api/setup/create-github/route.ts
// CONNEXIONS-STYLE: All template files embedded directly - no template repo needed
import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';

interface CreateGithubRequest {
  repoName?: string;
  platformName?: string;
  platformType?: PlatformType;
  formData?: {
    platformName?: string;
    companyName?: string;
    companyWebsite?: string;
    companyEmail?: string;
    adminFirstName?: string;
    adminLastName?: string;
    adminEmail?: string;
    extractedColors?: {
      primary?: string;
      accent?: string;
      background?: string;
    };
    investmentThesis?: string;
    platformType?: PlatformType;
  };
  createdResources?: {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    supabaseServiceKey?: string;
    elevenlabsAgentId?: string;
  };
}

// ============================================================================
// TEMPLATE FILES - These get pushed to every child repo
// ============================================================================

const TEMPLATE_FILES: Record<string, string> = {
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
    "@anthropic-ai/sdk": "^0.71.2",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.0",
    "@radix-ui/react-scroll-area": "^1.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-tooltip": "^1.1.2",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.460.0",
    "next": "15.0.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-dropzone": "^14.2.3",
    "recharts": "^2.12.7",
    "resend": "^4.0.0",
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

  'next.config.js': `// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
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

  'tailwind.config.ts': `import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "#ffffff",
        },
        background: "var(--color-background)",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;`,

  'postcss.config.mjs': `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;`,

  '.gitignore': `# Dependencies
/node_modules
/.pnp
.pnp.js

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts`,

  '.env.example': `# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key

# Voice Coaching (optional)
ELEVENLABS_API_KEY=your-elevenlabs-key
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your-agent-id

# Email (optional)
RESEND_API_KEY=your-resend-key`,

  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #3B82F6;
  --color-accent: #10B981;
  --color-background: #0F172A;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
  --radius: 0.5rem;
}

body {
  background-color: var(--color-background);
  color: #F8FAFC;
}

@layer base {
  * { @apply border-border; }
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
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
}`,

  'lib/utils.ts': `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,

  'components/ui/button.tsx': `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };`,

  'components/ui/card.tsx': `import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };`,

  'components/ui/input.tsx': `import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };`,

  'components/ui/label.tsx': `"use client";
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };`,

  'components/ui/textarea.tsx': `import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };`,

  'app/layout.tsx': `import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { clientConfig } from '@/config/client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: clientConfig.company.name,
  description: clientConfig.platform.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}`,

  'app/page.tsx': `import Link from 'next/link';
import { clientConfig } from '@/config/client';
import { ArrowRight, Upload, MessageSquare, Users, Target, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const { company, platform, theme } = clientConfig;
  const primaryColor = theme.colors.primary;
  const accentColor = theme.colors.accent;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold" style={{ color: primaryColor }}>
            {company.name}
          </div>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{ backgroundColor: primaryColor, color: '#fff' }}
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          {platform.tagline}
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          {platform.description}
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-semibold transition"
          style={{ backgroundColor: primaryColor, color: '#fff' }}
        >
          Get Started <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Features */}
      <section className="border-t border-slate-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Upload, title: 'Upload Your Deck', desc: 'Submit your pitch deck for AI analysis' },
              { icon: MessageSquare, title: 'Get AI Coaching', desc: 'Receive personalized feedback and guidance' },
              { icon: Target, title: 'Match & Connect', desc: 'Connect with aligned investors' },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6 rounded-xl border border-slate-800 bg-slate-900/50">
                <feature.icon className="w-12 h-12 mx-auto mb-4" style={{ color: accentColor }} />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-slate-400 mb-8">
            Join founders who are raising smarter with AI-powered pitch coaching.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-semibold transition"
            style={{ backgroundColor: accentColor, color: '#fff' }}
          >
            Create Your Account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} {company.name}. Powered by RaiseReady.
        </div>
      </footer>
    </div>
  );
}`,

  'app/(auth)/login/page.tsx': `'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { clientConfig } from '@/config/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: clientConfig.theme.colors.background }}>
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{clientConfig.company.name}</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-4">
            Don't have an account? <Link href="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}`,

  'app/(auth)/signup/page.tsx': `'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { clientConfig } from '@/config/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: clientConfig.theme.colors.background }}>
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join {clientConfig.company.name}</CardTitle>
          <CardDescription>Create your account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-4">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}`,

  'app/(auth)/callback/route.ts': `import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(\`\${origin}\${next}\`);
    }
  }

  return NextResponse.redirect(\`\${origin}/login?error=auth_error\`);
}`,

  'app/dashboard/page.tsx': `import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { clientConfig } from '@/config/client';
import Link from 'next/link';
import { Upload, FileText, MessageSquare, TrendingUp, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: decks } = await supabase
    .from('pitch_decks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen" style={{ backgroundColor: clientConfig.theme.colors.background }}>
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold" style={{ color: clientConfig.theme.colors.primary }}>
            {clientConfig.company.name}
          </div>
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-slate-400 mb-8">{user.email}</p>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Link href="/upload">
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition cursor-pointer h-full">
              <CardHeader>
                <Upload className="w-8 h-8 mb-2" style={{ color: clientConfig.theme.colors.primary }} />
                <CardTitle>Upload Deck</CardTitle>
                <CardDescription>Submit a new pitch deck for analysis</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/coaching">
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition cursor-pointer h-full">
              <CardHeader>
                <MessageSquare className="w-8 h-8 mb-2" style={{ color: clientConfig.theme.colors.accent }} />
                <CardTitle>AI Coaching</CardTitle>
                <CardDescription>Get personalized pitch feedback</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/progress">
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition cursor-pointer h-full">
              <CardHeader>
                <TrendingUp className="w-8 h-8 mb-2 text-purple-400" />
                <CardTitle>Track Progress</CardTitle>
                <CardDescription>View your improvement over time</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Recent Decks */}
        <h2 className="text-xl font-semibold mb-4">Recent Uploads</h2>
        {decks && decks.length > 0 ? (
          <div className="space-y-4">
            {decks.map((deck: any) => (
              <Card key={deck.id} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                    <div>
                      <p className="font-medium">{deck.title || 'Untitled Deck'}</p>
                      <p className="text-sm text-slate-400">
                        {new Date(deck.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {deck.score && (
                    <div className="text-2xl font-bold" style={{ color: clientConfig.theme.colors.accent }}>
                      {deck.score}/100
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <p className="text-slate-400">No pitch decks yet. Upload your first one!</p>
              <Link href="/upload">
                <Button className="mt-4" style={{ backgroundColor: clientConfig.theme.colors.primary }}>
                  Upload Deck
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}`,

  'app/api/auth/signout/route.ts': `import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'));
}`,

  'middleware.ts': `import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/upload/:path*', '/coaching/:path*'],
};`,
};

// ============================================================================
// DYNAMIC CONFIG FILE GENERATOR
// ============================================================================

function generateClientConfig(
  platformName: string,
  companyName: string,
  platformType: PlatformType,
  colors: { primary: string; accent: string; background: string },
  investmentThesis?: string
) {
  const platformDescriptions: Record<PlatformType, { tagline: string; description: string }> = {
    impact_investor: {
      tagline: 'AI-Powered Impact Investment Screening',
      description: 'Connect with mission-aligned founders creating measurable social and environmental impact.',
    },
    commercial_investor: {
      tagline: 'AI-Powered Deal Flow Screening',
      description: 'Efficiently screen and qualify founders for your investment thesis.',
    },
    family_office: {
      tagline: 'AI-Powered Founder Screening',
      description: 'Identify exceptional founders aligned with your investment philosophy.',
    },
    founder_service_provider: {
      tagline: 'AI-Powered Pitch Coaching',
      description: 'Help your clients become investor-ready with AI-powered pitch preparation.',
    },
  };

  const { tagline, description } = platformDescriptions[platformType] || platformDescriptions.commercial_investor;

  return `// config/client.ts
// Auto-generated for ${companyName}
export const clientConfig = {
  platform: {
    name: "${platformName}",
    tagline: "${tagline}",
    description: "${description}",
    type: "${platformType}" as const,
    version: "1.0.0",
  },
  company: {
    name: "${companyName}",
    website: "",
    supportEmail: "support@example.com",
    investmentThesis: ${investmentThesis ? `"${investmentThesis.replace(/"/g, '\\"')}"` : 'null'},
  },
  theme: {
    mode: "dark" as const,
    colors: {
      primary: "${colors.primary}",
      accent: "${colors.accent}",
      background: "${colors.background}",
    },
  },
  features: {
    enableVoiceCoaching: true,
    enableDeckAnalysis: true,
    enableInvestorMatching: ${platformType !== 'founder_service_provider'},
    enableImpactMetrics: ${platformType === 'impact_investor'},
  },
} as const;

export type ClientConfig = typeof clientConfig;
export type PlatformType = typeof clientConfig.platform.type;
`;
}

function generateReadme(platformName: string, companyName: string, platformType: PlatformType) {
  return `# ${platformName}

AI-Powered Founder Screening Platform for ${companyName}

## Platform Type
${platformType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Features
- **Pitch Deck Analysis**: AI-powered scoring and feedback
- **Founder Coaching**: Interactive AI coaching sessions
- **Progress Tracking**: Monitor improvement over time
${platformType !== 'founder_service_provider' ? '- **Investor Matching**: Connect with aligned opportunities' : ''}
${platformType === 'impact_investor' ? '- **Impact Metrics**: SDG alignment and impact scoring' : ''}

## Getting Started
1. Install dependencies: \`npm install\`
2. Set up environment variables (see .env.example)
3. Run development server: \`npm run dev\`

## Tech Stack
- Next.js 15
- Supabase (Auth & Database)
- Anthropic Claude (AI Analysis)
- ElevenLabs (Voice Coaching)
- Tailwind CSS

---
Powered by RaiseReady
`;
}

// ============================================================================
// GITHUB HELPERS
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
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    // Create or update file
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
      console.error(`Failed to push ${path}:`, await res.text());
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
    const { formData, createdResources } = body;

    const repoName = body.repoName || body.platformName;
    const platformName = body.platformName || formData?.platformName || 'AI Pitch Platform';
    const companyName = formData?.companyName || 'Your Company';
    const platformType = body.platformType || formData?.platformType || 'commercial_investor';
    const investmentThesis = formData?.investmentThesis;

    if (!repoName) {
      return NextResponse.json({ error: 'Repository name required' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'dennissolver';

    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const safeName = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
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

    // Create new repo
    console.log('Creating repo:', safeName);
    const createRes = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: safeName,
        description: `${platformName} - AI Pitch Platform for ${companyName}`,
        private: false,
        auto_init: true,
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      console.error('Failed to create repo:', error);
      return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: 400 });
    }

    console.log('Repo created, waiting for it to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Push all template files
    console.log('Pushing template files...');
    const colors = {
      primary: formData?.extractedColors?.primary || '#3B82F6',
      accent: formData?.extractedColors?.accent || '#10B981',
      background: formData?.extractedColors?.background || '#0F172A',
    };

    // Update globals.css with extracted colors
    const globalsCss = TEMPLATE_FILES['app/globals.css'].replace(
      '--color-primary: #3B82F6',
      `--color-primary: ${colors.primary}`
    ).replace(
      '--color-accent: #10B981',
      `--color-accent: ${colors.accent}`
    ).replace(
      '--color-background: #0F172A',
      `--color-background: ${colors.background}`
    );

    // Push base template files
    for (const [path, content] of Object.entries(TEMPLATE_FILES)) {
      const finalContent = path === 'app/globals.css' ? globalsCss : content;
      console.log(`Pushing ${path}...`);
      await pushFileToRepo(owner, safeName, path, finalContent, `Add ${path}`, headers);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // Generate and push dynamic config
    const clientConfigContent = generateClientConfig(
      platformName,
      companyName,
      platformType,
      colors,
      investmentThesis
    );
    await pushFileToRepo(owner, safeName, 'config/client.ts', clientConfigContent, 'Add client config', headers);

    // Generate and push README
    const readmeContent = generateReadme(platformName, companyName, platformType);
    await pushFileToRepo(owner, safeName, 'README.md', readmeContent, 'Update README', headers);

    console.log('All files pushed successfully!');

    return NextResponse.json({
      success: true,
      repoUrl: `https://github.com/${owner}/${safeName}`,
      repoName: safeName,
    });

  } catch (error: any) {
    console.error('Create GitHub error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create repository' }, { status: 500 });
  }
}
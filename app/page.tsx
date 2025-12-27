// app/page.tsx
// ============================================================================
// UNIFIED LANDING PAGE
// - Master platform (RaiseReady Impact) → Shows 6-type selector
// - White-label deployments → Shows customized landing from clientConfig
// ============================================================================

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Mic, FileText, Target, Sparkles, Brain, TrendingUp,
  Heart, Users, GraduationCap, Zap, Globe, Shield, CheckCircle,
  Rocket, Building2
} from 'lucide-react';
import { clientConfig } from '@/config/client';

// ============================================================================
// MASTER PLATFORM TYPES (6 types)
// ============================================================================

const PLATFORM_TYPES = [
  {
    type: 'impact_investor',
    title: 'Impact Investor',
    subtitle: 'For Impact Funds & ESG Investors',
    description: 'Screen impact founders using SDG alignment and our RealChange Impact Index. Coach founders on impact thesis, theory of change, and blended returns.',
    icon: Heart,
    gradient: 'from-emerald-500 to-teal-600',
    hoverGradient: 'hover:from-emerald-600 hover:to-teal-700',
    features: [
      'SDG Alignment Scoring',
      'Blended Returns Calculator',
      'Impact Thesis Coaching',
      'Theory of Change Analysis',
    ],
    founderType: 'Impact Founders',
    ownerType: 'Impact Investors',
  },
  {
    type: 'commercial_vc',
    title: 'Commercial VC',
    subtitle: 'For VCs, PE & Angel Investors',
    description: 'Screen founders on growth metrics, market opportunity, and unit economics. Coach founders on ARR, traction, and investor-ready financials.',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-violet-600',
    hoverGradient: 'hover:from-purple-600 hover:to-violet-700',
    features: [
      'Growth Metrics Analysis',
      'Financial Health Scoring',
      'Market Fit Assessment',
      'Deal Flow Management',
    ],
    founderType: 'Growth Founders',
    ownerType: 'VCs & Angels',
  },
  {
    type: 'family_office',
    title: 'Family Office',
    subtitle: 'For Patient Capital & Values-Aligned Investing',
    description: 'Screen founders for long-term value creation, mission alignment, and reputation fit. Coach founders on generational thinking and values articulation.',
    icon: Users,
    gradient: 'from-amber-500 to-orange-600',
    hoverGradient: 'hover:from-amber-600 hover:to-orange-700',
    features: [
      'Values Alignment Scoring',
      'Legacy Priority Matching',
      'Long-term Fit Analysis',
      'Reputation Risk Assessment',
    ],
    founderType: 'Mission-Driven Founders',
    ownerType: 'Family Principals',
  },
  {
    type: 'accelerator',
    title: 'Accelerator',
    subtitle: 'For Accelerators & Incubators',
    description: 'Screen applicants for coachability and program fit. Prepare founders for demo day with stage-appropriate pitch coaching and cohort management.',
    icon: Rocket,
    gradient: 'from-blue-500 to-indigo-600',
    hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
    features: [
      'Cohort Management',
      'Coachability Scoring',
      'Demo Day Preparation',
      'Stage-Appropriate Coaching',
    ],
    founderType: 'Program Applicants',
    ownerType: 'Program Directors',
  },
  {
    type: 'corporate_innovation',
    title: 'Corporate Innovation',
    subtitle: 'For Corporate Ventures & Innovation Labs',
    description: 'Screen startups for strategic fit and enterprise readiness. Coach founders on partnership positioning and corporate integration.',
    icon: Building2,
    gradient: 'from-rose-500 to-pink-600',
    hoverGradient: 'hover:from-rose-600 hover:to-pink-700',
    features: [
      'Strategic Fit Analysis',
      'Enterprise Readiness Scoring',
      'Partnership Potential',
      'Integration Assessment',
    ],
    founderType: 'Startup Partners',
    ownerType: 'Innovation Leads',
  },
  {
    type: 'founder_services',
    title: 'Founder Services',
    subtitle: 'For Law Firms, Advisors & Consultancies',
    description: 'Provide AI pitch coaching as a value-add service to your startup clients. Pure coaching and improvement tracking with no investor matching.',
    icon: GraduationCap,
    gradient: 'from-slate-500 to-gray-600',
    hoverGradient: 'hover:from-slate-600 hover:to-gray-700',
    features: [
      'Pitch Quality Scoring',
      'AI Coaching Sessions',
      'Progress Tracking',
      'Client Portfolio Management',
    ],
    founderType: 'Your Startup Clients',
    ownerType: null,
  },
];

// ============================================================================
// MASTER PLATFORM SELECTOR COMPONENT
// ============================================================================

function MasterPlatformSelector() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <span className="text-xl font-bold">RaiseReady</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                Client Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm mb-6">
            <Zap className="w-4 h-4" />
            White-Label AI Pitch Coaching Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Launch Your Branded
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              Founder Coaching Platform
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Deploy a fully customized AI pitch coaching platform in minutes.
            Your branding, your thesis, your founders.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              Isolated Database
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Custom Domain
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Voice Coach
            </div>
          </div>
        </div>
      </section>

      {/* Platform Type Selection */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose Your Platform Type
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Each platform type is optimized for different investment approaches and founder needs.
              Select the one that matches your organization.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLATFORM_TYPES.map((platform) => {
              const Icon = platform.icon;
              return (
                <Link
                  key={platform.type}
                  href={`/setup?type=${platform.type}`}
                  className="group"
                >
                  <div className="h-full p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${platform.gradient} ${platform.hoverGradient} transition-all group-hover:scale-110`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                          {platform.title}
                        </h3>
                        <p className="text-sm text-gray-400">{platform.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                      {platform.description}
                    </p>

                    <div className="grid grid-cols-2 gap-1 mb-4">
                      {platform.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${platform.gradient}`} />
                          {feature}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div className="text-xs text-gray-500">
                        <span className="text-gray-400">{platform.founderType}</span>
                      </div>
                      <span className="text-sm text-purple-400 group-hover:text-purple-300 flex items-center gap-1">
                        Get Started <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Launch in 4 Simple Steps
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              From selection to deployment in under 5 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Choose Type', description: 'Select the platform type that matches your organization', icon: Target },
              { step: '2', title: 'Add Branding', description: 'Enter your company URL and we extract your brand', icon: Sparkles },
              { step: '3', title: 'Deploy', description: 'We create your database, repo, and live platform', icon: Zap },
              { step: '4', title: 'Invite Founders', description: 'Share your platform URL and start screening', icon: Users },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-sm text-purple-400 mb-2">Step {item.step}</div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Launch Your Platform?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join investors who are screening smarter, not harder.
          </p>
          <Link href="#platform-types">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100 px-8">
              Choose Your Platform Type
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="font-bold">RaiseReady</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Global Buildtech Australia × Corporate AI Solutions
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// WHITE-LABEL LANDING (for deployed client platforms)
// ============================================================================

function WhiteLabelLanding() {
  const { company, theme, landing, footer } = clientConfig;
  const { hero, valueProps, howItWorks, stats } = landing || {};
  
  const companyName = company?.name || 'Pitch Coach';
  const tagline = company?.tagline || 'AI-Powered Pitch Coaching';
  const websiteUrl = company?.website || '#';
  const footerDescription = footer?.description || tagline;

  // Theme colors
  const primaryColor = theme?.colors?.primary || '#8B5CF6';
  const accentColor = theme?.colors?.accent || '#10B981';
  const backgroundColor = theme?.colors?.background || '#0F172A';
  const textColor = theme?.colors?.text || '#F8FAFC';
  const textMuted = '#94A3B8';
  const surfaceColor = '#1E293B';
  const borderColor = '#334155';

  // Icons for value props
  const iconMap: Record<string, any> = {
    Brain, Target, TrendingUp, Mic, Users, Shield, FileText, Sparkles,
    Heart, Globe, CheckCircle, Zap, GraduationCap
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor, color: textColor }}>
      {/* Navigation */}
      <nav
        className="fixed top-0 w-full z-50 backdrop-blur-lg"
        style={{ backgroundColor: `${backgroundColor}CC`, borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold" style={{ color: primaryColor }}>
            {companyName}
          </Link>
          <div className="flex items-center gap-4">
            <Link href="#how-it-works" className="text-sm transition-colors" style={{ color: textMuted }}>
              How It Works
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm" style={{ borderColor, color: textColor }}>
                Login
              </Button>
            </Link>
            <Link href="/signup/founder">
              <Button size="sm" style={{ backgroundColor: primaryColor }}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="pt-32 pb-20"
        style={{
          background: `linear-gradient(to bottom right, ${backgroundColor}, ${primaryColor}20, ${backgroundColor})`
        }}
      >
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            {hero?.headline || `Perfect Your Pitch with ${companyName}`}
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto" style={{ color: textMuted }}>
            {hero?.subHeadline || tagline}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href={hero?.ctaLink || '/signup/founder'}>
              <Button size="lg" className="px-8" style={{ backgroundColor: primaryColor }}>
                {hero?.ctaText || 'Start Your Pitch'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href={hero?.secondaryCtaLink || '/signup/investor'}>
              <Button size="lg" variant="outline" className="px-8" style={{ borderColor, color: textColor }}>
                {hero?.secondaryCtaText || 'For Investors'}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      {valueProps && valueProps.length > 0 && (
        <section className="py-20" style={{ backgroundColor: surfaceColor }}>
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Why {companyName}?</h2>
              <p style={{ color: textMuted }}>Everything you need to become investor-ready</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {valueProps.map((prop: any, i: number) => {
                const Icon = iconMap[prop.icon] || Sparkles;
                return (
                  <div key={i} className="p-6 rounded-xl" style={{ backgroundColor, border: `1px solid ${borderColor}` }}>
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: primaryColor }} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{prop.title}</h3>
                    <p style={{ color: textMuted }}>{prop.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      {stats && stats.length > 0 && (
        <section className="py-20" style={{ backgroundColor }}>
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat: any, i: number) => (
                <div key={i}>
                  <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: i === 1 ? primaryColor : textColor }}>
                    {stat.value}
                  </div>
                  <div style={{ color: textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section id="how-it-works" className="py-24" style={{ backgroundColor: surfaceColor }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p style={{ color: textMuted }}>Your journey to becoming investor-ready</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {(howItWorks || [
              { step: '1', title: 'Submit', description: 'Upload your pitch deck' },
              { step: '2', title: 'Analyze', description: 'Get AI-powered feedback' },
              { step: '3', title: 'Practice', description: 'Refine with voice coaching' },
              { step: '4', title: 'Connect', description: 'Match with investors' },
            ]).map((item: any, i: number) => (
              <div key={i} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold"
                  style={{ backgroundColor: primaryColor, color: '#ffffff' }}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm" style={{ color: textMuted }}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: `linear-gradient(to right, ${primaryColor}40, ${primaryColor}20)` }}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to tell your story?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: textMuted }}>
            Join founders who have transformed their pitches with {companyName}.
          </p>
          <Link href="/signup/founder">
            <Button size="lg" className="px-12 py-6 text-lg" style={{ backgroundColor: '#ffffff', color: backgroundColor }}>
              Start Your Journey
              <Sparkles className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16" style={{ backgroundColor: surfaceColor, borderTop: `1px solid ${borderColor}` }}>
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="text-2xl font-bold mb-4">{companyName}</div>
              <p className="text-sm" style={{ color: textMuted }}>{footerDescription}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                {(clientConfig.footer?.serviceLinks || []).map((link: any, i: number) => (
                  <li key={i}>
                    <Link href={link.href} className="transition-colors hover:opacity-80" style={{ color: textMuted }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                {(clientConfig.footer?.companyLinks || []).map((link: any, i: number) => (
                  <li key={i}>
                    <Link href={link.href} className="transition-colors hover:opacity-80" style={{ color: textMuted }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                {(clientConfig.footer?.legalLinks || []).map((link: any, i: number) => (
                  <li key={i}>
                    <Link href={link.href} className="transition-colors hover:opacity-80" style={{ color: textMuted }}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center" style={{ borderTop: `1px solid ${borderColor}` }}>
            <p className="text-sm" style={{ color: textMuted }}>
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-sm transition-colors hover:opacity-80" style={{ color: textMuted }}>
                Privacy Policy
              </Link>
              {websiteUrl && websiteUrl !== '#' && (
                <Link href={websiteUrl} className="text-sm transition-colors hover:opacity-80" style={{ color: textMuted }}>
                  {websiteUrl.replace('https://', '').replace('http://', '')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function HomePage() {
  const isMasterPlatform = clientConfig.company.name === 'RaiseReady Impact';

  if (isMasterPlatform) {
    return <MasterPlatformSelector />;
  }

  return <WhiteLabelLanding />;
}

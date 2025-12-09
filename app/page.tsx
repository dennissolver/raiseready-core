'use client';

import Link from 'next/link';
import {
  Heart, TrendingUp, Users, GraduationCap,
  ArrowRight, Sparkles, Zap, Globe, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// PLATFORM TYPE DEFINITIONS
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
    bgGlow: 'bg-emerald-500/20',
    features: [
      'SDG Alignment Scoring',
      'Blended Returns Calculator',
      'Impact Thesis Coaching',
      'Theory of Change Analysis',
    ],
    founderType: 'Impact Founders',
    investorType: 'Impact Investors',
  },
  {
    type: 'commercial_investor',
    title: 'Commercial VC',
    subtitle: 'For VCs & Growth Investors',
    description: 'Screen founders on growth metrics, market opportunity, and unit economics. Coach founders on ARR, traction, and investor-ready financials.',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-violet-600',
    hoverGradient: 'hover:from-purple-600 hover:to-violet-700',
    bgGlow: 'bg-purple-500/20',
    features: [
      'Growth Metrics Analysis',
      'Financial Health Scoring',
      'Market Fit Assessment',
      'Deal Flow Management',
    ],
    founderType: 'Growth Founders',
    investorType: 'VCs & Angels',
  },
  {
    type: 'family_office',
    title: 'Family Office',
    subtitle: 'For Patient Capital & Values-Aligned Investing',
    description: 'Screen founders for long-term value creation, mission alignment, and reputation fit. Coach founders on generational thinking and values articulation.',
    icon: Users,
    gradient: 'from-blue-500 to-indigo-600',
    hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
    bgGlow: 'bg-blue-500/20',
    features: [
      'Values Alignment Scoring',
      'Legacy Priority Matching',
      'Long-term Fit Analysis',
      'Reputation Risk Assessment',
    ],
    founderType: 'Mission-Driven Founders',
    investorType: 'Family Principals',
  },
  {
    type: 'founder_service_provider',
    title: 'Founder Service Provider',
    subtitle: 'For Law Firms, Accelerators & Consultancies',
    description: 'Provide AI pitch coaching as a value-add service to your startup clients. No investor matching - pure coaching and improvement tracking.',
    icon: GraduationCap,
    gradient: 'from-amber-500 to-orange-600',
    hoverGradient: 'hover:from-amber-600 hover:to-orange-700',
    bgGlow: 'bg-amber-500/20',
    features: [
      'Pitch Quality Scoring',
      'AI Coaching Sessions',
      'Progress Tracking',
      'Client Portfolio Management',
    ],
    founderType: 'Your Startup Clients',
    investorType: null, // No investor side
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function MasterLandingPage() {
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
              <Link href="/setup">
                <Button className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white">
                  Create Platform
                </Button>
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

          <div className="grid md:grid-cols-2 gap-8">
            {PLATFORM_TYPES.map((platform) => {
              const Icon = platform.icon;
              return (
                <Link
                  key={platform.type}
                  href={`/setup?type=${platform.type}`}
                  className="group"
                >
                  <div className="h-full p-8 bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`p-4 rounded-xl bg-gradient-to-br ${platform.gradient} ${platform.hoverGradient} transition-all group-hover:scale-110`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">
                          {platform.title}
                        </h3>
                        <p className="text-gray-400">{platform.subtitle}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-300 mb-6">
                      {platform.description}
                    </p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      {platform.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${platform.gradient}`} />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* User Types */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <span className="px-3 py-1 bg-slate-800 rounded-full text-sm text-gray-300">
                        👤 {platform.founderType}
                      </span>
                      {platform.investorType && (
                        <span className="px-3 py-1 bg-slate-800 rounded-full text-sm text-gray-300">
                          💼 {platform.investorType}
                        </span>
                      )}
                      {!platform.investorType && (
                        <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-sm text-amber-300">
                          Coaching Only
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className={`flex items-center gap-2 text-transparent bg-gradient-to-r ${platform.gradient} bg-clip-text font-semibold group-hover:gap-4 transition-all`}>
                      Create {platform.title} Platform
                      <ArrowRight className={`w-5 h-5 text-gray-400 group-hover:translate-x-2 transition-transform`} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Launch in Minutes, Not Months
            </h2>
            <p className="text-gray-400">
              From selection to live platform in under 10 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Choose Type',
                description: 'Select the platform type that matches your investment approach or service model.',
              },
              {
                step: '2',
                title: 'Enter Details',
                description: 'Add your company info, branding, and we\'ll extract your thesis from your website.',
              },
              {
                step: '3',
                title: 'Configure AI',
                description: 'Set up your AI voice coach personality and scoring criteria.',
              },
              {
                step: '4',
                title: 'Go Live',
                description: 'We create your Supabase, GitHub, Vercel, and ElevenLabs resources automatically.',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                  <span className="text-2xl font-bold">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Gets Created */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What You Get
            </h2>
            <p className="text-gray-400">
              A complete, production-ready platform with everything configured
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Isolated Infrastructure',
                items: ['Dedicated Supabase database', 'Private GitHub repository', 'Vercel deployment', 'Custom domain support'],
              },
              {
                title: 'AI Coaching System',
                items: ['Custom ElevenLabs voice agent', 'Pitch analysis engine', 'Discovery sessions', 'Practice simulations'],
              },
              {
                title: 'Platform Features',
                items: ['Founder portal', 'Investor dashboard', 'Deck upload & analysis', 'Progress tracking'],
              },
            ].map((column, i) => (
              <div key={i} className="p-6 bg-slate-900 rounded-xl border border-slate-800">
                <h3 className="text-xl font-semibold mb-4">{column.title}</h3>
                <ul className="space-y-3">
                  {column.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-purple-900/50 via-slate-900 to-violet-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Launch Your Platform?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Choose your platform type above or go straight to setup.
          </p>
          <Link href="/setup">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white px-8 py-6 text-lg">
              Start Setup Wizard
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-bold">RaiseReady</span>
              <span className="text-gray-500">by Global Buildtech Australia</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
            </div>
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} RaiseReady. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
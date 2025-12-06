// app/page.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, Target, TrendingUp, Mic, FileText, Sparkles, BookOpen, Users } from 'lucide-react';
import { clientConfig } from '@/config';

const iconMap: Record<string, any> = {
  Brain, Target, TrendingUp, Mic, FileText, Sparkles, BookOpen, Users
};

export default function HomePage() {
  const { company, theme, landing, offices, footer } = clientConfig;

  return (
    <div className={theme.mode === 'dark' ? 'min-h-screen bg-black text-white' : 'min-h-screen bg-white text-black'}>
      {/* Navigation */}
      <nav className={theme.mode === 'dark' 
        ? 'fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10'
        : 'fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-black/10'
      }>
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            {company.name}
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href={landing.hero.ctaLink}>
              <Button style={{ backgroundColor: theme.colors.primary }}>
                {landing.hero.ctaText}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {landing.hero.headline}
          </h1>
          <p className={theme.mode === 'dark' ? 'text-xl text-gray-400 mb-8' : 'text-xl text-gray-600 mb-8'}>
            {landing.hero.subHeadline}
          </p>
          <div className="flex gap-4 justify-center">
            <Link href={landing.hero.ctaLink}>
              <Button size="lg" style={{ backgroundColor: theme.colors.primary }}>
                {landing.hero.ctaText}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href={landing.hero.secondaryCtaLink}>
              <Button size="lg" variant="outline">
                {landing.hero.secondaryCtaText}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className={theme.mode === 'dark' ? 'py-16 bg-gray-900/50' : 'py-16 bg-gray-50'}>
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {landing.stats.map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-bold" style={{ color: theme.colors.primary }}>
                  {stat.value}
                </div>
                <div className={theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose {company.name}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {landing.valueProps.map((prop, i) => {
              const Icon = iconMap[prop.icon] || Target;
              return (
                <div key={i} className={theme.mode === 'dark' 
                  ? 'p-6 rounded-xl bg-gray-900 border border-gray-800' 
                  : 'p-6 rounded-xl bg-white border border-gray-200 shadow-sm'
                }>
                  <Icon className="h-12 w-12 mb-4" style={{ color: theme.colors.primary }} />
                  <h3 className="text-xl font-semibold mb-2">{prop.title}</h3>
                  <p className={theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    {prop.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={theme.mode === 'dark' ? 'py-20 px-6 bg-gray-900/50' : 'py-20 px-6 bg-gray-50'}>
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {landing.howItWorks.map((step, i) => (
              <div key={i} className="text-center">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4"
                  style={{ backgroundColor: theme.colors.primary, color: 'white' }}
                >
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className={theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Perfect Your Pitch?</h2>
          <p className={theme.mode === 'dark' ? 'text-gray-400 mb-8' : 'text-gray-600 mb-8'}>
            Join founders who have raised over \ with {company.name}'s AI coaching.
          </p>
          <Link href={landing.hero.ctaLink}>
            <Button size="lg" style={{ backgroundColor: theme.colors.primary }}>
              {landing.hero.ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={theme.mode === 'dark' ? 'py-12 px-6 bg-gray-900 border-t border-gray-800' : 'py-12 px-6 bg-gray-100 border-t border-gray-200'}>
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">{company.name}</h3>
              <p className={theme.mode === 'dark' ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>
                {footer.description}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2">
                {footer.serviceLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className={theme.mode === 'dark' ? 'text-gray-400 hover:text-white text-sm' : 'text-gray-600 hover:text-black text-sm'}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                {footer.companyLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className={theme.mode === 'dark' ? 'text-gray-400 hover:text-white text-sm' : 'text-gray-600 hover:text-black text-sm'}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className={theme.mode === 'dark' ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>
                {company.supportEmail}
              </p>
            </div>
          </div>
          <div className={theme.mode === 'dark' ? 'border-t border-gray-800 pt-8 text-center text-gray-400 text-sm' : 'border-t border-gray-200 pt-8 text-center text-gray-600 text-sm'}>
            © {new Date().getFullYear()} {company.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

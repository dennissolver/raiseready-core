import Link from 'next/link';
import { clientConfig } from '@/config';
import {
  Brain, Target, TrendingUp, Heart, Shield, Clock,
  Mic, Users, Zap, Upload, MessageSquare, CheckCircle,
  ArrowRight, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Icon mapping for dynamic icons from config
const iconMap: Record<string, React.ElementType> = {
  Brain, Target, TrendingUp, Heart, Shield, Clock,
  Mic, Users, Zap, Upload, MessageSquare, CheckCircle,
};

export default function LandingPage() {
  const { landing, company, theme, platformType, platformMode } = clientConfig;
  const isServiceProvider = platformMode === 'coaching';

  // Get gradient classes based on platform type
  const getHeroGradient = () => {
    switch (platformType) {
      case 'impact_investor':
        return 'from-emerald-600 via-green-700 to-teal-800';
      case 'family_office':
        return 'from-indigo-600 via-blue-700 to-slate-800';
      case 'founder_service_provider':
        return 'from-amber-500 via-orange-600 to-red-700';
      default:
        return 'from-purple-600 via-violet-700 to-indigo-800';
    }
  };

  const getAccentColor = () => {
    switch (platformType) {
      case 'impact_investor':
        return 'text-emerald-400';
      case 'family_office':
        return 'text-blue-400';
      case 'founder_service_provider':
        return 'text-amber-400';
      default:
        return 'text-purple-400';
    }
  };

  const getButtonGradient = () => {
    switch (platformType) {
      case 'impact_investor':
        return 'from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700';
      case 'family_office':
        return 'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700';
      case 'founder_service_provider':
        return 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700';
      default:
        return 'from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{company.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href={landing.hero.ctaLink}>
                <Button className={`bg-gradient-to-r ${getButtonGradient()} text-white`}>
                  {landing.hero.ctaText}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`pt-32 pb-20 bg-gradient-to-br ${getHeroGradient()}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            {landing.hero.headline}
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
            {landing.hero.subHeadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={landing.hero.ctaLink}>
              <Button size="lg" className={`bg-gradient-to-r ${getButtonGradient()} text-white px-8 py-6 text-lg`}>
                {landing.hero.ctaText}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href={landing.hero.secondaryCtaLink}>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg">
                {landing.hero.secondaryCtaText}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {landing.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`text-4xl md:text-5xl font-bold ${getAccentColor()} mb-2`}>
                  {stat.value}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {isServiceProvider ? 'How We Help Your Clients' : 'Why Choose Us'}
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {company.description}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {landing.valueProps.map((prop, index) => {
              const Icon = iconMap[prop.icon] || Brain;
              return (
                <div key={index} className="p-6 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getButtonGradient()} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{prop.title}</h3>
                  <p className="text-gray-400">{prop.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400">
              {isServiceProvider
                ? 'Simple process for your founder clients'
                : 'Your path to investor readiness'
              }
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {landing.howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${getButtonGradient()} flex items-center justify-center mb-4`}>
                    <span className="text-2xl font-bold">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
                {index < landing.howItWorks.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-slate-700" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Thesis Section (for investors) */}
      {!isServiceProvider && clientConfig.thesis && (
        <section id="thesis" className="py-20 bg-slate-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {platformType === 'impact_investor' ? 'Our Impact Thesis' :
                 platformType === 'family_office' ? 'Our Values' : 'Investment Thesis'}
              </h2>
            </div>
            <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
              <p className="text-xl text-gray-300 italic mb-8">
                "{clientConfig.thesis.philosophy}"
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className={`font-semibold ${getAccentColor()} mb-2`}>Focus Areas</h4>
                  <ul className="text-gray-400 space-y-1">
                    {clientConfig.thesis.focusAreas.map((area, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className={`font-semibold ${getAccentColor()} mb-2`}>Sectors</h4>
                  <div className="flex flex-wrap gap-2">
                    {clientConfig.thesis.sectors.map((sector, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-sm text-gray-300">
                        {sector}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className={`py-20 bg-gradient-to-br ${getHeroGradient()}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {isServiceProvider
              ? 'Ready to Help Your Clients Succeed?'
              : 'Ready to Perfect Your Pitch?'
            }
          </h2>
          <p className="text-xl text-gray-200 mb-8">
            {isServiceProvider
              ? 'Give your founder clients the coaching advantage they need.'
              : 'Join hundreds of founders who have transformed their investor presentations.'
            }
          </p>
          <Link href={landing.hero.ctaLink}>
            <Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100 px-8 py-6 text-lg font-semibold">
              {landing.hero.ctaText}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">{company.name}</h3>
              <p className="text-gray-400 text-sm">{clientConfig.footer.description}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2">
                {clientConfig.footer.serviceLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-gray-400 hover:text-white text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                {clientConfig.footer.companyLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-gray-400 hover:text-white text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                {clientConfig.footer.legalLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-gray-400 hover:text-white text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-gray-400 text-sm">
            {clientConfig.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  );
}
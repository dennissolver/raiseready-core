// app/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mic, FileText, Target, Sparkles, Brain, TrendingUp } from 'lucide-react';
import { clientConfig } from '@/config/client';

export default function HomePage() {
  // Admin platform - redirect to setup wizard
  if (process.env.IS_ADMIN_PLATFORM === 'true') {
    redirect('/setup');
  }

  // Pull from clientConfig with correct paths
  const companyName = clientConfig.company.name;
  const tagline = clientConfig.company.tagline;
  const websiteUrl = clientConfig.company.website;
  const primaryColor = clientConfig.theme.colors.primary;
  const coachName = clientConfig.coaching.coachName;

  // Landing page specific content
  const heroHeadline = clientConfig.landing.hero.headline;
  const heroSubHeadline = clientConfig.landing.hero.subHeadline;
  const ctaText = clientConfig.landing.hero.ctaText;
  const ctaLink = clientConfig.landing.hero.ctaLink;
  const stats = clientConfig.landing.stats;
  const valueProps = clientConfig.landing.valueProps;
  const howItWorks = clientConfig.landing.howItWorks;

  // Footer
  const footerDescription = clientConfig.footer.description;

  // Icon mapping for value props
  const iconMap: Record<string, React.ReactNode> = {
    Brain: <Brain className="w-7 h-7" style={{ color: primaryColor }} />,
    Target: <Target className="w-7 h-7 text-purple-400" />,
    TrendingUp: <TrendingUp className="w-7 h-7 text-green-400" />,
    FileText: <FileText className="w-7 h-7" style={{ color: primaryColor }} />,
    Mic: <Mic className="w-7 h-7 text-blue-400" />,
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            {companyName}
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href={websiteUrl} className="text-sm text-gray-400 hover:text-white transition">
              About Us
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link href="/signup/founder">
              <Button style={{ backgroundColor: primaryColor }} className="hover:opacity-90 text-white">
                Get Started
              </Button>
            </Link>
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-white/20 text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl">
            <p className="text-gray-400 mb-4 text-lg">{tagline}</p>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              {heroHeadline}
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl">
              {heroSubHeadline}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={ctaLink}>
                <Button size="lg" style={{ backgroundColor: primaryColor }} className="hover:opacity-90 text-white px-8 py-6 text-lg">
                  {ctaText}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Floating stats */}
        {stats.length > 0 && (
          <div className="absolute bottom-20 right-10 hidden lg:block">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="text-4xl font-bold" style={{ color: primaryColor }}>{stats[1]?.value || stats[0]?.value}</div>
              <div className="text-gray-400">{stats[1]?.label || stats[0]?.label}</div>
            </div>
          </div>
        )}
      </section>

      {/* Value Props */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Your Vision.<br />
              Our Expertise.<br />
              <span style={{ color: primaryColor }}>
                Infinite Possibilities.
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {valueProps.map((prop, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-8 border border-white/10 hover:border-white/30 transition">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: `${primaryColor}20` }}>
                  {iconMap[prop.icon] || <Brain className="w-7 h-7" style={{ color: primaryColor }} />}
                </div>
                <h3 className="text-xl font-semibold mb-3">{prop.title}</h3>
                <p className="text-gray-400">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats.length > 0 && (
        <section className="py-20 bg-gray-900">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat, i) => (
                <div key={i}>
                  <div
                    className="text-4xl md:text-5xl font-bold mb-2"
                    style={{ color: i === 1 ? primaryColor : 'white' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Your journey to becoming investor-ready</p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {howItWorks.map((item, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24" style={{ background: `linear-gradient(to right, ${primaryColor}40, ${primaryColor}20)` }}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to tell your story?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join founders who have transformed their pitches and raised successfully with {companyName}.
          </p>
          <Link href="/signup/founder">
            <Button size="lg" className="bg-white text-black hover:bg-gray-200 px-12 py-6 text-lg font-semibold">
              Start Your Journey
              <Sparkles className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-16 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="text-2xl font-bold mb-4">{companyName}</div>
              <p className="text-gray-400 text-sm">{footerDescription}</p>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {clientConfig.footer.serviceLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {clientConfig.footer.companyLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {clientConfig.footer.legalLinks.map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-white">
                Privacy Policy
              </Link>
              <Link href={websiteUrl} className="text-sm text-gray-500 hover:text-white">
                {websiteUrl.replace('https://', '').replace('http://', '')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
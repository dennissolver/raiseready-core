'use client';

import { clientConfig } from '@/config';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FounderSignupPage() {
  const router = useRouter();
  const supabase = createClient();

  // Determine messaging based on platform type
  const isServiceProvider = clientConfig.platformMode === 'coaching';
  const isImpactInvestor = clientConfig.platformType === 'impact_investor';
  const isFamilyOffice = clientConfig.platformType === 'family_office';

  // Platform-specific messaging
  const getWelcomeMessage = () => {
    if (isServiceProvider) {
      return `Get AI-powered coaching from ${clientConfig.company.name} to perfect your investor pitch.`;
    }
    if (isImpactInvestor) {
      return `Submit your impact pitch to ${clientConfig.company.name}. We back founders creating measurable positive change.`;
    }
    if (isFamilyOffice) {
      return `Connect with ${clientConfig.company.name}. We partner with founders who share our commitment to building enduring value.`;
    }
    return `Submit your pitch to ${clientConfig.company.name}. We back exceptional founders building category-defining companies.`;
  };

  const getSubheadline = () => {
    if (isServiceProvider) {
      return 'Start your pitch coaching journey';
    }
    if (isImpactInvestor) {
      return 'Show us your impact thesis';
    }
    if (isFamilyOffice) {
      return 'Share your long-term vision';
    }
    return 'Start perfecting your pitch today';
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Create founder profile if it doesn't exist
        const { error } = await (supabase as any)
          .from('founders' as any)
          .upsert({
            id: session.user.id,
            email: session.user.email,
            created_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (error) {
          console.error('Error creating founder profile:', error);
        }

        // Redirect to founder dashboard
        router.push('/founder/dashboard');
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  // Get theme colors from config
  const primaryColor = clientConfig.theme?.colors?.primary || 'hsl(262, 83%, 58%)';
  const accentColor = clientConfig.theme?.colors?.accent || 'hsl(262, 83%, 45%)';

  // Background gradient based on platform type
  const getBgGradient = () => {
    if (isServiceProvider) {
      return 'from-amber-50 to-orange-100';
    }
    if (isImpactInvestor) {
      return 'from-green-50 to-emerald-100';
    }
    if (isFamilyOffice) {
      return 'from-blue-50 to-indigo-100';
    }
    return 'from-purple-50 to-violet-100';
  };

  const getBannerColors = () => {
    if (isServiceProvider) {
      return 'bg-amber-50 border-amber-200 text-amber-900';
    }
    if (isImpactInvestor) {
      return 'bg-green-50 border-green-200 text-green-900';
    }
    if (isFamilyOffice) {
      return 'bg-blue-50 border-blue-200 text-blue-900';
    }
    return 'bg-purple-50 border-purple-200 text-purple-900';
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${getBgGradient()}`}>
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        {/* Welcome Banner */}
        <div className={`mb-6 p-4 border rounded-lg ${getBannerColors()}`}>
          <p className="text-sm">
            <strong>{clientConfig.company.name}:</strong> {getWelcomeMessage()}
          </p>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
          <p className="text-muted-foreground">{getSubheadline()}</p>
        </div>

        {/* Auth Form */}
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: primaryColor,
                  brandAccent: accentColor,
                }
              }
            }
          }}
          view="sign_up"
          providers={[]}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href="/login" className="text-primary hover:underline">Sign in</a>
        </div>
      </div>
    </div>
  );
}
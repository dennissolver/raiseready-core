'use client';

import { clientConfig } from '@/config';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  // Determine platform type
  const isServiceProvider = clientConfig.platformMode === 'coaching';
  const isImpactInvestor = clientConfig.platformType === 'impact_investor';
  const isFamilyOffice = clientConfig.platformType === 'family_office';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Check user role and redirect appropriately
        const { data: founderData } = await (supabase as any)
          .from('founders')
          .select('id')
          .eq('id', session.user.id)
          .single();

        const { data: investorData } = await (supabase as any)
          .from('investor_profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (founderData) {
          router.push('/founder/dashboard');
        } else if (investorData) {
          router.push('/portal/dashboard');
        } else {
          // Default to founder signup flow
          router.push('/signup/founder');
        }
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
      return 'from-slate-900 to-slate-800';
    }
    if (isImpactInvestor) {
      return 'from-emerald-900 to-slate-900';
    }
    if (isFamilyOffice) {
      return 'from-indigo-900 to-slate-900';
    }
    return 'from-purple-900 to-slate-900';
  };

  const getWelcomeText = () => {
    if (isServiceProvider) {
      return 'Access your pitch coaching portal';
    }
    if (isImpactInvestor) {
      return 'Access your impact investing portal';
    }
    if (isFamilyOffice) {
      return 'Access your family office portal';
    }
    return 'Access your investor portal';
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${getBgGradient()}`}>
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        {/* Logo/Company Name */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{clientConfig.company.name}</h1>
          <p className="text-muted-foreground">{getWelcomeText()}</p>
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
          view="sign_in"
          providers={[]}
        />

        {/* Footer - only show signup link if not service provider admin portal */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isServiceProvider ? (
            <>
              Are you a founder client?{' '}
              <a href="/signup/founder" className="text-primary hover:underline">Create account</a>
            </>
          ) : (
            <>
              New founder?{' '}
              <a href="/signup/founder" className="text-primary hover:underline">Submit your pitch</a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
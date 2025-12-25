// app/(auth)/login/page.tsx
// ============================================================================
// LOGIN PAGE - Single login for all users, redirect based on role
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import {
  clientConfig,
  isServiceProvider,
  isImpactInvestor,
  isFamilyOffice,
  hasInvestorMatching,
  isAdminEmail
} from '@/config';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  // Background gradient based on platform type
  const getBgGradient = () => {
    if (isServiceProvider()) {
      return 'from-amber-50 to-orange-100';
    }
    if (isImpactInvestor()) {
      return 'from-green-50 to-emerald-100';
    }
    if (isFamilyOffice()) {
      return 'from-blue-50 to-indigo-100';
    }
    return 'from-purple-50 to-violet-100';
  };

  const getBannerColors = () => {
    if (isServiceProvider()) {
      return 'bg-amber-50 border-amber-200 text-amber-900';
    }
    if (isImpactInvestor()) {
      return 'bg-green-50 border-green-200 text-green-900';
    }
    if (isFamilyOffice()) {
      return 'bg-blue-50 border-blue-200 text-blue-900';
    }
    return 'bg-purple-50 border-purple-200 text-purple-900';
  };

  // Get theme colors
  const primaryColor = clientConfig.theme?.colors?.primary || '#8B5CF6';
  const accentColor = clientConfig.theme?.colors?.accent || '#10B981';

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        const email = session.user.email;

        // Check if admin
        if (isAdminEmail(email)) {
          router.push('/admin');
          router.refresh();
          return;
        }

        // Check if founder
        const { data: founder } = await supabase
          .from('founders')
          .select('id')
          .eq('email', email)
          .single();

        if (founder) {
          router.push('/founder/dashboard');
          router.refresh();
          return;
        }

        // Check if investor (only if investor matching enabled)
        if (hasInvestorMatching()) {
          const { data: investor } = await supabase
            .from('investor_profiles')
            .select('id')
            .eq('email', email)
            .single();

          if (investor) {
            router.push('/investor/dashboard');
            router.refresh();
            return;
          }
        }

        // Default to founder dashboard (they may need to complete profile)
        router.push('/founder/dashboard');
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${getBgGradient()}`}>
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        {/* Welcome Banner */}
        <div className={`mb-6 p-4 border rounded-lg ${getBannerColors()}`}>
          <p className="text-sm">
            <strong>{clientConfig.company.name}</strong>
          </p>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to continue</p>
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
          redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/signup" className="text-purple-600 font-medium hover:underline">Sign up</a>
        </div>
      </div>
    </div>
  );
}
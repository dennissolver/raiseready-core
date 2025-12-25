// app/(auth)/signup/page.tsx
// ============================================================================
// SIGNUP PAGE - Config-driven, adapts to platform type
// For founder_service_provider: Direct to signup (no role choice)
// For other types: Role selection then signup
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import {
  clientConfig,
  isServiceProvider,
  isImpactInvestor,
  isFamilyOffice,
  hasInvestorMatching
} from '@/config';

type UserRole = 'founder' | 'investor';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  // For service providers, skip role selection entirely (no investor portal)
  const showRoleSelection = hasInvestorMatching();

  const [step, setStep] = useState<'role' | 'form'>(showRoleSelection ? 'role' : 'form');
  const [role, setRole] = useState<UserRole>('founder');

  // Platform-specific messaging
  const getWelcomeMessage = () => {
    if (isServiceProvider()) {
      return `Get AI-powered coaching from ${clientConfig.company.name} to perfect your investor pitch.`;
    }
    if (isImpactInvestor()) {
      return `Submit your impact pitch to ${clientConfig.company.name}. We back founders creating measurable positive change.`;
    }
    if (isFamilyOffice()) {
      return `Connect with ${clientConfig.company.name}. We partner with founders who share our commitment to building enduring value.`;
    }
    return `Submit your pitch to ${clientConfig.company.name}. We back exceptional founders building category-defining companies.`;
  };

  const getSubheadline = () => {
    if (isServiceProvider()) {
      return 'Start your pitch coaching journey';
    }
    if (isImpactInvestor()) {
      return 'Show us your impact thesis';
    }
    if (isFamilyOffice()) {
      return 'Share your long-term vision';
    }
    return 'Start perfecting your pitch today';
  };

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

  // Get labels based on platform type
  const getFounderLabel = () => isImpactInvestor() ? 'Impact Founder' : 'Founder';
  const getInvestorLabel = () => {
    if (isImpactInvestor()) return 'Impact Investor';
    if (isFamilyOffice()) return 'Family Office';
    return 'Investor';
  };

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
        // Create profile based on selected role
        if (role === 'founder') {
          const { error } = await supabase
            .from('founders')
            .upsert({
              id: session.user.id,
              email: session.user.email,
              user_role: 'founder',
              created_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (error) {
            console.error('Error creating founder profile:', error);
          }
          router.push('/founder/dashboard');
        } else if (role === 'investor' && hasInvestorMatching()) {
          const { error } = await supabase
            .from('investor_profiles')
            .upsert({
              email: session.user.email,
              name: session.user.user_metadata?.name || '',
              created_at: new Date().toISOString()
            }, {
              onConflict: 'email'
            });

          if (error) {
            console.error('Error creating investor profile:', error);
          }
          router.push('/investor/dashboard');
        }

        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router, supabase, role]);

  // Get theme colors
  const primaryColor = clientConfig.theme?.colors?.primary || '#8B5CF6';
  const accentColor = clientConfig.theme?.colors?.accent || '#10B981';

  // Role Selection Step (only for platforms with investor matching)
  if (step === 'role' && showRoleSelection) {
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
            <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
            <p className="text-gray-600">Choose how you want to use the platform</p>
          </div>

          {/* Role Cards */}
          <div className="space-y-4">
            {/* Founder Card */}
            <button
              onClick={() => { setRole('founder'); setStep('form'); }}
              className="w-full p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] hover:border-purple-400 bg-purple-50 border-purple-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-purple-500">
                  🚀
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-gray-900">
                    I'm a {getFounderLabel()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload your pitch, get AI coaching, and connect with {getInvestorLabel().toLowerCase()}s
                  </p>
                </div>
              </div>
            </button>

            {/* Investor Card */}
            <button
              onClick={() => { setRole('investor'); setStep('form'); }}
              className="w-full p-6 rounded-xl border-2 text-left transition-all hover:scale-[1.02] hover:border-emerald-400 bg-emerald-50 border-emerald-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-emerald-500">
                  💼
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-gray-900">
                    I'm an {getInvestorLabel()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Discover pre-vetted {getFounderLabel().toLowerCase()}s aligned with your investment thesis
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Sign In Link */}
          <p className="text-center mt-8 text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-purple-600 font-medium hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Signup Form Step
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${getBgGradient()}`}>
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        {/* Welcome Banner */}
        <div className={`mb-6 p-4 border rounded-lg ${getBannerColors()}`}>
          <p className="text-sm">
            <strong>{clientConfig.company.name}:</strong> {getWelcomeMessage()}
          </p>
        </div>

        {/* Back Button (if role selection was shown) */}
        {showRoleSelection && (
          <button
            onClick={() => setStep('role')}
            className="mb-4 text-sm flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Change selection
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {showRoleSelection
              ? `${role === 'founder' ? getFounderLabel() : getInvestorLabel()} Sign Up`
              : 'Create Your Account'
            }
          </h1>
          <p className="text-gray-600">{getSubheadline()}</p>
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
          redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-purple-600 font-medium hover:underline">Sign in</a>
        </div>
      </div>
    </div>
  );
}
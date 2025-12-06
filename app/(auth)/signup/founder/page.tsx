'use client';
import { clientConfig } from '@/config';
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function FounderSignupPage() {
  const router = useRouter()
  const supabase = createClient()

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
          })

        if (error) {
          console.error('Error creating founder profile:', error)
        }

        // Redirect to founder dashboard
        router.push('/founder/dashboard')
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900">
            <strong>Submit Your Pitch to " + clientConfig.company.name + ":</strong> Get AI-powered coaching to transform your pitch into a compelling story. From the team that has helped 500+ startups raise $2B+.
          </p>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
          <p className="text-muted-foreground">Start perfecting your pitch today</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(262, 83%, 58%)',
                  brandAccent: 'hsl(262, 83%, 45%)',
                }
              }
            }
          }}
          view="sign_up"
          providers={[]}
        />
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <a href="/login" className="text-primary hover:underline">Sign in</a>
        </div>
      </div>
    </div>
  )
}




'use client';
import { clientConfig } from '@/config';
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isChecking, setIsChecking] = useState(true)

  const getUserRole = async (userId: string): Promise<string> => {
    // Check user_roles table first (for investor_admin)
    const { data: roleData, error: roleError } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (!roleError && roleData?.role === 'portal_admin') {
      return 'portal_admin'
    }

    // Check founders table
    const { data: founder, error: founderError } = await supabase
      .from('founders')
      .select('user_role')
      .eq('id', userId)
      .single()

    if (!founderError && founder) {
      return 'founder'
    }

    // Check pitch_decks table (if user created a pitch, they're a founder)
    const { data: pitchDeck, error: pitchError } = await supabase
      .from('pitch_decks')
      .select('founder_id')
      .eq('founder_id', userId)
      .limit(1)
      .single()

    if (!pitchError && pitchDeck) {
      return 'founder'
    }

    // Default to founder if no role found
    return 'founder'
  }

  const redirectToDashboard = async (userId: string) => {
    const role = await getUserRole(userId)

    console.log('User role detected:', role)

    if (role === 'portal_admin') {
      console.log('Redirecting to " + clientConfig.company.name + " admin dashboard')
      router.push('/portal/dashboard')
    } else {
      console.log('Redirecting to founder dashboard')
      router.push('/founder/dashboard')
    }
    router.refresh()
  }

  useEffect(() => {
    // Check if already logged in on mount
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('Already logged in, redirecting...')
        await redirectToDashboard(session.user.id)
      }
      setIsChecking(false)
    }

    checkUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)

      if (event === 'SIGNED_IN' && session) {
        await redirectToDashboard(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to " + clientConfig.company.name + "</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
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
          view="sign_in"
          providers={[]}
        />

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Want to submit a pitch? <a href="/signup/founder" className="text-primary hover:underline">Create an account</a>
        </div>
      </div>
    </div>
  )
}

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      return null as any
    }
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'Accept': 'application/json',
      },
    },
  })
}
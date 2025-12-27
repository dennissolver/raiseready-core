// Placeholder - overwritten by child template
export const clientConfig = {
  name: process.env.NEXT_PUBLIC_CLIENT_NAME || 'RaiseReady',
  logo: '/logo.svg',
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#1E40AF',
  secondaryColor: process.env.NEXT_PUBLIC_SECONDARY_COLOR || '#3B82F6',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
}

export default clientConfig
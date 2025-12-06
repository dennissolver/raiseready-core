import { clientConfig } from '@/config';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Check user_roles table for investor_admin
      const { data: roleData } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role === 'portal_admin') {
        return NextResponse.redirect(new URL('/portal/dashboard', requestUrl.origin));
      }

      // Check if founder exists
      const { data: founder } = await supabase
        .from('founders')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (founder) {
        return NextResponse.redirect(new URL('/founder/dashboard', requestUrl.origin));
      }

      // Default to founder dashboard
      return NextResponse.redirect(new URL('/founder/dashboard', requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

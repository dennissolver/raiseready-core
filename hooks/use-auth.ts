'use client';
import { clientConfig } from '@/config';
// hooks/use-auth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type UserRole = 'founder' | 'portal_admin' | 'superadmin';

interface AuthOptions {
  requireAuth?: boolean;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function useAuth(options: AuthOptions = {}) {
  const {
    requireAuth = false,
    requiredRole,
    redirectTo = '/login'
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Get current user
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (error || !currentUser) {
        if (requireAuth) {
          router.push(redirectTo);
          return;
        }
        setIsLoading(false);
        return;
      }

      setUser(currentUser);

      // Get user role if needed
      if (requiredRole) {
        const role = await getUserRole(currentUser.id);
        setUserRole(role);

        // Check if user has required role
        if (role !== requiredRole && role !== 'superadmin') {
          // Redirect to appropriate dashboard based on actual role
          if (role === 'portal_admin') {
            router.push('/investor/dashboard');
          } else {
            router.push('/founder/dashboard');
          }
          return;
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      if (requireAuth) {
        router.push(redirectTo);
      }
      setIsLoading(false);
    }
  };

  const getUserRole = async (userId: string): Promise<UserRole> => {
    // Check superadmin first
    const { data: superadmin } = await supabase
      .from('superadmins')
      .select('id')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (superadmin) return 'superadmin';

    // Check user_roles table for portal_admin
    const { data: userRoleData } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (userRoleData?.role === 'portal_admin') return 'portal_admin';

    // Check founders table
    const { data: founder } = await supabase
      .from('founders')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (founder) return 'founder';

    // Default to founder (new signups)
    return 'founder';
  };

  return {
    isLoading,
    user,
    userRole,
    isAuthenticated: !!user,
  };
}
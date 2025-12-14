import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_MANAGEMENT_API = 'https://api.supabase.com/v1';

interface ConfigureAuthRequest {
  projectRef: string;
  siteUrl: string;
}

async function waitForAuthService(projectRef: string, accessToken: string, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const healthResponse = await fetch(
        `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/health`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        const authService = health.find((s: any) => s.name === 'auth');
        if (authService?.status === 'ACTIVE_HEALTHY') {
          console.log('Auth service is healthy');
          return true;
        }
        console.log(`Auth service status: ${authService?.status || 'unknown'}`);
      }
    } catch (err) {
      console.log(`Health check attempt ${i + 1} failed:`, err);
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body: ConfigureAuthRequest = await req.json();
    const { projectRef, siteUrl } = body;

    if (!projectRef || !siteUrl) {
      return NextResponse.json({ error: 'projectRef and siteUrl required' }, { status: 400 });
    }

    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'Supabase access token not configured' }, { status: 500 });
    }

    console.log(`Configuring Auth for project ${projectRef} with site URL: ${siteUrl}`);

    // Wait for auth service to be healthy
    const isReady = await waitForAuthService(projectRef, accessToken);
    if (!isReady) {
      console.warn('Auth service health check timed out, proceeding anyway...');
    }

    // Build redirect URLs list - comma-separated string
    // Include wildcards for Vercel preview deploys and all necessary paths
    const redirectUrls = [
      // Localhost for development
      'http://localhost:3000/**',
      'http://localhost:3000',
      'http://localhost:5173/**',
      'http://localhost:5173',
      // Vercel preview deploys - wildcard pattern
      'https://*.vercel.app/**',
      'https://*.vercel.app',
      // Production URLs - specific paths
      `${siteUrl}/**`,
      `${siteUrl}`,
    ].join(',');

    console.log('Setting redirect URLs:', redirectUrls);

    // First, get current config to understand what's set
    const getConfigResponse = await fetch(
      `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/config/auth`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (getConfigResponse.ok) {
      const currentConfig = await getConfigResponse.json();
      console.log('Current site_url:', currentConfig.site_url);
      console.log('Current uri_allow_list:', currentConfig.uri_allow_list);
    }

    // Update Auth configuration - uri_allow_list is the correct field
    const updatePayload = {
      site_url: siteUrl,
      uri_allow_list: redirectUrls,
    };

    console.log('Sending update payload:', JSON.stringify(updatePayload, null, 2));

    const authConfigResponse = await fetch(
      `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    const responseText = await authConfigResponse.text();
    console.log('Auth config response status:', authConfigResponse.status);
    console.log('Auth config response:', responseText);

    if (!authConfigResponse.ok) {
      console.error('Failed to configure Auth:', responseText);

      // Try setting just the site_url
      console.log('Trying site_url only...');
      const siteOnlyResponse = await fetch(
        `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/config/auth`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ site_url: siteUrl }),
        }
      );

      if (siteOnlyResponse.ok) {
        console.log('Site URL configured, but redirect URLs need manual setup');
        return NextResponse.json({
          success: true,
          partial: true,
          projectRef,
          siteUrl,
          message: 'Site URL set. Redirect URLs may need manual configuration.',
          requiredUrls: redirectUrls.split(','),
          manualInstructions: `Go to Supabase Dashboard → Project ${projectRef} → Authentication → URL Configuration`,
        });
      }

      return NextResponse.json({
        success: false,
        error: `Auth config update failed: ${responseText}`,
        message: 'Manual setup required in Supabase dashboard',
        requiredUrls: redirectUrls.split(','),
        manualInstructions: `Go to https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`,
      }, { status: 500 });
    }

    // Verify the update was successful
    const verifyResponse = await fetch(
      `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/config/auth`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (verifyResponse.ok) {
      const verifiedConfig = await verifyResponse.json();
      console.log('Verified site_url:', verifiedConfig.site_url);
      console.log('Verified uri_allow_list:', verifiedConfig.uri_allow_list);
    }

    console.log('Auth configuration updated successfully');

    return NextResponse.json({
      success: true,
      projectRef,
      siteUrl,
      redirectUrls: redirectUrls.split(','),
    });

  } catch (error) {
    console.error('Configure Supabase Auth error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
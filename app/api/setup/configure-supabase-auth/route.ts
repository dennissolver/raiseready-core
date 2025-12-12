import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_MANAGEMENT_API = 'https://api.supabase.com/v1';

interface ConfigureAuthRequest {
  projectRef: string;  // Supabase project ID
  siteUrl: string;     // e.g., https://roi-ventures-pitch.vercel.app
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

    // Build COMPLETE redirect URLs list (comma-separated string)
    // Must include: localhost for dev, wildcard for preview deploys, and specific production URLs
    const redirectUrls = [
      // Localhost for development
      'http://localhost:3000/auth/callback',
      'http://localhost:3000/auth/confirm',
      'http://localhost:3000/',
      'http://localhost:5173/',
      // Wildcard for all Vercel preview deploys
      'https://*.vercel.app',
      // Specific production URLs
      `${siteUrl}/auth/callback`,
      `${siteUrl}/auth/confirm`,
      `${siteUrl}/`,
    ].join(',');

    console.log('Setting redirect URLs:', redirectUrls);

    // Update Auth configuration using correct Management API field names
    const authConfigResponse = await fetch(
      `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_url: siteUrl,
          additional_redirect_urls: redirectUrls,
        }),
      }
    );

    const responseText = await authConfigResponse.text();
    console.log('Auth config response status:', authConfigResponse.status);
    console.log('Auth config response:', responseText);

    if (!authConfigResponse.ok) {
      console.error('Failed to configure Auth with additional_redirect_urls:', responseText);

      // Try alternate field name if first attempt fails
      console.log('Trying uri_allow_list field name...');
      const retryResponse = await fetch(
        `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/config/auth`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            site_url: siteUrl,
            uri_allow_list: redirectUrls,
          }),
        }
      );

      const retryText = await retryResponse.text();
      console.log('Retry response status:', retryResponse.status);
      console.log('Retry response:', retryText);

      if (!retryResponse.ok) {
        console.error('Retry also failed:', retryText);

        // Just try to set site_url alone as last resort
        console.log('Trying site_url only...');
        const siteOnlyResponse = await fetch(
          `${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/config/auth`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              site_url: siteUrl,
            }),
          }
        );

        if (siteOnlyResponse.ok) {
          console.log('Site URL configured, but redirect URLs need manual setup');
          return NextResponse.json({
            success: true,
            partial: true,
            projectRef,
            siteUrl,
            message: 'Site URL set. Add redirect URLs manually in Supabase dashboard.',
            requiredUrls: redirectUrls.split(','),
          });
        }

        return NextResponse.json({
          success: false,
          warning: `Auth config update failed: ${retryText}`,
          message: 'You may need to manually set Site URL and redirect URLs in Supabase dashboard',
          requiredUrls: redirectUrls.split(','),
        }, { status: 500 });
      }
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
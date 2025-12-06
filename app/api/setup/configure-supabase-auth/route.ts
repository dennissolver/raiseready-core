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

    // Build redirect URLs list (comma-separated string, not array)
    const redirectUrls = [
      `${siteUrl}/**`,
      `${siteUrl}/callback`,
      `${siteUrl}/auth/callback`,
    ].join(',');

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

    if (!authConfigResponse.ok) {
      const error = await authConfigResponse.text();
      console.error('Failed to configure Auth:', error);

      // Try alternate field name if first attempt fails
      console.log('Trying alternate field names...');
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

      if (!retryResponse.ok) {
        const retryError = await retryResponse.text();
        console.error('Retry also failed:', retryError);

        // Just try to set site_url alone
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
          });
        }

        return NextResponse.json({
          success: false,
          warning: `Auth config update failed: ${retryError}`,
          message: 'You may need to manually set Site URL in Supabase dashboard',
        });
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
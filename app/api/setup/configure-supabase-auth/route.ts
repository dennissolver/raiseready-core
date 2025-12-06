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

    // Update Auth configuration
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
          uri_allow_list: [
            `${siteUrl}/**`,
            `${siteUrl}/callback`,
            `${siteUrl}/callback/**`,
            `${siteUrl}/auth/callback`,
            `${siteUrl}/auth/callback/**`,
          ],
          // Enable email confirmations to redirect properly
          mailer_autoconfirm: false,
          // Redirect URLs for password reset, magic link, etc.
          external_email_enabled: true,
        }),
      }
    );

    if (!authConfigResponse.ok) {
      const error = await authConfigResponse.text();
      console.error('Failed to configure Auth:', error);

      // Don't fail the whole flow - just warn
      return NextResponse.json({
        success: false,
        warning: `Auth config update failed: ${error}`,
        message: 'You may need to manually set Site URL in Supabase dashboard',
      });
    }

    console.log('Auth configuration updated successfully');

    return NextResponse.json({
      success: true,
      projectRef,
      siteUrl,
      redirectUrls: [
        `${siteUrl}/**`,
        `${siteUrl}/auth/callback`,
      ],
    });

  } catch (error) {
    console.error('Configure Supabase Auth error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
// app/api/setup/send-welcome-email/route.ts
// ============================================================================
// SEND WELCOME EMAIL - Sends onboarding email to new platform admin
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Accept multiple parameter name formats for flexibility
    const adminEmail = body.adminEmail || body.email;
    const platformUrl = body.platformUrl || body.url;
    const firstName = body.firstName || body.adminFirstName || 'Admin';
    const companyName = body.companyName || body.company || 'Your Company';
    const githubUrl = body.githubUrl || body.repoUrl;

    // Normalize platformUrl - remove protocol if already present
    let cleanPlatformUrl = platformUrl.replace(/^https?:\/\//, '');

    console.log('[send-welcome-email] Received:', {
      adminEmail: adminEmail ? '✓' : '✗',
      platformUrl: platformUrl ? '✓' : '✗',
      cleanPlatformUrl,
      firstName,
      companyName
    });

    if (!adminEmail || !platformUrl) {
      console.error('[send-welcome-email] Missing required params:', { adminEmail: !!adminEmail, platformUrl: !!platformUrl });
      return NextResponse.json({
        error: 'Admin email and platform URL required',
        received: { adminEmail: !!adminEmail, platformUrl: !!platformUrl }
      }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.log('[send-welcome-email] RESEND_API_KEY not configured, skipping email');
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Email skipped - RESEND_API_KEY not configured'
      });
    }

    // Build the welcome email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Your Pitch Coaching Platform</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #18181b; font-size: 28px; margin: 0 0 8px 0;">🎉 Your Platform is Ready!</h1>
        <p style="color: #71717a; font-size: 16px; margin: 0;">Welcome to ${companyName}'s AI Pitch Coaching Platform</p>
      </div>

      <!-- Main Content -->
      <div style="margin-bottom: 32px;">
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${firstName},
        </p>
        <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Your AI-powered pitch coaching platform has been successfully created and deployed. 
          Your founders can now start improving their investor presentations with personalized AI coaching.
        </p>
      </div>

      <!-- Access Button -->
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="https://${cleanPlatformUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
          Access Your Platform →
        </a>
      </div>

      <!-- Platform Details -->
      <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
        <h3 style="color: #18181b; font-size: 14px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">Platform Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #71717a; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e4e4e7;">Platform URL</td>
            <td style="color: #18181b; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
              <a href="https://${cleanPlatformUrl}" style="color: #2563eb; text-decoration: none;">${cleanPlatformUrl}</a>
            </td>
          </tr>
          ${githubUrl ? `
          <tr>
            <td style="color: #71717a; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e4e4e7;">Source Code</td>
            <td style="color: #18181b; font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">
              <a href="${githubUrl}" style="color: #2563eb; text-decoration: none;">GitHub Repository</a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="color: #71717a; font-size: 14px; padding: 8px 0;">Admin Email</td>
            <td style="color: #18181b; font-size: 14px; padding: 8px 0; text-align: right;">${adminEmail}</td>
          </tr>
        </table>
      </div>

      <!-- Next Steps -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: #18181b; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">🚀 Next Steps</h3>
        <ol style="color: #3f3f46; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Visit your platform and sign up with this email address</li>
          <li>Invite your founders to create accounts</li>
          <li>Have founders upload their pitch decks for AI analysis</li>
          <li>Use voice coaching for pitch practice sessions</li>
        </ol>
      </div>

      <!-- Support -->
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center;">
        <p style="color: #71717a; font-size: 14px; margin: 0;">
          Need help? Reply to this email or contact our support team.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        Powered by RaiseReady Impact Platform
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RaiseReady <onboarding@resend.dev>', // Use verified domain in production
        to: adminEmail,
        subject: `🎉 Your ${companyName} Pitch Coaching Platform is Ready!`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[send-welcome-email] Resend API error:', errorText);

      // Don't fail the whole flow if email fails
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: 'Platform created but email failed to send',
        error: errorText
      });
    }

    const result = await response.json();
    console.log('[send-welcome-email] Email sent successfully:', result.id);

    return NextResponse.json({
      success: true,
      emailSent: true,
      messageId: result.id,
      recipient: adminEmail
    });

  } catch (error: any) {
    console.error('[send-welcome-email] Error:', error);

    // Don't fail the whole flow if email fails
    return NextResponse.json({
      success: true,
      emailSent: false,
      message: 'Platform created but email failed',
      error: error.message
    });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'send-welcome-email',
    status: 'ready',
    resendConfigured: !!process.env.RESEND_API_KEY
  });
}
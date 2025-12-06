import { NextRequest, NextResponse } from 'next/server';
import { clientConfig } from '@/config/client';

interface SendFounderWelcomeRequest {
  founderEmail: string;
  founderName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SendFounderWelcomeRequest = await req.json();
    const { founderEmail, founderName } = body;

    if (!founderEmail) {
      return NextResponse.json({ error: 'Founder email required' }, { status: 400 });
    }

    // Get client config
    const companyName = clientConfig.company.name;
    const platformUrl = clientConfig.company.platformUrl || process.env.NEXT_PUBLIC_APP_URL;
    const supportEmail = clientConfig.company.supportEmail;
    const coachName = clientConfig.coaching.coachName;
    const primaryColor = clientConfig.theme.colors.primary;

    // Generate the email content
    const emailHtml = generateFounderWelcomeEmail({
      founderName: founderName || 'there',
      companyName,
      platformUrl,
      supportEmail,
      coachName,
      primaryColor,
    });

    // Send via Resend
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${companyName} <noreply@${platformUrl?.replace('https://', '').replace('http://', '').split('.')[0]}.com>`,
          to: [founderEmail],
          subject: `Welcome to ${companyName} - Let's Perfect Your Pitch! 🚀`,
          html: emailHtml,
        }),
      });

      if (response.ok) {
        console.log(`Founder welcome email sent to ${founderEmail}`);
        return NextResponse.json({ success: true, sentTo: founderEmail });
      } else {
        const error = await response.text();
        console.error('Resend error:', error);
        // Don't fail signup if email fails
        return NextResponse.json({
          success: false,
          warning: 'Email not sent',
          sentTo: founderEmail
        });
      }
    }

    // No API key - just log
    console.log('=== FOUNDER WELCOME EMAIL ===');
    console.log(`To: ${founderEmail}`);
    console.log(`Company: ${companyName}`);
    console.log('Configure RESEND_API_KEY to send emails');
    console.log('=============================');

    return NextResponse.json({
      success: true,
      sentTo: founderEmail,
      note: 'Email logged (configure RESEND_API_KEY to send)',
    });

  } catch (error) {
    console.error('Send founder welcome email error:', error);
    // Don't fail - email is not critical to signup
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function generateFounderWelcomeEmail(data: {
  founderName: string;
  companyName: string;
  platformUrl: string;
  supportEmail: string;
  coachName: string;
  primaryColor: string;
}): string {
  const { founderName, companyName, platformUrl, supportEmail, coachName, primaryColor } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${companyName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%); padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to ${companyName}! 🚀</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your journey to investor-ready starts now</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    
    <p style="font-size: 18px;">Hi ${founderName},</p>
    
    <p>Thank you for joining <strong>${companyName}</strong>! We're excited to help you perfect your pitch and get investor-ready.</p>
    
    <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid ${primaryColor};">
      <h2 style="margin-top: 0; color: ${primaryColor}; font-size: 18px;">🎯 Here's What Happens Next</h2>
      <p style="margin-bottom: 0;">Our AI-powered platform will guide you through a proven process to sharpen your pitch and maximize your chances with investors.</p>
    </div>
    
    <h2 style="color: #1e293b; font-size: 18px; margin-top: 30px;">Your Founder Journey</h2>
    
    <div style="margin: 20px 0;">
      <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
        <div style="background: ${primaryColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">1</div>
        <div style="margin-left: 15px;">
          <strong style="color: #1e293b;">Upload Your Pitch Deck</strong>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Share your deck for instant AI analysis and feedback</p>
        </div>
      </div>
      
      <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
        <div style="background: ${primaryColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">2</div>
        <div style="margin-left: 15px;">
          <strong style="color: #1e293b;">Complete Story Discovery</strong>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Uncover the compelling narrative behind your startup</p>
        </div>
      </div>
      
      <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
        <div style="background: ${primaryColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">3</div>
        <div style="margin-left: 15px;">
          <strong style="color: #1e293b;">Refine Your Materials</strong>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Get AI coaching to improve your deck and messaging</p>
        </div>
      </div>
      
      <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
        <div style="background: ${primaryColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">4</div>
        <div style="margin-left: 15px;">
          <strong style="color: #1e293b;">Practice Your Pitch</strong>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Rehearse with ${coachName}, your AI voice coach</p>
        </div>
      </div>
      
      <div style="display: flex; align-items: flex-start;">
        <div style="background: #22c55e; color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">✓</div>
        <div style="margin-left: 15px;">
          <strong style="color: #1e293b;">Get Investor-Ready</strong>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Submit for review when your readiness score hits the target</p>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${platformUrl}/founder/dashboard" style="display: inline-block; background: ${primaryColor}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Your Dashboard →</a>
    </div>
    
    <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h3 style="margin-top: 0; color: #854d0e; font-size: 16px;">💡 Pro Tip</h3>
      <p style="margin-bottom: 0; color: #713f12;">Founders who complete all steps are <strong>3x more likely</strong> to secure a meeting with our investment team. Take your time with each step - quality matters more than speed.</p>
    </div>
    
    <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
      <p style="color: #64748b; font-size: 14px; margin-bottom: 5px;">Need help? Have questions?</p>
      <p style="margin: 0;"><a href="mailto:${supportEmail}" style="color: ${primaryColor};">${supportEmail}</a></p>
    </div>
    
    <p style="margin-top: 30px;">Here's to your fundraising success! 🎉</p>
    
    <p style="margin-bottom: 0;">
      Best,<br>
      <strong>The ${companyName} Team</strong>
    </p>
    
  </div>
  
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">You received this email because you signed up at <a href="${platformUrl}" style="color: #64748b;">${platformUrl}</a></p>
  </div>
  
</body>
</html>
`;
}

// Helper to darken/lighten colors
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}
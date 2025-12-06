import { NextRequest, NextResponse } from 'next/server';

interface SendWelcomeEmailRequest {
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  companyName: string;
  platformUrl: string;
  tempPassword: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SendWelcomeEmailRequest = await req.json();
    const {
      adminEmail,
      adminFirstName,
      adminLastName,
      companyName,
      platformUrl,
      tempPassword,
    } = body;

    if (!adminEmail || !platformUrl) {
      return NextResponse.json({ error: 'Admin email and platform URL required' }, { status: 400 });
    }

    // Generate the email content
    const emailHtml = generateWelcomeEmail({
      firstName: adminFirstName,
      lastName: adminLastName,
      companyName,
      platformUrl,
      adminEmail,
      tempPassword: tempPassword || `${companyName.replace(/\s+/g, '')}2024!`,
    });

    // Option 1: Use Resend (recommended)
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'RaiseReady <onboarding@corporateaisolutions.com>',
          to: [adminEmail],
          subject: `🚀 Your ${companyName} AI Pitch Portal is Live!`,
          html: emailHtml,
        }),
      });

      if (response.ok) {
        console.log(`Welcome email sent to ${adminEmail}`);
        return NextResponse.json({ success: true, sentTo: adminEmail });
      } else {
        const error = await response.text();
        console.error('Resend error:', error);
      }
    }

    // Fallback: Log the email content (for testing/debugging)
    console.log('=== WELCOME EMAIL ===');
    console.log(`To: ${adminEmail}`);
    console.log(`Subject: Your ${companyName} AI Pitch Portal is Live!`);
    console.log('Email would be sent with Resend API key configured.');
    console.log('=====================');

    return NextResponse.json({
      success: true,
      sentTo: adminEmail,
      note: 'Email logged (configure RESEND_API_KEY to actually send)',
    });

  } catch (error) {
    console.error('Send welcome email error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateWelcomeEmail(data: {
  firstName: string;
  lastName: string;
  companyName: string;
  platformUrl: string;
  adminEmail: string;
  tempPassword: string;
}): string {
  const { firstName, lastName, companyName, platformUrl, adminEmail, tempPassword } = data;
  const dashboardPath = platformUrl.replace('.vercel.app', '').split('//')[1]?.replace('-pitch', '') || 'portal';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AI Pitch Portal is Live!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🚀 Your Portal is Live!</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    
    <p style="font-size: 18px;">Hi ${firstName} ${lastName},</p>
    
    <p>Thanks for joining us on the RaiseReady journey! As promised, your <strong>${companyName} AI Pitch Portal</strong> is now live.</p>
    
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #1e40af; font-size: 18px;">🔐 Platform Access</h2>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>URL:</strong> <a href="${platformUrl}" style="color: #3B82F6;">${platformUrl}</a></li>
        <li style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>Email:</strong> ${adminEmail}</li>
        <li style="padding: 8px 0;"><strong>Password:</strong> ${tempPassword} <span style="color: #ef4444;">(please change on first login)</span></li>
      </ul>
    </div>
    
    <h2 style="color: #1e40af; font-size: 18px;">📧 Two Ways to Use It</h2>
    
    <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #059669;">Option A: Auto-Reply (Maximum Time Saving) ⭐ Recommended</h3>
      <p style="margin-bottom: 10px;">Set up an auto-responder to all inbound pitch emails:</p>
      <div style="background: white; border-radius: 6px; padding: 15px; font-style: italic; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 10px 0;">"Thank you for reaching out to ${companyName}!</p>
        <p style="margin: 0 0 10px 0;">Before we can review your pitch, please complete our Investment Readiness Programme: <a href="${platformUrl}" style="color: #3B82F6;">${platformUrl}</a></p>
        <p style="margin: 0 0 10px 0;">This AI-powered platform will:</p>
        <ul style="margin: 0 0 10px 0;">
          <li>Analyze your pitch deck</li>
          <li>Help you refine your story</li>
          <li>Practice your pitch with our AI coach</li>
        </ul>
        <p style="margin: 0;">Once you've completed the programme, we'll review your submission and be in touch.<br><br>Best,<br>The ${companyName} Team"</p>
      </div>
      <p style="margin-top: 15px; margin-bottom: 0;"><strong>Why this works:</strong></p>
      <ul style="margin-top: 5px;">
        <li>Zero time spent on unqualified founders</li>
        <li>Low-effort founders self-filter (they won't complete it)</li>
        <li>Serious founders arrive polished and prepared</li>
        <li>You only speak to founders who've proven commitment</li>
      </ul>
    </div>
    
    <div style="background: #f0f9ff; border: 1px solid #3B82F6; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e40af;">Option B: Take Calls First, Then Send Link</h3>
      <p>If you prefer to keep the initial call:</p>
      <ol>
        <li>Take the intro call as usual</li>
        <li>After the call, send: "Great chatting! As a next step, please complete our Investment Readiness Programme: <a href="${platformUrl}" style="color: #3B82F6;">${platformUrl}</a>"</li>
        <li>Review their AI analysis before the follow-up call</li>
      </ol>
      <p style="margin-bottom: 0;"><em>This still saves time - but Option A saves the most.</em></p>
    </div>
    
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #1e40af; font-size: 18px;">📊 Your Admin Dashboard</h2>
      <ul>
        <li><strong>Review submissions:</strong> /${dashboardPath}/dashboard</li>
        <li><strong>Shortlist founders:</strong> Add promising ones to your list</li>
        <li><strong>View AI scores:</strong> See deck analysis before any call</li>
      </ul>
    </div>
    
    <div style="background: #fefce8; border: 1px solid #eab308; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #854d0e; font-size: 18px;">💰 Pricing</h2>
      <p>I figure you'll know what your current time and money costs are to manage the inflow of cold pitches.</p>
      <p>So I thought I'd let you run your own numbers 😊</p>
      <p><strong>Calculator:</strong> <a href="https://corporateaisolutions.com/raiseready-calculator/" style="color: #3B82F6;">https://corporateaisolutions.com/raiseready-calculator/</a></p>
      <p style="margin-bottom: 0;">Plug in your monthly pitch volume and hourly rate to see monthly fee and ROI.</p>
    </div>
    
    <div style="background: #1e40af; color: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: white; font-size: 18px;">✅ Next Steps</h2>
      <ol style="margin-bottom: 0;">
        <li><strong>Log in and test</strong> - try the founder journey yourself</li>
        <li><strong>Pick Option A or B</strong> - or try both</li>
        <li><strong>Send feedback</strong> - what needs tweaking?</li>
        <li><strong>Lock in pricing</strong> - based on your calculator results</li>
      </ol>
    </div>
    
    <p>Looking forward to your thoughts!</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0;"><strong>Dennis</strong></p>
      <p style="margin: 5px 0; color: #3B82F6;">INNOVATOR | Corporate AI Solutions</p>
      <p style="margin: 5px 0; font-style: italic; color: #64748b; font-size: 14px;">"Wisdom in AI comes from sharing what we know, discovering what we need, and unlocking results together."</p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">
        📱 <a href="https://wa.me/61402612471" style="color: #3B82F6;">+61402612471</a> (WhatsApp)<br>
        ✉️ <a href="mailto:dennis@corporateaisolutions.com" style="color: #3B82F6;">dennis@corporateaisolutions.com</a>
      </p>
    </div>
    
  </div>
  
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>Turning Industry Insight into AI Action</p>
  </div>
  
</body>
</html>
`;
}
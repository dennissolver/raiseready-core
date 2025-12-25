// app/api/setup/extract-branding/route.ts
// ============================================================================
// EXTRACT BRANDING - Screenshot + AI Vision Analysis
// Takes screenshot of client website and uses Claude Vision to extract branding
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Default branding if all extraction fails
const DEFAULT_BRANDING = {
  colors: {
    primary: '#2563eb',
    accent: '#f59e0b',
    background: '#ffffff',
    text: '#1f2937',
  },
  description: 'Professional business platform',
  tone: 'professional',
  industry: 'general',
};

// Screenshot service - using a free API
async function captureScreenshot(url: string): Promise<string | null> {
  try {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    // Option 1: Use screenshotone.com API (has free tier)
    const screenshotApiKey = process.env.SCREENSHOT_API_KEY;
    if (screenshotApiKey) {
      const screenshotUrl = `https://api.screenshotone.com/take?access_key=${screenshotApiKey}&url=${encodeURIComponent(normalizedUrl)}&viewport_width=1280&viewport_height=800&format=jpg&image_quality=80`;

      const response = await fetch(screenshotUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
      }
    }

    // Option 2: Use microlink.io (generous free tier)
    try {
      // Don't use embed - we want the JSON response with screenshot URL
      const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(normalizedUrl)}&screenshot=true&meta=false`;
      const microlinkResponse = await fetch(microlinkUrl, {
        signal: AbortSignal.timeout(20000)
      });

      // Check content-type before parsing
      const contentType = microlinkResponse.headers.get('content-type') || '';

      if (microlinkResponse.ok && contentType.includes('application/json')) {
        const data = await microlinkResponse.json();
        if (data.status === 'success' && data.data?.screenshot?.url) {
          console.log('[extract-branding] Microlink returned screenshot URL:', data.data.screenshot.url);
          // Fetch the actual screenshot image
          const imageResponse = await fetch(data.data.screenshot.url, {
            signal: AbortSignal.timeout(10000)
          });
          if (imageResponse.ok) {
            const buffer = await imageResponse.arrayBuffer();
            return Buffer.from(buffer).toString('base64');
          }
        }
      } else if (microlinkResponse.ok && contentType.includes('image')) {
        // If it returned image directly, use it
        console.log('[extract-branding] Microlink returned image directly');
        const buffer = await microlinkResponse.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
      }
    } catch (microlinkError) {
      console.log('[extract-branding] Microlink failed:', microlinkError);
    }

    // Option 3: Use thum.io (free, no API key needed)
    try {
      const thumUrl = `https://image.thum.io/get/width/1280/crop/800/https://${normalizedUrl.replace(/^https?:\/\//, '')}`;
      console.log('[extract-branding] Trying thum.io...');
      const thumResponse = await fetch(thumUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000)
      });

      if (thumResponse.ok) {
        const buffer = await thumResponse.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
      }
    } catch (thumError) {
      console.log('[extract-branding] Thum.io failed:', thumError);
    }

    return null;
  } catch (error) {
    console.error('[extract-branding] Screenshot capture failed:', error);
    return null;
  }
}

// Use Claude Vision to analyze the screenshot
async function analyzeWithVision(screenshotBase64: string, companyName: string, websiteUrl: string): Promise<any> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.log('[extract-branding] No ANTHROPIC_API_KEY, skipping vision analysis');
    return null;
  }

  try {
    // Detect image type from base64 data
    // PNG starts with: iVBORw0KGgo (base64 of 0x89 0x50 0x4E 0x47)
    // JPEG starts with: /9j/ (base64 of 0xFF 0xD8 0xFF)
    // GIF starts with: R0lGOD (base64 of GIF89a or GIF87a)
    // WebP starts with: UklGR (base64 of RIFF)
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png';

    if (screenshotBase64.startsWith('/9j/')) {
      mediaType = 'image/jpeg';
    } else if (screenshotBase64.startsWith('iVBORw')) {
      mediaType = 'image/png';
    } else if (screenshotBase64.startsWith('R0lGOD')) {
      mediaType = 'image/gif';
    } else if (screenshotBase64.startsWith('UklGR')) {
      mediaType = 'image/webp';
    }

    console.log(`[extract-branding] Detected image type: ${mediaType}`);

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: screenshotBase64,
              },
            },
            {
              type: 'text',
              text: `Analyze this website screenshot for ${companyName} (${websiteUrl}).

Extract the branding information and respond ONLY with a JSON object (no markdown, no explanation):

{
  "colors": {
    "primary": "#hexcode",
    "accent": "#hexcode", 
    "background": "#hexcode",
    "text": "#hexcode"
  },
  "description": "one sentence describing the business",
  "tone": "professional|friendly|bold|elegant|playful|corporate",
  "industry": "finance|tech|healthcare|education|retail|services|other",
  "dominantColor": "#hexcode of the most prominent color on the page",
  "logoColors": ["#hex1", "#hex2"] 
}

IMPORTANT:
- Extract the ACTUAL colors you see in the screenshot
- Primary = main brand color (often in header, buttons, or logo)
- Accent = secondary highlight color
- Background = main page background color
- Look at the header, hero section, and buttons for brand colors
- Be precise with hex codes based on what you actually see`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      // Parse the JSON response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
    return null;
  } catch (error) {
    console.error('[extract-branding] Vision analysis failed:', error);
    return null;
  }
}

// Fallback: Try to extract from HTML/CSS
async function extractFromHtml(url: string): Promise<any> {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract colors from inline styles and meta tags
    const colors: string[] = [];

    // Look for hex colors in style attributes and CSS
    const hexMatches = html.match(/#[0-9A-Fa-f]{6}\b/g) || [];
    colors.push(...hexMatches);

    // Look for theme-color meta tag
    const themeColorMatch = html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    if (themeColorMatch) {
      colors.unshift(themeColorMatch[1]); // Priority
    }

    // Look for brand colors in CSS variables
    const cssVarMatch = html.match(/--(?:primary|brand|main)[^:]*:\s*([^;]+)/gi);
    if (cssVarMatch) {
      cssVarMatch.forEach(match => {
        const colorMatch = match.match(/#[0-9A-Fa-f]{6}/);
        if (colorMatch) colors.unshift(colorMatch[0]);
      });
    }

    if (colors.length > 0) {
      // Filter out common non-brand colors
      const filteredColors = colors.filter(c => {
        const lower = c.toLowerCase();
        return !['#ffffff', '#000000', '#f8f8f8', '#fafafa', '#333333', '#666666'].includes(lower);
      });

      return {
        colors: {
          primary: filteredColors[0] || colors[0] || DEFAULT_BRANDING.colors.primary,
          accent: filteredColors[1] || filteredColors[0] || DEFAULT_BRANDING.colors.accent,
          background: '#ffffff',
          text: '#1f2937',
        },
        source: 'html-extraction',
      };
    }

    return null;
  } catch (error) {
    console.error('[extract-branding] HTML extraction failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { companyWebsite, companyName } = body;

    console.log(`[extract-branding] Starting extraction for: ${companyName} @ ${companyWebsite}`);

    // Validate URL
    if (!companyWebsite) {
      console.log('[extract-branding] No website provided, using defaults');
      return NextResponse.json({
        success: true,
        branding: DEFAULT_BRANDING,
        source: 'defaults',
        message: 'No website provided',
      });
    }

    // Normalize the URL - handle common issues
    let normalizedUrl = companyWebsite.trim();

    // Remove trailing slashes
    normalizedUrl = normalizedUrl.replace(/\/+$/, '');

    // Ensure protocol
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    console.log(`[extract-branding] Normalized URL: ${normalizedUrl}`);

    // Step 1: Try to capture screenshot
    console.log('[extract-branding] Attempting screenshot capture...');
    const screenshot = await captureScreenshot(normalizedUrl);

    let branding = null;
    let source = 'defaults';

    if (screenshot) {
      console.log('[extract-branding] Screenshot captured, analyzing with AI Vision...');

      // Step 2: Analyze with Claude Vision
      const visionResult = await analyzeWithVision(screenshot, companyName || 'the company', normalizedUrl);

      if (visionResult && visionResult.colors) {
        branding = visionResult;
        source = 'ai-vision';
        console.log('[extract-branding] AI Vision analysis successful');
      }
    } else {
      console.log('[extract-branding] Screenshot failed, trying HTML extraction...');
    }

    // Step 3: Fallback to HTML extraction if vision failed
    if (!branding) {
      const htmlResult = await extractFromHtml(normalizedUrl);
      if (htmlResult) {
        branding = htmlResult;
        source = 'html-extraction';
        console.log('[extract-branding] HTML extraction successful');
      }
    }

    // Step 4: Use defaults if all else fails
    if (!branding) {
      console.log('[extract-branding] All extraction methods failed, using defaults');
      branding = DEFAULT_BRANDING;
      source = 'defaults';
    }

    // Ensure all required fields exist
    const finalBranding = {
      colors: {
        primary: branding.colors?.primary || DEFAULT_BRANDING.colors.primary,
        accent: branding.colors?.accent || DEFAULT_BRANDING.colors.accent,
        background: branding.colors?.background || DEFAULT_BRANDING.colors.background,
        text: branding.colors?.text || DEFAULT_BRANDING.colors.text,
      },
      description: branding.description || DEFAULT_BRANDING.description,
      tone: branding.tone || DEFAULT_BRANDING.tone,
      industry: branding.industry || DEFAULT_BRANDING.industry,
      dominantColor: branding.dominantColor,
      logoColors: branding.logoColors,
    };

    const duration = Date.now() - startTime;
    console.log(`[extract-branding] Complete (${source}) in ${duration}ms:`, finalBranding.colors);

    return NextResponse.json({
      success: true,
      branding: finalBranding,
      source,
      duration,
      url: normalizedUrl,
    });

  } catch (error: any) {
    console.error('[extract-branding] Error:', error);

    return NextResponse.json({
      success: true, // Don't fail the whole flow
      branding: DEFAULT_BRANDING,
      source: 'defaults',
      error: error.message,
    });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'extract-branding',
    version: 'v2-vision',
    methods: ['screenshot-ai-vision', 'html-extraction', 'defaults'],
    screenshotApiConfigured: !!process.env.SCREENSHOT_API_KEY,
    anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
  });
}
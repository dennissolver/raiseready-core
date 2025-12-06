import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface ExtractLogoRequest {
  websiteUrl: string;
}

interface LogoResult {
  logoUrl: string | null;
  logoBase64: string | null;
  logoType: 'svg' | 'png' | 'jpg' | 'ico' | 'webp' | null;
  source: string; // Where we found it
  ogImageUrl: string | null;
  ogImageBase64: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body: ExtractLogoRequest = await req.json();
    let { websiteUrl } = body;

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL required' }, { status: 400 });
    }

    // Ensure URL has protocol
    if (!websiteUrl.startsWith('http')) {
      websiteUrl = `https://${websiteUrl}`;
    }

    console.log(`Extracting logo from: ${websiteUrl}`);

    // Fetch the website HTML
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RaiseReady/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `Failed to fetch website: ${response.status}`
      }, { status: 400 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(websiteUrl).origin;

    // Try to find logo in order of preference
    let logoUrl: string | null = null;
    let source = '';

    // 1. Look for explicit logo in header/nav
    const logoSelectors = [
      'header img[src*="logo"]',
      'nav img[src*="logo"]',
      '.logo img',
      '#logo img',
      'a[href="/"] img',
      'header a img:first-of-type',
      'nav a img:first-of-type',
      '[class*="logo"] img',
      '[id*="logo"] img',
    ];

    for (const selector of logoSelectors) {
      const img = $(selector).first();
      if (img.length) {
        logoUrl = img.attr('src') || null;
        if (logoUrl) {
          source = `selector: ${selector}`;
          break;
        }
      }
    }

    // 2. Look for SVG logo
    if (!logoUrl) {
      const svgLogo = $('header svg, nav svg, .logo svg, [class*="logo"] svg').first();
      if (svgLogo.length) {
        // Get SVG as string
        const svgHtml = $.html(svgLogo);
        if (svgHtml) {
          const svgBase64 = Buffer.from(svgHtml).toString('base64');
          return NextResponse.json({
            success: true,
            logoUrl: null,
            logoBase64: `data:image/svg+xml;base64,${svgBase64}`,
            logoType: 'svg',
            source: 'inline SVG',
            ogImageUrl: null,
            ogImageBase64: null,
          });
        }
      }
    }

    // 3. Apple touch icon (usually high quality)
    if (!logoUrl) {
      const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr('href');
      if (appleTouchIcon) {
        logoUrl = appleTouchIcon;
        source = 'apple-touch-icon';
      }
    }

    // 4. Favicon (last resort for logo)
    if (!logoUrl) {
      const favicon = $('link[rel="icon"]').attr('href') ||
                      $('link[rel="shortcut icon"]').attr('href');
      if (favicon) {
        logoUrl = favicon;
        source = 'favicon';
      }
    }

    // 5. Get OG image for og-image.png
    let ogImageUrl = $('meta[property="og:image"]').attr('content') ||
                     $('meta[name="og:image"]').attr('content') ||
                     $('meta[property="twitter:image"]').attr('content');

    // Resolve relative URLs
    if (logoUrl && !logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
      logoUrl = new URL(logoUrl, baseUrl).href;
    }
    if (ogImageUrl && !ogImageUrl.startsWith('http')) {
      ogImageUrl = new URL(ogImageUrl, baseUrl).href;
    }

    // Download and convert logo to base64
    let logoBase64: string | null = null;
    let logoType: 'svg' | 'png' | 'jpg' | 'ico' | 'webp' | null = null;

    if (logoUrl) {
      try {
        const logoResponse = await fetch(logoUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaiseReady/1.0)' },
        });

        if (logoResponse.ok) {
          const contentType = logoResponse.headers.get('content-type') || '';
          const buffer = await logoResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');

          if (contentType.includes('svg')) {
            logoType = 'svg';
            logoBase64 = `data:image/svg+xml;base64,${base64}`;
          } else if (contentType.includes('png')) {
            logoType = 'png';
            logoBase64 = `data:image/png;base64,${base64}`;
          } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
            logoType = 'jpg';
            logoBase64 = `data:image/jpeg;base64,${base64}`;
          } else if (contentType.includes('webp')) {
            logoType = 'webp';
            logoBase64 = `data:image/webp;base64,${base64}`;
          } else if (contentType.includes('ico') || logoUrl.endsWith('.ico')) {
            logoType = 'ico';
            logoBase64 = `data:image/x-icon;base64,${base64}`;
          } else {
            // Try to detect from URL
            if (logoUrl.endsWith('.svg')) {
              logoType = 'svg';
              logoBase64 = `data:image/svg+xml;base64,${base64}`;
            } else if (logoUrl.endsWith('.png')) {
              logoType = 'png';
              logoBase64 = `data:image/png;base64,${base64}`;
            } else {
              logoType = 'png'; // Default assumption
              logoBase64 = `data:image/png;base64,${base64}`;
            }
          }
        }
      } catch (err) {
        console.warn('Failed to download logo:', err);
      }
    }

    // Download OG image
    let ogImageBase64: string | null = null;
    if (ogImageUrl) {
      try {
        const ogResponse = await fetch(ogImageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RaiseReady/1.0)' },
        });

        if (ogResponse.ok) {
          const contentType = ogResponse.headers.get('content-type') || 'image/png';
          const buffer = await ogResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          ogImageBase64 = `data:${contentType};base64,${base64}`;
        }
      } catch (err) {
        console.warn('Failed to download OG image:', err);
      }
    }

    console.log(`Logo found: ${source || 'not found'}`);

    return NextResponse.json({
      success: true,
      logoUrl,
      logoBase64,
      logoType,
      source,
      ogImageUrl,
      ogImageBase64,
    });

  } catch (error) {
    console.error('Extract logo error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
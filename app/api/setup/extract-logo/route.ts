import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface ExtractLogoRequest {
  websiteUrl: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ExtractLogoRequest = await req.json();
    const { websiteUrl } = body;

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL required' }, { status: 400 });
    }

    console.log(`Extracting logo from: ${websiteUrl}`);

    // Fetch the website HTML
    let html = '';
    try {
      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      html = await response.text();
    } catch (err) {
      console.error('Failed to fetch website:', err);
      return NextResponse.json({ success: false, error: 'Failed to fetch website' }, { status: 500 });
    }

    const $ = cheerio.load(html);
    const baseUrl = new URL(websiteUrl);

    // Logo extraction with PRIORITY ORDER - header logos first!
    // The key insight: header/nav logos should be found FIRST, before portfolio sections
    const logoSelectors = [
      // HIGHEST PRIORITY: Header/Nav logos (these are the company's own logo)
      'header a[href="/"] img',
      'header a[href="./"] img',
      'header .logo img',
      'header img.logo',
      'header [class*="brand"] img',
      'header [class*="logo"] img:first-of-type',
      'nav a[href="/"] img',
      'nav a[href="./"] img',
      'nav .logo img',
      'nav img.logo',
      'nav [class*="brand"] img',
      'nav [class*="logo"] img:first-of-type',
      '[role="banner"] img',
      '.header [class*="logo"] img:first-of-type',
      '.navbar [class*="logo"] img:first-of-type',

      // HIGH PRIORITY: Top-level logo classes (often header area)
      '.logo:first-of-type img',
      '[class*="site-logo"] img',
      '[class*="main-logo"] img',
      '#logo img',
      '#site-logo img',

      // MEDIUM PRIORITY: Link to home with image (common pattern)
      'a[href="/"] img[src*="logo"]',
      'a[href="/"] img[alt*="logo" i]',
      'a[href="./"] img[src*="logo"]',
      'a[href="./"] img[alt*="logo" i]',

      // LOWER PRIORITY: General logo selectors (may match portfolio logos!)
      // Only use these if nothing else matches
      '[class*="logo"]:not([class*="portfolio"]):not([class*="company"]):not([class*="client"]) img:first-of-type',
      'img[src*="logo"]:not([class*="portfolio"]):not([class*="company"])',
      'img[alt*="logo" i]:first-of-type',

      // SVG logos (often inline)
      'header svg',
      'nav svg',
      '.logo svg',
    ];

    let logoUrl: string | null = null;
    let logoBase64: string | null = null;
    let logoType: string | null = null;
    let matchedSelector: string | null = null;

    // Try each selector in priority order
    for (const selector of logoSelectors) {
      const elements = $(selector);

      // Check each matched element
      for (let i = 0; i < elements.length; i++) {
        const el = elements.eq(i);

        // Skip if this looks like a portfolio/client logo
        const parentClasses = el.parents().map((_, p) => $(p).attr('class') || '').get().join(' ').toLowerCase();
        if (parentClasses.includes('portfolio') ||
            parentClasses.includes('client') ||
            parentClasses.includes('company-logo') ||
            parentClasses.includes('partner') ||
            parentClasses.includes('investment')) {
          console.log(`Skipping potential portfolio logo with selector: ${selector}`);
          continue;
        }

        let src: string | undefined;

        // Handle img elements
        if (el.is('img')) {
          src = el.attr('src') || el.attr('data-src') || el.attr('data-lazy-src');
        }
        // Handle SVG elements - skip for now, they're complex
        else if (el.is('svg')) {
          continue;
        }

        if (src) {
          // Resolve relative URLs
          try {
            const fullUrl = new URL(src, baseUrl).href;
            logoUrl = fullUrl;
            matchedSelector = selector;
            console.log(`Found logo with selector "${selector}": ${fullUrl}`);
            break;
          } catch {
            continue;
          }
        }
      }

      if (logoUrl) break;
    }

    // If found, fetch and convert to base64
    if (logoUrl) {
      try {
        const logoResponse = await fetch(logoUrl);
        if (logoResponse.ok) {
          const contentType = logoResponse.headers.get('content-type') || '';
          const buffer = await logoResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');

          // Determine logo type
          if (contentType.includes('svg')) {
            logoType = 'svg';
            logoBase64 = `data:image/svg+xml;base64,${base64}`;
          } else if (contentType.includes('png')) {
            logoType = 'png';
            logoBase64 = `data:image/png;base64,${base64}`;
          } else if (contentType.includes('jpg') || contentType.includes('jpeg')) {
            logoType = 'jpg';
            logoBase64 = `data:image/jpeg;base64,${base64}`;
          } else if (contentType.includes('webp')) {
            logoType = 'webp';
            logoBase64 = `data:image/webp;base64,${base64}`;
          } else {
            // Guess from URL
            if (logoUrl.endsWith('.svg')) {
              logoType = 'svg';
              logoBase64 = `data:image/svg+xml;base64,${base64}`;
            } else if (logoUrl.endsWith('.png')) {
              logoType = 'png';
              logoBase64 = `data:image/png;base64,${base64}`;
            } else {
              logoType = 'png';
              logoBase64 = `data:image/png;base64,${base64}`;
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch logo:', err);
      }
    }

    // Extract OG image as fallback/additional branding
    let ogImageUrl: string | null = null;
    let ogImageBase64: string | null = null;

    const ogImage = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="og:image"]').attr('content') ||
                   $('meta[property="twitter:image"]').attr('content');

    if (ogImage) {
      try {
        ogImageUrl = new URL(ogImage, baseUrl).href;

        const ogResponse = await fetch(ogImageUrl);
        if (ogResponse.ok) {
          const buffer = await ogResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const contentType = ogResponse.headers.get('content-type') || 'image/png';
          ogImageBase64 = `data:${contentType};base64,${base64}`;
        }
      } catch (err) {
        console.error('Failed to fetch OG image:', err);
      }
    }

    return NextResponse.json({
      success: true,
      logoUrl,
      logoBase64,
      logoType,
      source: matchedSelector ? `selector: ${matchedSelector}` : 'not found',
      ogImageUrl,
      ogImageBase64,
    });

  } catch (error) {
    console.error('Extract logo error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
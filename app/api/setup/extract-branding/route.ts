// app/api/setup/extract-branding/route.ts
// ============================================================================
// UNIFIED BRANDING EXTRACTION
//
// REPLACES: extract-styles, extract-logo, extract-website
//
// This extracts ONLY what we need for white-labeling:
// ✅ Colors (primary, accent, background) - from extract-styles
// ✅ Logo (with header priority, portfolio filtering) - from extract-logo
// ✅ Company name & tagline
// ✅ Investment thesis hints
// ✅ Platform type detection (NEW)
// ✅ Contact info
//
// This does NOT recreate the source website - it extracts branding to apply
// to the RaiseReady platform template.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

// ============================================================================
// TYPES
// ============================================================================

type PlatformType = 'impact_investor' | 'commercial_investor' | 'family_office' | 'founder_service_provider';

interface ExtractedBranding {
  company: {
    name: string;
    tagline: string;
    description: string;
    website: string;
  };
  colors: {
    primary: string;
    accent: string;
    background: string;
    text: string;
  };
  logo: {
    url: string | null;
    base64: string | null;
    type: string | null;
    source: string | null;
  };
  ogImage: {
    url: string | null;
    base64: string | null;
  };
  thesis: {
    focusAreas: string[];
    sectors: string[];
    stages: string[];
    philosophy: string;
    idealFounder: string;
  };
  contact: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
  };
  platformType: PlatformType;
}

// Default colors for when extraction fails
const DEFAULT_COLORS = {
  primary: '#3B82F6',    // Blue
  accent: '#10B981',     // Green
  background: '#0F172A', // Dark slate
  text: '#F8FAFC',       // Light text
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteUrl } = body;

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL required' }, { status: 400 });
    }

    console.log(`[extract-branding] Starting extraction for: ${websiteUrl}`);

    // Step 1: Fetch the website HTML
    let html = '';
    try {
      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      html = await response.text();
    } catch (err) {
      console.error('[extract-branding] Failed to fetch website:', err);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch website',
        branding: getDefaultBranding(websiteUrl),
      });
    }

    const $ = cheerio.load(html);
    const baseUrl = new URL(websiteUrl);

    // Step 2: Extract colors from HTML/CSS (from extract-styles)
    const extractedColors = extractColorsFromHtml(html);
    console.log('[extract-branding] Extracted colors:', extractedColors);

    // Step 3: Extract logo with priority ordering (from extract-logo)
    const logoResult = await extractLogo($, baseUrl);
    console.log('[extract-branding] Logo result:', logoResult.url ? 'Found' : 'Not found', logoResult.source);

    // Step 4: Extract OG image (from extract-logo)
    const ogResult = await extractOgImage($, baseUrl);

    // Step 5: Extract meta info
    const meta = extractMeta($);

    // Step 6: Extract contact info
    const contact = extractContact(html);

    // Step 7: Use Claude to analyze content and determine platform type
    const aiAnalysis = await analyzeWithClaude(html, websiteUrl, meta, extractedColors);

    // Step 8: Build final branding object
    const branding: ExtractedBranding = {
      company: {
        name: aiAnalysis.companyName || meta.title || extractDomainName(websiteUrl),
        tagline: aiAnalysis.tagline || meta.description || '',
        description: aiAnalysis.description || '',
        website: websiteUrl,
      },
      colors: {
        primary: sanitizeColor(aiAnalysis.colors?.primary || extractedColors.primary, DEFAULT_COLORS.primary),
        accent: sanitizeColor(aiAnalysis.colors?.accent || extractedColors.accent, DEFAULT_COLORS.accent),
        background: sanitizeColor(aiAnalysis.colors?.background || extractedColors.background, DEFAULT_COLORS.background),
        text: DEFAULT_COLORS.text,
      },
      logo: logoResult,
      ogImage: ogResult,
      thesis: {
        focusAreas: aiAnalysis.focusAreas || [],
        sectors: aiAnalysis.sectors || [],
        stages: aiAnalysis.stages || [],
        philosophy: aiAnalysis.philosophy || '',
        idealFounder: aiAnalysis.idealFounder || '',
      },
      contact,
      platformType: aiAnalysis.platformType || 'commercial_investor',
    };

    console.log('[extract-branding] Extraction complete');
    console.log('[extract-branding] Platform type:', branding.platformType);
    console.log('[extract-branding] Company:', branding.company.name);

    return NextResponse.json({
      success: true,
      branding,
      // Also return individual fields for backwards compatibility with existing wizard
      theme: { colors: branding.colors },
      thesis: branding.thesis.philosophy,
      sectors: branding.thesis.sectors,
      stages: branding.thesis.stages,
      description: branding.company.description,
      logoUrl: branding.logo.url,
      logoBase64: branding.logo.base64,
      logoType: branding.logo.type,
      ogImageUrl: branding.ogImage.url,
      ogImageBase64: branding.ogImage.base64,
    });

  } catch (error) {
    console.error('[extract-branding] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ============================================================================
// COLOR EXTRACTION (from extract-styles/route.ts)
// ============================================================================

function extractColorsFromHtml(html: string): { primary: string; accent: string; background: string } {
  const colors: string[] = [];

  // Extract hex colors (6-char)
  const hexMatches = html.match(/#[0-9A-Fa-f]{6}\b/g) || [];
  colors.push(...hexMatches);

  // Extract 3-char hex and expand them
  const hex3Matches = html.match(/#[0-9A-Fa-f]{3}\b/g) || [];
  for (const hex3 of hex3Matches) {
    if (hex3.length === 4) { // #RGB
      const expanded = `#${hex3[1]}${hex3[1]}${hex3[2]}${hex3[2]}${hex3[3]}${hex3[3]}`;
      colors.push(expanded);
    }
  }

  // Extract rgb colors and convert
  const rgbMatches = html.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g) || [];
  for (const rgb of rgbMatches) {
    const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      colors.push(`#${r}${g}${b}`);
    }
  }

  // Filter out common/non-brand colors
  const filteredColors = colors.filter(c => {
    const lower = c.toLowerCase();
    // Skip black, white, and very common grays
    const commonColors = [
      '#000000', '#ffffff', '#fff', '#000',
      '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3',
      '#737373', '#525252', '#404040', '#262626', '#171717',
      '#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8',
    ];
    return !commonColors.includes(lower);
  });

  // Count occurrences
  const colorCounts: Record<string, number> = {};
  for (const color of filteredColors) {
    const normalized = color.toLowerCase();
    colorCounts[normalized] = (colorCounts[normalized] || 0) + 1;
  }

  // Sort by frequency
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  return {
    primary: sortedColors[0] || '',
    accent: sortedColors[1] || '',
    background: sortedColors[2] || '',
  };
}

// Validate and sanitize hex color (from extract-styles)
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();

  // If it's already a valid 6-char hex
  if (isValidHexColor(trimmed)) return trimmed;

  // If it's a 3-char hex, expand it
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }

  // If it's missing the #, add it
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  if (/^[0-9A-Fa-f]{3}$/.test(trimmed)) {
    return `#${trimmed[0]}${trimmed[0]}${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}`;
  }

  return fallback;
}

// ============================================================================
// LOGO EXTRACTION (from extract-logo/route.ts - excellent logic!)
// ============================================================================

async function extractLogo(
  $: cheerio.CheerioAPI,
  baseUrl: URL
): Promise<{ url: string | null; base64: string | null; type: string | null; source: string | null }> {

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
  ];

  let logoUrl: string | null = null;
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
        console.log(`[extract-branding] Skipping potential portfolio logo with selector: ${selector}`);
        continue;
      }

      // Handle img elements
      if (el.is('img')) {
        const src = el.attr('src') || el.attr('data-src') || el.attr('data-lazy-src');
        if (src) {
          try {
            logoUrl = new URL(src, baseUrl).href;
            matchedSelector = selector;
            console.log(`[extract-branding] Found logo with selector "${selector}": ${logoUrl}`);
            break;
          } catch {
            continue;
          }
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

        let logoType = 'png';
        let dataUrl = '';

        if (contentType.includes('svg') || logoUrl.endsWith('.svg')) {
          logoType = 'svg';
          dataUrl = `data:image/svg+xml;base64,${base64}`;
        } else if (contentType.includes('png') || logoUrl.endsWith('.png')) {
          logoType = 'png';
          dataUrl = `data:image/png;base64,${base64}`;
        } else if (contentType.includes('jpg') || contentType.includes('jpeg')) {
          logoType = 'jpg';
          dataUrl = `data:image/jpeg;base64,${base64}`;
        } else if (contentType.includes('webp') || logoUrl.endsWith('.webp')) {
          logoType = 'webp';
          dataUrl = `data:image/webp;base64,${base64}`;
        } else {
          dataUrl = `data:image/png;base64,${base64}`;
        }

        return {
          url: logoUrl,
          base64: dataUrl,
          type: logoType,
          source: matchedSelector,
        };
      }
    } catch (err) {
      console.error('[extract-branding] Failed to fetch logo:', err);
    }
  }

  return { url: null, base64: null, type: null, source: null };
}

// ============================================================================
// OG IMAGE EXTRACTION (from extract-logo/route.ts)
// ============================================================================

async function extractOgImage(
  $: cheerio.CheerioAPI,
  baseUrl: URL
): Promise<{ url: string | null; base64: string | null }> {

  const ogImage = $('meta[property="og:image"]').attr('content') ||
                  $('meta[name="og:image"]').attr('content') ||
                  $('meta[property="twitter:image"]').attr('content');

  if (!ogImage) {
    return { url: null, base64: null };
  }

  try {
    const ogImageUrl = new URL(ogImage, baseUrl).href;
    const ogResponse = await fetch(ogImageUrl);

    if (ogResponse.ok) {
      const buffer = await ogResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = ogResponse.headers.get('content-type') || 'image/png';
      return {
        url: ogImageUrl,
        base64: `data:${contentType};base64,${base64}`,
      };
    }
  } catch (err) {
    console.error('[extract-branding] Failed to fetch OG image:', err);
  }

  return { url: null, base64: null };
}

// ============================================================================
// META EXTRACTION
// ============================================================================

function extractMeta($: cheerio.CheerioAPI): { title: string; description: string } {
  const title = $('title').text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                $('meta[name="title"]').attr('content') ||
                '';

  const description = $('meta[name="description"]').attr('content') ||
                      $('meta[property="og:description"]').attr('content') ||
                      '';

  return { title, description };
}

// ============================================================================
// CONTACT EXTRACTION
// ============================================================================

function extractContact(html: string): { email: string | null; phone: string | null; linkedin: string | null } {
  // Email
  const emailMatch = html.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);

  // Phone (various formats)
  const phoneMatch = html.match(/(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);

  // LinkedIn
  const linkedinMatch = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^"'\s<>]+/i);

  return {
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    linkedin: linkedinMatch ? linkedinMatch[0] : null,
  };
}

// ============================================================================
// CLAUDE ANALYSIS - Platform type detection & thesis extraction (enhanced)
// ============================================================================

async function analyzeWithClaude(
  html: string,
  url: string,
  meta: { title: string; description: string },
  extractedColors: { primary: string; accent: string; background: string }
) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    console.log('[extract-branding] No Anthropic API key, skipping AI analysis');
    return {
      companyName: meta.title,
      tagline: meta.description,
      platformType: 'commercial_investor' as PlatformType,
    };
  }

  // Strip HTML to plain text, limit size
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000);

  const prompt = `Analyze this website and extract information for a white-label pitch coaching platform.

Website: ${url}
Title: ${meta.title}
Description: ${meta.description}

Pre-extracted colors from CSS (may be incomplete):
- Primary: ${extractedColors.primary || 'not found'}
- Accent: ${extractedColors.accent || 'not found'}
- Background: ${extractedColors.background || 'not found'}

Content excerpt:
${textContent}

Return a JSON object with these fields:
{
  "companyName": "Their company/brand name (clean, no taglines)",
  "tagline": "Their main value proposition (one sentence)",
  "description": "What they do (2-3 sentences)",
  "platformType": "One of: impact_investor, commercial_investor, family_office, founder_service_provider",
  "focusAreas": ["3-6 investment or service focus areas"],
  "sectors": ["Industry sectors they focus on"],
  "stages": ["Investment stages like Pre-Seed, Seed, Series A"],
  "philosophy": "Their investment or service philosophy (one sentence)",
  "idealFounder": "Description of founders they want to work with",
  "colors": {
    "primary": "#XXXXXX",
    "accent": "#XXXXXX",
    "background": "#XXXXXX"
  }
}

PLATFORM TYPE DETECTION GUIDE:
- impact_investor: Mentions ESG, SDG, impact, social good, environmental, sustainable, mission-driven, climate, clean energy
- commercial_investor: Traditional VC/PE, focuses on growth, returns, scalability, market size, exits
- family_office: Family investment office, patient capital, values-driven, long-term, multi-generational
- founder_service_provider: Accelerator, incubator, advisor, consultant, coach, law firm (NOT an investor themselves)

COLOR RULES:
- Return valid 6-char hex codes like #3B82F6
- If colors weren't found in CSS, make educated guesses based on the brand/industry
- NEVER return text like "Unable to confirm" - always return a valid hex code
- Dark backgrounds are common for VC: #0F172A, #111827
- Common VC primaries: #3B82F6 (blue), #8B5CF6 (purple), #10B981 (green)

Be concise. This data will configure a pitch coaching platform branded for them.`;

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[extract-branding] AI analysis complete, platform type:', parsed.platformType);
        return parsed;
      }
    }
  } catch (err) {
    console.error('[extract-branding] Claude analysis error:', err);
  }

  // Fallback
  return {
    companyName: meta.title || extractDomainName(url),
    tagline: meta.description || '',
    description: '',
    platformType: 'commercial_investor' as PlatformType,
    focusAreas: [],
    sectors: [],
    stages: [],
    philosophy: '',
    idealFounder: '',
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function extractDomainName(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0]
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch {
    return 'Company';
  }
}

function getDefaultBranding(websiteUrl: string): ExtractedBranding {
  return {
    company: {
      name: extractDomainName(websiteUrl),
      tagline: '',
      description: '',
      website: websiteUrl,
    },
    colors: DEFAULT_COLORS,
    logo: { url: null, base64: null, type: null, source: null },
    ogImage: { url: null, base64: null },
    thesis: {
      focusAreas: [],
      sectors: [],
      stages: [],
      philosophy: '',
      idealFounder: '',
    },
    contact: { email: null, phone: null, linkedin: null },
    platformType: 'commercial_investor',
  };
}
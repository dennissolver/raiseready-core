// app/api/setup/extract-from-website/route.ts
// ============================================================================
// WEBSITE CONTENT EXTRACTION
// Scrapes client website and uses AI to extract company info, thesis, colors
// Used during initial setup to seed the platform
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl } = await request.json();

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    console.log('Extracting from website:', websiteUrl);

    // Step 1: Fetch website HTML (for both text and color analysis)
    const { textContent, rawHtml } = await scrapeWebsite(websiteUrl);

    if (!textContent) {
      return NextResponse.json({ error: 'Could not fetch website content' }, { status: 400 });
    }

    // Step 2: Extract colors from HTML/CSS
    const extractedColors = extractColorsFromHtml(rawHtml);
    console.log('Extracted colors from HTML:', extractedColors);

    // Step 3: Use Claude to extract structured data
    const extractedData = await extractWithAI(textContent, websiteUrl, extractedColors);

    // Return flat structure that setup page expects
    return NextResponse.json({
      success: true,
      // These are what setup page looks for:
      thesis: extractedData.thesis,
      branding: {
        primary: extractedData.branding?.primary || '#3B82F6',
        accent: extractedData.branding?.accent || '#10B981',
        background: extractedData.branding?.background || '#0F172A',
      },
      company: extractedData.company,
      coaching: extractedData.coaching,
      offices: extractedData.offices,
      socialLinks: extractedData.socialLinks,
      confidence: extractedData.confidence,
    });

  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function scrapeWebsite(url: string): Promise<{ textContent: string; rawHtml: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RaiseReadyBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const rawHtml = await response.text();

    // Extract text content (remove scripts, styles, etc)
    const textContent = rawHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000);

    return { textContent, rawHtml };
  } catch (error) {
    console.error('Scrape error:', error);
    throw error;
  }
}

function extractColorsFromHtml(html: string): { primary?: string; accent?: string; background?: string } {
  const colors: { primary?: string; accent?: string; background?: string } = {};

  // Regex patterns for hex colors
  const hexPattern = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g;

  // Find all hex colors in the HTML
  const allColors = html.match(hexPattern) || [];

  // Count color occurrences
  const colorCounts: Record<string, number> = {};
  allColors.forEach(color => {
    // Normalize to 6-digit hex
    const normalized = color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
    colorCounts[normalized.toUpperCase()] = (colorCounts[normalized.toUpperCase()] || 0) + 1;
  });

  // Filter out common non-brand colors (black, white, grays)
  const nonBrandColors = ['#FFFFFF', '#000000', '#F8F8F8', '#F5F5F5', '#EEEEEE', '#E5E5E5', '#CCCCCC', '#999999', '#666666', '#333333'];

  const brandColors = Object.entries(colorCounts)
    .filter(([color]) => !nonBrandColors.includes(color))
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  // Try to extract colors from CSS variables or inline styles
  const primaryMatch = html.match(/--primary[^:]*:\s*(#[0-9A-Fa-f]{3,6})/i);
  const accentMatch = html.match(/--accent[^:]*:\s*(#[0-9A-Fa-f]{3,6})/i);
  const bgMatch = html.match(/--background[^:]*:\s*(#[0-9A-Fa-f]{3,6})/i);

  if (primaryMatch) colors.primary = primaryMatch[1];
  if (accentMatch) colors.accent = accentMatch[1];
  if (bgMatch) colors.background = bgMatch[1];

  // If no CSS variables found, use most common brand colors
  if (!colors.primary && brandColors.length > 0) {
    colors.primary = brandColors[0];
  }
  if (!colors.accent && brandColors.length > 1) {
    colors.accent = brandColors[1];
  }

  // Look for background in body or main styles
  const bodyBgMatch = html.match(/body[^{]*{[^}]*background(?:-color)?:\s*(#[0-9A-Fa-f]{3,6})/i);
  if (bodyBgMatch && !colors.background) {
    colors.background = bodyBgMatch[1];
  }

  return colors;
}

async function extractWithAI(
  content: string,
  url: string,
  htmlColors: { primary?: string; accent?: string; background?: string }
): Promise<ExtractedClientData> {
  const prompt = `
You are analyzing a company website to extract information for setting up an AI-powered pitch coaching platform.

Website URL: ${url}

Website Content:
${content}

Colors already extracted from HTML/CSS:
- Primary: ${htmlColors.primary || 'not found'}
- Accent: ${htmlColors.accent || 'not found'}
- Background: ${htmlColors.background || 'not found'}

Extract the following information and return as JSON. If information is not found, make reasonable inferences based on the content, or use null.

{
  "company": {
    "name": "Company name",
    "tagline": "Main tagline or slogan",
    "description": "One paragraph description of what they do",
    "industry": "Primary industry (e.g., 'Law Firm', 'Venture Capital', 'Accelerator', 'Consultancy')"
  },
  "thesis": {
    "focusAreas": ["Array of 3-5 focus areas or specialties"],
    "sectors": ["Array of sectors they focus on"],
    "stages": ["Array of investment/company stages they work with"],
    "geographies": ["Array of geographic regions"],
    "philosophy": "Their investment/business philosophy in 1-2 sentences",
    "idealFounder": "Description of their ideal founder/client profile",
    "dealBreakers": ["Array of 3-5 things they avoid or red flags"]
  },
  "coaching": {
    "methodology": "Their unique methodology or approach to helping founders",
    "scoringFocus": "storytelling OR impact OR growth - pick the best fit",
    "suggestedCoachName": "Suggest an appropriate AI coach name that fits their brand",
    "suggestedPersonality": "Describe the ideal personality for their AI coach (warm/direct/formal/etc)"
  },
  "branding": {
    "primary": "${htmlColors.primary || 'Suggest a hex color based on their brand (e.g., #3B82F6)'}",
    "accent": "${htmlColors.accent || 'Suggest an accent hex color (e.g., #10B981)'}",
    "background": "${htmlColors.background || 'Suggest background hex color, dark theme preferred (e.g., #0F172A)'}",
    "themeMode": "dark OR light - based on their website style",
    "tone": "professional OR friendly OR bold - overall brand tone"
  },
  "offices": [
    {
      "country": "Country name",
      "city": "City if found",
      "address": "Full address if found"
    }
  ],
  "socialLinks": {
    "linkedin": "LinkedIn URL or null",
    "twitter": "Twitter URL or null",
    "youtube": "YouTube URL or null"
  },
  "confidence": {
    "overall": 0.0-1.0,
    "notes": "Any notes about what was inferred vs explicitly found"
  }
}

IMPORTANT: 
- For branding colors, if I provided hex colors from HTML, use those exact values.
- If colors were not found in HTML, suggest appropriate colors based on the brand.
- Always return valid 6-digit hex colors (e.g., #3B82F6, not #rgb or color names).

Return ONLY valid JSON, no markdown or explanation.
`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    // Clean up potential markdown formatting
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse AI response:', text);
    throw new Error('Failed to parse extracted data');
  }
}

// Type definitions
interface ExtractedClientData {
  company: {
    name: string;
    tagline: string;
    description: string;
    industry: string;
  };
  thesis: {
    focusAreas: string[];
    sectors: string[];
    stages: string[];
    geographies: string[];
    philosophy: string;
    idealFounder: string;
    dealBreakers: string[];
  };
  coaching: {
    methodology: string;
    scoringFocus: 'storytelling' | 'impact' | 'growth';
    suggestedCoachName: string;
    suggestedPersonality: string;
  };
  branding: {
    primary: string;
    accent: string;
    background: string;
    themeMode: 'dark' | 'light';
    tone: 'professional' | 'friendly' | 'bold';
  };
  offices: Array<{
    country: string;
    city?: string;
    address?: string;
  }>;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  confidence: {
    overall: number;
    notes: string;
  };
}
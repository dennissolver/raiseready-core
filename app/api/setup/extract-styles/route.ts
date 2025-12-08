import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface ExtractStylesRequest {
  websiteUrl: string;
}

// Validate hex color - must be #XXXXXX format
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Ensure we always return valid hex colors
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

  // Otherwise return fallback
  return fallback;
}

// Default colors for when extraction fails
const DEFAULT_COLORS = {
  primary: '#3B82F6',    // Blue
  accent: '#10B981',     // Green
  background: '#0F172A', // Dark slate
};

export async function POST(req: NextRequest) {
  try {
    const body: ExtractStylesRequest = await req.json();
    const { websiteUrl } = body;

    if (!websiteUrl) {
      return NextResponse.json({ error: 'Website URL required' }, { status: 400 });
    }

    // Step 1: Fetch the website HTML
    console.log(`Fetching website: ${websiteUrl}`);

    let html = '';
    try {
      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RaiseReady/1.0)',
        },
      });
      html = await response.text();
    } catch (err) {
      console.error('Failed to fetch website:', err);
      return NextResponse.json({
        success: true,
        theme: { colors: DEFAULT_COLORS },
        thesis: '',
        sectors: [],
        stages: [],
        description: '',
      });
    }

    // Step 2: Extract colors from HTML/CSS
    const extractedColors = extractColorsFromHtml(html);
    console.log('Extracted colors from HTML:', extractedColors);

    // Step 3: Use Claude to analyze the content and refine colors
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicKey) {
      // Return extracted colors with validation
      return NextResponse.json({
        success: true,
        theme: {
          colors: {
            primary: sanitizeColor(extractedColors.primary, DEFAULT_COLORS.primary),
            accent: sanitizeColor(extractedColors.accent, DEFAULT_COLORS.accent),
            background: sanitizeColor(extractedColors.background, DEFAULT_COLORS.background),
          }
        },
        thesis: '',
        sectors: [],
        stages: [],
        description: '',
      });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const prompt = `Analyze this website HTML and extract:
1. The company's investment thesis or philosophy (if it's an investment firm)
2. Their focus sectors
3. Their investment stages
4. A brief company description
5. Brand colors - you MUST return valid hex color codes (e.g. #FF5733)

Pre-extracted colors from CSS (may be incomplete):
- Primary: ${extractedColors.primary || 'not found'}
- Accent: ${extractedColors.accent || 'not found'}
- Background: ${extractedColors.background || 'not found'}

HTML content (truncated):
${html.substring(0, 15000)}

CRITICAL INSTRUCTIONS FOR COLORS:
- You MUST return valid 6-character hex codes (like #3B82F6, #10B981, #0F172A)
- If you cannot find exact colors in the HTML, make an educated guess based on:
  - Any color names mentioned (e.g., "teal" = #14B8A6, "navy" = #1E3A5A)
  - The overall brand tone/industry
  - CSS variable names that suggest colors
- NEVER return text like "Unable to confirm" - always return a valid hex code
- For VC/investment firms, common colors are: dark backgrounds (#0F172A, #111827), blue primaries (#3B82F6, #2563EB), green accents (#10B981, #22C55E)

Respond in JSON format only:
{
  "thesis": "their investment philosophy in 2-3 sentences",
  "sectors": ["sector1", "sector2"],
  "stages": ["stage1", "stage2"],
  "colors": {
    "primary": "#XXXXXX",
    "accent": "#XXXXXX", 
    "background": "#XXXXXX"
  },
  "companyDescription": "brief description"
}`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // Validate and sanitize all colors - CRITICAL: always return valid hex
          const validatedColors = {
            primary: sanitizeColor(parsed.colors?.primary, extractedColors.primary || DEFAULT_COLORS.primary),
            accent: sanitizeColor(parsed.colors?.accent, extractedColors.accent || DEFAULT_COLORS.accent),
            background: sanitizeColor(parsed.colors?.background, extractedColors.background || DEFAULT_COLORS.background),
          };

          console.log('Final validated colors:', validatedColors);

          return NextResponse.json({
            success: true,
            theme: {
              colors: validatedColors,
            },
            thesis: parsed.thesis || '',
            sectors: parsed.sectors || [],
            stages: parsed.stages || [],
            description: parsed.companyDescription || '',
          });
        }
      }
    } catch (err) {
      console.error('Claude analysis error:', err);
    }

    // Fallback: Return extracted colors with validation
    return NextResponse.json({
      success: true,
      theme: {
        colors: {
          primary: sanitizeColor(extractedColors.primary, DEFAULT_COLORS.primary),
          accent: sanitizeColor(extractedColors.accent, DEFAULT_COLORS.accent),
          background: sanitizeColor(extractedColors.background, DEFAULT_COLORS.background),
        }
      },
      thesis: '',
      sectors: [],
      stages: [],
      description: '',
    });

  } catch (error) {
    console.error('Extract styles error:', error);
    return NextResponse.json({
      success: true,
      theme: { colors: DEFAULT_COLORS },
      thesis: '',
      sectors: [],
      stages: [],
      description: '',
    });
  }
}

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
    if (['#000000', '#ffffff', '#fff', '#000', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717'].includes(lower)) {
      return false;
    }
    return true;
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
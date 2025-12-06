import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface ExtractStylesRequest {
  websiteUrl: string;
}

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
        error: 'Could not fetch website',
        theme: getDefaultTheme(),
        thesis: '',
      });
    }

    // Step 2: Extract colors from HTML/CSS
    const extractedColors = extractColorsFromHtml(html);

    // Step 3: Use Claude to analyze the content
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    if (!anthropicKey) {
      return NextResponse.json({
        theme: { colors: extractedColors },
        thesis: '',
      });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const prompt = `Analyze this website HTML and extract:
1. The company's investment thesis or philosophy (if it's an investment firm)
2. Their focus sectors
3. Their investment stages
4. Any other relevant information about their approach

Also confirm or refine these extracted brand colors:
- Primary: ${extractedColors.primary}
- Accent: ${extractedColors.accent}
- Background: ${extractedColors.background}

HTML content (truncated):
${html.substring(0, 15000)}

Respond in JSON format:
{
  "thesis": "their investment philosophy in 2-3 sentences",
  "sectors": ["sector1", "sector2"],
  "stages": ["stage1", "stage2"],
  "colors": {
    "primary": "#hex",
    "accent": "#hex",
    "background": "#hex"
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
          return NextResponse.json({
            success: true,
            theme: {
              colors: parsed.colors || extractedColors,
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

    // Return extracted colors even if Claude fails
    return NextResponse.json({
      theme: { colors: extractedColors },
      thesis: '',
    });

  } catch (error) {
    console.error('Extract styles error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      theme: getDefaultTheme(),
    }, { status: 500 });
  }
}

function extractColorsFromHtml(html: string): { primary: string; accent: string; background: string } {
  const colors: string[] = [];
  
  // Extract hex colors
  const hexMatches = html.match(/#[0-9A-Fa-f]{6}\b/g) || [];
  colors.push(...hexMatches);

  // Extract rgb colors and convert
  const rgbMatches = html.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g) || [];
  for (const rgb of rgbMatches) {
    const match = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (match) {
      const hex = '#' + [match[1], match[2], match[3]]
        .map(x => parseInt(x).toString(16).padStart(2, '0'))
        .join('');
      colors.push(hex);
    }
  }

  // Count occurrences and filter out common colors
  const colorCounts = new Map<string, number>();
  const commonColors = ['#000000', '#ffffff', '#fff', '#000', '#333333', '#666666', '#999999'];
  
  for (const color of colors) {
    const normalized = color.toLowerCase();
    if (!commonColors.includes(normalized)) {
      colorCounts.set(normalized, (colorCounts.get(normalized) || 0) + 1);
    }
  }

  // Sort by frequency
  const sortedColors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  return {
    primary: sortedColors[0] || '#3B82F6',
    accent: sortedColors[1] || '#10B981',
    background: sortedColors[2] || '#0F172A',
  };
}

function getDefaultTheme() {
  return {
    colors: {
      primary: '#3B82F6',
      accent: '#10B981',
      background: '#0F172A',
    },
  };
}

// app/api/setup/extract-from-website/route.ts
// ============================================================================
// WEBSITE CONTENT EXTRACTION
// Scrapes client website and uses AI to extract company info, thesis, methodology
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

    // Step 1: Fetch website content
    const websiteContent = await scrapeWebsite(websiteUrl);

    if (!websiteContent) {
      return NextResponse.json({ error: 'Could not fetch website content' }, { status: 400 });
    }

    // Step 2: Use Claude to extract structured data
    const extractedData = await extractWithAI(websiteContent, websiteUrl);

    return NextResponse.json({
      success: true,
      extracted: extractedData,
      rawContentLength: websiteContent.length,
    });

  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function scrapeWebsite(url: string): Promise<string> {
  try {
    // Fetch main page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RaiseReadyBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML to text extraction (remove scripts, styles, extract text)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 15000); // Limit to ~15k chars for API

    return textContent;
  } catch (error) {
    console.error('Scrape error:', error);
    throw error;
  }
}

async function extractWithAI(content: string, url: string): Promise<ExtractedClientData> {
  const prompt = `
You are analyzing a company website to extract information for setting up an AI-powered pitch coaching platform.

Website URL: ${url}

Website Content:
${content}

Extract the following information and return as JSON. If information is not found, make reasonable inferences based on the content, or use null.

{
  "company": {
    "name": "Company name",
    "tagline": "Main tagline or slogan",
    "description": "One paragraph description of what they do",
    "industry": "Primary industry (e.g., 'Fundraising Advisory', 'Venture Capital', 'Accelerator')"
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
    "primaryColor": "Suggest a hex color based on their brand (e.g., #EF4444)",
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
    primaryColor: string;
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

// app/api/voice-coach/generate-feedback/route.ts
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import type { VoiceFeedbackInsert } from '@/types/voice-coaching';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function POST(req: Request) {
  try {
    const { sessionId, transcript, mode, persona, projectData } = await req.json();

    if (!sessionId || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate feedback using Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Analyze this founder's pitch practice session and provide detailed feedback.

Context:
- Project: ${projectData?.name || 'Unknown'}
- SDG Focus: ${projectData?.sdgs?.join(', ') || 'Not specified'}
- Coaching Mode: ${mode}
${persona ? `- Investor Persona: ${persona}` : ''}

Transcript:
${transcript}

Provide structured feedback in JSON format with these fields:
{
  "overall_score": 0-100,
  "sdg_alignment_score": 0-100,
  "sdg_alignment_feedback": "specific feedback on SDG articulation (2-3 sentences)",
  "impact_clarity_score": 0-100,
  "impact_clarity_feedback": "feedback on impact messaging clarity (2-3 sentences)",
  "financial_logic_score": 0-100,
  "financial_logic_feedback": "feedback on business model and financials (2-3 sentences)",
  "delivery_quality_score": 0-100,
  "delivery_quality_feedback": "feedback on presentation skills and delivery (2-3 sentences)",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "improvements": ["actionable improvement 1", "actionable improvement 2", "actionable improvement 3"],
  "recommendations": ["next step 1", "next step 2", "next step 3"]
}

Be constructive, specific, and actionable. Focus on helping impact founders improve their pitch for impact investors.

IMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON object. Do not use markdown code blocks.`
      }],
      system: 'You are an expert pitch coach for impact investors. Provide honest, specific, actionable feedback to help founders improve. Always respond with valid JSON only, no additional text or formatting.'
    });

    // Type-safe way to get text from response
    const firstBlock = response.content[0];
    if (firstBlock.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    const feedbackText = firstBlock.text;

    // Clean up response (remove markdown if present)
    let cleanedText = feedbackText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    // Parse JSON response
    const feedbackData = JSON.parse(cleanedText);

    // Save to database
    const supabase = await createClient();

    // Get session to find user_id and project_id
    const { data: session } = await supabase
      .from('voice_sessions')
      .select('user_id, project_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const feedback: VoiceFeedbackInsert = {
      session_id: sessionId,
      user_id: session.user_id,
      project_id: session.project_id,
      overall_score: feedbackData.overall_score,
      sdg_alignment_score: feedbackData.sdg_alignment_score,
      sdg_alignment_feedback: feedbackData.sdg_alignment_feedback,
      impact_clarity_score: feedbackData.impact_clarity_score,
      impact_clarity_feedback: feedbackData.impact_clarity_feedback,
      financial_logic_score: feedbackData.financial_logic_score,
      financial_logic_feedback: feedbackData.financial_logic_feedback,
      delivery_quality_score: feedbackData.delivery_quality_score,
      delivery_quality_feedback: feedbackData.delivery_quality_feedback,
      strengths: feedbackData.strengths,
      improvements: feedbackData.improvements,
      recommendations: feedbackData.recommendations
    };

    const { error } = await supabase
      .from('voice_feedback')
      .insert(feedback);

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      feedback: feedbackData
    });

  } catch (error: any) {
    console.error('Feedback generation error:', error);

    // More detailed error response
    return NextResponse.json(
      {
        error: 'Failed to generate feedback',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

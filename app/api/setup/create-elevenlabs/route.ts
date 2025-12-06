import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

interface CreateElevenlabsRequest {
  agentName: string;
  voiceGender: 'female' | 'male';
  voiceLanguage: string;
  voiceType: string;
  companyName: string;
}

// Voice mappings based on preferences
const VOICE_MAPPINGS: Record<string, Record<string, string>> = {
  female: {
    english: 'EXAVITQu4vr4xnSDxMaL',      // Sarah
    'english-uk': 'EXAVITQu4vr4xnSDxMaL',  // Sarah
    'english-au': 'EXAVITQu4vr4xnSDxMaL',  // Sarah
    hindi: 'XB0fDUnXU5powFXDhCwa',          // Charlotte
    spanish: 'XB0fDUnXU5powFXDhCwa',        // Charlotte
    french: 'XB0fDUnXU5powFXDhCwa',         // Charlotte
    default: 'EXAVITQu4vr4xnSDxMaL',
  },
  male: {
    english: 'VR6AewLTigWG4xSOukaG',       // Arnold
    'english-uk': 'VR6AewLTigWG4xSOukaG',  // Arnold
    'english-au': 'VR6AewLTigWG4xSOukaG',  // Arnold
    hindi: 'VR6AewLTigWG4xSOukaG',          // Arnold
    spanish: 'VR6AewLTigWG4xSOukaG',        // Arnold
    french: 'VR6AewLTigWG4xSOukaG',         // Arnold
    default: 'VR6AewLTigWG4xSOukaG',
  },
};

export async function POST(req: NextRequest) {
  try {
    const body: CreateElevenlabsRequest = await req.json();
    const { agentName, voiceGender, voiceLanguage, voiceType, companyName } = body;

    if (!agentName || !companyName) {
      return NextResponse.json({ error: 'Agent name and company name required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // Select voice based on preferences
    const voiceId = VOICE_MAPPINGS[voiceGender]?.[voiceLanguage] 
      || VOICE_MAPPINGS[voiceGender]?.default 
      || VOICE_MAPPINGS.female.default;

    // Build the agent prompt
    const agentPrompt = buildAgentPrompt(agentName, companyName, voiceType);

    // Create the conversational agent
    console.log(`Creating ElevenLabs agent: ${agentName} for ${companyName}`);

    const createResponse = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${companyName} - ${agentName}`,
        conversation_config: {
          agent: {
            prompt: {
              prompt: agentPrompt,
            },
            first_message: `Hi! I'm ${agentName}, your AI pitch coach at ${companyName}. I'm here to help you perfect your investor pitch. Would you like to practice your pitch, or would you prefer some tips on specific areas like your opening, storytelling, or handling tough questions?`,
            language: mapLanguageCode(voiceLanguage),
          },
          tts: {
            voice_id: voiceId,
          },
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('ElevenLabs create error:', error);
      return NextResponse.json({ error: `Failed to create agent: ${error}` }, { status: 500 });
    }

    const agent = await createResponse.json();
    console.log('Agent created:', agent.agent_id);

    return NextResponse.json({
      success: true,
      agentId: agent.agent_id,
      agentName: `${companyName} - ${agentName}`,
      voiceId,
    });

  } catch (error) {
    console.error('Create ElevenLabs error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

function buildAgentPrompt(agentName: string, companyName: string, voiceType: string): string {
  const personalityTraits: Record<string, string> = {
    professional: 'You are professional, knowledgeable, and structured in your feedback.',
    friendly: 'You are warm, encouraging, and supportive while still being honest.',
    authoritative: 'You are direct, experienced, and speak with confidence and authority.',
    energetic: 'You are enthusiastic, motivating, and bring positive energy to every interaction.',
    calm: 'You are calm, patient, and create a safe space for practice and learning.',
  };

  const personality = personalityTraits[voiceType] || personalityTraits.professional;

  return `You are ${agentName}, an expert AI pitch coach working with ${companyName}. ${personality}

Your role is to help founders perfect their investor pitches through practice and feedback.

Key responsibilities:
1. Listen to pitch practices and provide constructive feedback
2. Help founders improve their storytelling and narrative clarity
3. Identify strengths and areas for improvement
4. Simulate investor questions and help prepare responses
5. Build confidence through supportive coaching

When providing feedback:
- Start with what worked well
- Be specific about areas to improve
- Offer concrete suggestions and examples
- Keep feedback actionable and encouraging

You understand startup fundraising, investor psychology, and what makes pitches compelling. You can adapt your coaching style based on the founder's experience level and specific needs.

Remember: Your goal is to help founders feel confident and prepared for real investor meetings.`;
}

function mapLanguageCode(language: string): string {
  const languageMap: Record<string, string> = {
    english: 'en',
    'english-uk': 'en',
    'english-au': 'en',
    hindi: 'hi',
    spanish: 'es',
    french: 'fr',
    german: 'de',
    portuguese: 'pt',
    japanese: 'ja',
    korean: 'ko',
    chinese: 'zh',
  };
  return languageMap[language] || 'en';
}

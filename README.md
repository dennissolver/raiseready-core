# RaiseReady Voice Coach Module

**AI-powered voice coaching for impact investing pitches and discovery sessions**

## Overview

This module provides sophisticated voice coaching capabilities for RaiseReady Impact, enabling founders to practice their pitches and investors to conduct discovery sessions with AI-powered coaching assistance.

## Features

### 🎤 Three Coaching Modes

1. **Interactive Coaching** (`interrupt`)
   - AI provides real-time feedback during the pitch
   - Stops you when it notices issues or opportunities
   - Immediate, actionable suggestions
   - Best for: Refining specific sections of your pitch

2. **Full Pitch Review** (`full_listen`)
   - Complete your entire pitch uninterrupted
   - Receive comprehensive feedback afterward
   - Detailed analysis of content, delivery, and impact
   - Best for: Final run-throughs and complete assessments

3. **Investor Simulation** (`investor_sim`)
   - AI acts as a real investor with questions and challenges
   - Three personality types (see below)
   - Tests your knowledge and preparedness
   - Best for: Realistic pitch practice

### 👔 Three Investor Personas (for Investor Simulation mode)

1. **Supportive Investor** (`easy_going`)
   - Friendly, encouraging approach
   - Asks clarifying questions
   - Celebrates strong points
   - Good for: Building confidence, first practices

2. **Excited Investor** (`enthusiastic`)
   - High energy, rapid-fire questions
   - Visible excitement about innovations
   - Forward-leaning engagement
   - Good for: Handling enthusiastic investors, thinking on feet

3. **Skeptical Investor** (`aggressive`)
   - Challenging, analytical approach
   - Stress-tests assumptions
   - Direct and blunt feedback
   - Good for: Preparing for tough meetings, identifying weaknesses

## Architecture

### Self-Contained Module Structure

```
/modules/voice-coach/
├── /components/          # React UI components (to be built)
├── /lib/                 # Core business logic
│   └── session-manager.ts    # VoiceSessionManager class
├── /hooks/              # React hooks
│   └── useVoiceSession.ts    # Main hook for components
├── /types/              # TypeScript definitions
│   ├── voice-session.ts      # Core types
│   ├── coaching-modes.ts     # Mode configurations
│   └── investor-personas.ts  # Persona definitions
├── /services/           # External integrations
│   └── supabase-sessions.ts  # Database persistence
└── /config/             # Configuration
    ├── coaching-modes.ts
    └── personas.ts
```

### Integration Points

**Minimal touchpoints with existing codebase:**
- Routes in `/app/voice-coach/` (Next.js requirement)
- API routes in `/app/api/voice/` (for streaming)
- Database schema in Supabase
- Environment variables for API keys

## Quick Start

### 1. Install Dependencies

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js
```

### 2. Environment Variables

```env
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Database Migration

```bash
# Apply the schema to your Supabase database
psql -h your-db-host -U postgres -d postgres -f schema/voice-sessions.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

### 4. Create Storage Buckets

In Supabase Dashboard, create two storage buckets:
- `voice-recordings` (for audio)
- `video-recordings` (for webcam recordings)

### 5. Use in Your Components

```tsx
import { useVoiceSession } from '@/modules/voice-coach/hooks/useVoiceSession';

function MyComponent() {
  const session = useVoiceSession({
    userId: 'user-123',
    sessionType: 'pitch_practice',
    mode: 'investor_sim',
    persona: 'aggressive',
    projectData: {
      name: 'Solar Energy for Rural Ghana',
      sdgs: [7, 13],
      impact_thesis: 'Providing clean energy access...',
      funding_target: 500000,
      blended_returns: {
        financial: 6,
        impact: 33.75,
        total: 39.75
      }
    }
  });

  return (
    <div>
      <button onClick={session.startSession}>Start Session</button>
      {/* ... rest of UI */}
    </div>
  );
}
```

## Core Classes

### VoiceSessionManager

Main class managing session lifecycle, AI communication, and state.

**Key Methods:**
- `startSession()` - Initialize and start coaching session
- `sendMessage(content)` - Send text message to AI coach
- `pauseSession()` - Pause the session
- `resumeSession()` - Resume paused session
- `completeSession()` - End session and generate feedback
- `on(handler)` - Subscribe to session events

**Events:**
- `session_started` - Session initialized
- `message_received` - New message in transcript
- `transcription_update` - Real-time transcription chunk
- `session_paused` - Session paused
- `session_resumed` - Session resumed
- `session_completed` - Session ended with feedback
- `error` - Error occurred

### SupabaseSessionsService

Handles all database operations for sessions.

**Key Methods:**
- `createSession(state)` - Save new session
- `updateSession(id, updates)` - Update session
- `completeSession(id, state, feedback)` - Finalize session
- `getUserSessions(userId)` - Get user's sessions
- `getUserSessionStats(userId)` - Get statistics
- `uploadAudio(sessionId, blob)` - Upload audio recording
- `uploadVideo(sessionId, blob)` - Upload video recording

## Database Schema

### Main Table: `voice_coaching_sessions`

```sql
CREATE TABLE voice_coaching_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  session_type TEXT,  -- 'discovery' | 'pitch_practice'
  coaching_mode TEXT, -- 'interrupt' | 'full_listen' | 'investor_sim'
  investor_persona TEXT, -- 'easy_going' | 'enthusiastic' | 'aggressive'
  
  transcript JSONB,   -- Full conversation
  audio_url TEXT,     -- Recording URL
  video_url TEXT,     -- Video recording URL
  
  feedback JSONB,     -- AI-generated feedback
  metrics JSONB,      -- Session metrics
  duration_seconds INTEGER,
  
  created_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  pitch_deck_id UUID,
  project_id UUID
);
```

### Helper Functions

- `get_recent_voice_sessions(user_id, limit)` - Get recent sessions
- `get_voice_coaching_progress(user_id, session_type)` - Track improvement

## TypeScript Types

### Core Types

```typescript
// Session configuration
interface VoiceSessionConfig {
  userId: string;
  sessionType: 'discovery' | 'pitch_practice';
  mode: 'interrupt' | 'full_listen' | 'investor_sim';
  persona?: 'easy_going' | 'enthusiastic' | 'aggressive';
  pitchDeckId?: string;
  projectId?: string;
  projectData?: ProjectData;
  preferences?: SessionPreferences;
}

// Session state
interface VoiceSessionState {
  id: string;
  config: VoiceSessionConfig;
  status: 'initializing' | 'active' | 'paused' | 'completed' | 'error';
  transcript: Message[];
  startTime: Date;
  endTime?: Date;
  metrics?: SessionMetrics;
  error?: ErrorInfo;
}

// Feedback structure
interface SessionFeedback {
  sessionId: string;
  overallScore?: number;
  content: FeedbackCategory;
  delivery: DeliveryFeedback;
  impact: ImpactFeedback;
  investorQuestions?: InvestorQuestion[];
  nextSteps: string[];
  practiceAreas: string[];
  generatedAt: Date;
}
```

## Integration with RaiseReady Impact

### Context-Aware Coaching

The voice coach integrates deeply with RaiseReady's impact measurement framework:

1. **SDG Alignment** - Coaches on articulating SDG impact
2. **Blended Returns** - Helps explain financial + impact returns
3. **Theory of Change** - Validates impact pathway clarity
4. **RealChange Framework** - Uses the $USD impact valuation methodology

### Example Project Context

```typescript
projectData: {
  name: 'Ghana Waste-to-Energy',
  sdgs: [7, 11, 12, 13],
  impact_thesis: 'Converting 50 tons/day of waste to electricity...',
  funding_target: 2000000,
  blended_returns: {
    financial: 6,      // 6% IRR
    impact: 33.75,     // $impact equivalent
    total: 39.75       // Combined return
  }
}
```

The AI coach will reference these specifics when providing feedback.

## Next Steps

### Phase 2: Audio Integration
- Real-time audio streaming
- Speech-to-text transcription
- Text-to-speech for AI responses
- Anthropic Voice API integration

### Phase 3: Video Integration
- Webcam capture
- Body language analysis (future)
- Confidence detection (future)

### Phase 4: Advanced Features
- Progress tracking over time
- Comparison with successful pitches
- Custom investor personas based on real profiles
- Team practice sessions

## API Cost Estimates

**Per Session Costs (approximate):**
- 5-minute session: $0.50-1.00
- 15-minute session: $1.50-3.00
- 30-minute session: $3.00-6.00

Costs depend on:
- Session length
- Transcript length
- Mode (investor_sim generates more tokens)

## Development Status

✅ **Completed:**
- Core architecture
- Type definitions
- Session manager
- React hook
- Database schema
- Supabase integration
- Coaching mode configurations
- Investor persona definitions

🚧 **In Progress:**
- Audio streaming integration
- UI components

📋 **Planned:**
- Video capture
- Real-time transcription
- Advanced analytics

## Contributing

This module is designed to be extracted into its own package if needed. Keep all logic within `/modules/voice-coach/` for easy portability.

## License

Proprietary - RaiseReady Impact / Global Buildtech

---

**Built with:**
- Next.js
- TypeScript
- Anthropic Claude API
- Supabase
- WebRTC (planned)

**Contact:**
Dennis @ Global Buildtech
dennis@corporate-ai-solutions.com

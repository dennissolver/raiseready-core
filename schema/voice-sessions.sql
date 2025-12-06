-- Voice Coaching Sessions Schema
-- Self-contained schema for the voice coaching module

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main voice coaching sessions table
CREATE TABLE IF NOT EXISTS voice_coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  
  -- Session configuration
  session_type TEXT NOT NULL CHECK (session_type IN ('discovery', 'pitch_practice')),
  coaching_mode TEXT NOT NULL CHECK (coaching_mode IN ('interrupt', 'full_listen', 'investor_sim')),
  investor_persona TEXT CHECK (investor_persona IN ('easy_going', 'enthusiastic', 'aggressive')),
  
  -- Session data
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_url TEXT,
  video_url TEXT,
  
  -- Feedback and analytics
  feedback JSONB,
  metrics JSONB,
  duration_seconds INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Context references
  pitch_deck_id UUID REFERENCES pitch_decks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user 
  ON voice_coaching_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_type 
  ON voice_coaching_sessions(session_type);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_created 
  ON voice_coaching_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_project 
  ON voice_coaching_sessions(project_id) 
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_sessions_pitch_deck 
  ON voice_coaching_sessions(pitch_deck_id) 
  WHERE pitch_deck_id IS NOT NULL;

-- Storage buckets for audio and video recordings
-- Note: These need to be created through Supabase dashboard or API
-- CREATE STORAGE BUCKET voice-recordings
-- CREATE STORAGE BUCKET video-recordings

-- RLS (Row Level Security) policies
ALTER TABLE voice_coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON voice_coaching_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own sessions
CREATE POLICY "Users can create own sessions"
  ON voice_coaching_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON voice_coaching_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON voice_coaching_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Optional: Helper view for session statistics
CREATE OR REPLACE VIEW voice_session_stats AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  SUM(duration_seconds) as total_duration_seconds,
  AVG((feedback->>'overallScore')::float) as avg_score,
  COUNT(CASE WHEN session_type = 'discovery' THEN 1 END) as discovery_sessions,
  COUNT(CASE WHEN session_type = 'pitch_practice' THEN 1 END) as pitch_practice_sessions,
  COUNT(CASE WHEN coaching_mode = 'interrupt' THEN 1 END) as interrupt_sessions,
  COUNT(CASE WHEN coaching_mode = 'full_listen' THEN 1 END) as full_listen_sessions,
  COUNT(CASE WHEN coaching_mode = 'investor_sim' THEN 1 END) as investor_sim_sessions,
  MAX(created_at) as last_session_date
FROM voice_coaching_sessions
WHERE completed_at IS NOT NULL
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON voice_session_stats TO authenticated;

-- Function to get recent sessions for a user
CREATE OR REPLACE FUNCTION get_recent_voice_sessions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  session_type TEXT,
  coaching_mode TEXT,
  investor_persona TEXT,
  duration_seconds INTEGER,
  overall_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vcs.id,
    vcs.session_type,
    vcs.coaching_mode,
    vcs.investor_persona,
    vcs.duration_seconds,
    (vcs.feedback->>'overallScore')::float as overall_score,
    vcs.created_at,
    vcs.completed_at
  FROM voice_coaching_sessions vcs
  WHERE vcs.user_id = p_user_id
    AND vcs.completed_at IS NOT NULL
  ORDER BY vcs.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_recent_voice_sessions TO authenticated;

-- Function to calculate improvement over time
CREATE OR REPLACE FUNCTION get_voice_coaching_progress(
  p_user_id UUID,
  p_session_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  session_date DATE,
  avg_score FLOAT,
  session_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as session_date,
    AVG((feedback->>'overallScore')::float) as avg_score,
    COUNT(*)::integer as session_count
  FROM voice_coaching_sessions
  WHERE user_id = p_user_id
    AND completed_at IS NOT NULL
    AND feedback IS NOT NULL
    AND (p_session_type IS NULL OR session_type = p_session_type)
  GROUP BY DATE(created_at)
  ORDER BY DATE(created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_voice_coaching_progress TO authenticated;

-- Comments for documentation
COMMENT ON TABLE voice_coaching_sessions IS 'Stores voice coaching session data including transcripts, feedback, and recordings';
COMMENT ON COLUMN voice_coaching_sessions.session_type IS 'Type of coaching session: discovery or pitch_practice';
COMMENT ON COLUMN voice_coaching_sessions.coaching_mode IS 'Coaching mode: interrupt, full_listen, or investor_sim';
COMMENT ON COLUMN voice_coaching_sessions.investor_persona IS 'For investor_sim mode: easy_going, enthusiastic, or aggressive';
COMMENT ON COLUMN voice_coaching_sessions.transcript IS 'JSONB array of conversation messages';
COMMENT ON COLUMN voice_coaching_sessions.feedback IS 'JSONB object containing detailed feedback and scores';
COMMENT ON COLUMN voice_coaching_sessions.metrics IS 'JSONB object containing session metrics (duration, word count, pace, etc)';

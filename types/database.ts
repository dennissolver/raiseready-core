export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_feedback: {
        Row: {
          id: string
          session_id: string | null
          deck_id: string | null
          slide_number: number | null
          feedback_type: string | null
          original_content: string | null
          suggestion: string | null
          reasoning: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null
          deck_id?: string | null
          slide_number?: number | null
          feedback_type?: string | null
          original_content?: string | null
          suggestion?: string | null
          reasoning?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null
          deck_id?: string | null
          slide_number?: number | null
          feedback_type?: string | null
          original_content?: string | null
          suggestion?: string | null
          reasoning?: string | null
          created_at?: string | null
        }
      }
      coaching_sessions: {
        Row: {
          id: string
          deck_id: string | null
          coach_type: string | null
          conversation: Json | null
          feedback_summary: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
          current_mode: string | null
          phase_completed: Json | null
          focus_areas: string[] | null
          founder_id: string | null
          session_type: string | null
          context: Json | null
          message_count: number | null
          last_activity: string | null
        }
        Insert: {
          id?: string
          deck_id?: string | null
          coach_type?: string | null
          conversation?: Json | null
          feedback_summary?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          current_mode?: string | null
          phase_completed?: Json | null
          focus_areas?: string[] | null
          founder_id?: string | null
          session_type?: string | null
          context?: Json | null
          message_count?: number | null
          last_activity?: string | null
        }
        Update: {
          id?: string
          deck_id?: string | null
          coach_type?: string | null
          conversation?: Json | null
          feedback_summary?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          current_mode?: string | null
          phase_completed?: Json | null
          focus_areas?: string[] | null
          founder_id?: string | null
          session_type?: string | null
          context?: Json | null
          message_count?: number | null
          last_activity?: string | null
        }
      }
      deck_analysis: {
        Row: {
          id: string
          deck_id: string | null
          analysis_type: string | null
          scores: Json | null
          strengths: string[] | null
          weaknesses: string[] | null
          recommendations: string[] | null
          created_at: string | null
          improvement_suggestions: Json | null
          progress_notes: string | null
        }
        Insert: {
          id?: string
          deck_id?: string | null
          analysis_type?: string | null
          scores?: Json | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          recommendations?: string[] | null
          created_at?: string | null
          improvement_suggestions?: Json | null
          progress_notes?: string | null
        }
        Update: {
          id?: string
          deck_id?: string | null
          analysis_type?: string | null
          scores?: Json | null
          strengths?: string[] | null
          weaknesses?: string[] | null
          recommendations?: string[] | null
          created_at?: string | null
          improvement_suggestions?: Json | null
          progress_notes?: string | null
        }
      }
      founders: {
        Row: {
          id: string
          email: string
          name: string | null
          country: string | null
          created_at: string | null
          updated_at: string | null
          founder_type: string | null
          funding_stage: string | null
          target_market: string | null
          team_size: number | null
          has_revenue: boolean | null
          has_customers: boolean | null
          has_prototype: boolean | null
          has_domain_expertise: boolean | null
          has_startup_experience: boolean | null
          company_name: string | null
          tagline: string | null
          problem_statement: string | null
          solution_statement: string | null
          traction_details: string | null
          team_background: string | null
          funding_ask_amount: string | null
          funding_ask_stage: string | null
          use_of_funds: string | null
          profile_completed_at: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          country?: string | null
          created_at?: string | null
          updated_at?: string | null
          founder_type?: string | null
          funding_stage?: string | null
          target_market?: string | null
          team_size?: number | null
          has_revenue?: boolean | null
          has_customers?: boolean | null
          has_prototype?: boolean | null
          has_domain_expertise?: boolean | null
          has_startup_experience?: boolean | null
          company_name?: string | null
          tagline?: string | null
          problem_statement?: string | null
          solution_statement?: string | null
          traction_details?: string | null
          team_background?: string | null
          funding_ask_amount?: string | null
          funding_ask_stage?: string | null
          use_of_funds?: string | null
          profile_completed_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          country?: string | null
          created_at?: string | null
          updated_at?: string | null
          founder_type?: string | null
          funding_stage?: string | null
          target_market?: string | null
          team_size?: number | null
          has_revenue?: boolean | null
          has_customers?: boolean | null
          has_prototype?: boolean | null
          has_domain_expertise?: boolean | null
          has_startup_experience?: boolean | null
          company_name?: string | null
          tagline?: string | null
          problem_statement?: string | null
          solution_statement?: string | null
          traction_details?: string | null
          team_background?: string | null
          funding_ask_amount?: string | null
          funding_ask_stage?: string | null
          use_of_funds?: string | null
          profile_completed_at?: string | null
        }
      }
      investor_discovery_sessions: {
        Row: {
          id: string
          investor_id: string | null
          conversation: Json | null
          extracted_criteria: Json | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          investor_id?: string | null
          conversation?: Json | null
          extracted_criteria?: Json | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          investor_id?: string | null
          conversation?: Json | null
          extracted_criteria?: Json | null
          created_at?: string | null
          completed_at?: string | null
        }
      }
      investor_profiles: {
        Row: {
          id: string
          email: string
          name: string
          firm: string | null
          focus_areas: string[] | null
          check_size_min: number | null
          check_size_max: number | null
          preferences: Json | null
          created_at: string | null
          updated_at: string | null
          organization_name: string | null
          investor_type: string | null
          website_url: string | null
          linkedin_url: string | null
          min_ticket_size: number | null
          max_ticket_size: number | null
          stages: string[] | null
          sectors: string[] | null
          geographies: string[] | null
          investment_philosophy: string | null
          deal_breakers: string | null
          ideal_founder_profile: string | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          firm?: string | null
          focus_areas?: string[] | null
          check_size_min?: number | null
          check_size_max?: number | null
          preferences?: Json | null
          created_at?: string | null
          updated_at?: string | null
          organization_name?: string | null
          investor_type?: string | null
          website_url?: string | null
          linkedin_url?: string | null
          min_ticket_size?: number | null
          max_ticket_size?: number | null
          stages?: string[] | null
          sectors?: string[] | null
          geographies?: string[] | null
          investment_philosophy?: string | null
          deal_breakers?: string | null
          ideal_founder_profile?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          firm?: string | null
          focus_areas?: string[] | null
          check_size_min?: number | null
          check_size_max?: number | null
          preferences?: Json | null
          created_at?: string | null
          updated_at?: string | null
          organization_name?: string | null
          investor_type?: string | null
          website_url?: string | null
          linkedin_url?: string | null
          min_ticket_size?: number | null
          max_ticket_size?: number | null
          stages?: string[] | null
          sectors?: string[] | null
          geographies?: string[] | null
          investment_philosophy?: string | null
          deal_breakers?: string | null
          ideal_founder_profile?: string | null
        }
      }
      investor_watchlist: {
        Row: {
          id: string
          investor_id: string
          founder_id: string
          added_at: string | null
          notes: string | null
          tags: string[] | null
          last_viewed_at: string | null
        }
        Insert: {
          id?: string
          investor_id: string
          founder_id: string
          added_at?: string | null
          notes?: string | null
          tags?: string[] | null
          last_viewed_at?: string | null
        }
        Update: {
          id?: string
          investor_id?: string
          founder_id?: string
          added_at?: string | null
          notes?: string | null
          tags?: string[] | null
          last_viewed_at?: string | null
        }
      }
      knowledge_base: {
        Row: {
          id: string
          title: string
          content: string
          summary: string | null
          category: string
          tags: string[] | null
          founder_types: string[] | null
          source_url: string | null
          source_type: string | null
          author: string | null
          published_date: string | null
          relevance_score: number | null
          usage_count: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          summary?: string | null
          category: string
          tags?: string[] | null
          founder_types?: string[] | null
          source_url?: string | null
          source_type?: string | null
          author?: string | null
          published_date?: string | null
          relevance_score?: number | null
          usage_count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          summary?: string | null
          category?: string
          tags?: string[] | null
          founder_types?: string[] | null
          source_url?: string | null
          source_type?: string | null
          author?: string | null
          published_date?: string | null
          relevance_score?: number | null
          usage_count?: number | null
          created_at?: string | null
        }
      }
      notification_preferences: {
        Row: {
          user_id: string
          email_enabled: boolean | null
          in_app_enabled: boolean | null
          alert_score_change: boolean | null
          alert_new_match: boolean | null
          alert_profile_view: boolean | null
          alert_status_change: boolean | null
          digest_frequency: string | null
          digest_time: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          email_enabled?: boolean | null
          in_app_enabled?: boolean | null
          alert_score_change?: boolean | null
          alert_new_match?: boolean | null
          alert_profile_view?: boolean | null
          alert_status_change?: boolean | null
          digest_frequency?: string | null
          digest_time?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          email_enabled?: boolean | null
          in_app_enabled?: boolean | null
          alert_score_change?: boolean | null
          alert_new_match?: boolean | null
          alert_profile_view?: boolean | null
          alert_status_change?: boolean | null
          digest_frequency?: string | null
          digest_time?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      pitch_decks: {
        Row: {
          id: string
          founder_id: string | null
          title: string
          file_url: string
          file_type: string | null
          status: string | null
          readiness_score: number | null
          created_at: string | null
          updated_at: string | null
          version: number | null
          previous_version_id: string | null
          is_latest: boolean | null
          visibility: string | null
          one_liner: string | null
          sectors: string[] | null
          funding_stage: string | null
          funding_goal: number | null
          target_market: string | null
          parent_deck_id: string | null
          improvement_notes: string | null
          version_notes: string | null
          file_name: string | null
          raw_text: string | null
          analyzed_at: string | null
          file_size: number | null
        }
        Insert: {
          id?: string
          founder_id?: string | null
          title: string
          file_url: string
          file_type?: string | null
          status?: string | null
          readiness_score?: number | null
          created_at?: string | null
          updated_at?: string | null
          version?: number | null
          previous_version_id?: string | null
          is_latest?: boolean | null
          visibility?: string | null
          one_liner?: string | null
          sectors?: string[] | null
          funding_stage?: string | null
          funding_goal?: number | null
          target_market?: string | null
          parent_deck_id?: string | null
          improvement_notes?: string | null
          version_notes?: string | null
          file_name?: string | null
          raw_text?: string | null
          analyzed_at?: string | null
          file_size?: number | null
        }
        Update: {
          id?: string
          founder_id?: string | null
          title?: string
          file_url?: string
          file_type?: string | null
          status?: string | null
          readiness_score?: number | null
          created_at?: string | null
          updated_at?: string | null
          version?: number | null
          previous_version_id?: string | null
          is_latest?: boolean | null
          visibility?: string | null
          one_liner?: string | null
          sectors?: string[] | null
          funding_stage?: string | null
          funding_goal?: number | null
          target_market?: string | null
          parent_deck_id?: string | null
          improvement_notes?: string | null
          version_notes?: string | null
          file_name?: string | null
          raw_text?: string | null
          analyzed_at?: string | null
          file_size?: number | null
        }
      }
      superadmins: {
        Row: {
          id: string
          email: string
          full_name: string | null
          permissions: Json | null
          is_active: boolean | null
          last_login_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          permissions?: Json | null
          is_active?: boolean | null
          last_login_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          permissions?: Json | null
          is_active?: boolean | null
          last_login_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      voice_coaching_sessions: {
        Row: {
          id: string
          user_id: string
          session_type: string
          coaching_mode: string
          investor_persona: string | null
          transcript: Json | null
          audio_url: string | null
          video_url: string | null
          feedback: Json | null
          metrics: Json | null
          duration_seconds: number | null
          created_at: string | null
          completed_at: string | null
          pitch_deck_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_type: string
          coaching_mode: string
          investor_persona?: string | null
          transcript?: Json | null
          audio_url?: string | null
          video_url?: string | null
          feedback?: Json | null
          metrics?: Json | null
          duration_seconds?: number | null
          created_at?: string | null
          completed_at?: string | null
          pitch_deck_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_type?: string
          coaching_mode?: string
          investor_persona?: string | null
          transcript?: Json | null
          audio_url?: string | null
          video_url?: string | null
          feedback?: Json | null
          metrics?: Json | null
          duration_seconds?: number | null
          created_at?: string | null
          completed_at?: string | null
          pitch_deck_id?: string | null
        }
      }
      voice_feedback: {
        Row: {
          id: string
          session_id: string
          user_id: string
          project_id: string | null
          overall_score: number | null
          strengths: string[] | null
          improvements: string[] | null
          recommendations: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          project_id?: string | null
          overall_score?: number | null
          strengths?: string[] | null
          improvements?: string[] | null
          recommendations?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          project_id?: string | null
          overall_score?: number | null
          strengths?: string[] | null
          improvements?: string[] | null
          recommendations?: string[] | null
          created_at?: string
        }
      }
      voice_messages: {
        Row: {
          id: string
          session_id: string
          role: string
          content: string
          audio_url: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: string
          content: string
          audio_url?: string | null
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: string
          content?: string
          audio_url?: string | null
          timestamp?: string
          created_at?: string
        }
      }
      voice_sessions: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          coaching_mode: string
          investor_persona: string | null
          status: string
          started_at: string
          ended_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          coaching_mode: string
          investor_persona?: string | null
          status?: string
          started_at?: string
          ended_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          coaching_mode?: string
          investor_persona?: string | null
          status?: string
          started_at?: string
          ended_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
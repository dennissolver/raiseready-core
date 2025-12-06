export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action_type: string
          admin_id: string | null
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "superadmins"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          created_at: string | null
          deck_id: string | null
          feedback_type: string | null
          id: string
          original_content: string | null
          reasoning: string | null
          session_id: string | null
          slide_number: number | null
          suggestion: string | null
        }
        Insert: {
          created_at?: string | null
          deck_id?: string | null
          feedback_type?: string | null
          id?: string
          original_content?: string | null
          reasoning?: string | null
          session_id?: string | null
          slide_number?: number | null
          suggestion?: string | null
        }
        Update: {
          created_at?: string | null
          deck_id?: string | null
          feedback_type?: string | null
          id?: string
          original_content?: string | null
          reasoning?: string | null
          session_id?: string | null
          slide_number?: number | null
          suggestion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "ai_feedback_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "ai_feedback_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          coach_type: string | null
          context: Json | null
          conversation: Json | null
          created_at: string | null
          current_mode: string | null
          deck_id: string | null
          feedback_summary: string | null
          focus_areas: string[] | null
          founder_id: string | null
          id: string
          last_activity: string | null
          message_count: number | null
          phase_completed: Json | null
          session_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          coach_type?: string | null
          context?: Json | null
          conversation?: Json | null
          created_at?: string | null
          current_mode?: string | null
          deck_id?: string | null
          feedback_summary?: string | null
          focus_areas?: string[] | null
          founder_id?: string | null
          id?: string
          last_activity?: string | null
          message_count?: number | null
          phase_completed?: Json | null
          session_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          coach_type?: string | null
          context?: Json | null
          conversation?: Json | null
          created_at?: string | null
          current_mode?: string | null
          deck_id?: string | null
          feedback_summary?: string | null
          focus_areas?: string[] | null
          founder_id?: string | null
          id?: string
          last_activity?: string | null
          message_count?: number | null
          phase_completed?: Json | null
          session_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "coaching_sessions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "coaching_sessions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_analysis: {
        Row: {
          analysis_type: string | null
          created_at: string | null
          deck_id: string | null
          id: string
          improvement_suggestions: Json | null
          progress_notes: string | null
          recommendations: string[] | null
          scores: Json | null
          strengths: string[] | null
          weaknesses: string[] | null
        }
        Insert: {
          analysis_type?: string | null
          created_at?: string | null
          deck_id?: string | null
          id?: string
          improvement_suggestions?: Json | null
          progress_notes?: string | null
          recommendations?: string[] | null
          scores?: Json | null
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Update: {
          analysis_type?: string | null
          created_at?: string | null
          deck_id?: string | null
          id?: string
          improvement_suggestions?: Json | null
          progress_notes?: string | null
          recommendations?: string[] | null
          scores?: Json | null
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "deck_analysis_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "deck_analysis_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "deck_analysis_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          enabled_for_roles: string[] | null
          enabled_for_users: string[] | null
          flag_key: string
          flag_name: string
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          rollout_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled_for_roles?: string[] | null
          enabled_for_users?: string[] | null
          flag_key: string
          flag_name: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled_for_roles?: string[] | null
          enabled_for_users?: string[] | null
          flag_key?: string
          flag_name?: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          rollout_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "superadmins"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_investor_matches: {
        Row: {
          contacted_at: string | null
          deck_id: string | null
          founder_id: string | null
          founder_interest: string | null
          id: string
          investor_id: string | null
          investor_response: string | null
          match_reasons: Json | null
          match_score: number | null
          responded_at: string | null
          status: string | null
          suggested_at: string | null
        }
        Insert: {
          contacted_at?: string | null
          deck_id?: string | null
          founder_id?: string | null
          founder_interest?: string | null
          id?: string
          investor_id?: string | null
          investor_response?: string | null
          match_reasons?: Json | null
          match_score?: number | null
          responded_at?: string | null
          status?: string | null
          suggested_at?: string | null
        }
        Update: {
          contacted_at?: string | null
          deck_id?: string | null
          founder_id?: string | null
          founder_interest?: string | null
          id?: string
          investor_id?: string | null
          investor_response?: string | null
          match_reasons?: Json | null
          match_score?: number | null
          responded_at?: string | null
          status?: string | null
          suggested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_investor_matches_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "founder_investor_matches_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "founder_investor_matches_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_investor_matches_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_profiles: {
        Row: {
          discovery_completeness: number | null
          dream_outcome: string | null
          founder_id: string
          founder_type: string | null
          funding_motivation: string | null
          funding_stage: string | null
          id: string
          ideal_investor_type: string[] | null
          last_updated: string | null
          motivation: string | null
          personal_story: string | null
          problem_passion: string | null
          target_market: string | null
          team_background: Json | null
          team_gaps: string[] | null
        }
        Insert: {
          discovery_completeness?: number | null
          dream_outcome?: string | null
          founder_id: string
          founder_type?: string | null
          funding_motivation?: string | null
          funding_stage?: string | null
          id?: string
          ideal_investor_type?: string[] | null
          last_updated?: string | null
          motivation?: string | null
          personal_story?: string | null
          problem_passion?: string | null
          target_market?: string | null
          team_background?: Json | null
          team_gaps?: string[] | null
        }
        Update: {
          discovery_completeness?: number | null
          dream_outcome?: string | null
          founder_id?: string
          founder_type?: string | null
          funding_motivation?: string | null
          funding_stage?: string | null
          id?: string
          ideal_investor_type?: string[] | null
          last_updated?: string | null
          motivation?: string | null
          personal_story?: string | null
          problem_passion?: string | null
          target_market?: string | null
          team_background?: Json | null
          team_gaps?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_profiles_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_sdg_projections: {
        Row: {
          baseline_description: string | null
          confidence_level: string | null
          created_at: string | null
          data_sources: string | null
          founder_id: string
          id: string
          is_verified: boolean | null
          measurement_methodology: string | null
          pitch_deck_id: string | null
          projected_units: number
          projection_period_years: number | null
          sdg_number: number
          unit_type: string
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          baseline_description?: string | null
          confidence_level?: string | null
          created_at?: string | null
          data_sources?: string | null
          founder_id: string
          id?: string
          is_verified?: boolean | null
          measurement_methodology?: string | null
          pitch_deck_id?: string | null
          projected_units: number
          projection_period_years?: number | null
          sdg_number: number
          unit_type: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          baseline_description?: string | null
          confidence_level?: string | null
          created_at?: string | null
          data_sources?: string | null
          founder_id?: string
          id?: string
          is_verified?: boolean | null
          measurement_methodology?: string | null
          pitch_deck_id?: string | null
          projected_units?: number
          projection_period_years?: number | null
          sdg_number?: number
          unit_type?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_sdg_projections_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_sdg_projections_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "founder_sdg_projections_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "founder_sdg_projections_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_sdg_projections_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_watchlist: {
        Row: {
          added_at: string | null
          founder_id: string
          id: string
          last_viewed_at: string | null
          notes: string | null
          tags: string[] | null
          target_id: string
          target_type: string
        }
        Insert: {
          added_at?: string | null
          founder_id: string
          id?: string
          last_viewed_at?: string | null
          notes?: string | null
          tags?: string[] | null
          target_id: string
          target_type: string
        }
        Update: {
          added_at?: string | null
          founder_id?: string
          id?: string
          last_viewed_at?: string | null
          notes?: string | null
          tags?: string[] | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_watchlist_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_watchlist_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founders: {
        Row: {
          company_name: string | null
          country: string | null
          created_at: string | null
          email: string
          founder_type: string | null
          funding_ask_amount: string | null
          funding_ask_stage: string | null
          funding_stage: string | null
          has_customers: boolean | null
          has_domain_expertise: boolean | null
          has_prototype: boolean | null
          has_revenue: boolean | null
          has_startup_experience: boolean | null
          id: string
          impact_focus: string[] | null
          name: string | null
          problem_statement: string | null
          profile_completed_at: string | null
          solution_statement: string | null
          tagline: string | null
          target_market: string | null
          team_background: string | null
          team_size: number | null
          traction_details: string | null
          updated_at: string | null
          use_of_funds: string | null
          user_role: string | null
        }
        Insert: {
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          founder_type?: string | null
          funding_ask_amount?: string | null
          funding_ask_stage?: string | null
          funding_stage?: string | null
          has_customers?: boolean | null
          has_domain_expertise?: boolean | null
          has_prototype?: boolean | null
          has_revenue?: boolean | null
          has_startup_experience?: boolean | null
          id?: string
          impact_focus?: string[] | null
          name?: string | null
          problem_statement?: string | null
          profile_completed_at?: string | null
          solution_statement?: string | null
          tagline?: string | null
          target_market?: string | null
          team_background?: string | null
          team_size?: number | null
          traction_details?: string | null
          updated_at?: string | null
          use_of_funds?: string | null
          user_role?: string | null
        }
        Update: {
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          founder_type?: string | null
          funding_ask_amount?: string | null
          funding_ask_stage?: string | null
          funding_stage?: string | null
          has_customers?: boolean | null
          has_domain_expertise?: boolean | null
          has_prototype?: boolean | null
          has_revenue?: boolean | null
          has_startup_experience?: boolean | null
          id?: string
          impact_focus?: string[] | null
          name?: string | null
          problem_statement?: string | null
          profile_completed_at?: string | null
          solution_statement?: string | null
          tagline?: string | null
          target_market?: string | null
          team_background?: string | null
          team_size?: number | null
          traction_details?: string | null
          updated_at?: string | null
          use_of_funds?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          last_updated_by: string | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          last_updated_by?: string | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          last_updated_by?: string | null
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_settings_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "superadmins"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_matching_scores: {
        Row: {
          created_at: string | null
          financial_match_score: number | null
          founder_id: string
          id: string
          impact_match_score: number | null
          investor_id: string
          investor_response: string | null
          investor_response_reason: string | null
          investor_viewed: boolean | null
          match_tier: string | null
          mismatch_reasons: Json | null
          overall_match_score: number | null
          pitch_deck_id: string | null
          sdg_alignment_score: number | null
          sdg_overlap: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          financial_match_score?: number | null
          founder_id: string
          id?: string
          impact_match_score?: number | null
          investor_id: string
          investor_response?: string | null
          investor_response_reason?: string | null
          investor_viewed?: boolean | null
          match_tier?: string | null
          mismatch_reasons?: Json | null
          overall_match_score?: number | null
          pitch_deck_id?: string | null
          sdg_alignment_score?: number | null
          sdg_overlap?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          financial_match_score?: number | null
          founder_id?: string
          id?: string
          impact_match_score?: number | null
          investor_id?: string
          investor_response?: string | null
          investor_response_reason?: string | null
          investor_viewed?: boolean | null
          match_tier?: string | null
          mismatch_reasons?: Json | null
          overall_match_score?: number | null
          pitch_deck_id?: string | null
          sdg_alignment_score?: number | null
          sdg_overlap?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impact_matching_scores_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_matching_scores_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_matching_scores_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "impact_matching_scores_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "impact_matching_scores_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      impact_returns_calculated: {
        Row: {
          blended_return_annual_pct: number | null
          blended_return_total_pct: number | null
          calculation_date: string | null
          created_at: string | null
          founder_id: string
          id: string
          impact_investment_usd: number | null
          impact_return_annual_pct: number | null
          impact_return_pct: number | null
          pitch_deck_id: string | null
          profit_investment_usd: number | null
          projected_financial_return_annual_pct: number | null
          projected_financial_return_pct: number | null
          sdg_breakdown: Json | null
          total_impact_value_usd: number | null
          total_investment_usd: number | null
          updated_at: string | null
          valuation_framework_version: string | null
        }
        Insert: {
          blended_return_annual_pct?: number | null
          blended_return_total_pct?: number | null
          calculation_date?: string | null
          created_at?: string | null
          founder_id: string
          id?: string
          impact_investment_usd?: number | null
          impact_return_annual_pct?: number | null
          impact_return_pct?: number | null
          pitch_deck_id?: string | null
          profit_investment_usd?: number | null
          projected_financial_return_annual_pct?: number | null
          projected_financial_return_pct?: number | null
          sdg_breakdown?: Json | null
          total_impact_value_usd?: number | null
          total_investment_usd?: number | null
          updated_at?: string | null
          valuation_framework_version?: string | null
        }
        Update: {
          blended_return_annual_pct?: number | null
          blended_return_total_pct?: number | null
          calculation_date?: string | null
          created_at?: string | null
          founder_id?: string
          id?: string
          impact_investment_usd?: number | null
          impact_return_annual_pct?: number | null
          impact_return_pct?: number | null
          pitch_deck_id?: string | null
          profit_investment_usd?: number | null
          projected_financial_return_annual_pct?: number | null
          projected_financial_return_pct?: number | null
          sdg_breakdown?: Json | null
          total_impact_value_usd?: number | null
          total_investment_usd?: number | null
          updated_at?: string | null
          valuation_framework_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impact_returns_calculated_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_returns_calculated_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "impact_returns_calculated_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "impact_returns_calculated_pitch_deck_id_fkey"
            columns: ["pitch_deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_discovery_sessions: {
        Row: {
          completed_at: string | null
          conversation: Json | null
          created_at: string | null
          extracted_criteria: Json | null
          id: string
          investor_id: string | null
        }
        Insert: {
          completed_at?: string | null
          conversation?: Json | null
          created_at?: string | null
          extracted_criteria?: Json | null
          id?: string
          investor_id?: string | null
        }
        Update: {
          completed_at?: string | null
          conversation?: Json | null
          created_at?: string | null
          extracted_criteria?: Json | null
          id?: string
          investor_id?: string | null
        }
        Relationships: []
      }
      investor_network_watchlist: {
        Row: {
          added_at: string | null
          id: string
          investor_id: string
          last_viewed_at: string | null
          notes: string | null
          reason: string | null
          target_investor_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          investor_id: string
          last_viewed_at?: string | null
          notes?: string | null
          reason?: string | null
          target_investor_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          investor_id?: string
          last_viewed_at?: string | null
          notes?: string | null
          reason?: string | null
          target_investor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_network_watchlist_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_network_watchlist_target_investor_id_fkey"
            columns: ["target_investor_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          allow_direct_contact: boolean | null
          check_size_max: number | null
          check_size_min: number | null
          created_at: string | null
          deal_breakers: string | null
          email: string
          firm: string | null
          focus_areas: string[] | null
          founder_id: string | null
          geographies: string[] | null
          id: string
          ideal_founder_profile: string | null
          investment_philosophy: string | null
          investor_type: string | null
          linkedin_url: string | null
          max_ticket_size: number | null
          min_ticket_size: number | null
          name: string
          organization_name: string | null
          preferences: Json | null
          priority_sdgs: number[] | null
          profile_visibility: string | null
          sectors: string[] | null
          show_contact_info: boolean | null
          show_investment_activity: boolean | null
          show_portfolio: boolean | null
          stages: string[] | null
          target_financial_return: number | null
          target_impact_return: number | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          allow_direct_contact?: boolean | null
          check_size_max?: number | null
          check_size_min?: number | null
          created_at?: string | null
          deal_breakers?: string | null
          email: string
          firm?: string | null
          focus_areas?: string[] | null
          founder_id?: string | null
          geographies?: string[] | null
          id?: string
          ideal_founder_profile?: string | null
          investment_philosophy?: string | null
          investor_type?: string | null
          linkedin_url?: string | null
          max_ticket_size?: number | null
          min_ticket_size?: number | null
          name: string
          organization_name?: string | null
          preferences?: Json | null
          priority_sdgs?: number[] | null
          profile_visibility?: string | null
          sectors?: string[] | null
          show_contact_info?: boolean | null
          show_investment_activity?: boolean | null
          show_portfolio?: boolean | null
          stages?: string[] | null
          target_financial_return?: number | null
          target_impact_return?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          allow_direct_contact?: boolean | null
          check_size_max?: number | null
          check_size_min?: number | null
          created_at?: string | null
          deal_breakers?: string | null
          email?: string
          firm?: string | null
          focus_areas?: string[] | null
          founder_id?: string | null
          geographies?: string[] | null
          id?: string
          ideal_founder_profile?: string | null
          investment_philosophy?: string | null
          investor_type?: string | null
          linkedin_url?: string | null
          max_ticket_size?: number | null
          min_ticket_size?: number | null
          name?: string
          organization_name?: string | null
          preferences?: Json | null
          priority_sdgs?: number[] | null
          profile_visibility?: string | null
          sectors?: string[] | null
          show_contact_info?: boolean | null
          show_investment_activity?: boolean | null
          show_portfolio?: boolean | null
          stages?: string[] | null
          target_financial_return?: number | null
          target_impact_return?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_profiles_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_sdg_valuations: {
        Row: {
          created_at: string | null
          custom_rationale: string | null
          custom_unit_value_usd: number
          id: string
          importance_weight: number | null
          investor_id: string
          sdg_number: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_rationale?: string | null
          custom_unit_value_usd: number
          id?: string
          importance_weight?: number | null
          investor_id: string
          sdg_number: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_rationale?: string | null
          custom_unit_value_usd?: number
          id?: string
          importance_weight?: number | null
          investor_id?: string
          sdg_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_sdg_valuations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_watchlist: {
        Row: {
          added_at: string | null
          founder_id: string
          id: string
          investor_id: string
          last_viewed_at: string | null
          notes: string | null
          tags: string[] | null
        }
        Insert: {
          added_at?: string | null
          founder_id: string
          id?: string
          investor_id: string
          last_viewed_at?: string | null
          notes?: string | null
          tags?: string[] | null
        }
        Update: {
          added_at?: string | null
          founder_id?: string
          id?: string
          investor_id?: string
          last_viewed_at?: string | null
          notes?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_watchlist_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_watchlist_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          avg_time_to_decision: number | null
          business_models: string[] | null
          created_at: string | null
          description: string | null
          discovered_via_ai: boolean | null
          discovery_session_id: string | null
          geography: string[] | null
          id: string
          investment_types: string[] | null
          min_readiness_score: number | null
          name: string
          portfolio_size: number | null
          rating: number | null
          response_rate: number | null
          sdgs: string[] | null
          sectors: string[] | null
          stage: string[] | null
          successful_matches: number | null
          ticket_size: string[] | null
          website: string | null
        }
        Insert: {
          avg_time_to_decision?: number | null
          business_models?: string[] | null
          created_at?: string | null
          description?: string | null
          discovered_via_ai?: boolean | null
          discovery_session_id?: string | null
          geography?: string[] | null
          id?: string
          investment_types?: string[] | null
          min_readiness_score?: number | null
          name: string
          portfolio_size?: number | null
          rating?: number | null
          response_rate?: number | null
          sdgs?: string[] | null
          sectors?: string[] | null
          stage?: string[] | null
          successful_matches?: number | null
          ticket_size?: string[] | null
          website?: string | null
        }
        Update: {
          avg_time_to_decision?: number | null
          business_models?: string[] | null
          created_at?: string | null
          description?: string | null
          discovered_via_ai?: boolean | null
          discovery_session_id?: string | null
          geography?: string[] | null
          id?: string
          investment_types?: string[] | null
          min_readiness_score?: number | null
          name?: string
          portfolio_size?: number | null
          rating?: number | null
          response_rate?: number | null
          sdgs?: string[] | null
          sectors?: string[] | null
          stage?: string[] | null
          successful_matches?: number | null
          ticket_size?: string[] | null
          website?: string | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          author: string | null
          category: string
          content: string
          created_at: string | null
          embedding: string | null
          founder_types: string[] | null
          id: string
          published_date: string | null
          relevance_score: number | null
          source_type: string | null
          source_url: string | null
          summary: string | null
          tags: string[] | null
          title: string
          usage_count: number | null
        }
        Insert: {
          author?: string | null
          category: string
          content: string
          created_at?: string | null
          embedding?: string | null
          founder_types?: string[] | null
          id?: string
          published_date?: string | null
          relevance_score?: number | null
          source_type?: string | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          usage_count?: number | null
        }
        Update: {
          author?: string | null
          category?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          founder_types?: string[] | null
          id?: string
          published_date?: string | null
          relevance_score?: number | null
          source_type?: string | null
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          alert_criteria_update: boolean | null
          alert_funding_stage: boolean | null
          alert_milestone: boolean | null
          alert_new_investment: boolean | null
          alert_new_match: boolean | null
          alert_portfolio_addition: boolean | null
          alert_profile_view: boolean | null
          alert_project_update: boolean | null
          alert_score_change: boolean | null
          alert_status_change: boolean | null
          alert_ticket_change: boolean | null
          created_at: string | null
          digest_frequency: string | null
          digest_time: string | null
          email_enabled: boolean | null
          in_app_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_criteria_update?: boolean | null
          alert_funding_stage?: boolean | null
          alert_milestone?: boolean | null
          alert_new_investment?: boolean | null
          alert_new_match?: boolean | null
          alert_portfolio_addition?: boolean | null
          alert_profile_view?: boolean | null
          alert_project_update?: boolean | null
          alert_score_change?: boolean | null
          alert_status_change?: boolean | null
          alert_ticket_change?: boolean | null
          created_at?: string | null
          digest_frequency?: string | null
          digest_time?: string | null
          email_enabled?: boolean | null
          in_app_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_criteria_update?: boolean | null
          alert_funding_stage?: boolean | null
          alert_milestone?: boolean | null
          alert_new_investment?: boolean | null
          alert_new_match?: boolean | null
          alert_portfolio_addition?: boolean | null
          alert_profile_view?: boolean | null
          alert_project_update?: boolean | null
          alert_score_change?: boolean | null
          alert_status_change?: boolean | null
          alert_ticket_change?: boolean | null
          created_at?: string | null
          digest_frequency?: string | null
          digest_time?: string | null
          email_enabled?: boolean | null
          in_app_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_decks: {
        Row: {
          analyzed_at: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          founder_id: string | null
          funding_goal: number | null
          funding_stage: string | null
          id: string
          improvement_notes: string | null
          is_latest: boolean | null
          one_liner: string | null
          parent_deck_id: string | null
          previous_version_id: string | null
          raw_text: string | null
          readiness_score: number | null
          sdgs: number[] | null
          sectors: string[] | null
          status: string | null
          target_market: string | null
          title: string
          updated_at: string | null
          version: number | null
          version_notes: string | null
          visibility: string | null
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          founder_id?: string | null
          funding_goal?: number | null
          funding_stage?: string | null
          id?: string
          improvement_notes?: string | null
          is_latest?: boolean | null
          one_liner?: string | null
          parent_deck_id?: string | null
          previous_version_id?: string | null
          raw_text?: string | null
          readiness_score?: number | null
          sdgs?: number[] | null
          sectors?: string[] | null
          status?: string | null
          target_market?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
          version_notes?: string | null
          visibility?: string | null
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          founder_id?: string | null
          funding_goal?: number | null
          funding_stage?: string | null
          id?: string
          improvement_notes?: string | null
          is_latest?: boolean | null
          one_liner?: string | null
          parent_deck_id?: string | null
          previous_version_id?: string | null
          raw_text?: string | null
          readiness_score?: number | null
          sdgs?: number[] | null
          sectors?: string[] | null
          status?: string | null
          target_market?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
          version_notes?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pitch_decks_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_decks_parent_deck_id_fkey"
            columns: ["parent_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "pitch_decks_parent_deck_id_fkey"
            columns: ["parent_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "pitch_decks_parent_deck_id_fkey"
            columns: ["parent_deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pitch_decks_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "pitch_decks_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "pitch_decks_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      pitch_videos: {
        Row: {
          created_at: string | null
          deck_id: string | null
          duration_seconds: number | null
          id: string
          transcript: Json | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          deck_id?: string | null
          duration_seconds?: number | null
          id?: string
          transcript?: Json | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          deck_id?: string | null
          duration_seconds?: number | null
          id?: string
          transcript?: Json | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitch_videos_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "pitch_videos_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "pitch_videos_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          viewed_at: string | null
          viewed_id: string
          viewed_type: string
          viewer_id: string
        }
        Insert: {
          id?: string
          viewed_at?: string | null
          viewed_id: string
          viewed_type: string
          viewer_id: string
        }
        Update: {
          id?: string
          viewed_at?: string | null
          viewed_id?: string
          viewed_type?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewed_id_fkey"
            columns: ["viewed_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      score_history: {
        Row: {
          created_at: string | null
          deck_id: string | null
          id: string
          improvements: string[] | null
          overall_score: number | null
          regressions: string[] | null
          scores: Json | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          deck_id?: string | null
          id?: string
          improvements?: string[] | null
          overall_score?: number | null
          regressions?: string[] | null
          scores?: Json | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          deck_id?: string | null
          id?: string
          improvements?: string[] | null
          overall_score?: number | null
          regressions?: string[] | null
          scores?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "score_history_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["current_deck_id"]
          },
          {
            foreignKeyName: "score_history_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck_version_comparison"
            referencedColumns: ["previous_deck_id"]
          },
          {
            foreignKeyName: "score_history_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "pitch_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      sdg_valuations: {
        Row: {
          created_at: string | null
          data_sources: string | null
          default_unit_value_usd: number
          id: string
          indicator_name: string
          measurement_description: string
          measurement_unit: string
          sdg_category: string | null
          sdg_name: string
          sdg_number: number
          updated_at: string | null
          valuation_rationale: string | null
        }
        Insert: {
          created_at?: string | null
          data_sources?: string | null
          default_unit_value_usd: number
          id?: string
          indicator_name: string
          measurement_description: string
          measurement_unit: string
          sdg_category?: string | null
          sdg_name: string
          sdg_number: number
          updated_at?: string | null
          valuation_rationale?: string | null
        }
        Update: {
          created_at?: string | null
          data_sources?: string | null
          default_unit_value_usd?: number
          id?: string
          indicator_name?: string
          measurement_description?: string
          measurement_unit?: string
          sdg_category?: string | null
          sdg_name?: string
          sdg_number?: number
          updated_at?: string | null
          valuation_rationale?: string | null
        }
        Relationships: []
      }
      superadmins: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          active_users_30d: number | null
          active_users_7d: number | null
          api_calls_today: number | null
          created_at: string | null
          id: string
          metric_date: string
          new_signups_today: number | null
          storage_used_mb: number | null
          total_founders: number | null
          total_investors: number | null
          total_matches: number | null
          total_notifications_sent: number | null
          total_projects: number | null
          total_users: number | null
          total_watchlist_items: number | null
        }
        Insert: {
          active_users_30d?: number | null
          active_users_7d?: number | null
          api_calls_today?: number | null
          created_at?: string | null
          id?: string
          metric_date: string
          new_signups_today?: number | null
          storage_used_mb?: number | null
          total_founders?: number | null
          total_investors?: number | null
          total_matches?: number | null
          total_notifications_sent?: number | null
          total_projects?: number | null
          total_users?: number | null
          total_watchlist_items?: number | null
        }
        Update: {
          active_users_30d?: number | null
          active_users_7d?: number | null
          api_calls_today?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          new_signups_today?: number | null
          storage_used_mb?: number | null
          total_founders?: number | null
          total_investors?: number | null
          total_matches?: number | null
          total_notifications_sent?: number | null
          total_projects?: number | null
          total_users?: number | null
          total_watchlist_items?: number | null
        }
        Relationships: []
      }
      watchlist_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          read_at: string | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          read_at?: string | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      deck_version_comparison: {
        Row: {
          created_at: string | null
          current_deck_id: string | null
          current_score: number | null
          current_version: number | null
          founder_id: string | null
          previous_deck_id: string | null
          previous_score: number | null
          previous_version: number | null
          score_change: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pitch_decks_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_founder_impact_return: {
        Args: { p_founder_id: string; p_pitch_deck_id: string }
        Returns: {
          impact_return_pct: number
          sdg_breakdown: Json
          total_impact_value: number
        }[]
      }
      get_profile_view_count: {
        Args: { p_days?: number; p_user_id: string }
        Returns: number
      }
      get_unread_alerts_count: { Args: { p_user_id: string }; Returns: number }
      get_watchlist_count: {
        Args: { p_user_id: string; p_user_role: string }
        Returns: number
      }
      is_superadmin: { Args: { user_id: string }; Returns: boolean }
      is_watching: {
        Args: {
          p_target_id: string
          p_target_type: string
          p_user_id: string
          p_user_role: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_admin_id: string
          p_changes?: Json
          p_metadata?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: string
      }
      mark_all_alerts_read: { Args: { p_user_id: string }; Returns: number }
      superadmin_bypass_rls: { Args: never; Returns: boolean }
      update_system_metrics: { Args: never; Returns: undefined }
    }
    Enums: {
      user_role_type: "founder" | "investor" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role_type: ["founder", "investor", "superadmin"],
    },
  },
} as const

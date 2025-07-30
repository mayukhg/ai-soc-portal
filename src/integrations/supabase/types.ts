export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_interactions: {
        Row: {
          content: string
          context_id: string | null
          context_type: string | null
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          message_type: string
          metadata?: Json | null
          session_id?: string
          user_id: string
        }
        Update: {
          content?: string
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      alerts: {
        Row: {
          affected_systems: string[] | null
          alert_type: string
          assigned_to: string | null
          created_at: string
          description: string | null
          destination_ip: unknown | null
          embedding: string | null
          id: string
          indicators: string[] | null
          metadata: Json | null
          resolved_at: string | null
          severity: string
          source: string
          source_ip: unknown | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_systems?: string[] | null
          alert_type: string
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          destination_ip?: unknown | null
          embedding?: string | null
          id?: string
          indicators?: string[] | null
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          source: string
          source_ip?: unknown | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_systems?: string[] | null
          alert_type?: string
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          destination_ip?: unknown | null
          embedding?: string | null
          id?: string
          indicators?: string[] | null
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          source?: string
          source_ip?: unknown | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comments: {
        Row: {
          alert_id: string | null
          comment_type: string | null
          content: string
          created_at: string
          id: string
          incident_id: string | null
          is_internal: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          comment_type?: string | null
          content: string
          created_at?: string
          id?: string
          incident_id?: string | null
          is_internal?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          comment_type?: string | null
          content?: string
          created_at?: string
          id?: string
          incident_id?: string | null
          is_internal?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      incidents: {
        Row: {
          alert_count: number | null
          assignee: string | null
          created_at: string
          description: string | null
          embedding: string | null
          id: string
          severity: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          alert_count?: number | null
          assignee?: string | null
          created_at?: string
          description?: string | null
          embedding?: string | null
          id?: string
          severity: string
          status: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          alert_count?: number | null
          assignee?: string | null
          created_at?: string
          description?: string | null
          embedding?: string | null
          id?: string
          severity?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_metrics: {
        Row: {
          calculated_at: string
          current_value: number
          id: string
          metadata: Json | null
          metric_category: string
          metric_name: string
          period_end: string
          period_start: string
          previous_value: number | null
          target_value: number | null
          trend: string | null
          unit: string | null
        }
        Insert: {
          calculated_at?: string
          current_value: number
          id?: string
          metadata?: Json | null
          metric_category: string
          metric_name: string
          period_end: string
          period_start: string
          previous_value?: number | null
          target_value?: number | null
          trend?: string | null
          unit?: string | null
        }
        Update: {
          calculated_at?: string
          current_value?: number
          id?: string
          metadata?: Json | null
          metric_category?: string
          metric_name?: string
          period_end?: string
          period_start?: string
          previous_value?: number | null
          target_value?: number | null
          trend?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          content: Json
          created_at: string
          file_url: string | null
          generated_by: string
          generated_for: string[] | null
          id: string
          is_recurring: boolean | null
          recurrence_pattern: string | null
          report_type: string
          scheduled_for: string | null
          status: string | null
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          file_url?: string | null
          generated_by: string
          generated_for?: string[] | null
          id?: string
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          report_type: string
          scheduled_for?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          file_url?: string | null
          generated_by?: string
          generated_for?: string[] | null
          id?: string
          is_recurring?: boolean | null
          recurrence_pattern?: string | null
          report_type?: string
          scheduled_for?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      threat_intelligence: {
        Row: {
          confidence_score: number | null
          country_code: string | null
          created_at: string
          first_seen: string | null
          id: string
          indicator_type: string
          indicator_value: string
          is_active: boolean | null
          last_seen: string | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          source: string
          tags: string[] | null
          threat_type: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          country_code?: string | null
          created_at?: string
          first_seen?: string | null
          id?: string
          indicator_type: string
          indicator_value: string
          is_active?: boolean | null
          last_seen?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          source: string
          tags?: string[] | null
          threat_type: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          country_code?: string | null
          created_at?: string
          first_seen?: string | null
          id?: string
          indicator_type?: string
          indicator_value?: string
          is_active?: boolean | null
          last_seen?: string | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          source?: string
          tags?: string[] | null
          threat_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      search_incidents_semantic: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          severity: string
          status: string
          assignee: string
          alert_count: number
          tags: string[]
          created_at: string
          updated_at: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

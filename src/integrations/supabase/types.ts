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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      competitor_alerts: {
        Row: {
          comparison_id: string | null
          created_at: string
          diff: number
          id: string
          metric: string
          new_score: number
          old_score: number
          read: boolean
          site_url: string
          user_id: string
        }
        Insert: {
          comparison_id?: string | null
          created_at?: string
          diff: number
          id?: string
          metric: string
          new_score: number
          old_score: number
          read?: boolean
          site_url: string
          user_id: string
        }
        Update: {
          comparison_id?: string | null
          created_at?: string
          diff?: number
          id?: string
          metric?: string
          new_score?: number
          old_score?: number
          read?: boolean
          site_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_alerts_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "competitor_comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_comparisons: {
        Row: {
          competitor_urls: string[]
          created_at: string
          id: string
          results: Json
          user_id: string
          your_url: string
        }
        Insert: {
          competitor_urls: string[]
          created_at?: string
          id?: string
          results: Json
          user_id: string
          your_url: string
        }
        Update: {
          competitor_urls?: string[]
          created_at?: string
          id?: string
          results?: Json
          user_id?: string
          your_url?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          billing_type: string
          created_at: string
          currency: string
          id: string
          paystack_data: Json | null
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_type: string
          created_at?: string
          currency?: string
          id?: string
          paystack_data?: Json | null
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_type?: string
          created_at?: string
          currency?: string
          id?: string
          paystack_data?: Json | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_keywords: {
        Row: {
          created_at: string
          difficulty_score: number | null
          id: string
          keyword: string
          opportunity_score: number | null
          search_intent: string | null
          suggested_content: string | null
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty_score?: number | null
          id?: string
          keyword: string
          opportunity_score?: number | null
          search_intent?: string | null
          suggested_content?: string | null
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty_score?: number | null
          id?: string
          keyword?: string
          opportunity_score?: number | null
          search_intent?: string | null
          suggested_content?: string | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_reports: {
        Row: {
          created_at: string
          id: string
          overall_score: number | null
          results: Json | null
          status: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          overall_score?: number | null
          results?: Json | null
          status?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          overall_score?: number | null
          results?: Json | null
          status?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          read: boolean
          scan_report_id: string | null
          severity: string
          site_url: string | null
          source: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          read?: boolean
          scan_report_id?: string | null
          severity: string
          site_url?: string | null
          source: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          read?: boolean
          scan_report_id?: string | null
          severity?: string
          site_url?: string | null
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_reports: {
        Row: {
          created_at: string
          id: string
          report_data: Json | null
          user_id: string
          website_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_data?: Json | null
          user_id: string
          website_url: string
        }
        Update: {
          created_at?: string
          id?: string
          report_data?: Json | null
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
      tracked_websites: {
        Row: {
          created_at: string
          id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_type: string | null
          created_at: string
          current_period_end: string | null
          id: string
          paystack_customer_code: string | null
          paystack_email_token: string | null
          paystack_subscription_code: string | null
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_type?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_type?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_scan: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

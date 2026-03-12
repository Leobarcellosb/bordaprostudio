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
      catalog_items: {
        Row: {
          catalog_id: string
          created_at: string | null
          design_id: string
          id: string
        }
        Insert: {
          catalog_id: string
          created_at?: string | null
          design_id: string
          id?: string
        }
        Update: {
          catalog_id?: string
          created_at?: string | null
          design_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogs: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      designs: {
        Row: {
          category_id: string | null
          colors_count: number | null
          cover_image: string | null
          created_at: string | null
          description: string | null
          featured_for_daily_inspiration: boolean
          generated_title: string | null
          height_mm: number | null
          id: string
          is_published: boolean | null
          name: string
          raw_filename: string | null
          stitch_count: number | null
          tags_text: string | null
          updated_at: string | null
          width_mm: number | null
        }
        Insert: {
          category_id?: string | null
          colors_count?: number | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          featured_for_daily_inspiration?: boolean
          generated_title?: string | null
          height_mm?: number | null
          id?: string
          is_published?: boolean | null
          name: string
          raw_filename?: string | null
          stitch_count?: number | null
          tags_text?: string | null
          updated_at?: string | null
          width_mm?: number | null
        }
        Update: {
          category_id?: string | null
          colors_count?: number | null
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          featured_for_daily_inspiration?: boolean
          generated_title?: string | null
          height_mm?: number | null
          id?: string
          is_published?: boolean | null
          name?: string
          raw_filename?: string | null
          stitch_count?: number | null
          tags_text?: string | null
          updated_at?: string | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      downloads: {
        Row: {
          created_at: string | null
          id: string
          kit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kit_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          kit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kit_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          integration: string
          message: string | null
          payload: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          integration?: string
          message?: string | null
          payload?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          integration?: string
          message?: string | null
          payload?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      kit_arquivos: {
        Row: {
          created_at: string | null
          design_id: string
          file_hash: string | null
          file_name: string
          file_url: string
          format: string
          id: string
        }
        Insert: {
          created_at?: string | null
          design_id: string
          file_hash?: string | null
          file_name: string
          file_url: string
          format: string
          id?: string
        }
        Update: {
          created_at?: string | null
          design_id?: string
          file_hash?: string | null
          file_name?: string
          file_url?: string
          format?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_arquivos_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_kits: {
        Row: {
          access_rule: string
          cover_image: string | null
          created_at: string | null
          description: string | null
          designs_count: number
          id: string
          is_published: boolean
          price: number | null
          purchase_url: string | null
          title: string
          updated_at: string | null
          zip_url: string | null
        }
        Insert: {
          access_rule?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          designs_count?: number
          id?: string
          is_published?: boolean
          price?: number | null
          purchase_url?: string | null
          title: string
          updated_at?: string | null
          zip_url?: string | null
        }
        Update: {
          access_rule?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          designs_count?: number
          id?: string
          is_published?: boolean
          price?: number | null
          purchase_url?: string | null
          title?: string
          updated_at?: string | null
          zip_url?: string | null
        }
        Relationships: []
      }
      product_ideas: {
        Row: {
          created_at: string | null
          description: string | null
          design_id: string | null
          id: string
          price_range: string | null
          profit_example: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          design_id?: string | null
          id?: string
          price_range?: string | null
          profit_example?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          design_id?: string | null
          id?: string
          price_range?: string | null
          profit_example?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ideas_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brand_name: string | null
          created_at: string | null
          email: string | null
          id: string
          last_name: string | null
          name: string | null
          phone: string | null
          plan: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          brand_name?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          last_name?: string | null
          name?: string | null
          phone?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          brand_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          phone?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          access_expires_at: string | null
          created_at: string | null
          email: string
          id: string
          last_event: string | null
          plan_code: string
          provider: string
          provider_buyer_id: string | null
          provider_invoice_id: string | null
          provider_offer_id: string | null
          raw_payload: Json | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          last_event?: string | null
          plan_code?: string
          provider?: string
          provider_buyer_id?: string | null
          provider_invoice_id?: string | null
          provider_offer_id?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_event?: string | null
          plan_code?: string
          provider?: string
          provider_buyer_id?: string | null
          provider_invoice_id?: string | null
          provider_offer_id?: string | null
          raw_payload?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          completed_at: string | null
          created_at: string | null
          experience_level: string | null
          favorite_categories: string[] | null
          hoop_size: string | null
          id: string
          selling_activity: string | null
          usage_goal: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          experience_level?: string | null
          favorite_categories?: string[] | null
          hoop_size?: string | null
          id?: string
          selling_activity?: string | null
          usage_goal?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          experience_level?: string | null
          favorite_categories?: string[] | null
          hoop_size?: string | null
          id?: string
          selling_activity?: string | null
          usage_goal?: string | null
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
      webhook_configs: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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

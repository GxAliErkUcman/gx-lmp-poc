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
      businesses: {
        Row: {
          additionalCategories: string | null
          additionalPhones: string | null
          addressLine1: string | null
          addressLine2: string | null
          addressLine3: string | null
          addressLine4: string | null
          addressLine5: string | null
          adwords: string | null
          appointmentURL: string | null
          businessName: string | null
          city: string | null
          client_id: string | null
          country: string | null
          coverPhoto: string | null
          created_at: string
          customServices: Json | null
          district: string | null
          fridayHours: string | null
          fromTheBusiness: string | null
          id: string
          labels: string | null
          latitude: number | null
          logoPhoto: string | null
          longitude: number | null
          menuURL: string | null
          mondayHours: string | null
          moreHours: Json | null
          openingDate: string | null
          orderAheadURL: string | null
          otherPhotos: string | null
          postalCode: string | null
          primaryCategory: string | null
          primaryPhone: string | null
          reservationsURL: string | null
          saturdayHours: string | null
          socialMediaUrls: Json | null
          specialHours: string | null
          state: string | null
          status: string
          storeCode: string
          sundayHours: string | null
          temporarilyClosed: boolean | null
          thursdayHours: string | null
          tuesdayHours: string | null
          updated_at: string
          user_id: string
          website: string | null
          wednesdayHours: string | null
        }
        Insert: {
          additionalCategories?: string | null
          additionalPhones?: string | null
          addressLine1?: string | null
          addressLine2?: string | null
          addressLine3?: string | null
          addressLine4?: string | null
          addressLine5?: string | null
          adwords?: string | null
          appointmentURL?: string | null
          businessName?: string | null
          city?: string | null
          client_id?: string | null
          country?: string | null
          coverPhoto?: string | null
          created_at?: string
          customServices?: Json | null
          district?: string | null
          fridayHours?: string | null
          fromTheBusiness?: string | null
          id?: string
          labels?: string | null
          latitude?: number | null
          logoPhoto?: string | null
          longitude?: number | null
          menuURL?: string | null
          mondayHours?: string | null
          moreHours?: Json | null
          openingDate?: string | null
          orderAheadURL?: string | null
          otherPhotos?: string | null
          postalCode?: string | null
          primaryCategory?: string | null
          primaryPhone?: string | null
          reservationsURL?: string | null
          saturdayHours?: string | null
          socialMediaUrls?: Json | null
          specialHours?: string | null
          state?: string | null
          status?: string
          storeCode?: string
          sundayHours?: string | null
          temporarilyClosed?: boolean | null
          thursdayHours?: string | null
          tuesdayHours?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          wednesdayHours?: string | null
        }
        Update: {
          additionalCategories?: string | null
          additionalPhones?: string | null
          addressLine1?: string | null
          addressLine2?: string | null
          addressLine3?: string | null
          addressLine4?: string | null
          addressLine5?: string | null
          adwords?: string | null
          appointmentURL?: string | null
          businessName?: string | null
          city?: string | null
          client_id?: string | null
          country?: string | null
          coverPhoto?: string | null
          created_at?: string
          customServices?: Json | null
          district?: string | null
          fridayHours?: string | null
          fromTheBusiness?: string | null
          id?: string
          labels?: string | null
          latitude?: number | null
          logoPhoto?: string | null
          longitude?: number | null
          menuURL?: string | null
          mondayHours?: string | null
          moreHours?: Json | null
          openingDate?: string | null
          orderAheadURL?: string | null
          otherPhotos?: string | null
          postalCode?: string | null
          primaryCategory?: string | null
          primaryPhone?: string | null
          reservationsURL?: string | null
          saturdayHours?: string | null
          socialMediaUrls?: Json | null
          specialHours?: string | null
          state?: string | null
          status?: string
          storeCode?: string
          sundayHours?: string | null
          temporarilyClosed?: boolean | null
          thursdayHours?: string | null
          tuesdayHours?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          wednesdayHours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_name: string | null
          created_at: string
          id: number
        }
        Insert: {
          category_name?: string | null
          created_at?: string
          id?: number
        }
        Update: {
          category_name?: string | null
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      client_categories: {
        Row: {
          category_name: string
          client_id: string
          created_at: string | null
          id: string
          source_category_id: number | null
        }
        Insert: {
          category_name: string
          client_id: string
          created_at?: string | null
          id?: string
          source_category_id?: number | null
        }
        Update: {
          category_name?: string
          client_id?: string
          created_at?: string | null
          id?: string
          source_category_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_categories_source_category_id_fkey"
            columns: ["source_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          lsc_id: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lsc_id?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lsc_id?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_store_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_client_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_locations: number
          client_id: string
          client_name: string
          last_updated: string
          pending_locations: number
          user_count: number
        }[]
      }
      get_user_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_business_complete: {
        Args: {
          business_row: Database["public"]["Tables"]["businesses"]["Row"]
        }
        Returns: boolean
      }
      validate_opening_hours: {
        Args: { hours_text: string }
        Returns: boolean
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

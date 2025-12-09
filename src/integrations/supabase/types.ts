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
      business_field_history: {
        Row: {
          business_id: string
          change_source: string | null
          changed_at: string
          changed_by: string | null
          changed_by_email: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          business_id: string
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          business_id?: string
          change_source?: string | null
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_field_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
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
          goldmine: string | null
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
          relevantLocation: Json | null
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
          goldmine?: string | null
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
          relevantLocation?: Json | null
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
          goldmine?: string | null
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
          relevantLocation?: Json | null
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
      client_custom_services: {
        Row: {
          client_id: string
          created_at: string
          id: string
          service_category_id: string | null
          service_description: string | null
          service_name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          service_category_id?: string | null
          service_description?: string | null
          service_name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          service_category_id?: string | null
          service_description?: string | null
          service_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_custom_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_permissions: {
        Row: {
          client_id: string
          created_at: string
          field_id: string | null
          id: string
          locked_for_client_admin: boolean
          locked_for_store_owner: boolean
          locked_for_user: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          field_id?: string | null
          id?: string
          locked_for_client_admin?: boolean
          locked_for_store_owner?: boolean
          locked_for_user?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          field_id?: string | null
          id?: string
          locked_for_client_admin?: boolean
          locked_for_store_owner?: boolean
          locked_for_user?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_permissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_permissions_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "lockable_fields"
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
      lockable_fields: {
        Row: {
          created_at: string
          display_name: string
          field_group: Database["public"]["Enums"]["field_group"]
          field_name: string
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          display_name: string
          field_group: Database["public"]["Enums"]["field_group"]
          field_name: string
          id?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          field_group?: Database["public"]["Enums"]["field_group"]
          field_name?: string
          id?: string
          sort_order?: number
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
      store_owner_access: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_owner_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_client_access: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_as_store_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_store_owner_access: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      generate_store_code: { Args: never; Returns: string }
      get_client_statistics: {
        Args: never
        Returns: {
          active_locations: number
          client_id: string
          client_name: string
          last_updated: string
          pending_locations: number
          user_count: number
        }[]
      }
      get_user_accessible_clients: {
        Args: { _user_id: string }
        Returns: {
          client_id: string
        }[]
      }
      get_user_client_id: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_complete: {
        Args: {
          business_row: Database["public"]["Tables"]["businesses"]["Row"]
        }
        Returns: boolean
      }
      validate_opening_hours: { Args: { hours_text: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "service_user"
        | "client_admin"
        | "user"
        | "store_owner"
      field_group:
        | "basic_info"
        | "address_details"
        | "location"
        | "categories"
        | "contact"
        | "marketing"
        | "opening_hours"
        | "dates"
        | "status"
        | "photos"
        | "service_urls"
        | "additional_features"
        | "import_function"
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
      app_role: [
        "admin",
        "service_user",
        "client_admin",
        "user",
        "store_owner",
      ],
      field_group: [
        "basic_info",
        "address_details",
        "location",
        "categories",
        "contact",
        "marketing",
        "opening_hours",
        "dates",
        "status",
        "photos",
        "service_urls",
        "additional_features",
        "import_function",
      ],
    },
  },
} as const

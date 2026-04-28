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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      author_applications: {
        Row: {
          blessing_doc_url: string | null
          created_at: string
          id: string
          motivation: string
          profile_id: string
          reviewed_at: string | null
          reviewer_comment: string | null
          status: string
        }
        Insert: {
          blessing_doc_url?: string | null
          created_at?: string
          id?: string
          motivation: string
          profile_id: string
          reviewed_at?: string | null
          reviewer_comment?: string | null
          status?: string
        }
        Update: {
          blessing_doc_url?: string | null
          created_at?: string
          id?: string
          motivation?: string
          profile_id?: string
          reviewed_at?: string | null
          reviewer_comment?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          bio: string | null
          blessing_info: string | null
          created_at: string
          id: number
          name: string | null
          photo_url: string | null
          profile_id: string | null
          slug: string | null
        }
        Insert: {
          bio?: string | null
          blessing_info?: string | null
          created_at?: string
          id?: number
          name?: string | null
          photo_url?: string | null
          profile_id?: string | null
          slug?: string | null
        }
        Update: {
          bio?: string | null
          blessing_info?: string | null
          created_at?: string
          id?: number
          name?: string | null
          photo_url?: string | null
          profile_id?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: number
          name: string | null
          slug: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
          slug?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
          slug?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      interest_tags: {
        Row: {
          created_at: string | null
          icon: string | null
          id: number
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: never
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: never
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: number | null
          author_photo_url: string | null
          body: string | null
          category_id: number | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: number
          published_at: string | null
          status: string
          title: string | null
        }
        Insert: {
          author_id?: number | null
          author_photo_url?: string | null
          body?: string | null
          category_id?: number | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          published_at?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          author_id?: number | null
          author_photo_url?: string | null
          body?: string | null
          category_id?: number | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          published_at?: string | null
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_interests: {
        Row: {
          created_at: string | null
          profile_id: string
          tag_id: number
        }
        Insert: {
          created_at?: string | null
          profile_id: string
          tag_id: number
        }
        Update: {
          created_at?: string | null
          profile_id?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_interests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_interests_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "interest_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          baptism_date: string | null
          bio: string | null
          christian_name: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          privacy_settings: Json | null
          role: string
          social_links: Json | null
          temple_id: number | null
          temple_relation: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          baptism_date?: string | null
          bio?: string | null
          christian_name?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          privacy_settings?: Json | null
          role?: string
          social_links?: Json | null
          temple_id?: number | null
          temple_relation?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          baptism_date?: string | null
          bio?: string | null
          christian_name?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          privacy_settings?: Json | null
          role?: string
          social_links?: Json | null
          temple_id?: number | null
          temple_relation?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          author_id: number
          created_at: string
          id: string
          subscriber_id: string
        }
        Insert: {
          author_id: number
          created_at?: string
          id?: string
          subscriber_id: string
        }
        Update: {
          author_id?: number
          created_at?: string
          id?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      temple_applications: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          id: number
          latitude: number
          longitude: number
          name: string
          phone: string | null
          photo_url: string | null
          profile_id: string
          rector: string | null
          resulting_temple_id: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_comment: string | null
          schedule_url: string | null
          status: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: never
          latitude: number
          longitude: number
          name: string
          phone?: string | null
          photo_url?: string | null
          profile_id: string
          rector?: string | null
          resulting_temple_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comment?: string | null
          schedule_url?: string | null
          status?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: never
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
          photo_url?: string | null
          profile_id?: string
          rector?: string | null
          resulting_temple_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_comment?: string | null
          schedule_url?: string | null
          status?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temple_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temple_applications_resulting_temple_id_fkey"
            columns: ["resulting_temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temple_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      temples: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          id: number
          latitude: number
          longitude: number
          name: string
          phone: string | null
          photo_url: string | null
          rector: string | null
          schedule_url: string | null
          slug: string
          submitted_by: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: never
          latitude: number
          longitude: number
          name: string
          phone?: string | null
          photo_url?: string | null
          rector?: string | null
          schedule_url?: string | null
          slug: string
          submitted_by?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: never
          latitude?: number
          longitude?: number
          name?: string
          phone?: string | null
          photo_url?: string | null
          rector?: string | null
          schedule_url?: string | null
          slug?: string
          submitted_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temples_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_editor: { Args: never; Returns: boolean }
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

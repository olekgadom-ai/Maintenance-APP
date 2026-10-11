// Generated from the Supabase schema. Regenerate after every migration:
//   npx supabase gen types typescript --project-id flfaagqjthrvxfxzbskp > src/lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          allow_technician_self_assign: boolean;
          id: boolean;
          updated_at: string;
        };
        Insert: {
          allow_technician_self_assign?: boolean;
          id?: boolean;
          updated_at?: string;
        };
        Update: {
          allow_technician_self_assign?: boolean;
          id?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      areas: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      machines: {
        Row: {
          active: boolean;
          area_id: string;
          code: string;
          created_at: string;
          criticality: Database["public"]["Enums"]["machine_criticality"];
          id: string;
          name: string;
          qr_token: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          area_id: string;
          code: string;
          created_at?: string;
          criticality?: Database["public"]["Enums"]["machine_criticality"];
          id?: string;
          name: string;
          qr_token?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          area_id?: string;
          code?: string;
          created_at?: string;
          criticality?: Database["public"]["Enums"]["machine_criticality"];
          id?: string;
          name?: string;
          qr_token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "machines_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          area_id: string | null;
          created_at: string;
          full_name: string;
          id: string;
          locale: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          area_id?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          locale?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          area_id?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          locale?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_attachments: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          storage_path: string;
          ticket_id: string;
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: string;
          storage_path: string;
          ticket_id: string;
          uploaded_by?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          storage_path?: string;
          ticket_id?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          ticket_id: string;
        };
        Insert: {
          author_id?: string;
          body: string;
          created_at?: string;
          id?: string;
          ticket_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_events: {
        Row: {
          actor_id: string | null;
          comment: string | null;
          created_at: string;
          event_type: string;
          from_status: Database["public"]["Enums"]["ticket_status"] | null;
          id: number;
          payload: Json;
          ticket_id: string;
          to_status: Database["public"]["Enums"]["ticket_status"] | null;
        };
        Insert: {
          actor_id?: string | null;
          comment?: string | null;
          created_at?: string;
          event_type: string;
          from_status?: Database["public"]["Enums"]["ticket_status"] | null;
          id?: never;
          payload?: Json;
          ticket_id: string;
          to_status?: Database["public"]["Enums"]["ticket_status"] | null;
        };
        Update: {
          actor_id?: string | null;
          comment?: string | null;
          created_at?: string;
          event_type?: string;
          from_status?: Database["public"]["Enums"]["ticket_status"] | null;
          id?: never;
          payload?: Json;
          ticket_id?: string;
          to_status?: Database["public"]["Enums"]["ticket_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_parts: {
        Row: {
          added_by: string;
          created_at: string;
          id: string;
          name: string;
          part_number: string | null;
          quantity: number;
          ticket_id: string;
          unit: string;
        };
        Insert: {
          added_by?: string;
          created_at?: string;
          id?: string;
          name: string;
          part_number?: string | null;
          quantity?: number;
          ticket_id: string;
          unit?: string;
        };
        Update: {
          added_by?: string;
          created_at?: string;
          id?: string;
          name?: string;
          part_number?: string | null;
          quantity?: number;
          ticket_id?: string;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_parts_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_parts_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_work_logs: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          note: string | null;
          started_at: string;
          technician_id: string;
          ticket_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          note?: string | null;
          started_at?: string;
          technician_id: string;
          ticket_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          note?: string | null;
          started_at?: string;
          technician_id?: string;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_work_logs_technician_id_fkey";
            columns: ["technician_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_work_logs_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          area_id: string;
          assigned_at: string | null;
          assigned_to: string | null;
          cancelled_at: string | null;
          closed_at: string | null;
          confirmed_at: string | null;
          description: string | null;
          id: string;
          machine_id: string;
          machine_stopped: boolean;
          number: string;
          priority: Database["public"]["Enums"]["ticket_priority"];
          reported_at: string;
          reported_by: string;
          resolution: string | null;
          resolved_at: string | null;
          root_cause: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["ticket_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          area_id: string;
          assigned_at?: string | null;
          assigned_to?: string | null;
          cancelled_at?: string | null;
          closed_at?: string | null;
          confirmed_at?: string | null;
          description?: string | null;
          id?: string;
          machine_id: string;
          machine_stopped?: boolean;
          number?: string;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          reported_at?: string;
          reported_by: string;
          resolution?: string | null;
          resolved_at?: string | null;
          root_cause?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          area_id?: string;
          assigned_at?: string | null;
          assigned_to?: string | null;
          cancelled_at?: string | null;
          closed_at?: string | null;
          confirmed_at?: string | null;
          description?: string | null;
          id?: string;
          machine_id?: string;
          machine_stopped?: boolean;
          number?: string;
          priority?: Database["public"]["Enums"]["ticket_priority"];
          reported_at?: string;
          reported_by?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          root_cause?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_machine_id_fkey";
            columns: ["machine_id"];
            isOneToOne: false;
            referencedRelation: "machines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_update_profile: {
        Args: {
          p_active: boolean;
          p_area_id: string | null;
          p_role: Database["public"]["Enums"]["user_role"];
          p_user_id: string;
        };
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      assign_ticket: {
        Args: {
          p_comment?: string;
          p_technician_id: string;
          p_ticket_id: string;
        };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
        SetofOptions: {
          from: "*";
          to: "tickets";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_ticket: {
        Args: {
          p_description?: string;
          p_machine_id: string;
          p_machine_stopped?: boolean;
          p_priority?: Database["public"]["Enums"]["ticket_priority"];
          p_title: string;
        };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
        SetofOptions: {
          from: "*";
          to: "tickets";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      transition_ticket: {
        Args: {
          p_comment?: string;
          p_ticket_id: string;
          p_to: Database["public"]["Enums"]["ticket_status"];
        };
        Returns: Database["public"]["Tables"]["tickets"]["Row"];
        SetofOptions: {
          from: "*";
          to: "tickets";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      machine_criticality: "A" | "B" | "C";
      ticket_priority: "critical" | "high" | "normal" | "low";
      ticket_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "on_hold"
        | "resolved"
        | "rejected"
        | "confirmed"
        | "closed"
        | "cancelled";
      user_role: "area_leader" | "technician" | "manager";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      machine_criticality: ["A", "B", "C"],
      ticket_priority: ["critical", "high", "normal", "low"],
      ticket_status: [
        "new",
        "assigned",
        "in_progress",
        "on_hold",
        "resolved",
        "rejected",
        "confirmed",
        "closed",
        "cancelled",
      ],
      user_role: ["area_leader", "technician", "manager"],
    },
  },
} as const;

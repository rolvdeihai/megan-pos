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
      employees: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          employee_code: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          pin_code: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          employee_code?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          pin_code: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          employee_code?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          pin_code?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          current_stock: number | null
          id: string
          last_restocked: string | null
          minimum_stock: number | null
          name: string
          sku: string
          supplier: string | null
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          last_restocked?: string | null
          minimum_stock?: number | null
          name: string
          sku: string
          supplier?: string | null
          unit: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          current_stock?: number | null
          id?: string
          last_restocked?: string | null
          minimum_stock?: number | null
          name?: string
          sku?: string
          supplier?: string | null
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_featured: boolean | null
          name: string
          preparation_time: number | null
          price: number
          sku: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          name: string
          preparation_time?: number | null
          price: number
          sku?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number
          sku?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string
          order_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id: string
          order_id: string
          quantity: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          notes: string | null
          order_number: string
          order_type: string
          payment_method: string | null
          payment_status: string | null
          served_by: string | null
          status: string
          subtotal: number
          table_id: string | null
          tax_amount: number | null
          tax_percentage: number | null
          total_amount: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          order_number: string
          order_type: string
          payment_method?: string | null
          payment_status?: string | null
          served_by?: string | null
          status: string
          subtotal: number
          table_id?: string | null
          tax_amount?: number | null
          tax_percentage?: number | null
          total_amount: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          order_type?: string
          payment_method?: string | null
          payment_status?: string | null
          served_by?: string | null
          status?: string
          subtotal?: number
          table_id?: string | null
          tax_amount?: number | null
          tax_percentage?: number | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_served_by_fkey"
            columns: ["served_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          duration_days?: number
          features?: Json | null
          id: string
          is_active?: boolean | null
          name: string
          price?: number
        }
        Update: {
          created_at?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string
          menu_item_id: string
          quantity_required: number
          unit: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id: string
          menu_item_id: string
          quantity_required: number
          unit: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string
          menu_item_id?: string
          quantity_required?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          business_hours: Json | null
          created_at: string | null
          delivery_fee: number | null
          enable_delivery: boolean | null
          enable_online_orders: boolean | null
          enable_table_selection: boolean | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          service_charge_percentage: number | null
          tax_percentage: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_hours?: Json | null
          created_at?: string | null
          delivery_fee?: number | null
          enable_delivery?: boolean | null
          enable_online_orders?: boolean | null
          enable_table_selection?: boolean | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          service_charge_percentage?: number | null
          tax_percentage?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_hours?: Json | null
          created_at?: string | null
          delivery_fee?: number | null
          enable_delivery?: boolean | null
          enable_online_orders?: boolean | null
          enable_table_selection?: boolean | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          service_charge_percentage?: number | null
          tax_percentage?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      restaurant_tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          is_available: boolean | null
          qr_code: string | null
          table_name: string | null
          table_number: string
          user_id: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          qr_code?: string | null
          table_name?: string | null
          table_number: string
          user_id: string
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          qr_code?: string | null
          table_name?: string | null
          table_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          order_id: string | null
          payment_details: Json | null
          payment_method: string
          status: string | null
          transaction_number: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_details?: Json | null
          payment_method: string
          status?: string | null
          transaction_number: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_details?: Json | null
          payment_method?: string
          status?: string | null
          transaction_number?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          package_id: string
          payment_proof_url: string | null
          start_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          package_id: string
          payment_proof_url?: string | null
          start_date: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          package_id?: string
          payment_proof_url?: string | null
          start_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          password_hash: string | null
          phone: string | null
          restaurant_name: string | null
          restaurant_slug: string | null
          subscription_end_date: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          password_hash?: string | null
          phone?: string | null
          restaurant_name?: string | null
          restaurant_slug?: string | null
          subscription_end_date?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          password_hash?: string | null
          phone?: string | null
          restaurant_name?: string | null
          restaurant_slug?: string | null
          subscription_end_date?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
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

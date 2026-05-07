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
      app_settings: {
        Row: {
          default_currency: string
          default_unit: string
          id: string
          low_stock_threshold_tons: number
          overtime_multiplier: number
          updated_at: string
          working_days_per_week: number
          working_hours_per_day: number
        }
        Insert: {
          default_currency?: string
          default_unit?: string
          id?: string
          low_stock_threshold_tons?: number
          overtime_multiplier?: number
          updated_at?: string
          working_days_per_week?: number
          working_hours_per_day?: number
        }
        Update: {
          default_currency?: string
          default_unit?: string
          id?: string
          low_stock_threshold_tons?: number
          overtime_multiplier?: number
          updated_at?: string
          working_days_per_week?: number
          working_hours_per_day?: number
        }
        Relationships: []
      }
      attendance: {
        Row: {
          date: string | null
          id: string
          labour_id: string | null
          notes: string | null
          overtime_hours: number | null
          status: string | null
        }
        Insert: {
          date?: string | null
          id?: string
          labour_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string | null
        }
        Update: {
          date?: string | null
          id?: string
          labour_id?: string | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_labour_id_fkey"
            columns: ["labour_id"]
            isOneToOne: false
            referencedRelation: "labour"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          credit_limit: number | null
          current_balance: number | null
          customer_type: string | null
          email: string | null
          id: string
          marble_size: string | null
          marble_type: string | null
          name: string
          notes: string | null
          phone: string | null
          pieces: number | null
          price_per_piece: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          customer_type?: string | null
          email?: string | null
          id?: string
          marble_size?: string | null
          marble_type?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          pieces?: number | null
          price_per_piece?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          customer_type?: string | null
          email?: string | null
          id?: string
          marble_size?: string | null
          marble_type?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          pieces?: number | null
          price_per_piece?: number | null
        }
        Relationships: []
      }
      expense_products: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          description: string | null
          expense_date: string | null
          expense_product: string | null
          id: string
          paid_to: string | null
          receipt_url: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string | null
          expense_product?: string | null
          id?: string
          paid_to?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          expense_date?: string | null
          expense_product?: string | null
          id?: string
          paid_to?: string | null
          receipt_url?: string | null
        }
        Relationships: []
      }
      factory_info: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          established_year: number | null
          id: string
          logo_url: string | null
          name_english: string | null
          name_urdu: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          established_year?: number | null
          id?: string
          logo_url?: string | null
          name_english?: string | null
          name_urdu?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          established_year?: number | null
          id?: string
          logo_url?: string | null
          name_english?: string | null
          name_urdu?: string | null
        }
        Relationships: []
      }
      finished_marble_inventory: {
        Row: {
          batch_number: string | null
          category_id: string | null
          cost_per_unit: number | null
          created_at: string
          id: string
          production_date: string | null
          quantity: number | null
          selling_price_per_unit: number | null
          stock_status: string | null
          unit: string | null
        }
        Insert: {
          batch_number?: string | null
          category_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          production_date?: string | null
          quantity?: number | null
          selling_price_per_unit?: number | null
          stock_status?: string | null
          unit?: string | null
        }
        Update: {
          batch_number?: string | null
          category_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          production_date?: string | null
          quantity?: number | null
          selling_price_per_unit?: number | null
          stock_status?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finished_marble_inventory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marble_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      founders: {
        Row: {
          created_at: string
          designation_english: string | null
          designation_urdu: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name_english: string | null
          name_urdu: string | null
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          designation_english?: string | null
          designation_urdu?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name_english?: string | null
          name_urdu?: string | null
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          designation_english?: string | null
          designation_urdu?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name_english?: string | null
          name_urdu?: string | null
          photo_url?: string | null
        }
        Relationships: []
      }
      labour: {
        Row: {
          cnic: string | null
          created_at: string
          daily_wage: number | null
          id: string
          is_active: boolean | null
          job_role: string | null
          join_date: string | null
          monthly_salary: number | null
          name: string
          phone: string | null
          salary_type: string | null
        }
        Insert: {
          cnic?: string | null
          created_at?: string
          daily_wage?: number | null
          id?: string
          is_active?: boolean | null
          job_role?: string | null
          join_date?: string | null
          monthly_salary?: number | null
          name: string
          phone?: string | null
          salary_type?: string | null
        }
        Update: {
          cnic?: string | null
          created_at?: string
          daily_wage?: number | null
          id?: string
          is_active?: boolean | null
          job_role?: string | null
          join_date?: string | null
          monthly_salary?: number | null
          name?: string
          phone?: string | null
          salary_type?: string | null
        }
        Relationships: []
      }
      lending_borrowing: {
        Row: {
          amount: number | null
          amount_returned: number | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string | null
          due_date: string | null
          id: string
          is_settled: boolean | null
          item_kind: string | null
          marble_size: string | null
          marble_type: string | null
          notes: string | null
          party_name: string
          party_type: string | null
          price_per_unit: number | null
          quantity: number | null
          rock_type: string | null
          supplier_id: string | null
          transaction_date: string | null
          transaction_type: string | null
          unit: string | null
        }
        Insert: {
          amount?: number | null
          amount_returned?: number | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          is_settled?: boolean | null
          item_kind?: string | null
          marble_size?: string | null
          marble_type?: string | null
          notes?: string | null
          party_name: string
          party_type?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          rock_type?: string | null
          supplier_id?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          unit?: string | null
        }
        Update: {
          amount?: number | null
          amount_returned?: number | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          is_settled?: boolean | null
          item_kind?: string | null
          marble_size?: string | null
          marble_type?: string | null
          notes?: string | null
          party_name?: string
          party_type?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          rock_type?: string | null
          supplier_id?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          unit?: string | null
        }
        Relationships: []
      }
      machine_equipment: {
        Row: {
          current_status: string | null
          id: string
          last_maintenance_date: string | null
          machine_name: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
        }
        Insert: {
          current_status?: string | null
          id?: string
          last_maintenance_date?: string | null
          machine_name?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
        }
        Update: {
          current_status?: string | null
          id?: string
          last_maintenance_date?: string | null
          machine_name?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
        }
        Relationships: []
      }
      marble_categories: {
        Row: {
          created_at: string
          description_urdu: string | null
          id: string
          is_active: boolean | null
          name_english: string | null
          name_urdu: string
          price_per_slab: number | null
          price_per_sqft: number | null
          show_price: boolean
          unit: string
        }
        Insert: {
          created_at?: string
          description_urdu?: string | null
          id?: string
          is_active?: boolean | null
          name_english?: string | null
          name_urdu: string
          price_per_slab?: number | null
          price_per_sqft?: number | null
          show_price?: boolean
          unit?: string
        }
        Update: {
          created_at?: string
          description_urdu?: string | null
          id?: string
          is_active?: boolean | null
          name_english?: string | null
          name_urdu?: string
          price_per_slab?: number | null
          price_per_sqft?: number | null
          show_price?: boolean
          unit?: string
        }
        Relationships: []
      }
      marble_photos: {
        Row: {
          caption_urdu: string | null
          category_id: string | null
          display_order: number | null
          id: string
          photo_url: string
          uploaded_at: string
        }
        Insert: {
          caption_urdu?: string | null
          category_id?: string | null
          display_order?: number | null
          id?: string
          photo_url: string
          uploaded_at?: string
        }
        Update: {
          caption_urdu?: string | null
          category_id?: string | null
          display_order?: number | null
          id?: string
          photo_url?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marble_photos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marble_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      marble_price_history: {
        Row: {
          category_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_price_per_slab: number | null
          new_price_per_sqft: number | null
          old_price_per_slab: number | null
          old_price_per_sqft: number | null
        }
        Insert: {
          category_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price_per_slab?: number | null
          new_price_per_sqft?: number | null
          old_price_per_slab?: number | null
          old_price_per_sqft?: number | null
        }
        Update: {
          category_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price_per_slab?: number | null
          new_price_per_sqft?: number | null
          old_price_per_slab?: number | null
          old_price_per_sqft?: number | null
        }
        Relationships: []
      }
      marble_sizes: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          customer_id: string | null
          due_date: string | null
          id: string
          is_settled: boolean | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_type: string | null
          related_order_id: string | null
          supplier_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          is_settled?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          related_order_id?: string | null
          supplier_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          is_settled?: boolean | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_type?: string | null
          related_order_id?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          category_id: string | null
          created_at: string
          date: string | null
          id: string
          machine_id: string | null
          notes: string | null
          operator_name: string | null
          raw_rock_used_tons: number | null
          slabs_produced: number | null
          sqft_produced: number | null
          wastage_percent: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          operator_name?: string | null
          raw_rock_used_tons?: number | null
          slabs_produced?: number | null
          sqft_produced?: number | null
          wastage_percent?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          date?: string | null
          id?: string
          machine_id?: string | null
          notes?: string | null
          operator_name?: string | null
          raw_rock_used_tons?: number | null
          slabs_produced?: number | null
          sqft_produced?: number | null
          wastage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marble_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machine_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      raw_rock_inventory: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          purchase_date: string | null
          purchase_price_per_ton: number | null
          quantity_tons: number | null
          rock_name_urdu: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price_per_ton?: number | null
          quantity_tons?: number | null
          rock_name_urdu?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price_per_ton?: number | null
          quantity_tons?: number | null
          rock_name_urdu?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_rock_inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          base_salary: number | null
          days_present: number | null
          deductions: number | null
          half_days: number | null
          id: string
          is_paid: boolean | null
          labour_id: string | null
          month: number | null
          net_salary: number | null
          notes: string | null
          overtime_hours: number | null
          overtime_pay: number | null
          paid_date: string | null
          payment_method: string | null
          year: number | null
        }
        Insert: {
          base_salary?: number | null
          days_present?: number | null
          deductions?: number | null
          half_days?: number | null
          id?: string
          is_paid?: boolean | null
          labour_id?: string | null
          month?: number | null
          net_salary?: number | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_date?: string | null
          payment_method?: string | null
          year?: number | null
        }
        Update: {
          base_salary?: number | null
          days_present?: number | null
          deductions?: number | null
          half_days?: number | null
          id?: string
          is_paid?: boolean | null
          labour_id?: string | null
          month?: number | null
          net_salary?: number | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          paid_date?: string | null
          payment_method?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_labour_id_fkey"
            columns: ["labour_id"]
            isOneToOne: false
            referencedRelation: "labour"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          category_id: string | null
          id: string
          inventory_id: string | null
          order_id: string | null
          quantity: number | null
          total_price: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          category_id?: string | null
          id?: string
          inventory_id?: string | null
          order_id?: string | null
          quantity?: number | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          category_id?: string | null
          id?: string
          inventory_id?: string | null
          order_id?: string | null
          quantity?: number | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marble_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "finished_marble_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          customer_id: string | null
          delivery_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string | null
          paid_amount: number | null
          payment_type: string | null
          remaining_amount: number | null
          status: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          paid_amount?: number | null
          payment_type?: string | null
          remaining_amount?: number | null
          status?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          paid_amount?: number | null
          payment_type?: string | null
          remaining_amount?: number | null
          status?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          current_balance: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          price_per_ton: number | null
          quantity_tons: number | null
          rock_type: string | null
          supply_type: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          price_per_ton?: number | null
          quantity_tons?: number | null
          rock_type?: string | null
          supply_type?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          price_per_ton?: number | null
          quantity_tons?: number | null
          rock_type?: string | null
          supply_type?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read: { Args: { _uid: string }; Returns: boolean }
      decrement_finished_inventory: {
        Args: { inv_id: string; sold_qty: number }
        Returns: undefined
      }
      decrement_raw_rock: {
        Args: { rock_id: string; used_tons: number }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_authenticated_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer"
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
      app_role: ["admin", "manager", "viewer"],
    },
  },
} as const

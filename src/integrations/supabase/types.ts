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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_app_settings_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          code: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          customer_type: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          is_active: boolean
          is_test_data: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_type?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_test_data?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_type?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_test_data?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_customers_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_customers_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intermediate_products: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_stock_units: number | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_active: boolean
          min_stock_units: number | null
          name: string
          shelf_life_days: number | null
          unit_cost: number | null
          unit_measure: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_stock_units?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock_units?: number | null
          name: string
          shelf_life_days?: number | null
          unit_cost?: number | null
          unit_measure?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_stock_units?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          min_stock_units?: number | null
          name?: string
          shelf_life_days?: number | null
          unit_cost?: number | null
          unit_measure?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_current: {
        Row: {
          batch_id: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          last_movement_date: string | null
          last_updated: string | null
          location_id: string | null
          product_id: string | null
          quantity_available: number | null
          quantity_in_transit: number | null
          quantity_reserved: number | null
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_movement_date?: string | null
          last_updated?: string | null
          location_id?: string | null
          product_id?: string | null
          quantity_available?: number | null
          quantity_in_transit?: number | null
          quantity_reserved?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_movement_date?: string | null
          last_updated?: string | null
          location_id?: string | null
          product_id?: string | null
          quantity_available?: number | null
          quantity_in_transit?: number | null
          quantity_reserved?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_current_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_current_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_current_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          batch_id: string | null
          created_at: string | null
          created_by: string | null
          from_location_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          product_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          to_location_id: string | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_location_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          to_location_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_location_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          to_location_id?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_movements_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          code: string
          contact_info: Json | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_info?: Json | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_info?: Json | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          priority: Database["public"]["Enums"]["notification_priority"] | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      packaging_materials: {
        Row: {
          code: string
          created_at: string
          current_stock_units: number | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          moq_units: number | null
          name: string
          price_per_unit: number | null
          supplier_id: string | null
          type: Database["public"]["Enums"]["packaging_material_type"] | null
          unit_measure: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_stock_units?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          moq_units?: number | null
          name: string
          price_per_unit?: number | null
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["packaging_material_type"] | null
          unit_measure?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_stock_units?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          moq_units?: number | null
          name?: string
          price_per_unit?: number | null
          supplier_id?: string | null
          type?: Database["public"]["Enums"]["packaging_material_type"] | null
          unit_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_packaging_materials_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_materials_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packaging_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_formulas: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          quantity_needed: number | null
          raw_material_id: string | null
          unit_measure: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity_needed?: number | null
          raw_material_id?: string | null
          unit_measure?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity_needed?: number | null
          raw_material_id?: string | null
          unit_measure?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_formulas_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_formulas_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      product_packaging: {
        Row: {
          created_at: string
          id: string
          packaging_material_id: string | null
          product_id: string | null
          quantity_per_unit: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          packaging_material_id?: string | null
          product_id?: string | null
          quantity_per_unit?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          packaging_material_id?: string | null
          product_id?: string | null
          quantity_per_unit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_packaging_packaging_material_id_fkey"
            columns: ["packaging_material_id"]
            isOneToOne: false
            referencedRelation: "packaging_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ingredient_id: string
          ingredient_type: string
          notes: string | null
          product_id: string | null
          quantity_needed: number
          unit_measure: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id: string
          ingredient_type: string
          notes?: string | null
          product_id?: string | null
          quantity_needed?: number
          unit_measure?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string
          ingredient_type?: string
          notes?: string | null
          product_id?: string | null
          quantity_needed?: number
          unit_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_recipes_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          actual_quantity: number | null
          batch_number: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          expiry_date: string | null
          id: string
          location_id: string | null
          notes: string | null
          planned_quantity: number
          product_id: string | null
          production_date: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["batch_status"] | null
          updated_at: string | null
        }
        Insert: {
          actual_quantity?: number | null
          batch_number: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expiry_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          planned_quantity: number
          product_id?: string | null
          production_date?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["batch_status"] | null
          updated_at?: string | null
        }
        Update: {
          actual_quantity?: number | null
          batch_number?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expiry_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          planned_quantity?: number
          product_id?: string | null
          production_date?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["batch_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_production_batches_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_production_batches_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          min_stock_units: number | null
          name: string
          product_type: Database["public"]["Enums"]["product_type_enum"] | null
          shelf_life_days: number | null
          sku: string
          type: string
          unit_cost: number | null
          units_per_box: number | null
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          min_stock_units?: number | null
          name: string
          product_type?: Database["public"]["Enums"]["product_type_enum"] | null
          shelf_life_days?: number | null
          sku: string
          type: string
          unit_cost?: number | null
          units_per_box?: number | null
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          min_stock_units?: number | null
          name?: string
          product_type?: Database["public"]["Enums"]["product_type_enum"] | null
          shelf_life_days?: number | null
          sku?: string
          type?: string
          unit_cost?: number | null
          units_per_box?: number | null
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          notes: string | null
          purchase_order_id: string | null
          quantity: number
          total_price: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          notes?: string | null
          purchase_order_id?: string | null
          quantity: number
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          notes?: string | null
          purchase_order_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          order_number: string
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          supplier_id: string | null
          tax: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number: string
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          supplier_id?: string | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          order_number?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          supplier_id?: string | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_orders_approved_by"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchase_orders_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_purchase_orders_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          code: string
          created_at: string
          current_stock_kg: number | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          min_stock_units: number | null
          moq_kg: number | null
          name: string
          price_per_unit: number | null
          shelf_life_days: number | null
          supplier_code: string | null
          supplier_id: string | null
          unit_measure: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_stock_kg?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_stock_units?: number | null
          moq_kg?: number | null
          name: string
          price_per_unit?: number | null
          shelf_life_days?: number | null
          supplier_code?: string | null
          supplier_id?: string | null
          unit_measure?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_stock_kg?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_stock_units?: number | null
          moq_kg?: number | null
          name?: string
          price_per_unit?: number | null
          shelf_life_days?: number | null
          supplier_code?: string | null
          supplier_id?: string | null
          unit_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_raw_materials_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_materials_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_data: {
        Row: {
          channel: Database["public"]["Enums"]["sales_channel"] | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          discount: number | null
          external_id: string | null
          id: string
          invoice_number: string | null
          order_number: string | null
          product_id: string | null
          quantity: number | null
          sale_date: string | null
          source: Database["public"]["Enums"]["sales_source"]
          synced_at: string | null
          tax: number | null
          total: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["sales_channel"] | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          external_id?: string | null
          id?: string
          invoice_number?: string | null
          order_number?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_date?: string | null
          source: Database["public"]["Enums"]["sales_source"]
          synced_at?: string | null
          tax?: number | null
          total?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["sales_channel"] | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number | null
          external_id?: string | null
          id?: string
          invoice_number?: string | null
          order_number?: string | null
          product_id?: string | null
          quantity?: number | null
          sale_date?: string | null
          source?: Database["public"]["Enums"]["sales_source"]
          synced_at?: string | null
          tax?: number | null
          total?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sales_data_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_projections: {
        Row: {
          created_at: string
          created_by: string | null
          current_stock_units: number | null
          growth_percentage: number | null
          historical_avg_units: number | null
          historical_months: number | null
          id: string
          product_id: string | null
          projected_units: number | null
          projection_month: string | null
          safety_stock_units: number | null
          units_to_produce: number | null
          units_to_purchase: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_stock_units?: number | null
          growth_percentage?: number | null
          historical_avg_units?: number | null
          historical_months?: number | null
          id?: string
          product_id?: string | null
          projected_units?: number | null
          projection_month?: string | null
          safety_stock_units?: number | null
          units_to_produce?: number | null
          units_to_purchase?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_stock_units?: number | null
          growth_percentage?: number | null
          historical_avg_units?: number | null
          historical_months?: number | null
          id?: string
          product_id?: string | null
          projected_units?: number | null
          projection_month?: string | null
          safety_stock_units?: number | null
          units_to_produce?: number | null
          units_to_purchase?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sales_projections_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_projections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_projections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          code: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number | null
          min_order_value: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_order_value?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_order_value?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_suppliers_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_suppliers_deleted_by"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string | null
          created_by: string | null
          is_active: boolean
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          created_by?: string | null
          is_active?: boolean
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          created_by?: string | null
          is_active?: boolean
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_activated_by_fkey"
            columns: ["activated_by"]
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
      activate_user_role: {
        Args: {
          p_activated_by?: string
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      detect_suspicious_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          activity_count: number
          first_occurrence: string
          last_occurrence: string
          suspicious_activity: string
          user_id: string
        }[]
      }
      get_intermediate_products_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          shelf_life_days: number
          unit_measure: string
        }[]
      }
      get_inventory_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          expiry_date: string
          id: string
          last_movement_date: string
          location_id: string
          product_id: string
          quantity_available: number
          quantity_reserved: number
        }[]
      }
      get_locations_basic: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["location_type"]
        }[]
      }
      get_locations_basic_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["location_type"]
        }[]
      }
      get_locations_detailed: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          code: string
          contact_info: Json
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at: string
        }[]
      }
      get_locations_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["location_type"]
        }[]
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_products_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          shelf_life_days: number
          sku: string
          type: string
          units_per_box: number
          weight_grams: number
        }[]
      }
      get_raw_materials_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          shelf_life_days: number
          unit_measure: string
        }[]
      }
      get_security_audit_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          action_count: number
          last_action: string
          table_name: string
          unique_users: number
        }[]
      }
      get_suppliers_admin_only: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          code: string
          contact_name: string
          email: string
          id: string
          is_active: boolean
          lead_time_days: number
          min_order_value: number
          name: string
          payment_terms: string
          phone: string
        }[]
      }
      get_suppliers_safe: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          contact_name: string
          email: string
          id: string
          is_active: boolean
          lead_time_days: number
          name: string
          phone: string
        }[]
      }
      get_user_accessible_locations: {
        Args: { p_user_id: string }
        Returns: {
          code: string
          id: string
          name: string
          type: Database["public"]["Enums"]["location_type"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_access: {
        Args: { operation_type: string; table_accessed: string }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          description: string
          event_type: string
          metadata?: Json
          severity: string
        }
        Returns: undefined
      }
      log_sensitive_access: {
        Args: { operation: string; record_id?: string; table_name: string }
        Returns: undefined
      }
      mask_sensitive_data: {
        Args: { data_type: string; original_value: string }
        Returns: string
      }
      register_inventory_movement: {
        Args: {
          p_batch_id?: string
          p_from_location_id?: string
          p_movement_type: Database["public"]["Enums"]["movement_type"]
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reference_id?: string
          p_reference_type?: string
          p_to_location_id?: string
          p_unit_cost?: number
        }
        Returns: string
      }
      restore_deleted_record: {
        Args: { record_id: string; table_name: string }
        Returns: boolean
      }
      soft_delete_record: {
        Args: { deleted_by_id?: string; record_id: string; table_name: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "user"
      audit_action_enum:
        | "INSERT"
        | "UPDATE"
        | "DELETE"
        | "SELECT"
        | "RESTORE"
        | "ARCHIVE"
      batch_status: "planned" | "in_production" | "completed" | "cancelled"
      ingredient_type_enum:
        | "raw_material"
        | "packaging_material"
        | "intermediate_product"
      item_type_enum:
        | "raw_material"
        | "packaging_material"
        | "product"
        | "other"
      location_type: "oficina" | "maquila" | "punto_venta" | "transito"
      movement_type:
        | "entrada"
        | "salida"
        | "produccion"
        | "ajuste"
        | "devolucion"
        | "reemplazo"
        | "transformacion"
      movement_type_enum:
        | "entrada"
        | "transferencia"
        | "reemplazo"
        | "transformacion"
      notification_priority: "low" | "medium" | "high" | "urgent"
      order_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "sent"
        | "received"
        | "cancelled"
      packaging_material_type:
        | "box"
        | "bottle"
        | "bag"
        | "container"
        | "label"
        | "wrapper"
        | "other"
      product_type_enum:
        | "materia_prima"
        | "empaques"
        | "gomas_granel"
        | "producto_final"
      reference_type_enum:
        | "purchase_order"
        | "production_batch"
        | "sales_order"
        | "adjustment"
        | "transfer"
        | "other"
      sales_channel:
        | "website"
        | "store"
        | "phone"
        | "email"
        | "marketplace"
        | "distributor"
        | "other"
      sales_source:
        | "online"
        | "retail"
        | "wholesale"
        | "direct"
        | "marketplace"
        | "other"
      user_role: "admin" | "user" | "operator"
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
      app_role: ["admin", "operator", "user"],
      audit_action_enum: [
        "INSERT",
        "UPDATE",
        "DELETE",
        "SELECT",
        "RESTORE",
        "ARCHIVE",
      ],
      batch_status: ["planned", "in_production", "completed", "cancelled"],
      ingredient_type_enum: [
        "raw_material",
        "packaging_material",
        "intermediate_product",
      ],
      item_type_enum: [
        "raw_material",
        "packaging_material",
        "product",
        "other",
      ],
      location_type: ["oficina", "maquila", "punto_venta", "transito"],
      movement_type: [
        "entrada",
        "salida",
        "produccion",
        "ajuste",
        "devolucion",
        "reemplazo",
        "transformacion",
      ],
      movement_type_enum: [
        "entrada",
        "transferencia",
        "reemplazo",
        "transformacion",
      ],
      notification_priority: ["low", "medium", "high", "urgent"],
      order_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "sent",
        "received",
        "cancelled",
      ],
      packaging_material_type: [
        "box",
        "bottle",
        "bag",
        "container",
        "label",
        "wrapper",
        "other",
      ],
      product_type_enum: [
        "materia_prima",
        "empaques",
        "gomas_granel",
        "producto_final",
      ],
      reference_type_enum: [
        "purchase_order",
        "production_batch",
        "sales_order",
        "adjustment",
        "transfer",
        "other",
      ],
      sales_channel: [
        "website",
        "store",
        "phone",
        "email",
        "marketplace",
        "distributor",
        "other",
      ],
      sales_source: [
        "online",
        "retail",
        "wholesale",
        "direct",
        "marketplace",
        "other",
      ],
      user_role: ["admin", "user", "operator"],
    },
  },
} as const

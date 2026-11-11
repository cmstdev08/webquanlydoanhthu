// Database types generated from Supabase schema
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: 'admin' | 'manager' | 'member';
          status: 'active' | 'inactive' | 'suspended';
          group_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['groups']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['groups']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          description: string | null;
          icon: string | null;
          image_url: string | null;
          status: 'active' | 'inactive';
          product_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'product_count' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      suppliers: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          group_id: string;
          code: string;
          name: string;
          description: string | null;
          image_url: string | null;
          category_id: string | null;
          supplier_id: string | null;
          unit: string;
          cost_price: number;
          sell_price: number;
          stock_quantity: number;
          min_stock_alert: number;
          status: 'active' | 'inactive' | 'discontinued';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      inventory_transactions: {
        Row: {
          id: string;
          group_id: string;
          product_id: string;
          type: 'import' | 'export' | 'adjustment' | 'return';
          quantity: number;
          unit_price: number;
          total_amount: number;
          supplier_id: string | null;
          reference_id: string | null;
          reference_type: string | null;
          notes: string | null;
          attachment_url: string | null;
          performed_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory_transactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['inventory_transactions']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          group_id: string;
          order_code: string;
          customer_name: string | null;
          customer_phone: string | null;
          customer_address: string | null;
          status: 'pending' | 'confirmed' | 'preparing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';
          subtotal: number;
          discount_amount: number;
          shipping_fee: number;
          total_amount: number;
          cost_total: number;
          payment_method: string | null;
          payment_status: 'unpaid' | 'paid' | 'refunded';
          assigned_to: string | null;
          notes: string | null;
          created_by: string;
          confirmed_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          cost_price: number;
          discount: number;
          total: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      capital_contributions: {
        Row: {
          id: string;
          group_id: string;
          member_id: string;
          round_name: string | null;
          committed_amount: number;
          paid_amount: number;
          payment_method: string | null;
          attachment_url: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          notes: string | null;
          status: 'pending' | 'confirmed' | 'cancelled';
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['capital_contributions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['capital_contributions']['Insert']>;
      };
      fund_transactions: {
        Row: {
          id: string;
          group_id: string;
          type: 'income' | 'expense';
          amount: number;
          category: string;
          description: string;
          performed_by: string;
          approved_by: string | null;
          attachment_url: string | null;
          status: 'pending' | 'approved' | 'rejected';
          transaction_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fund_transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['fund_transactions']['Insert']>;
      };
      expense_categories: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          description: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expense_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['expense_categories']['Insert']>;
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          category_id: string | null;
          amount: number;
          description: string;
          payment_method: string | null;
          attachment_url: string | null;
          performed_by: string;
          approved_by: string | null;
          status: 'pending' | 'approved' | 'rejected';
          expense_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      activity_logs: {
        Row: {
          id: string;
          group_id: string | null;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          group_id: string | null;
          title: string;
          message: string;
          type: 'info' | 'success' | 'warning' | 'error';
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

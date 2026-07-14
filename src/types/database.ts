export type AppRole = "admin" | "company" | "driver" | "customer";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  user_id: string | null;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
  banner_url: string | null;
  cover_url: string | null;
  description: string | null;
  category: string | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: Record<string, { open: string; close: string }> | null;
  delivery_mode: "own" | "platform" | "pickup" | null;
  city_id: string | null;
  delivery_fee: number | null;
  is_open: boolean | null;
  business_hours: string | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  price: number;
  description: string | null;
  category: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  is_active: boolean;
}

export interface Order {
  id: string;
  customer_id: string | null;
  user_id: string | null;
  company_id: string;
  status: OrderStatus;
  total: number;
  delivery_fee: number;
  delivery_address: string | null;
  payment_method: string | null;
  notes: string | null;
  region_id: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product_name: string;
}

// Minimal Database type so supabase-js infers something.
// Estenda conforme novas tabelas forem usadas.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      customers: { Row: Customer; Insert: Partial<Customer> & { user_id: string; name: string }; Update: Partial<Customer> };
      companies: { Row: Company; Insert: Partial<Company> & { name: string }; Update: Partial<Company> };
      products: { Row: Product; Insert: Partial<Product> & { company_id: string; name: string; price: number }; Update: Partial<Product> };
      orders: { Row: Order; Insert: Partial<Order> & { company_id: string; total: number; idempotency_key: string }; Update: Partial<Order> };
      order_items: { Row: OrderItem; Insert: Partial<OrderItem> & { order_id: string; product_id: string; quantity: number; price: number; product_name: string }; Update: Partial<OrderItem> };
      audit_logs: { Row: { id: string; request_id: string; user_id: string | null; event: string; source: string | null; http_status: number | null; error_code: string | null; error_message: string | null; payload: unknown; context: unknown; created_at: string }; Insert: { request_id: string; event: string; user_id?: string | null; source?: string | null; http_status?: number | null; error_code?: string | null; error_message?: string | null; payload?: unknown; context?: unknown }; Update: never };
    };
    Views: {
      customer_orders_view: { Row: Order & { company: { name: string; logo_url: string | null; category: string | null } | null } };
    };
    Functions: Record<string, unknown>;
    Enums: { app_role: AppRole };
  };
}

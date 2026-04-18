-- Tabel restaurant_settings (dipakai saat register + dashboard settings)
-- Satu baris per user (owner).

CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  tax_percentage NUMERIC(5,2) DEFAULT 10,
  service_charge_percentage NUMERIC(5,2) DEFAULT 0,
  delivery_fee NUMERIC(12,2) DEFAULT 0,
  enable_online_orders BOOLEAN DEFAULT true,
  enable_table_selection BOOLEAN DEFAULT true,
  enable_delivery BOOLEAN DEFAULT true,
  business_hours JSONB,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1F2937',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_restaurant_settings_user_id ON public.restaurant_settings(user_id);

-- Grant akses untuk anon/authenticated (supabase client)
GRANT ALL ON public.restaurant_settings TO anon, authenticated;

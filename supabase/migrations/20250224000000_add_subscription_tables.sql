-- Migration: Add subscription and packages tables for Xendit payment integration
-- Tables: packages, user_subscriptions

-- 1. packages (subscription tiers: basic, pro, enterprise)
CREATE TABLE IF NOT EXISTS public.packages (
  id TEXT PRIMARY KEY, -- 'basic', 'pro', 'enterprise'
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default packages
INSERT INTO public.packages (id, name, price, duration_days, features) VALUES
  ('basic', 'Basic', 300000, 30, '["Max 100 transaksi/bulan", "1 admin user", "Laporan dasar", "Menu online"]'),
  ('pro', 'Pro', 500000, 30, '["Unlimited transaksi", "3 staff users", "Laporan lengkap", "Inventory management", "Support priority"]'),
  ('enterprise', 'Enterprise', 800000, 30, '["Unlimited transaksi", "10 staff users", "Semua fitur pro", "API access", "Custom development", "24/7 support"]')
ON CONFLICT (id) DO NOTHING;

-- 2. user_subscriptions (user subscription records)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'pending_payment', -- 'pending_payment', 'active', 'expired', 'cancelled'
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  payment_proof_url TEXT, -- stores xendit_invoice_id
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_package_id ON public.user_subscriptions(package_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);

-- Grant access
GRANT ALL ON public.packages TO anon, authenticated;
GRANT ALL ON public.user_subscriptions TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

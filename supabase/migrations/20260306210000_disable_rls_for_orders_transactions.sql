-- Migration to disable RLS on orders, order_items and transactions
-- This resolves the "new row violates row-level security policy" error
-- since the app uses custom authentication instead of Supabase Auth.

ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- Ensure anon has access (usually already granted but being explicit)
GRANT ALL ON public.orders TO anon, authenticated;
GRANT ALL ON public.order_items TO anon, authenticated;
GRANT ALL ON public.transactions TO anon, authenticated;

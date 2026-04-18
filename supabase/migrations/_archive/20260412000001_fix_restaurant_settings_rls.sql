-- Enable RLS on restaurant_settings table and add policies

-- Enable RLS
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own restaurant settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Users can insert own restaurant settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Users can update own restaurant settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Public can view restaurant settings" ON public.restaurant_settings;

-- Authenticated users can SELECT their own settings
CREATE POLICY "Users can view own restaurant settings" ON public.restaurant_settings
  FOR SELECT
  USING (user_id = auth.uid());

-- Authenticated users can INSERT their own settings
CREATE POLICY "Users can insert own restaurant settings" ON public.restaurant_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Authenticated users can UPDATE their own settings
CREATE POLICY "Users can update own restaurant settings" ON public.restaurant_settings
  FOR UPDATE
  USING (user_id = auth.uid());

-- Public (anon) can SELECT all settings (needed for public menu pages)
CREATE POLICY "Public can view restaurant settings" ON public.restaurant_settings
  FOR SELECT
  TO anon
  USING (true);

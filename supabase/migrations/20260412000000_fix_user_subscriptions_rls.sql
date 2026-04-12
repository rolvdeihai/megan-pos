-- Fix RLS policies for user_subscriptions table
-- RLS was enabled but no policies were created, causing all inserts to fail

-- Enable RLS (if not already enabled)
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;

-- Create policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid());

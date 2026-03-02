-- Add payment_method column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Create index for payment_method
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);

-- Add delivery_fee column to orders table
ALTER TABLE IF EXISTS public.orders
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.delivery_fee IS 'Delivery fee for delivery orders';

-- Add service charge columns to orders table
-- This fixes the bug where service charge is not included in invoice

ALTER TABLE IF EXISTS public.orders
ADD COLUMN IF NOT EXISTS service_charge_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC(12,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.service_charge_percentage IS 'Service charge percentage (e.g., 5 for 5%)';
COMMENT ON COLUMN public.orders.service_charge_amount IS 'Calculated service charge amount';

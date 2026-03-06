-- Add new calculation fields to the orders table

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS service_charge_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_charge_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2) DEFAULT 0;

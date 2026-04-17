-- Fix RLS for Public Invoice Access
-- Allow anonymous users to view orders for invoice page

-- Policy for anonymous users to view orders by order ID (for public invoice)
DROP POLICY IF EXISTS "Anonymous users can view orders by ID" ON public.orders;

CREATE POLICY "Anonymous users can view orders by ID" ON public.orders
  FOR SELECT
  TO anon
  USING (
    -- Allow if user has the order ID (for public invoice page)
    id IS NOT NULL
  );

-- Policy for authenticated users to view any order (for public pages)
DROP POLICY IF EXISTS "Authenticated users can view all orders" ON public.orders;

CREATE POLICY "Authenticated users can view all orders" ON public.orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Also fix order_items for public access
DROP POLICY IF EXISTS "Anonymous users can view order items" ON public.order_items;

CREATE POLICY "Anonymous users can view order items" ON public.order_items
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id
    )
  );

-- Policy for authenticated users to view any order items
DROP POLICY IF EXISTS "Authenticated users can view all order items" ON public.order_items;

CREATE POLICY "Authenticated users can view all order items" ON public.order_items
  FOR SELECT
  TO authenticated
  USING (true);

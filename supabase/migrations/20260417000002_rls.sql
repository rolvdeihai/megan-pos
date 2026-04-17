-- =============================================================================
-- Migration: 20260417000002_rls.sql
-- Description: Enable RLS and create policies
-- Source: Remote Supabase database (csftinoyjdbnkupnwdig)
-- =============================================================================

-- Enable RLS on tables
alter table public.menu_items enable row level security;
alter table public.order_items enable row level security;
alter table public.orders enable row level security;
alter table public.otps enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.transactions enable row level security;

-- =============================================================================
-- Menu Items Policies
-- =============================================================================

create policy "Allow public read menu_items"
  on public.menu_items for select
  to anon
  using (true);

create policy "Public can view active menu items"
  on public.menu_items for select
  using (
    is_available = true
    and exists (
      select 1 from public.users
      where users.id = menu_items.user_id
        and users.restaurant_slug = current_setting('app.current_restaurant_slug'::text, true)
    )
  );

create policy "Restaurant owners can manage menu items"
  on public.menu_items
  using (auth.uid() = user_id);

-- =============================================================================
-- Order Items Policies
-- =============================================================================

create policy "Allow public read order_items"
  on public.order_items for select
  to anon
  using (true);

create policy "Anonymous users can view order items"
  on public.order_items for select
  to anon
  using (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
  ));

create policy "Authenticated users can view all order items"
  on public.order_items for select
  to authenticated
  using (true);

create policy "Users can insert own order items"
  on public.order_items for insert
  with check (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  ));

create policy "Users can view own order items"
  on public.order_items for select
  using (exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  ));

-- =============================================================================
-- Orders Policies
-- =============================================================================

create policy "Allow public read orders by id"
  on public.orders for select
  to anon
  using (true);

comment on policy "Allow public read orders by id" on public.orders is 'Allow public to view order by ID for invoice page (UUID acts as secret)';

create policy "Anonymous users can view orders by ID"
  on public.orders for select
  to anon
  using (id is not null);

create policy "Authenticated users can view all orders"
  on public.orders for select
  to authenticated
  using (true);

create policy "Users can delete own orders"
  on public.orders for delete
  using (user_id = auth.uid());

create policy "Users can insert own orders"
  on public.orders for insert
  with check (user_id = auth.uid());

create policy "Users can update own orders"
  on public.orders for update
  using (user_id = auth.uid());

create policy "Users can view own orders"
  on public.orders for select
  using (user_id = auth.uid());

-- =============================================================================
-- OTPs Policies
-- =============================================================================

create policy "Service role can manage otps"
  on public.otps
  to service_role
  using (true);

-- =============================================================================
-- Restaurant Tables Policies
-- =============================================================================

create policy "Allow public read restaurant_tables"
  on public.restaurant_tables for select
  to anon
  using (true);

-- =============================================================================
-- Transactions Policies
-- =============================================================================

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (user_id = auth.uid());

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (user_id = auth.uid());

create policy "Users can update own transactions"
  on public.transactions for update
  using (user_id = auth.uid());

create policy "Users can view own transactions"
  on public.transactions for select
  using (user_id = auth.uid());

-- =============================================================================
-- Users Policies (note: RLS not enabled on users table, policies exist but inactive)
-- =============================================================================

create policy "Allow public read users by slug"
  on public.users for select
  to anon
  using (true);

create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can view own data"
  on public.users for select
  using (auth.uid() = id);

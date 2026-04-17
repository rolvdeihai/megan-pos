-- =============================================================================
-- Migration: 20260417000000_tables.sql
-- Description: Create all tables, constraints, and indexes
-- Source: Remote Supabase database (csftinoyjdbnkupnwdig)
-- =============================================================================

-- Users (extends auth.users)
create table public.users (
  id uuid not null,
  email text not null,
  full_name text,
  phone text,
  restaurant_name text,
  restaurant_slug text,
  subscription_tier text default 'free'::text,
  subscription_end_date timestamp without time zone,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  password_hash text,
  is_verified boolean default true,
  pricing_tier text default 'tier1'::text,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_restaurant_slug_key unique (restaurant_slug)
);

create unique index users_email_idx on public.users using btree (email);

-- Roles
create table public.roles (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now(),
  name text not null,
  user_id uuid not null,
  constraint roles_pkey primary key (id),
  constraint roles_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade
);

create index idx_roles_user_id on public.roles using btree (user_id);

-- Permissions
create table public.permissions (
  id uuid default gen_random_uuid() not null,
  code text not null,
  description text,
  created_at timestamp with time zone default now(),
  constraint permissions_pkey primary key (id),
  constraint permissions_code_key unique (code)
);

-- Role Permissions (junction table)
create table public.role_permissions (
  role_id uuid not null,
  permission_id uuid not null,
  constraint role_permissions_pkey primary key (role_id, permission_id),
  constraint role_permissions_permission_id_fkey foreign key (permission_id) references public.permissions(id) on delete cascade,
  constraint role_permissions_role_id_fkey foreign key (role_id) references public.roles(id) on delete cascade
);

create index idx_role_permissions_permission_id on public.role_permissions using btree (permission_id);
create index idx_role_permissions_role_id on public.role_permissions using btree (role_id);

-- Employees
create table public.employees (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  employee_code text,
  full_name text not null,
  email text,
  phone text,
  role text not null,
  pin_code text not null,
  is_active boolean default true,
  created_at timestamp without time zone default now(),
  created_by uuid,
  role_id uuid,
  daily_rate numeric(12,2) default 0,
  monthly_salary numeric(12,2) default 0,
  constraint employees_pkey primary key (id),
  constraint employees_email_key unique (email),
  constraint employees_employee_code_key unique (employee_code),
  constraint employees_role_check check ((role = any (array['admin'::text, 'cashier'::text, 'kitchen'::text, 'waiter'::text, 'manager'::text]))),
  constraint employees_created_by_fkey foreign key (created_by) references public.users(id),
  constraint employees_role_id_fkey foreign key (role_id) references public.roles(id) on delete set null,
  constraint employees_user_id_fkey foreign key (user_id) references public.users(id)
);

create index idx_employees_role_id on public.employees using btree (role_id);
create index idx_employees_user_id on public.employees using btree (user_id);

-- Attendance Logs
create table public.attendance_logs (
  id uuid default gen_random_uuid() not null,
  employee_id uuid not null,
  user_id uuid not null,
  clock_in timestamp with time zone default now() not null,
  clock_out timestamp with time zone,
  status text default 'present'::text not null,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone,
  constraint attendance_logs_pkey primary key (id),
  constraint attendance_logs_employee_id_fkey foreign key (employee_id) references public.employees(id) on delete cascade,
  constraint attendance_logs_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade
);

create index idx_attendance_logs_employee_id on public.attendance_logs using btree (employee_id);
create index idx_attendance_logs_user_id on public.attendance_logs using btree (user_id);

-- Payrolls
create table public.payrolls (
  id uuid default gen_random_uuid() not null,
  employee_id uuid not null,
  user_id uuid not null,
  period_start date not null,
  period_end date not null,
  basic_salary numeric(12,2) default 0,
  deductions numeric(12,2) default 0,
  net_salary numeric(12,2) default 0,
  status text default 'draft'::text not null,
  payment_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone,
  constraint payrolls_pkey primary key (id),
  constraint payrolls_employee_id_fkey foreign key (employee_id) references public.employees(id) on delete cascade,
  constraint payrolls_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade
);

create index idx_payrolls_employee_id on public.payrolls using btree (employee_id);
create index idx_payrolls_user_id on public.payrolls using btree (user_id);

-- Restaurant Settings
create table public.restaurant_settings (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  logo_url text,
  primary_color text default '#3B82F6'::text,
  secondary_color text default '#1F2937'::text,
  tax_percentage numeric(5,2) default 10,
  service_charge_percentage numeric(5,2) default 0,
  enable_online_orders boolean default true,
  enable_table_selection boolean default true,
  enable_delivery boolean default true,
  delivery_fee numeric(10,2) default 0,
  business_hours jsonb default '{"friday": {"open": "08:00", "close": "23:00"}, "monday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "09:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "23:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}}'::jsonb,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  constraint restaurant_settings_pkey primary key (id),
  constraint restaurant_settings_user_id_key unique (user_id)
);

create index idx_restaurant_settings_user_id on public.restaurant_settings using btree (user_id);

-- Restaurant Tables
create table public.restaurant_tables (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  table_number text not null,
  table_name text,
  capacity integer default 4,
  is_available boolean default true,
  qr_code text,
  created_at timestamp without time zone default now(),
  updated_at timestamp with time zone,
  constraint restaurant_tables_pkey primary key (id),
  constraint restaurant_tables_user_id_fkey foreign key (user_id) references public.users(id)
);

create index idx_restaurant_tables_user_id on public.restaurant_tables using btree (user_id);

-- Restaurants
create table public.restaurants (
  id uuid default extensions.uuid_generate_v4() not null,
  user_id uuid not null,
  slug text not null,
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint restaurants_pkey primary key (id),
  constraint restaurants_slug_key unique (slug),
  constraint restaurants_user_id_fkey foreign key (user_id) references auth.users(id)
);

-- Menu Categories
create table public.menu_categories (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text not null,
  description text,
  display_order integer default 0,
  is_active boolean default true,
  created_at timestamp without time zone default now(),
  constraint menu_categories_pkey primary key (id),
  constraint menu_categories_user_id_fkey foreign key (user_id) references public.users(id)
);

create index idx_menu_categories_user_id on public.menu_categories using btree (user_id);

-- Menu Items
create table public.menu_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  category_id uuid,
  name text not null,
  description text,
  price numeric(10,2) not null,
  cost_price numeric(10,2),
  sku text,
  is_available boolean default true,
  is_featured boolean default false,
  image_url text,
  preparation_time integer,
  tags text[] default '{}'::text[],
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  constraint menu_items_pkey primary key (id),
  constraint menu_items_sku_key unique (sku),
  constraint menu_items_category_id_fkey foreign key (category_id) references public.menu_categories(id),
  constraint menu_items_user_id_fkey foreign key (user_id) references public.users(id)
);

create index idx_menu_items_category_id on public.menu_items using btree (category_id);
create index idx_menu_items_user_id on public.menu_items using btree (user_id);

-- Inventory
create table public.inventory (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  sku text not null,
  name text not null,
  category text,
  unit text not null,
  current_stock numeric(10,2) default 0,
  minimum_stock numeric(10,2) default 10,
  cost_per_unit numeric(10,2) default 0,
  supplier text,
  last_restocked date,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  transactions_connected boolean default false,
  expense_payment_method text,
  constraint inventory_pkey primary key (id),
  constraint inventory_sku_key unique (sku),
  constraint inventory_user_id_fkey foreign key (user_id) references public.users(id)
);

create index idx_inventory_user_id on public.inventory using btree (user_id);

-- Menu Item Ingredients
create table public.menu_item_ingredients (
  id uuid default gen_random_uuid() not null,
  menu_item_id uuid not null,
  inventory_id uuid not null,
  quantity numeric(10,2) default 0 not null,
  unit text default 'gram'::text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone,
  constraint menu_item_ingredients_pkey primary key (id),
  constraint menu_item_ingredients_inventory_id_fkey foreign key (inventory_id) references public.inventory(id) on delete cascade,
  constraint menu_item_ingredients_menu_item_id_fkey foreign key (menu_item_id) references public.menu_items(id) on delete cascade
);

create index idx_menu_item_ingredients_inventory_id on public.menu_item_ingredients using btree (inventory_id);
create index idx_menu_item_ingredients_menu_item_id on public.menu_item_ingredients using btree (menu_item_id);

-- Recipe Items
create table public.recipe_items (
  id uuid default gen_random_uuid() not null,
  menu_item_id uuid not null,
  inventory_id uuid not null,
  quantity_required numeric(10,2) not null,
  unit text not null,
  created_at timestamp without time zone default now(),
  constraint recipe_items_pkey primary key (id),
  constraint recipe_items_inventory_id_fkey foreign key (inventory_id) references public.inventory(id),
  constraint recipe_items_menu_item_id_fkey foreign key (menu_item_id) references public.menu_items(id) on delete cascade
);

-- Orders
create table public.orders (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  order_number text not null,
  table_id uuid,
  order_type text not null,
  customer_name text,
  customer_phone text,
  delivery_address text,
  status text not null,
  subtotal numeric(10,2) not null,
  tax_percentage numeric(5,2) default 10,
  tax_amount numeric(10,2) default 0,
  discount_percentage numeric(5,2) default 0,
  discount_amount numeric(10,2) default 0,
  total_amount numeric(10,2) not null,
  payment_method text,
  payment_status text default 'pending'::text,
  notes text,
  served_by uuid,
  created_at timestamp without time zone default now(),
  completed_at timestamp without time zone,
  service_charge_percentage numeric(5,2) default 0,
  service_charge_amount numeric(12,2) default 0,
  updated_at timestamp with time zone,
  delivery_fee numeric(12,2) default 0,
  scheduled_time timestamp with time zone,
  constraint orders_pkey primary key (id),
  constraint orders_order_number_key unique (order_number),
  constraint orders_order_type_check check ((order_type = any (array['dine_in'::text, 'takeaway'::text, 'delivery'::text]))),
  constraint orders_payment_method_check check ((payment_method = any (array['cash'::text, 'card'::text, 'qris'::text, 'transfer'::text]))),
  constraint orders_payment_status_check check ((payment_status = any (array['pending'::text, 'paid'::text, 'refunded'::text]))),
  constraint orders_status_check check ((status = any (array['pending'::text, 'confirmed'::text, 'preparing'::text, 'ready'::text, 'served'::text, 'completed'::text, 'cancelled'::text]))),
  constraint orders_served_by_fkey foreign key (served_by) references public.employees(id),
  constraint orders_table_id_fkey foreign key (table_id) references public.restaurant_tables(id),
  constraint orders_user_id_fkey foreign key (user_id) references public.users(id)
);

create index idx_orders_id_user_id on public.orders using btree (id, user_id);
create index idx_orders_payment_method on public.orders using btree (payment_method);
create index idx_orders_service_charge on public.orders using btree (service_charge_percentage, service_charge_amount);
create index idx_orders_status on public.orders using btree (status);
create index idx_orders_table_id on public.orders using btree (table_id);
create index idx_orders_user_id on public.orders using btree (user_id);

-- Order Items
create table public.order_items (
  id uuid default gen_random_uuid() not null,
  order_id uuid not null,
  menu_item_id uuid not null,
  quantity integer not null,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  special_instructions text,
  created_at timestamp without time zone default now(),
  constraint order_items_pkey primary key (id),
  constraint order_items_menu_item_id_fkey foreign key (menu_item_id) references public.menu_items(id),
  constraint order_items_order_id_fkey foreign key (order_id) references public.orders(id) on delete cascade
);

create index idx_order_items_order_id on public.order_items using btree (order_id);

-- Transactions
create table public.transactions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  order_id uuid,
  transaction_number text not null,
  type text not null,
  amount numeric(10,2) not null,
  payment_method text not null,
  payment_details jsonb,
  status text default 'completed'::text,
  notes text,
  created_by uuid,
  created_at timestamp without time zone default now(),
  inventory_id uuid,
  constraint transactions_pkey primary key (id),
  constraint transactions_transaction_number_key unique (transaction_number),
  constraint transactions_type_check check ((type = any (array['sale'::text, 'refund'::text, 'expense'::text]))),
  constraint transactions_created_by_fkey foreign key (created_by) references public.employees(id),
  constraint transactions_inventory_id_fkey foreign key (inventory_id) references public.inventory(id),
  constraint transactions_order_id_fkey foreign key (order_id) references public.orders(id),
  constraint transactions_user_id_fkey foreign key (user_id) references public.users(id)
);

create index idx_transactions_order_id on public.transactions using btree (order_id);
create index idx_transactions_user_id on public.transactions using btree (user_id);

-- OTPs
create table public.otps (
  id uuid default gen_random_uuid() not null,
  email character varying(255) not null,
  otp character varying(6) not null,
  type character varying(50) not null,
  expires_at timestamp with time zone not null,
  verified boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint otps_pkey primary key (id),
  constraint otps_type_check check (((type)::text = any ((array['signup'::character varying, 'forgot_password'::character varying])::text[])))
);

create index idx_otps_email on public.otps using btree (email);
create index idx_otps_email_type on public.otps using btree (email, type);
create index idx_otps_expires_at on public.otps using btree (expires_at);

-- Packages
create table public.packages (
  id text not null,
  name text not null,
  price numeric(12,2) default 0 not null,
  duration_days integer default 30 not null,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  constraint packages_pkey primary key (id)
);

-- User Subscriptions
create table public.user_subscriptions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  package_id text not null,
  status text default 'pending_payment'::text,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  payment_proof_url text,
  created_at timestamp with time zone default now(),
  constraint user_subscriptions_pkey primary key (id),
  constraint user_subscriptions_package_id_fkey foreign key (package_id) references public.packages(id) on delete restrict,
  constraint user_subscriptions_user_id_fkey foreign key (user_id) references public.users(id) on delete cascade
);

create index idx_user_subscriptions_package_id on public.user_subscriptions using btree (package_id);
create index idx_user_subscriptions_status on public.user_subscriptions using btree (status);
create index idx_user_subscriptions_user_id on public.user_subscriptions using btree (user_id);

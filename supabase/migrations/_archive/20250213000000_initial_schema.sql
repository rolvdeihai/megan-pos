-- JetNote Pos – Initial schema (users, roles, permissions, role_permissions, employees)
-- Sesuai src/lib/database.types.ts

-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users (owner / restaurant account)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT NOT NULL,
  full_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  password_hash TEXT,
  phone TEXT,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  subscription_end_date TIMESTAMPTZ,
  subscription_tier TEXT,
  updated_at TIMESTAMPTZ
);

-- 2. permissions (global, untuk RBAC)
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. roles (milik owner via user_id)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roles_user_id ON public.roles(user_id);

-- 4. role_permissions (junction: role ↔ permission)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- 5. employees (staff, punya legacy role + role_id RBAC)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT,
  employee_code TEXT,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  phone TEXT,
  pin_code TEXT NOT NULL,
  role TEXT NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role_id ON public.employees(role_id);

-- Optional: RLS (Row Level Security) – uncomment jika ingin pakai policy
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

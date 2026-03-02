-- Add roles, permissions, and role_permissions tables
-- Megan POS - RBAC System

-- 1. permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. roles table (owned by user)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_roles_user_id ON public.roles(user_id);

-- 3. role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- 4. Add role_id to employees table for RBAC
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Grant permissions
GRANT ALL ON public.permissions TO anon, authenticated;
GRANT ALL ON public.roles TO anon, authenticated;
GRANT ALL ON public.role_permissions TO anon, authenticated;

-- 6. Seed default permissions
INSERT INTO public.permissions (code, description) VALUES
  ('menu.view', 'Melihat menu'),
  ('menu.create', 'Menambah menu'),
  ('menu.edit', 'Mengedit menu'),
  ('menu.delete', 'Menghapus menu'),
  ('orders.view', 'Melihat order'),
  ('orders.create', 'Membuat order'),
  ('orders.edit', 'Mengedit order'),
  ('orders.delete', 'Menghapus order'),
  ('orders.process_payment', 'Memproses pembayaran'),
  ('tables.view', 'Melihat meja'),
  ('tables.manage', 'Mengelola meja'),
  ('inventory.view', 'Melihat inventory'),
  ('inventory.manage', 'Mengelola inventory'),
  ('reports.view', 'Melihat laporan'),
  ('employees.view', 'Melihat pegawai'),
  ('employees.manage', 'Mengelola pegawai'),
  ('settings.view', 'Melihat pengaturan'),
  ('settings.manage', 'Mengelola pengaturan'),
  ('transactions.view', 'Melihat transaksi'),
  ('transactions.refund', 'Melakukan refund')
ON CONFLICT (code) DO NOTHING;

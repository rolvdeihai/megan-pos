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

-- 6. Seed default permissions (format yang konsisten dengan PERMISSION_DEFINITIONS di aplikasi)
INSERT INTO public.permissions (code, description) VALUES
  ('view_dashboard', 'Akses ringkasan dan statistik utama'),
  ('manage_orders', 'Buat, proses, dan ubah status order'),
  ('manage_menu', 'Tambah dan ubah menu serta kategori'),
  ('manage_inventory', 'Atur stok bahan atau barang'),
  ('manage_staff', 'Tambah, edit, dan atur akses karyawan'),
  ('manage_settings', 'Ubah pengaturan restoran dan tampilan'),
  ('view_reports', 'Akses laporan dan data transaksi'),
  ('manage_billing', 'Kelola paket dan tagihan')
ON CONFLICT (code) DO NOTHING;

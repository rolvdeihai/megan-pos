-- Migration: Enterprise Features (Gramasi, Absensi, Penggajian)

-- 1. menu_item_ingredients (Sistem Gramasi)
-- Menyimpan resep / bahan baku untuk tiap menu item
CREATE TABLE IF NOT EXISTS public.menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'gram',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_menu_item_id ON public.menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_inventory_id ON public.menu_item_ingredients(inventory_id);

-- 2. attendance_logs (Absensi)
-- Menyimpan log absensi karyawan
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present', -- present, late, absent
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id ON public.attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON public.attendance_logs(user_id);

-- 3. payrolls (Manajemen Gaji)
-- Menyimpan data penggajian karyawan untuk satu periode
CREATE TABLE IF NOT EXISTS public.payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, paid
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id ON public.payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_user_id ON public.payrolls(user_id);

-- 4. Alter employees table to add salary configurations
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(12,2) DEFAULT 0;

-- 5. Grant permissions to anon and authenticated users 
-- (following the existing DB pattern)
GRANT ALL ON public.menu_item_ingredients TO anon, authenticated;
GRANT ALL ON public.attendance_logs TO anon, authenticated;
GRANT ALL ON public.payrolls TO anon, authenticated;

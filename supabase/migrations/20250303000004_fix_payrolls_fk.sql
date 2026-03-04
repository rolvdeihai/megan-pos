-- Fix payrolls foreign key relationships
-- This ensures the Supabase relationship query works

-- ============================================
-- CHECK AND FIX PAYROLLS FOREIGN KEYS
-- ============================================

-- Add employee_id FK if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payrolls_employee_id_fkey' 
    AND table_name = 'payrolls'
  ) THEN
    ALTER TABLE public.payrolls 
    ADD CONSTRAINT payrolls_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add user_id FK if not exists  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payrolls_user_id_fkey' 
    AND table_name = 'payrolls'
  ) THEN
    ALTER TABLE public.payrolls 
    ADD CONSTRAINT payrolls_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- CHECK AND FIX ATTENDANCE_LOGS FOREIGN KEYS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_logs_employee_id_fkey' 
    AND table_name = 'attendance_logs'
  ) THEN
    ALTER TABLE public.attendance_logs 
    ADD CONSTRAINT attendance_logs_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_logs_user_id_fkey' 
    AND table_name = 'attendance_logs'
  ) THEN
    ALTER TABLE public.attendance_logs 
    ADD CONSTRAINT attendance_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- GRANT PERMISSIONS (AGAIN TO BE SURE)
-- ============================================

GRANT ALL ON public.payrolls TO anon, authenticated;
GRANT ALL ON public.attendance_logs TO anon, authenticated;

-- Grant sequence permissions if using identity columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

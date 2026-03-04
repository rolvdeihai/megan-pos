-- Fix payrolls and attendance_logs structure
-- Run this if tables exist but columns or relationships are missing

-- ============================================
-- FIX PAYROLLS TABLE
-- ============================================

-- Add missing columns to payrolls (if not exist)
DO $$
BEGIN
  -- Add basic_salary if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' AND column_name = 'basic_salary') THEN
    ALTER TABLE public.payrolls ADD COLUMN basic_salary NUMERIC(12,2) DEFAULT 0;
  END IF;

  -- Add deductions if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' AND column_name = 'deductions') THEN
    ALTER TABLE public.payrolls ADD COLUMN deductions NUMERIC(12,2) DEFAULT 0;
  END IF;

  -- Add net_salary if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' AND column_name = 'net_salary') THEN
    ALTER TABLE public.payrolls ADD COLUMN net_salary NUMERIC(12,2) DEFAULT 0;
  END IF;

  -- Add status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' AND column_name = 'status') THEN
    ALTER TABLE public.payrolls ADD COLUMN status TEXT DEFAULT 'draft';
  END IF;

  -- Add payment_date if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' AND column_name = 'payment_date') THEN
    ALTER TABLE public.payrolls ADD COLUMN payment_date TIMESTAMPTZ;
  END IF;

  -- Add period_start if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' AND column_name = 'period_start') THEN
    ALTER TABLE public.payrolls ADD COLUMN period_start DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  -- Add period_end if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payrolls' AND column_name = 'period_end') THEN
    ALTER TABLE public.payrolls ADD COLUMN period_end DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- ============================================
-- FIX ATTENDANCE_LOGS TABLE
-- ============================================

DO $$
BEGIN
  -- Add clock_in if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'clock_in') THEN
    ALTER TABLE public.attendance_logs ADD COLUMN clock_in TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  -- Add clock_out if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'clock_out') THEN
    ALTER TABLE public.attendance_logs ADD COLUMN clock_out TIMESTAMPTZ;
  END IF;

  -- Add status if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'status') THEN
    ALTER TABLE public.attendance_logs ADD COLUMN status TEXT DEFAULT 'present';
  END IF;

  -- Add notes if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' AND column_name = 'notes') THEN
    ALTER TABLE public.attendance_logs ADD COLUMN notes TEXT;
  END IF;
END $$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.payrolls TO anon, authenticated;
GRANT ALL ON public.attendance_logs TO anon, authenticated;

-- Refresh schema cache (Supabase specific)
NOTIFY pgrst, 'reload schema';

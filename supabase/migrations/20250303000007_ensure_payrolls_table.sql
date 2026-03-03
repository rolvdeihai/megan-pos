-- Drop and recreate payrolls table to ensure clean state
DROP TABLE IF EXISTS public.payrolls CASCADE;

-- Create payrolls table with all required columns
CREATE TABLE public.payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  basic_salary NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_payrolls_employee_id ON public.payrolls(employee_id);
CREATE INDEX idx_payrolls_user_id ON public.payrolls(user_id);

-- Grant permissions
GRANT ALL ON public.payrolls TO anon, authenticated;

-- Recreate functions after table drop
DROP FUNCTION IF EXISTS create_payroll(UUID, UUID, DATE, DATE, NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS get_payrolls(UUID);

CREATE OR REPLACE FUNCTION create_payroll(
  p_user_id UUID,
  p_employee_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_basic_salary NUMERIC DEFAULT 0,
  p_deductions NUMERIC DEFAULT 0,
  p_net_salary NUMERIC DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO public.payrolls (
    user_id, employee_id, period_start, period_end,
    basic_salary, deductions, net_salary, status
  ) VALUES (
    p_user_id, p_employee_id, p_period_start, p_period_end,
    p_basic_salary, p_deductions, p_net_salary, 'draft'
  )
  RETURNING to_jsonb(payrolls.*) INTO v_result;
  
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_payrolls(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(to_jsonb(p.*) ORDER BY p.period_start DESC)
  INTO v_result
  FROM public.payrolls p
  WHERE p.user_id = p_user_id;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION create_payroll(UUID, UUID, DATE, DATE, NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_payrolls(UUID) TO anon, authenticated;

-- Also ensure attendance_logs table exists
DROP TABLE IF EXISTS public.attendance_logs CASCADE;

CREATE TABLE public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_attendance_logs_employee_id ON public.attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_user_id ON public.attendance_logs(user_id);

GRANT ALL ON public.attendance_logs TO anon, authenticated;

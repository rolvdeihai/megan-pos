-- Create RPC function to insert payroll (bypass schema cache)
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
    user_id,
    employee_id,
    period_start,
    period_end,
    basic_salary,
    deductions,
    net_salary,
    status
  ) VALUES (
    p_user_id,
    p_employee_id,
    p_period_start,
    p_period_end,
    p_basic_salary,
    p_deductions,
    p_net_salary,
    'draft'
  )
  RETURNING to_jsonb(payrolls.*) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_payroll(UUID, UUID, DATE, DATE, NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated;

-- Also create function for getting payrolls
CREATE OR REPLACE FUNCTION get_payrolls(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(to_jsonb(p.*))
  INTO v_result
  FROM public.payrolls p
  WHERE p.user_id = p_user_id
  ORDER BY p.period_start DESC;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_payrolls(UUID) TO anon, authenticated;

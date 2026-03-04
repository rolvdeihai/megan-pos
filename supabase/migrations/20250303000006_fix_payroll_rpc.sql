-- Fix get_payrolls function
DROP FUNCTION IF EXISTS get_payrolls(UUID);

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

GRANT EXECUTE ON FUNCTION get_payrolls(UUID) TO anon, authenticated;

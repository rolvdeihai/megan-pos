-- Add Attendance and Payroll permissions
INSERT INTO public.permissions (code, description) VALUES
  ('manage_attendance', 'Catat dan kelola kehadiran karyawan'),
  ('manage_payroll', 'Buat dan kelola slip gaji karyawan')
ON CONFLICT (code) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.permissions TO anon, authenticated;

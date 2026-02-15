-- Grant anon & authenticated access to public schema (fix: permission denied for schema public)
-- Required for Supabase client (anon key) to read/write from Next.js app

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- All current tables in public (users, employees, roles, permissions, role_permissions, + any others)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Allow anon/authenticated to use sequences for default id generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Future tables created by migrations (e.g. restaurant_settings, orders, etc.)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

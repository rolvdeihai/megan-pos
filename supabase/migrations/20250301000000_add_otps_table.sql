-- Create OTP table for email verification
CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('signup', 'forgot_password')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_email_type ON otps(email, type);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- Enable RLS
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists (to avoid conflict)
DROP POLICY IF EXISTS "Service role can manage otps" ON otps;

-- Create policy for service role
CREATE POLICY "Service role can manage otps" ON otps
    FOR ALL
    TO service_role
    USING (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_otps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_otps_updated_at ON otps;

-- Create trigger for updated_at
CREATE TRIGGER update_otps_updated_at
    BEFORE UPDATE ON otps
    FOR EACH ROW
    EXECUTE FUNCTION update_otps_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE otps;

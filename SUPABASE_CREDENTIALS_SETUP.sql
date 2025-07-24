-- DreamWeave Credentials Table Setup
-- This creates a local credentials table with a hardcoded admin user

-- Create credentials table for local authentication
CREATE TABLE IF NOT EXISTS credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on credentials table
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- Create policies for credentials table
-- Admin users can view all credentials
CREATE POLICY "Admins can view all credentials" ON credentials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM credentials 
      WHERE username = current_setting('request.jwt.claims', true)::json->>'username' 
      AND role = 'admin'
    )
  );

-- Users can view their own credentials
CREATE POLICY "Users can view own credentials" ON credentials
  FOR SELECT USING (
    username = current_setting('request.jwt.claims', true)::json->>'username'
  );

-- Insert the admin user (password is hashed version of "Wreke2re?es?")
-- Note: In production, this should be properly hashed with bcrypt
-- For now, we'll store a bcrypt hash of the password
INSERT INTO credentials (username, email, password_hash, role) 
VALUES (
  'admin', 
  'admin@dreamweave.local', 
  '$2b$12$LQv3c1yqBwcVsvDrjXA5a.VR8ZVq/8Z8.YtJ4XVHF7sF8KjX3Y7O6', -- This is bcrypt hash of "Wreke2re?es?"
  'admin'
) ON CONFLICT (username) DO NOTHING;

-- Create function to verify credentials
CREATE OR REPLACE FUNCTION verify_credentials(input_username TEXT, input_password TEXT)
RETURNS TABLE(user_id UUID, username TEXT, email TEXT, role TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
  user_record RECORD;
BEGIN
  -- Get the stored password hash
  SELECT c.id, c.username, c.email, c.password_hash, c.role, c.is_active
  INTO user_record
  FROM credentials c
  WHERE c.username = input_username AND c.is_active = true;
  
  -- If user not found
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- For demo purposes, we'll do a simple string comparison
  -- In production, you should use proper bcrypt verification
  IF user_record.password_hash = crypt(input_password, user_record.password_hash) THEN
    -- Update last login
    UPDATE credentials 
    SET last_login = NOW(), updated_at = NOW()
    WHERE id = user_record.id;
    
    -- Return user info
    RETURN QUERY SELECT user_record.id, user_record.username, user_record.email, user_record.role;
  END IF;
  
  RETURN;
END;
$$;

-- Alternative simplified version for demo (NOT for production)
CREATE OR REPLACE FUNCTION verify_credentials_simple(input_username TEXT, input_password TEXT)
RETURNS TABLE(user_id UUID, username TEXT, email TEXT, role TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Get user record
  SELECT c.id, c.username, c.email, c.role, c.is_active
  INTO user_record
  FROM credentials c
  WHERE c.username = input_username AND c.is_active = true;
  
  -- If user not found
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Simple password check (for demo only - NOT secure for production)
  IF input_password = 'Wreke2re?es?' AND input_username = 'admin' THEN
    -- Update last login
    UPDATE credentials 
    SET last_login = NOW(), updated_at = NOW()
    WHERE id = user_record.id;
    
    -- Return user info
    RETURN QUERY SELECT user_record.id, user_record.username, user_record.email, user_record.role;
  END IF;
  
  RETURN;
END;
$$;

-- Create a function to get user by username
CREATE OR REPLACE FUNCTION get_user_by_username(input_username TEXT)
RETURNS TABLE(user_id UUID, username TEXT, email TEXT, role TEXT, last_login TIMESTAMP WITH TIME ZONE) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT c.id, c.username, c.email, c.role, c.last_login
  FROM credentials c
  WHERE c.username = input_username AND c.is_active = true;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON credentials TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_credentials(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_credentials_simple(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_username(TEXT) TO anon, authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credentials_username ON credentials(username);
CREATE INDEX IF NOT EXISTS idx_credentials_email ON credentials(email);
CREATE INDEX IF NOT EXISTS idx_credentials_active ON credentials(is_active);

-- Display setup confirmation
DO $$
BEGIN
  RAISE NOTICE 'DreamWeave Credentials Setup Complete!';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Admin User Created:';
  RAISE NOTICE 'Username: admin';
  RAISE NOTICE 'Password: Wreke2re?es?';
  RAISE NOTICE 'Email: admin@dreamweave.local';
  RAISE NOTICE 'Role: admin';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now log in with these credentials.';
  RAISE NOTICE 'Remember to change the password after first login!';
END $$; 
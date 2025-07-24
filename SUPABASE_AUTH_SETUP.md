# Supabase Authentication Setup Guide

## 🔐 Overview

This guide helps you transition from public anonymous access to secure, authenticated-only access for your DreamWeave application.

## 📋 Current Status

✅ **Completed:**
- Authentication context and providers
- Login/signup UI components
- User management in settings
- Navigation with auth buttons

⚠️ **Next Steps Required:**
- Configure Row Level Security (RLS) policies
- Create user_profiles table
- Disable anonymous access

## 🛠️ Step-by-Step Setup

### 1. Enable Row Level Security

In your Supabase dashboard, go to **Database > Tables** and enable RLS for each table:

```sql
-- Enable RLS on all tables
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
```

### 2. Create User Profiles Table

```sql
-- Create user_profiles table to sync with auth.users
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin users can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3. Create RLS Policies for Existing Tables

```sql
-- Characters: Only authenticated users can access
CREATE POLICY "Authenticated users can view characters" ON characters
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert characters" ON characters
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update characters" ON characters
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete characters" ON characters
  FOR DELETE USING (auth.role() = 'authenticated');

-- Devices: Only authenticated users can access
CREATE POLICY "Authenticated users can view devices" ON devices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert devices" ON devices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update devices" ON devices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Sessions: Only authenticated users can access
CREATE POLICY "Authenticated users can view sessions" ON sessions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sessions" ON sessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sessions" ON sessions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Interactions: Only authenticated users can access
CREATE POLICY "Authenticated users can view interactions" ON interactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert interactions" ON interactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Voices: Only authenticated users can access
CREATE POLICY "Authenticated users can view voices" ON voices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert voices" ON voices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update voices" ON voices
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Error Logs: Only authenticated users can access
CREATE POLICY "Authenticated users can view error_logs" ON error_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert error_logs" ON error_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 4. Create Database Function to Auto-Create User Profiles

```sql
-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 5. Configure Authentication Settings

In Supabase Dashboard, go to **Authentication > Settings**:

1. **Enable email confirmations** (recommended)
2. **Set site URL** to your Vercel domain
3. **Configure redirect URLs** for login/signup
4. **Enable additional providers** if needed (Google, GitHub, etc.)

### 6. Create Your First Admin User

```sql
-- After creating your first user through the app, promote them to admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

### 7. Update Environment Variables (Optional)

If you want to use service role key for admin operations:

```env
# Add to your Vercel environment variables
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 🚦 Testing Your Setup

1. **Sign up a new user** via `/login`
2. **Verify email** (if enabled)
3. **Sign in** and access the dashboard
4. **Try accessing data** - should work when authenticated
5. **Sign out** and try accessing `/characters` - should be blocked

## 🔒 Security Checklist

- [ ] RLS enabled on all tables
- [ ] Policies created for authenticated access
- [ ] user_profiles table created with trigger
- [ ] Admin user created
- [ ] Email confirmation enabled
- [ ] Site URL configured
- [ ] Anonymous access blocked

## 🛡️ Advanced Security (Optional)

### IP Restrictions
```sql
-- Restrict access by IP (example)
CREATE POLICY "IP restriction" ON characters
  FOR ALL USING (
    inet_client_addr() << inet '192.168.1.0/24'
  );
```

### Time-based Access
```sql
-- Only allow access during business hours
CREATE POLICY "Business hours only" ON interactions
  FOR ALL USING (
    EXTRACT(hour FROM NOW()) BETWEEN 9 AND 17
  );
```

### Rate Limiting by User
```sql
-- Limit interactions per user per hour
CREATE POLICY "Rate limit interactions" ON interactions
  FOR INSERT WITH CHECK (
    (
      SELECT COUNT(*) 
      FROM interactions 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      AND user_id = auth.uid()
    ) < 100
  );
```

## 🔧 Troubleshooting

### Common Issues:

1. **"403 Forbidden" errors**: Check RLS policies are correct
2. **Users can't sign up**: Check email confirmation settings
3. **Redirect loops**: Verify site URL and redirect URLs
4. **Data not showing**: Ensure user is authenticated and policies allow access

### Debug Queries:

```sql
-- Check current user
SELECT auth.uid(), auth.role();

-- Check user profile
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Test policy (should return data if user can access)
SELECT * FROM characters LIMIT 1;
```

## 📞 Next Steps

After completing this setup:

1. Test thoroughly with different user roles
2. Consider implementing user roles (admin, moderator, user)
3. Add audit logging for sensitive operations
4. Set up monitoring and alerts
5. Regular security reviews

---

Your DreamWeave application will now be secure with proper authentication! 🎉 
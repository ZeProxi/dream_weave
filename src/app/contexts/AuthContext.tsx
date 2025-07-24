'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient, User, Session, AuthError } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type AuthUser = User & {
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
};

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithCredentials: (username: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, options?: { data?: { full_name?: string } }) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  supabase: typeof supabase;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        // First check for credentials session in localStorage
        const storedUser = localStorage.getItem('dreamweave_credentials_user');
        const storedSession = localStorage.getItem('dreamweave_credentials_session');
        
        if (storedUser && storedSession) {
          console.log('🔐 Found stored credentials session');
          const user = JSON.parse(storedUser) as AuthUser;
          const session = JSON.parse(storedSession) as Session;
          
          // Verify the session is still valid (not expired)
          if (session.expires_at && session.expires_at > Math.floor(Date.now() / 1000)) {
            setUser(user);
            setSession(session);
            setLoading(false);
            return;
          } else {
            // Session expired, clear it
            localStorage.removeItem('dreamweave_credentials_user');
            localStorage.removeItem('dreamweave_credentials_session');
          }
        }

        // Check Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setSession(null);
        } else {
          setSession(session);
          setUser(session?.user as AuthUser || null);
        }
      } catch (error) {
        console.error('Error during session initialization:', error);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user as AuthUser || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as AuthError };
    }
  };

  const signInWithCredentials = async (username: string, password: string) => {
    try {
      console.log('🔐 Attempting credentials login for:', username);
      
      // Call the Supabase function to verify credentials
      const { data, error } = await supabase.rpc('verify_credentials_simple', {
        input_username: username,
        input_password: password
      });

      if (error) {
        console.error('Credentials verification error:', error);
        return { error: 'Invalid credentials' };
      }

      if (!data || data.length === 0) {
        console.log('No user found with these credentials');
        return { error: 'Invalid username or password' };
      }

      const userInfo = data[0];
      console.log('✅ Credentials verified for user:', userInfo);

             // Create a mock user object with essential properties
       const mockUser: AuthUser = {
         ...({
           id: userInfo.user_id,
           email: userInfo.email,
           created_at: new Date().toISOString(),
           updated_at: new Date().toISOString(),
           email_confirmed_at: new Date().toISOString(),
           last_sign_in_at: new Date().toISOString(),
           aud: 'authenticated',
           user_metadata: {
             full_name: userInfo.username,
             role: userInfo.role
           },
           app_metadata: {
             provider: 'credentials',
             role: userInfo.role
           }
         } as any)
       };

      // Create a mock session
      const mockSession: Session = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser
      };

      // Store in localStorage to persist across page reloads
      localStorage.setItem('dreamweave_credentials_user', JSON.stringify(mockUser));
      localStorage.setItem('dreamweave_credentials_session', JSON.stringify(mockSession));

      // Update state
      setUser(mockUser);
      setSession(mockSession);

      return { error: null };
    } catch (error) {
      console.error('Credentials sign in error:', error);
      return { error: 'Authentication failed' };
    }
  };

  const signUp = async (email: string, password: string, options?: { data?: { full_name?: string } }) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: options?.data || {},
        },
      });
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      // Clear credentials session if it exists
      localStorage.removeItem('dreamweave_credentials_user');
      localStorage.removeItem('dreamweave_credentials_session');
      
      // Clear Supabase session
      const { error } = await supabase.auth.signOut();
      
      // Clear state
      setUser(null);
      setSession(null);
      
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as AuthError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error as AuthError };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signInWithCredentials,
    signUp,
    signOut,
    resetPassword,
    supabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { supabase }; 
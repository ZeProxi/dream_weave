'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../components/Toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isCredentialsLogin, setIsCredentialsLogin] = useState(true); // Default to admin login
  const [fullName, setFullName] = useState('');
  
  const { user, signIn, signInWithCredentials, signUp, loading } = useAuth();
  const router = useRouter();
  const toasts = useToasts();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCredentialsLogin) {
      // Admin/Credentials Login
      if (!username || !password) {
        toasts.error('Please fill in username and password');
        return;
      }

      setIsLoading(true);
      try {
        const { error } = await signInWithCredentials(username, password);

        if (error) {
          toasts.error(`Login failed: ${error}`);
        } else {
          toasts.success('Welcome back, admin!');
          router.push('/');
        }
      } catch (error) {
        console.error('Credentials authentication error:', error);
        toasts.error('Authentication failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Email/Password Auth (Supabase)
      if (!email || !password) {
        toasts.error('Please fill in all fields');
        return;
      }

      setIsLoading(true);
      try {
        if (isSignUp) {
          const { error } = await signUp(email, password, {
            data: { full_name: fullName }
          });

          if (error) {
            toasts.error(`Sign up failed: ${error.message}`);
          } else {
            toasts.success('Account created successfully! Please check your email for verification.');
            setIsSignUp(false);
            setEmail('');
            setPassword('');
            setFullName('');
          }
        } else {
          const { error } = await signIn(email, password);

          if (error) {
            toasts.error(`Sign in failed: ${error.message}`);
          } else {
            toasts.success('Welcome back!');
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        toasts.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-gradient-hero)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-accent-purple)' }}></div>
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-gradient-hero)' }}>
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/dreamwalk-logo.webp"
              alt="DreamWalk"
              width={150}
              height={50}
              className="rounded-lg"
              style={{ objectFit: 'contain' }}
            />
          </Link>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent" 
              style={{ 
                backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
            {isCredentialsLogin ? 'Admin Access' : (isSignUp ? 'Create Account' : 'Welcome Back')}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {isCredentialsLogin 
              ? 'Sign in with your admin credentials' 
              : (isSignUp ? 'Sign up to access DreamWeave' : 'Sign in to your account')
            }
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className="flex justify-center mb-6">
          <div className="flex rounded-lg p-1" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
            <button
              type="button"
              onClick={() => {
                setIsCredentialsLogin(true);
                setIsSignUp(false);
                setEmail('');
                setPassword('');
                setUsername('');
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isCredentialsLogin ? 'transform scale-105' : ''
              }`}
              style={{
                backgroundColor: isCredentialsLogin ? 'var(--color-accent-purple)' : 'transparent',
                color: isCredentialsLogin ? 'white' : 'var(--color-text-secondary)'
              }}
            >
              Admin Login
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCredentialsLogin(false);
                setIsSignUp(false);
                setEmail('');
                setPassword('');
                setUsername('');
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                !isCredentialsLogin ? 'transform scale-105' : ''
              }`}
              style={{
                backgroundColor: !isCredentialsLogin ? 'var(--color-accent-cyan)' : 'transparent',
                color: !isCredentialsLogin ? 'white' : 'var(--color-text-secondary)'
              }}
            >
              Email Login
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="border rounded-xl p-8" style={{ 
          backgroundColor: 'var(--color-secondary-dark)', 
          borderColor: 'var(--color-border-medium)' 
        }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {isCredentialsLogin ? (
              // Admin/Credentials Login Form
              <>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-2" 
                         style={{ color: 'var(--color-text-primary)' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      borderColor: 'var(--color-border-medium)',
                      color: 'var(--color-text-primary)'
                    }}
                    placeholder="Enter admin username"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2" 
                         style={{ color: 'var(--color-text-primary)' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      borderColor: 'var(--color-border-medium)',
                      color: 'var(--color-text-primary)'
                    }}
                    placeholder="Enter admin password"
                  />
                </div>
              </>
            ) : (
              // Email/Password Login Form
              <>
                {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-2" 
                       style={{ color: 'var(--color-text-primary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  style={{ 
                    backgroundColor: 'var(--color-surface-dark)',
                    borderColor: 'var(--color-border-medium)',
                    color: 'var(--color-text-primary)'
                  }}
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" 
                     style={{ color: 'var(--color-text-primary)' }}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                style={{ 
                  backgroundColor: 'var(--color-surface-dark)',
                  borderColor: 'var(--color-border-medium)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" 
                     style={{ color: 'var(--color-text-primary)' }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                style={{ 
                  backgroundColor: 'var(--color-surface-dark)',
                  borderColor: 'var(--color-border-medium)',
                  color: 'var(--color-text-primary)'
                }}
                placeholder="Enter your password"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all duration-200 focus:ring-2 focus:ring-purple-500"
              style={{ 
                backgroundColor: 'var(--color-accent-purple)',
                color: 'var(--color-text-primary)'
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>
                    {isCredentialsLogin 
                      ? 'Signing In...' 
                      : (isSignUp ? 'Creating Account...' : 'Signing In...')
                    }
                  </span>
                </div>
              ) : (
                isCredentialsLogin 
                  ? 'Sign In as Admin' 
                  : (isSignUp ? 'Create Account' : 'Sign In')
                )}
              </button>
            </>
            )}
          </form>

          {/* Toggle between sign in and sign up (only for email login) */}
          {!isCredentialsLogin && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setEmail('');
                  setPassword('');
                  setFullName('');
                }}
                className="text-sm hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-accent-cyan)' }}
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          )}

          {/* Forgot password (only for email login) */}
          {!isCredentialsLogin && !isSignUp && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-text-secondary)' }}
                onClick={() => {
                  if (email) {
                    // This would trigger forgot password flow
                    toasts.info('Forgot password functionality coming soon...');
                  } else {
                    toasts.error('Please enter your email address first');
                  }
                }}
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Admin credentials hint */}
          {isCredentialsLogin && (
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-accent-purple)' + '10' }}>
              <p className="text-xs text-center" style={{ color: 'var(--color-accent-purple)' }}>
                💡 Default admin credentials: <strong>admin</strong> / <strong>Wreke2re?es?</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link 
            href="/"
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 
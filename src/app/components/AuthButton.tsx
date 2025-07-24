'use client';

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from './Toast';

export default function AuthButton() {
  const { user, signOut, loading } = useAuth();
  const toasts = useToasts();

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        toasts.error(`Sign out failed: ${error.message}`);
      } else {
        toasts.success('Signed out successfully');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toasts.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-600 h-8 w-20 rounded"></div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {user.email}
        </span>
        <button
          onClick={handleSignOut}
          className="px-3 py-1 rounded-md text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ 
            backgroundColor: 'var(--color-error-red)',
            color: 'white'
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="px-3 py-1 rounded-md text-sm font-medium hover:opacity-80 transition-opacity"
      style={{ 
        backgroundColor: 'var(--color-accent-purple)',
        color: 'white'
      }}
    >
      Sign In
    </Link>
  );
} 
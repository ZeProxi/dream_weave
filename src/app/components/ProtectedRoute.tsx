'use client';

import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../login/page';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-gradient-hero)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-accent-purple)' }}></div>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page
  if (!user) {
    return <LoginPage />;
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
} 
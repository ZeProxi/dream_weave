'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToasts } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';

type User = {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
};

type AuthSettings = {
  enableSignUp: boolean;
  requireEmailConfirmation: boolean;
  allowedDomains: string[];
  sessionTimeout: number;
};

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [authSettings, setAuthSettings] = useState<AuthSettings>({
    enableSignUp: true,
    requireEmailConfirmation: true,
    allowedDomains: [],
    sessionTimeout: 24
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'auth' | 'database' | 'api'>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const toasts = useToasts();
  const { user, session, loading: authLoading, signUp, supabase } = useAuth();

  // Fetch users from Supabase Auth
  const fetchUsers = async () => {
    if (!supabase) {
      console.error('❌ No Supabase client available');
      setLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching users from auth...');
      
      // Note: In a real app, you'd need the service role key to access auth.admin
      // For now, we'll create and use a user_profiles table as a workaround
      const { data: usersData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users:', error);
        
        // Try to create the user_profiles table if it doesn't exist
        console.log('🔧 Attempting to create user_profiles table...');
        
        // Add current user to the list if authenticated
        if (user) {
          const currentUserProfile = {
            id: user.id,
            email: user.email!,
            created_at: user.created_at || new Date().toISOString(),
            email_confirmed_at: user.email_confirmed_at,
            last_sign_in_at: user.last_sign_in_at,
            user_metadata: user.user_metadata
          };
          setUsers([currentUserProfile]);
        } else {
          setUsers([]);
        }
        
        toasts.info('User profiles table not found. Showing current authenticated user only.');
        return;
      }

      console.log('✅ Users fetched successfully:', { count: usersData?.length || 0 });
      setUsers(usersData || []);

    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      // Fallback to show current user if available
      if (user) {
        const currentUserProfile = {
          id: user.id,
          email: user.email!,
          created_at: user.created_at || new Date().toISOString(),
          email_confirmed_at: user.email_confirmed_at,
          last_sign_in_at: user.last_sign_in_at,
          user_metadata: user.user_metadata
        };
        setUsers([currentUserProfile]);
      } else {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const createUser = async () => {
    if (!newUserEmail || !newUserPassword) return;

    setIsCreatingUser(true);
    try {
      const { error } = await signUp(newUserEmail, newUserPassword);

      if (error) {
        toasts.error(`Failed to create user: ${error.message}`);
        return;
      }

      toasts.success('User created successfully! Check email for verification.');

      setNewUserEmail('');
      setNewUserPassword('');
      setShowCreateUserModal(false);
      
      // Refresh users list after a short delay to allow for user creation
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (error) {
      console.error('❌ Failed to create user:', error);
      toasts.error('Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const tabs = [
    { id: 'users', label: 'Users', icon: '👥', description: 'Manage user accounts and permissions' },
    { id: 'auth', label: 'Authentication', icon: '🔐', description: 'Configure authentication settings' },
    { id: 'database', label: 'Database', icon: '🗄️', description: 'Database connection and settings' },
    { id: 'api', label: 'API Keys', icon: '🔑', description: 'Manage API keys and integrations' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-gradient-hero)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center" style={{ color: 'var(--color-text-primary)' }}>
            Loading settings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-gradient-hero)' }}>
      {/* Header */}
      <header className="border-b backdrop-blur-sm" style={{ 
        borderColor: 'var(--color-border-medium)', 
        backgroundColor: 'var(--color-surface-dark)' + '80' 
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/dreamwalk-logo.webp"
                alt="DreamWalk"
                width={120}
                height={40}
                className="rounded-lg"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Dashboard
              </Link>
              <Link href="/interactions" className="hover:opacity-80" style={{ color: 'var(--color-accent-cyan)' }}>
                Interactions
              </Link>
              <Link href="/characters" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Characters
              </Link>
              <Link href="/devices" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Devices
              </Link>
              <Link href="/elevenlabs" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                ElevenLabs
              </Link>
              <Link href="#analytics" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Analytics
              </Link>
              <Link href="/error-logs" className="hover:opacity-80" style={{ color: 'var(--color-error-red)' }}>
                Error Logs
              </Link>
              <Link href="/settings" className="font-medium" style={{ color: 'var(--color-accent-purple)' }}>
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
              background: 'var(--color-gradient-accent)' 
            }}>
              <span className="text-xl">⚙️</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent px-1"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: '1.1',
                  paddingTop: '2px',
                  paddingBottom: '2px'
                }}>
              Settings
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Configure authentication, manage users, and customize your DreamWeave experience
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="border rounded-xl sticky top-4" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Settings Categories
                </h3>
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center space-x-3 ${
                        activeTab === tab.id
                          ? 'transform scale-105 shadow-lg'
                          : 'hover:scale-102 hover:shadow-md'
                      }`}
                      style={{
                        backgroundColor: activeTab === tab.id 
                          ? 'var(--color-accent-purple)' 
                          : 'var(--color-surface-dark)',
                        color: activeTab === tab.id 
                          ? 'white' 
                          : 'var(--color-text-secondary)',
                        border: activeTab === tab.id 
                          ? '2px solid var(--color-accent-purple)' 
                          : '2px solid transparent'
                      }}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <div>
                        <div className="font-medium">{tab.label}</div>
                        <div className="text-xs opacity-75">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="border rounded-xl" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        User Management
                      </h2>
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        Manage user accounts, roles, and permissions • Total: {users.length} users
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="px-4 py-2 rounded-lg font-medium hover:opacity-90"
                      style={{ 
                        backgroundColor: 'var(--color-accent-purple)',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      Add User
                    </button>
                  </div>

                  {users.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg" style={{ 
                      borderColor: 'var(--color-border-medium)',
                      backgroundColor: 'var(--color-surface-dark)'
                    }}>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ 
                        backgroundColor: 'var(--color-accent-purple)' + '20'
                      }}>
                        <span className="text-2xl">👥</span>
                      </div>
                      <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                        No Users Found
                      </h3>
                      <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                        Authentication tables may need to be set up. Create your first user to get started.
                      </p>
                      <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="px-6 py-3 rounded-lg font-medium hover:opacity-90"
                        style={{ 
                          backgroundColor: 'var(--color-accent-purple)',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        Create First User
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="border rounded-lg p-4 hover:shadow-lg transition-all duration-200"
                          style={{ 
                            backgroundColor: 'var(--color-surface-dark)', 
                            borderColor: 'var(--color-border-medium)' 
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ 
                                backgroundColor: 'var(--color-accent-cyan)' + '20'
                              }}>
                                <span className="text-lg">👤</span>
                              </div>
                              <div>
                                <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                  {user.user_metadata?.full_name || user.email}
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                  {user.email}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  Created: {new Date(user.created_at).toLocaleDateString()}
                                  {user.last_sign_in_at && 
                                    ` • Last login: ${new Date(user.last_sign_in_at).toLocaleDateString()}`
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`px-2 py-1 rounded-full text-xs ${
                                user.email_confirmed_at ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {user.email_confirmed_at ? 'Verified' : 'Pending'}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowUserModal(true);
                                }}
                                className="px-3 py-1 rounded-md text-sm hover:opacity-80"
                                style={{ 
                                  backgroundColor: 'var(--color-action-blue)',
                                  color: 'white'
                                }}
                              >
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Authentication Tab */}
              {activeTab === 'auth' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Authentication Settings
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Configure how users authenticate with your application
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Current Status */}
                    <div className="border rounded-lg p-4" style={{ 
                      backgroundColor: 'var(--color-surface-dark)', 
                      borderColor: 'var(--color-border-medium)' 
                    }}>
                      <h3 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                        Current Authentication Status
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Mode:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="font-medium text-yellow-400">Public Access</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Security:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="font-medium text-red-400">Anonymous Key Active</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Settings Form */}
                    <div className="border rounded-lg p-4" style={{ 
                      backgroundColor: 'var(--color-surface-dark)', 
                      borderColor: 'var(--color-border-medium)' 
                    }}>
                      <h3 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                        Authentication Configuration
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              Enable User Registration
                            </label>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              Allow new users to create accounts
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={authSettings.enableSignUp}
                            onChange={(e) => setAuthSettings({...authSettings, enableSignUp: e.target.checked})}
                            className="w-4 h-4"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              Require Email Confirmation
                            </label>
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                              Users must verify their email before accessing the app
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={authSettings.requireEmailConfirmation}
                            onChange={(e) => setAuthSettings({...authSettings, requireEmailConfirmation: e.target.checked})}
                            className="w-4 h-4"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="border rounded-lg p-4" style={{ 
                      backgroundColor: 'var(--color-warning-yellow)' + '10', 
                      borderColor: 'var(--color-warning-yellow)' + '30' 
                    }}>
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                          <h4 className="font-medium text-yellow-400">Security Notice</h4>
                          <p className="text-sm text-yellow-300 mt-1">
                            Your application is currently using public access with anonymous keys. 
                            To secure your app, you'll need to implement Row Level Security (RLS) in Supabase 
                            and switch to authenticated access only.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Database Tab */}
              {activeTab === 'database' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      Database Settings
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Manage your Supabase database connection and settings
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Connection Status */}
                    <div className="border rounded-lg p-4" style={{ 
                      backgroundColor: 'var(--color-surface-dark)', 
                      borderColor: 'var(--color-border-medium)' 
                    }}>
                      <h3 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                        Connection Status
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                                                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Supabase URL:</span>
                      <div className="mt-1 font-mono text-sm p-2 rounded" style={{ 
                        backgroundColor: 'var(--color-primary-dark)',
                        color: 'var(--color-accent-cyan)'
                      }}>
                        {process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : 'Not configured'}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Anonymous Key:</span>
                      <div className="mt-1 font-mono text-sm p-2 rounded" style={{ 
                        backgroundColor: 'var(--color-primary-dark)',
                        color: 'var(--color-accent-cyan)'
                      }}>
                        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'Not configured'}
                      </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys Tab */}
              {activeTab === 'api' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      API Keys & Integrations
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Manage your API keys for OpenAI, ElevenLabs, and other services
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="text-4xl mb-4 block">🔑</span>
                      <p>API key management coming soon...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="border rounded-xl p-6 max-w-md w-full mx-4" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Create New User
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--color-surface-dark)',
                    borderColor: 'var(--color-border-medium)',
                    color: 'var(--color-text-primary)'
                  }}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--color-surface-dark)',
                    borderColor: 'var(--color-border-medium)',
                    color: 'var(--color-text-primary)'
                  }}
                  placeholder="Enter password"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateUserModal(false);
                  setNewUserEmail('');
                  setNewUserPassword('');
                }}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-80"
                style={{ 
                  backgroundColor: 'var(--color-surface-dark)',
                  borderColor: 'var(--color-border-medium)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-medium)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                disabled={isCreatingUser || !newUserEmail || !newUserPassword}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--color-accent-purple)',
                  color: 'var(--color-text-primary)'
                }}
              >
                {isCreatingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="border rounded-xl p-6 max-w-lg w-full mx-4" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              User Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Email
                </label>
                <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedUser.email}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  User ID
                </label>
                <p className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedUser.id}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Created
                </label>
                <p style={{ color: 'var(--color-text-primary)' }}>
                  {new Date(selectedUser.created_at).toLocaleString()}
                </p>
              </div>
              {selectedUser.last_sign_in_at && (
                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    Last Sign In
                  </label>
                  <p style={{ color: 'var(--color-text-primary)' }}>
                    {new Date(selectedUser.last_sign_in_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-80"
                style={{ 
                  backgroundColor: 'var(--color-surface-dark)',
                  borderColor: 'var(--color-border-medium)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-medium)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
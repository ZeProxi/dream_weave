"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

type ErrorLog = {
  id: number;
  error_type: string;
  error_message: string;
  error_stack?: string;
  endpoint?: string;
  method?: string;
  user_agent?: string;
  ip_address?: string;
  client_id?: string;
  session_id?: string;
  request_body?: string;
  response_status?: number;
  severity?: string;
  resolved?: boolean;
  created_at: string;
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔧 Error Logs - Environment Check:', {
  hasUrl: !!supabaseUrl,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  hasKey: !!supabaseAnonKey,
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
});

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

console.log('🔧 Error Logs - Supabase Client:', {
  clientCreated: !!supabase,
  ready: !!(supabase && supabaseUrl && supabaseAnonKey)
});

export default function ErrorLogsPage() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const logsPerPage = 20;

  // Fetch error logs from Supabase
  const fetchErrorLogs = async () => {
    console.log('🚀 fetchErrorLogs called - supabase client exists:', !!supabase);
    
    if (!supabase) {
      console.error('❌ No Supabase client available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('📊 Fetching error logs...', { currentPage, filterType, logsPerPage });

      // Build query based on filter
      let query = supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * logsPerPage, currentPage * logsPerPage - 1);

      console.log('🔍 Query built for error_logs table');

      // Apply filter
      if (filterType !== 'all') {
        console.log('🔍 Applying filter for error_type:', filterType);
        query = query.eq('error_type', filterType);
      }

      console.log('🔄 Executing query...');
      const { data: logs, count, error } = await query;

      console.log('📊 Query result:', {
        hasError: !!error,
        errorDetails: error,
        dataCount: logs?.length || 0,
        totalCount: count,
        rawData: logs ? logs.slice(0, 2) : null // First 2 records for debugging
      });

      if (error) {
        console.error('❌ Error fetching error logs:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setIsLoading(false);
        return;
      }

      console.log('✅ Error logs fetched successfully:', { count: logs?.length || 0, total: count });
      setErrorLogs(logs || []);
      setTotalCount(count || 0);

    } catch (error) {
      console.error('❌ Failed to fetch error logs (catch block):', error);
      console.error('❌ Error object:', error);
    } finally {
      setIsLoading(false);
      console.log('🏁 fetchErrorLogs completed');
    }
  };

  // Get unique error types for filter dropdown
  const [errorTypes, setErrorTypes] = useState<string[]>([]);
  const fetchErrorTypes = async () => {
    console.log('🔍 fetchErrorTypes called - supabase client exists:', !!supabase);
    
    if (!supabase) {
      console.error('❌ No Supabase client for error types');
      return;
    }

    try {
      console.log('🔄 Fetching error types...');
      const { data, error } = await supabase
        .from('error_logs')
        .select('error_type')
        .order('error_type');

      console.log('📊 Error types query result:', {
        hasError: !!error,
        errorDetails: error,
        dataCount: data?.length || 0,
        rawData: data?.slice(0, 5) // First 5 types for debugging
      });

      if (error) {
        console.error('❌ Error fetching error types:', error);
        return;
      }

      const uniqueTypes = [...new Set(data?.map(item => item.error_type) || [])];
      console.log('✅ Unique error types found:', uniqueTypes);
      setErrorTypes(uniqueTypes);
    } catch (error) {
      console.error('❌ Failed to fetch error types (catch):', error);
    }
  };



  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get severity color
  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'var(--color-error-red)';
      case 'error':
        return 'var(--color-error-red)';
      case 'warning':
        return 'var(--color-warning-yellow)';
      case 'info':
        return 'var(--color-action-blue)';
      default:
        return 'var(--color-text-muted)';
    }
  };

  // Test basic connection
  const testConnection = async () => {
    if (!supabase) {
      console.error('❌ Cannot test connection - no supabase client');
      return;
    }

    try {
      console.log('🔄 Testing basic Supabase connection...');
      
      // Try a simple query first
      const { data, error } = await supabase
        .from('error_logs')
        .select('count(*)')
        .limit(1);

      console.log('📊 Connection test result:', {
        hasError: !!error,
        errorDetails: error,
        data: data
      });

      if (error) {
        console.error('❌ Connection test failed:', error);
        
        // Try to list tables to see what's available
        console.log('🔍 Trying to check available tables...');
        const { data: tablesData, error: tablesError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
          
        console.log('📊 Available tables:', { tablesError, tables: tablesData });
      } else {
        console.log('✅ Basic connection test passed');
      }
    } catch (error) {
      console.error('❌ Connection test exception:', error);
    }
  };

  useEffect(() => {
    console.log('🚀 Error Logs Page - useEffect triggered');
    testConnection();
    fetchErrorLogs();
    fetchErrorTypes();
  }, [currentPage, filterType]);

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return;

    const subscription = supabase
      .channel('error_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'error_logs' },
        (payload) => {
          console.log('🔄 Error log change detected:', payload);
          fetchErrorLogs();
        })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
              <a href="/" className="text-text_secondary hover:text-text_primary">
                Dashboard
              </a>
              <a href="/characters" className="text-text_secondary hover:text-text_primary">
                Characters
              </a>
              <a href="#devices" className="text-text_secondary hover:text-text_primary">
                Devices
              </a>
              <a href="#analytics" className="text-text_secondary hover:text-text_primary">
                Analytics
              </a>
              <a href="/error-logs" className="font-medium" style={{ color: 'var(--color-error-red)' }}>
                Error Logs
              </a>
              <a href="#settings" className="text-text_secondary hover:text-text_primary">
                Settings
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Error Logs</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Monitor and resolve system errors • Total: {totalCount} logs
              </p>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center space-x-4">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  backgroundColor: 'var(--color-surface-dark)',
                  borderColor: 'var(--color-border-medium)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <option value="all">All Error Types</option>
                {errorTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              <button
                onClick={() => fetchErrorLogs()}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--color-accent-purple)',
                  color: 'var(--color-text-primary)'
                }}
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Error Logs List */}
          <div className="lg:col-span-2">
            <div className="border rounded-xl" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Recent Errors
                </h3>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <p style={{ color: 'var(--color-text-muted)' }}>Loading error logs...</p>
                  </div>
                ) : errorLogs.length > 0 ? (
                  <div className="space-y-3">
                    {errorLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-4 rounded-lg border cursor-pointer hover:opacity-80 ${selectedError?.id === log.id ? 'ring-2' : ''}`}
                                                 style={{ 
                           backgroundColor: 'var(--color-surface-dark)', 
                           borderColor: log.resolved ? 'var(--color-success-green)' : 'var(--color-border-dark)'
                         }}
                        onClick={() => setSelectedError(log)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span 
                                className="px-2 py-1 text-xs rounded-full font-medium"
                                style={{ 
                                  backgroundColor: getSeverityColor(log.severity) + '20',
                                  color: getSeverityColor(log.severity)
                                }}
                              >
                                {log.error_type}
                              </span>
                              {log.resolved && (
                                <span 
                                  className="px-2 py-1 text-xs rounded-full font-medium"
                                  style={{ 
                                    backgroundColor: 'var(--color-success-green)' + '20',
                                    color: 'var(--color-success-green)'
                                  }}
                                >
                                  Resolved
                                </span>
                              )}
                            </div>
                            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {log.error_message.length > 100 ? 
                                log.error_message.substring(0, 100) + '...' : 
                                log.error_message
                              }
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              <span>{formatDate(log.created_at)}</span>
                              {log.endpoint && <span>{log.method} {log.endpoint}</span>}
                              {log.response_status && <span>Status: {log.response_status}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      No Error Logs Found
                    </p>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      {filterType !== 'all' ? `No errors of type "${filterType}"` : 'No errors recorded yet'}
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {totalCount > logsPerPage && (
                  <div className="flex justify-between items-center mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-border-dark)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Showing {((currentPage - 1) * logsPerPage) + 1}-{Math.min(currentPage * logsPerPage, totalCount)} of {totalCount}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded text-sm disabled:opacity-50"
                        style={{ 
                          backgroundColor: 'var(--color-surface-dark)',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={currentPage * logsPerPage >= totalCount}
                        className="px-3 py-1 rounded text-sm disabled:opacity-50"
                        style={{ 
                          backgroundColor: 'var(--color-surface-dark)',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Details Panel */}
          <div>
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {selectedError ? 'Error Details' : 'Select an Error'}
              </h3>
              
              {selectedError ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Error Type</label>
                    <p style={{ color: 'var(--color-text-primary)' }}>{selectedError.error_type}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Message</label>
                    <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{selectedError.error_message}</p>
                  </div>
                  
                  {selectedError.error_stack && (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Stack Trace</label>
                      <pre className="text-xs p-3 rounded mt-1 overflow-auto max-h-40" style={{ 
                        backgroundColor: 'var(--color-surface-dark)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {selectedError.error_stack}
                      </pre>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Occurred</label>
                      <p style={{ color: 'var(--color-text-primary)' }}>{formatDate(selectedError.created_at)}</p>
                    </div>
                    {selectedError.severity && (
                      <div>
                        <label className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Severity</label>
                        <p style={{ color: getSeverityColor(selectedError.severity) }}>{selectedError.severity}</p>
                      </div>
                    )}
                  </div>


                </div>
              ) : (
                <div className="text-center py-8">
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    Click on an error log to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
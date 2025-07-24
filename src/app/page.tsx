"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Debug environment variables
console.log('🔧 Environment Variables Debug:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'NOT SET');

type ServiceStatus = {
  status: 'operational' | 'degraded' | 'outage' | 'unknown';
  lastChecked: Date;
};

type DashboardStats = {
  activeSessions: number;
  onlineDevices: number;
  totalCharacters: number;
  avgResponseTime: number | null;
};



// Initialize Supabase client (you'll add these to Vercel environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

console.log('🔌 Supabase Client Status:', supabase ? 'CREATED' : 'FAILED TO CREATE');

export default function Dashboard() {
  const [openAIStatus, setOpenAIStatus] = useState<ServiceStatus>({ status: 'unknown', lastChecked: new Date() });
  const [elevenLabsStatus, setElevenLabsStatus] = useState<ServiceStatus>({ status: 'unknown', lastChecked: new Date() });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  // Database state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeSessions: 0,
    onlineDevices: 0, 
    totalCharacters: 0,
    avgResponseTime: null
  });
  const [recentInteractions, setRecentInteractions] = useState<Record<string, unknown>[]>([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState<Date>(new Date());
  const [isLoadingData] = useState(false);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [clientTime, setClientTime] = useState<string>('');
  const [recentErrors, setRecentErrors] = useState<Record<string, unknown>[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [metricsData, setMetricsData] = useState({
    totalInteractions24h: 0,
    interactionsTrend: 0,
    avgResponseTime: null as number | null,
    responseTimeTrend: 0,
    errorRate: 0,
    totalErrors: 0,
    responseTimeChart: [] as Array<Record<string, unknown>>,
    errorChart: [] as Array<Record<string, unknown>>,
    characterUsage: [] as Array<Record<string, unknown>>
  });

  // Safely render data that might be an object
  const safeRender = (data: unknown): string => {
    if (data === null || data === undefined) return '';
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return '[Complex Object]';
      }
    }
    return String(data);
  };

  // Test database connection
  const testDatabaseConnection = async () => {
    if (!supabase) {
      console.log('❌ Supabase client not initialized - check environment variables');
      setDbConnectionStatus('error');
      return false;
    }

    try {
      console.log('🔌 Testing Supabase connection...');
      
      // Try a simple query to test connection
      const { data, error } = await supabase.from('characters').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Database connection failed:', error);
        setDbConnectionStatus('error');
        return false;
      }
      
      console.log('✅ Database connection successful!');
      console.log('📊 Database info:', {
        url: supabaseUrl,
        tablesAccessible: true,
        charactersCount: data || 0
      });
      
      setDbConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      setDbConnectionStatus('error');
      return false;
    }
  };

  // Check OpenAI Status
  const checkOpenAIStatus = async () => {
    try {
      const response = await fetch('https://status.openai.com/api/v2/status.json');
      const data = await response.json();
      
      const status = data.status?.indicator === 'none' ? 'operational' :
                    data.status?.indicator === 'minor' ? 'degraded' :
                    data.status?.indicator === 'major' ? 'outage' : 'unknown';
                    
      setOpenAIStatus({ status, lastChecked: new Date() });
    } catch (error) {
      console.error('Failed to check OpenAI status:', error);
      setOpenAIStatus({ status: 'unknown', lastChecked: new Date() });
    }
  };

  // Check ElevenLabs Status
  const checkElevenLabsStatus = async () => {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/models', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      setElevenLabsStatus({ status: 'operational', lastChecked: new Date() });
    } catch (error) {
      console.error('Failed to check ElevenLabs status:', error);
      setElevenLabsStatus({ status: 'outage', lastChecked: new Date() });
    }
  };

  // Fetch dashboard statistics from Supabase
  const fetchDashboardStats = async () => {
    if (!supabase) return;

    try {
      // Get active sessions count
      const { count: activeSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get online devices count  
      const { count: onlineDevices } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

      // Get total characters count
      const { count: totalCharacters } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true });

      // Get average response time from recent interactions
      const { data: avgResponseData } = await supabase
        .from('interactions')
        .select('response_time')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Filter out null values and calculate average
      const validDashboardResponseTimes = avgResponseData?.filter(item => item.response_time != null && item.response_time > 0) || [];
      const avgResponseTime = validDashboardResponseTimes.length > 0
        ? validDashboardResponseTimes.reduce((sum: number, interaction: any) => sum + interaction.response_time, 0) / validDashboardResponseTimes.length / 1000
        : null;

      setDashboardStats({
        activeSessions: activeSessions || 0,
        onlineDevices: onlineDevices || 0,
        totalCharacters: totalCharacters || 0,
        avgResponseTime: avgResponseTime
      });

      setLastDataUpdate(new Date());
      setLastUpdateTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  // Fetch recent interactions from database
  const fetchRecentInteractions = async () => {
    if (!supabase) return;

    try {
      console.log('🔍 Fetching recent interactions...');
      
      // Let's explore what tables are available first
      console.log('🔍 Checking available tables...');
      try {
        // Try to get a list of tables
        const tablesQuery = await supabase
          .rpc('get_table_names'); // This might not work, but let's try

        console.log('📊 Tables RPC result:', tablesQuery);
      } catch (e) {
        console.log('ℹ️ RPC not available, continuing with direct table tests...');
      }

      // Test each table we know should exist
      const tablesToTest = ['characters', 'devices', 'sessions', 'interactions', 'voices', 'error_logs'];
      
      for (const tableName of tablesToTest) {
        try {
          console.log(`🔍 Testing ${tableName} table...`);
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
            
          console.log(`📊 ${tableName} table result:`, {
            accessible: !error,
            error: error,
            hasData: !!data?.length,
            sampleKeys: data?.[0] ? Object.keys(data[0]) : null
          });
          
          if (tableName === 'interactions' && !error && data) {
            console.log('✅ Interactions table is accessible!');
            console.log('📊 Sample interaction structure:', data[0]);
            setRecentInteractions(data || []);
            return; // Exit early if interactions work
          }
        } catch (e) {
          console.error(`❌ Exception testing ${tableName}:`, e);
        }
      }

      // If we get here, interactions table is not accessible
      console.log('⚠️ Interactions table not accessible, checking for alternative data...');
      
      // Try to use error_logs data as a fallback to show something
      try {
        const { data: errorData, error: errorError } = await supabase
          .from('error_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (!errorError && errorData) {
          console.log('ℹ️ Using error_logs as fallback data for recent activity');
          // Convert error logs to a format that can be displayed
          const formattedErrors = errorData.map((error: any) => ({
            id: error.id,
            user_input: `Error: ${error.error_type}`,
            ai_response: error.error_message,
            created_at: error.created_at,
            session_id: 'Error Log'
          }));
          setRecentInteractions(formattedErrors);
          return;
        }
      } catch (e) {
        console.error('❌ Fallback to error_logs failed:', e);
      }

      // If we reach here without returning, no data was found
      console.log('⚠️ No interaction data available, showing empty state');
      setRecentInteractions([]);
    } catch (error) {
      console.error('❌ Failed to fetch recent interactions (catch):', error);
    }
  };

  // Fetch recent error logs for dashboard
  const fetchRecentErrors = async () => {
    if (!supabase) return;

    try {
      console.log('🔍 Fetching recent error logs...');
      const { data: errors, error } = await supabase
        .from('error_logs')
        .select('id, error_type, error_message, created_at, severity, resolved')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error fetching error logs:', error);
        return;
      }

      console.log('✅ Recent error logs fetched:', { count: errors?.length || 0 });
      setRecentErrors(errors || []);
    } catch (error) {
      console.error('❌ Failed to fetch recent errors:', error);
    }
  };

  // Fetch analytics data for dashboard
  const fetchAnalyticsData = async () => {
    if (!supabase) return;

    try {
      console.log('📊 Fetching analytics data...');
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Get total interactions in last 24 hours
      const { count: interactions24h } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      // Get interactions from previous 24h for trend
      const { count: interactionsPrev24h } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoDaysAgo.toISOString())
        .lt('created_at', yesterday.toISOString());

      // Calculate trend percentage
      const interactionsTrend = (interactionsPrev24h || 0) > 0 
        ? Math.round(((interactions24h || 0) - (interactionsPrev24h || 0)) / (interactionsPrev24h || 1) * 100)
        : 0;

      // Get response time data for chart (last 24 hours, grouped by hour)
      const responseTimeChart = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
        
        const { data: hourlyData } = await supabase
          .from('interactions')
          .select('response_time_ms')
          .gte('created_at', hourStart.toISOString())
          .lt('created_at', hourEnd.toISOString());

        // Filter out null values and calculate average
        const validResponseTimes = hourlyData?.filter(item => item.response_time_ms != null && item.response_time_ms > 0) || [];
        const avgTime = validResponseTimes.length > 0
          ? validResponseTimes.reduce((sum, item) => sum + item.response_time_ms, 0) / validResponseTimes.length / 1000
          : 0;

        responseTimeChart.push({
          hour: hourStart.getHours() + ':00',
          avgTime: Number(avgTime.toFixed(2))
        });
      }

      // Get error data for chart (last 24 hours, grouped by hour)
      const errorChart = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
        
        const { count: errorCount } = await supabase
          .from('error_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', hourStart.toISOString())
          .lt('created_at', hourEnd.toISOString());

        errorChart.push({
          hour: hourStart.getHours() + ':00',
          errors: errorCount || 0
        });
      }

      // Get peak activity hours (interactions by hour over last 7 days for better pattern)
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: activityData } = await supabase
        .from('interactions')
        .select('created_at')
        .gte('created_at', lastWeek.toISOString());

      // Group by hour of day (0-23) across all days
      const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
        hour: hour.toString().padStart(2, '0') + ':00',
        hourNum: hour,
        interactions: 0
      }));

      if (activityData) {
        activityData.forEach((interaction: any) => {
          const hour = new Date(interaction.created_at).getHours();
          hourlyActivity[hour].interactions += 1;
        });
      }

      // Get total errors in 24h
      const { count: totalErrors } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      // Calculate error rate (errors per interaction)
      const errorRate = (interactions24h || 0) > 0 ? (totalErrors || 0) / (interactions24h || 1) * 100 : 0;

      // Get average response time
      const { data: avgResponseData } = await supabase
        .from('interactions')
        .select('response_time_ms')
        .gte('created_at', yesterday.toISOString());

      // Filter out null values and calculate average
      const validAvgResponseTimes = avgResponseData?.filter(item => item.response_time_ms != null && item.response_time_ms > 0) || [];
      const avgResponseTime = validAvgResponseTimes.length > 0
        ? validAvgResponseTimes.reduce((sum, item) => sum + item.response_time_ms, 0) / validAvgResponseTimes.length / 1000
        : null;

      setMetricsData({
        totalInteractions24h: interactions24h || 0,
        interactionsTrend,
        avgResponseTime,
        responseTimeTrend: 0, // Could calculate trend vs previous period
        errorRate,
        totalErrors: totalErrors || 0,
        responseTimeChart,
        errorChart,
        characterUsage: hourlyActivity
      });

      console.log('✅ Analytics data fetched successfully');

    } catch (error) {
      console.error('❌ Failed to fetch analytics data:', error);
    }
  };

  // Check backend health  
  const checkBackendHealth = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!backendUrl) return;

    try {
      const response = await fetch(`${backendUrl}/api/status`);
      if (response.ok) {
        setBackendConnected(true);
      } else {
        setBackendConnected(false);
      }
    } catch (error) {
      setBackendConnected(false);
    }
  };

  // Check all services
  const checkAllServices = async () => {
    setIsCheckingStatus(true);
    await Promise.all([
      checkOpenAIStatus(),
      checkElevenLabsStatus(),
      checkBackendHealth()
    ]);
    setIsCheckingStatus(false);
  };

  // Fetch all data
  const refreshDashboard = async () => {
    console.log('🔄 Refreshing dashboard...');
    
    // First test database connection
    const isConnected = await testDatabaseConnection();
    
    if (isConnected) {
      await Promise.all([
        fetchDashboardStats(),
        fetchRecentInteractions(),
        fetchRecentErrors(),
        fetchAnalyticsData(),
        checkAllServices()
      ]);
    } else {
      await checkAllServices();
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!supabase) return;

    // Subscribe to sessions changes
    const sessionsSubscription = supabase
      .channel('sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, 
        (payload: any) => {
          console.log('Session change:', payload);
          fetchDashboardStats();
        })
      .subscribe();

    // Subscribe to interaction changes for Recent Activity
    const interactionsSubscription = supabase
      .channel('interactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interactions' }, 
        (payload: any) => {
          console.log('🔄 Interaction change:', payload);
          fetchRecentInteractions();
        })
      .subscribe();

    // Subscribe to device changes
    const devicesSubscription = supabase
      .channel('devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' },
        (payload: any) => {
          console.log('Device change:', payload);
          fetchDashboardStats();
        })
      .subscribe();

    // Subscribe to characters changes
    const charactersSubscription = supabase
      .channel('characters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' },
        (payload: any) => {
          console.log('Character change:', payload);
          fetchDashboardStats();
        })
      .subscribe();

    return () => {
      sessionsSubscription.unsubscribe();
      interactionsSubscription.unsubscribe();
      devicesSubscription.unsubscribe();
      charactersSubscription.unsubscribe();
    };
  }, []);

  // Update client time to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      const currentTime = new Date().toLocaleTimeString();
      setClientTime(currentTime);
    };
    
    // Initialize both timestamps to avoid hydration issues
    updateTime(); // Set initial client time
    setLastUpdateTime(new Date().toLocaleTimeString()); // Set initial last update time
    
    const timeInterval = setInterval(updateTime, 1000); // Update every second
    
    return () => clearInterval(timeInterval);
  }, []);

  // Initial data load and periodic refresh
  useEffect(() => {
    refreshDashboard();
    const interval = setInterval(refreshDashboard, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Get status color and text
  const getStatusDisplay = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return { color: 'var(--color-success-green)', text: 'Operational', dot: 'var(--color-success-green)' };
      case 'degraded':
        return { color: 'var(--color-warning-yellow)', text: 'Degraded', dot: 'var(--color-warning-yellow)' };
      case 'outage':
        return { color: 'var(--color-error-red)', text: 'Outage', dot: 'var(--color-error-red)' };
      default:
        return { color: 'var(--color-text-muted)', text: 'Checking...', dot: 'var(--color-text-muted)' };
    }
  };

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
              <a href="#dashboard" className="font-medium" style={{ color: 'var(--color-accent-purple)' }}>
                Dashboard
              </a>
              <a href="/interactions" className="hover:opacity-80" style={{ color: 'var(--color-accent-cyan)' }}>
                Interactions
              </a>
              <a href="/characters" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Characters
              </a>
              <a href="/devices" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Devices
              </a>
              <a href="/elevenlabs" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                ElevenLabs
              </a>
              <a href="#analytics" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Analytics
              </a>
              <a href="/error-logs" className="hover:opacity-80" style={{ color: 'var(--color-error-red)' }}>
                Error Logs
              </a>
              <a href="#settings" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Settings
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent" 
              style={{ 
                backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))',
                letterSpacing: '0.02em'
              }}>
            DreamWeave
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Monitor and Manage your AI tools</p>
          {supabase && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Last updated: {lastUpdateTime || 'Loading...'}
            </p>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Active Sessions</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{dashboardStats.activeSessions}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: dashboardStats.activeSessions > 0 ? 'var(--color-success-green)' + '20' : 'var(--color-text-muted)' + '20' 
              }}>
                <div className={`w-6 h-6 rounded-full ${dashboardStats.activeSessions > 0 ? 'animate-pulse' : ''}`} style={{ 
                  backgroundColor: dashboardStats.activeSessions > 0 ? 'var(--color-success-green)' : 'var(--color-text-muted)' 
                }}></div>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ 
              color: dashboardStats.activeSessions > 0 ? 'var(--color-success-green)' : 'var(--color-text-muted)' 
            }}>
              {dashboardStats.activeSessions > 0 ? `${dashboardStats.activeSessions} active now` : 'No active sessions'}
            </p>
          </div>

          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Online Devices</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{dashboardStats.onlineDevices}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: dashboardStats.onlineDevices > 0 ? 'var(--color-accent-cyan)' + '20' : 'var(--color-error-red)' + '20' 
              }}>
                <div className="w-6 h-6 rounded-full" style={{ 
                  backgroundColor: dashboardStats.onlineDevices > 0 ? 'var(--color-accent-cyan)' : 'var(--color-error-red)' 
                }}></div>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ 
              color: dashboardStats.onlineDevices > 0 ? 'var(--color-accent-cyan)' : 'var(--color-error-red)' 
            }}>
              {dashboardStats.onlineDevices > 0 ? `${dashboardStats.onlineDevices} connected` : 'All devices offline'}
            </p>
          </div>

          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Characters</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{dashboardStats.totalCharacters}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-purple)' + '20' }}>
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-purple)' }}></div>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {dashboardStats.totalCharacters > 0 ? `${dashboardStats.totalCharacters} configured` : 'Ready to create characters'}
            </p>
          </div>

          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Avg Response</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {dashboardStats.avgResponseTime ? `${dashboardStats.avgResponseTime.toFixed(1)}s` : '--'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: dashboardStats.avgResponseTime ? 'var(--color-action-blue)' + '20' : 'var(--color-text-muted)' + '20' 
              }}>
                <div className="w-6 h-6 rounded-full" style={{ 
                  backgroundColor: dashboardStats.avgResponseTime ? 'var(--color-action-blue)' : 'var(--color-text-muted)' 
                }}></div>
              </div>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {dashboardStats.avgResponseTime ? 'Last 24 hours' : 'No data available'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Analytics Dashboard */}
          <div className="lg:col-span-2">
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Analytics Overview</h3>
                <button 
                  onClick={refreshDashboard}
                  className="text-sm font-medium hover:opacity-80" 
                  style={{ color: 'var(--color-accent-purple)' }}
                >
                  Refresh
                </button>
              </div>
              
              {dbConnectionStatus === 'connected' ? (
                <div className="space-y-6">
                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent-cyan)' }}></div>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>24H Interactions</span>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {metricsData.totalInteractions24h || 0}
                      </p>
                      <p className="text-xs" style={{ color: metricsData.interactionsTrend >= 0 ? 'var(--color-success-green)' : 'var(--color-error-red)' }}>
                        {metricsData.interactionsTrend > 0 ? '+' : ''}{metricsData.interactionsTrend}% vs yesterday
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-warning-yellow)' }}></div>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Avg Response Time</span>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {metricsData.avgResponseTime ? `${metricsData.avgResponseTime.toFixed(1)}s` : '--'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Last 24 hours
                      </p>
                    </div>
                    
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-error-red)' }}></div>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Error Rate</span>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {metricsData.errorRate ? `${metricsData.errorRate.toFixed(1)}%` : '0%'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {metricsData.totalErrors || 0} errors in 24h
                      </p>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Response Time Chart */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        Response Time Trend (Last 24h)
                      </h4>
                      <div style={{ width: '100%', height: '200px' }}>
                        <ResponsiveContainer>
                          <LineChart data={metricsData.responseTimeChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-dark)" />
                            <XAxis 
                              dataKey="hour" 
                              stroke="var(--color-text-muted)"
                              fontSize={12}
                            />
                            <YAxis 
                              stroke="var(--color-text-muted)"
                              fontSize={12}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'var(--color-surface-dark)',
                                border: '1px solid var(--color-border-medium)',
                                borderRadius: '8px',
                                color: 'var(--color-text-primary)'
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="avgTime" 
                              stroke="var(--color-accent-cyan)" 
                              strokeWidth={2}
                              dot={{ fill: 'var(--color-accent-cyan)', strokeWidth: 0, r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Peak Activity Hours */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        Peak Activity Hours (Last 7 Days)
                      </h4>
                      <div style={{ width: '100%', height: '200px' }}>
                        <ResponsiveContainer>
                          <LineChart data={metricsData.characterUsage}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-dark)" />
                            <XAxis 
                              dataKey="hour" 
                              stroke="var(--color-text-muted)"
                              fontSize={10}
                              interval={2}
                            />
                            <YAxis 
                              stroke="var(--color-text-muted)"
                              fontSize={12}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'var(--color-surface-dark)',
                                border: '1px solid var(--color-border-medium)',
                                borderRadius: '8px',
                                color: 'var(--color-text-primary)'
                              }}
                              labelFormatter={(hour) => `${hour}`}
                              formatter={(value: any) => [`${value} interactions`, 'Activity']}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="interactions" 
                              stroke="var(--color-accent-purple)" 
                              strokeWidth={2}
                              dot={{ fill: 'var(--color-accent-purple)', strokeWidth: 0, r: 3 }}
                              activeDot={{ r: 5, fill: 'var(--color-accent-purple)' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        <span>📅 Based on last 7 days of activity</span>
                        <span>
                          Peak: {(() => {
                            const peak = metricsData.characterUsage.reduce((max, curr) => 
                              curr.interactions > max.interactions ? curr : max, 
                              { hour: '00:00', interactions: 0 }
                            );
                            return `${peak.hour} (${peak.interactions} interactions)`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Error Log Trends */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                      System Health (Last 24h)
                    </h4>
                    <div style={{ width: '100%', height: '150px' }}>
                      <ResponsiveContainer>
                        <AreaChart data={metricsData.errorChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-dark)" />
                          <XAxis 
                            dataKey="hour" 
                            stroke="var(--color-text-muted)"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="var(--color-text-muted)"
                            fontSize={12}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'var(--color-surface-dark)',
                              border: '1px solid var(--color-border-medium)',
                              borderRadius: '8px',
                              color: 'var(--color-text-primary)'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="errors" 
                            stroke="var(--color-error-red)" 
                            fill="var(--color-error-red)"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-text-muted)' + '20' }}>
                    <svg className="w-8 h-8" fill="currentColor" style={{ color: 'var(--color-text-muted)' }} viewBox="0 0 24 24">
                      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Analytics Unavailable
                  </p>
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    Connect to database to view performance metrics and trends
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & System Status */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/characters">
                  <div className="block w-full font-medium py-3 px-4 rounded-lg hover:opacity-90 text-center cursor-pointer" style={{ 
                    background: 'var(--color-gradient-accent)', 
                    color: 'var(--color-text-primary)',
                    textDecoration: 'none'
                  }}>
                    Manage Characters
                  </div>
                </Link>
                <Link href="/interactions">
                  <div className="block w-full border font-medium py-3 px-4 rounded-lg hover:opacity-80 text-center cursor-pointer" style={{ 
                    backgroundColor: 'var(--color-surface-dark)', 
                    borderColor: 'var(--color-border-medium)', 
                    color: 'var(--color-text-primary)',
                    textDecoration: 'none'
                  }}>
                    View Interactions
                  </div>
                </Link>
              </div>
            </div>

            {/* System Status */}
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>System Status</h3>
                <button 
                  onClick={checkAllServices} 
                  disabled={isCheckingStatus}
                  className="text-xs px-3 py-1 rounded-md border hover:opacity-80 disabled:opacity-50"
                  style={{ 
                    borderColor: 'var(--color-border-medium)',
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface-dark)'
                  }}
                >
                  {isCheckingStatus ? 'Checking...' : 'Refresh'}
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>OpenAI API</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusDisplay(openAIStatus.status).dot }}></div>
                    <span className="text-sm" style={{ color: getStatusDisplay(openAIStatus.status).color }}>
                      {getStatusDisplay(openAIStatus.status).text}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>ElevenLabs API</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusDisplay(elevenLabsStatus.status).dot }}></div>
                    <span className="text-sm" style={{ color: getStatusDisplay(elevenLabsStatus.status).color }}>
                      {getStatusDisplay(elevenLabsStatus.status).text}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Backend Server</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ 
                      backgroundColor: backendConnected ? 'var(--color-success-green)' : 'var(--color-error-red)' 
                    }}></div>
                    <span className="text-sm" style={{ 
                      color: backendConnected ? 'var(--color-success-green)' : 'var(--color-error-red)' 
                    }}>
                      {backendConnected ? 'Connected' : 'Not running'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Database</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ 
                      backgroundColor: supabase ? 'var(--color-success-green)' : 'var(--color-error-red)' 
                    }}></div>
                    <span className="text-sm" style={{ 
                      color: supabase ? 'var(--color-success-green)' : 'var(--color-error-red)' 
                    }}>
                      {supabase ? 'Connected' : 'Not configured'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
                Last checked: {clientTime || 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="border rounded-xl p-6" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)' 
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent Activity</h3>
              <Link 
                href="/interactions"
                className="text-sm font-medium hover:opacity-80"
                style={{ color: 'var(--color-accent-cyan)' }}
              >
                View All
              </Link>
            </div>

            {dbConnectionStatus === 'connected' ? (
              recentInteractions.length > 0 ? (
                <div className="space-y-3">
                  {recentInteractions.map((interaction: any) => (
                    <div key={interaction.id} className="p-4 rounded-lg border" style={{ 
                      backgroundColor: 'var(--color-surface-dark)', 
                      borderColor: 'var(--color-border-dark)' 
                    }}>
                      {/* User Input */}
                      <div className="mb-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-action-blue)' }}></div>
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            User • Session {interaction.session_id || 'Unknown'}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(interaction.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm pl-4" style={{ color: 'var(--color-text-secondary)' }}>
                          {(() => {
                            const userInput = safeRender(interaction.user_input || 'No user input recorded');
                            return userInput.length > 80 ? userInput.substring(0, 80) + '...' : userInput;
                          })()}
                        </p>
                      </div>

                      {/* AI Response */}
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent-purple)' }}></div>
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            AI Assistant
                          </span>
                          {interaction.response_time_ms && (
                            <span className="text-xs" style={{ color: 'var(--color-success-green)' }}>
                              {interaction.response_time_ms}ms
                            </span>
                          )}
                        </div>
                        <p className="text-sm pl-4" style={{ color: 'var(--color-text-primary)' }}>
                          {(() => {
                            const aiResponse = safeRender(interaction.ai_response || 'No AI response recorded');
                            return aiResponse.length > 100 ? aiResponse.substring(0, 100) + '...' : aiResponse;
                          })()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-text-muted)' + '20' }}>
                    <svg className="w-8 h-8" fill="currentColor" style={{ color: 'var(--color-text-muted)' }} viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    No Recent Conversations
                  </p>
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    User interactions and AI responses will appear here as conversations happen
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Database Connection Required
                </p>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Check browser console (F12) for connection details
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useToasts } from '../components/Toast';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [supabase, setSupabase] = useState<any>(null);
  const toasts = useToasts();

  // Safe rendering utility
  const safeRender = (data: any) => {
    if (data === null || data === undefined || data === '') return '--';
    if (typeof data === 'object') return JSON.stringify(data);
    return String(data);
  };

  // Format last seen time
  const formatLastSeen = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get status badge styling
  const getStatusBadge = (status: string, lastSeen: string) => {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    // Determine actual status based on last_seen and reported status
    let actualStatus = status?.toLowerCase() || 'unknown';
    if (actualStatus === 'online' && diffMins > 5) actualStatus = 'offline';

    const statusStyles = {
      online: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/30',
        icon: '🟢',
        gradient: 'linear-gradient(135deg, #10b981, #059669)'
      },
      offline: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
        icon: '🔴',
        gradient: 'linear-gradient(135deg, #ef4444, #dc2626)'
      },
      idle: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        icon: '🟡',
        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
      },
      unknown: {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400',
        border: 'border-gray-500/30',
        icon: '⚫',
        gradient: 'linear-gradient(135deg, #6b7280, #4b5563)'
      }
    };

    const style = statusStyles[actualStatus as keyof typeof statusStyles] || statusStyles.unknown;

    return (
      <div className={`px-3 py-2 rounded-xl text-sm font-medium border flex items-center space-x-2 ${style.bg} ${style.text} ${style.border}`}
           style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}>
        <div 
          className="w-3 h-3 rounded-full flex items-center justify-center"
          style={{ background: style.gradient }}
        >
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
        </div>
        <span className="font-semibold">
          {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
        </span>
      </div>
    );
  };

  useEffect(() => {
    console.log('🔌 Initializing Devices page...');
    console.log('Environment check:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
    });

    if (supabaseUrl && supabaseAnonKey) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      setSupabase(supabaseClient);
      console.log('✅ Supabase client initialized for devices');
    } else {
      console.error('❌ Missing Supabase environment variables');
      setLoading(false);
    }
  }, []);

  // Fetch devices with character information
  const fetchDevices = async () => {
    if (!supabase) return;

    try {
      console.log('📱 Fetching devices...');

      let allDevices: any[] = [];

      // Fetch devices with character information
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select(`
          *,
          characters!devices_assigned_character_id_fkey (
            id,
            name,
            description
          )
        `)
        .order('name', { ascending: true });

      if (devicesError) {
        console.error('❌ Error fetching devices:', devicesError);
        // Fallback to basic devices query
        const { data: basicDevices, error: basicError } = await supabase
          .from('devices')
          .select('*')
          .order('name', { ascending: true });

        if (basicError) {
          console.error('❌ Error fetching basic devices:', basicError);
          return;
        }

        console.log('✅ Fetched basic devices:', basicDevices?.length || 0);
        allDevices = basicDevices || [];
        setDevices(allDevices);
      } else {
        console.log('✅ Fetched devices with characters:', devicesData?.length || 0);
        allDevices = devicesData || [];
        setDevices(allDevices);
      }

      // Fetch all characters for device assignment
      const { data: charactersData, error: charactersError } = await supabase
        .from('characters')
        .select('id, name, description')
        .order('name');

      if (charactersError) {
        console.error('❌ Error fetching characters:', charactersError);
      } else {
        console.log('✅ Fetched characters:', charactersData?.length || 0);
        setCharacters(charactersData || []);
      }

      // Update selected device with fresh data if it exists
      if (selectedDevice && allDevices.length > 0) {
        const updatedSelectedDevice = allDevices.find((d: any) => String(d.id) === String(selectedDevice.id));
        if (updatedSelectedDevice) {
          setSelectedDevice(updatedSelectedDevice);
        }
      }

    } catch (error) {
      console.error('❌ Exception fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update device character assignment
  const updateDeviceCharacter = async (deviceId: string, characterId: string) => {
    if (!supabase) return;

    try {
      console.log('🔄 Updating device character assignment...', { deviceId, characterId });

      // Get character name for toast message (ensure proper type conversion)
      const selectedCharacter = characters.find(c => String(c.id) === String(characterId));
      const deviceName = selectedDevice?.name || 'Device';

      console.log('🔍 Character lookup:', { characterId, characters: characters.map(c => ({ id: c.id, name: c.name })), selectedCharacter });

      const { error } = await supabase
        .from('devices')
        .update({ 
          assigned_character_id: characterId || null
        })
        .eq('id', deviceId);

      if (error) {
        console.error('❌ Error updating device:', error);
        toasts.error(`Failed to update ${deviceName} character assignment`);
        return;
      }

      console.log('✅ Device character updated successfully');
      
      // Update the selected device immediately to reflect the change
      if (selectedDevice && String(selectedDevice.id) === String(deviceId)) {
        setSelectedDevice({
          ...selectedDevice,
          assigned_character_id: characterId || null,
          characters: selectedCharacter || null
        });
      }
      
      // Show success toast
      if (characterId && selectedCharacter) {
        toasts.success(`${deviceName} assigned to character "${selectedCharacter.name}"`);
      } else if (characterId) {
        toasts.success(`${deviceName} assigned to character (ID: ${characterId})`);
      } else {
        toasts.success(`Character assignment removed from ${deviceName}`);
      }
      
      fetchDevices(); // Refresh data
    } catch (error) {
      console.error('❌ Exception updating device:', error);
      toasts.error('An unexpected error occurred while updating device');
    }
  };

  useEffect(() => {
    if (supabase) {
      fetchDevices();

      // Set up real-time subscription
      console.log('🔔 Setting up real-time subscription for devices...');
      const channel = supabase
        .channel('devices-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'devices' },
          (payload: any) => {
            console.log('📱 Device change detected:', payload);
            fetchDevices();
          }
        )
        .subscribe();

      return () => {
        console.log('🔕 Cleaning up devices subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [supabase]);

  // Filter devices based on status
  const filteredDevices = devices.filter(device => {
    if (filterStatus === 'all') return true;
    
    const now = new Date();
    const lastSeenDate = new Date(device.last_seen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    let actualStatus = device.status?.toLowerCase() || 'unknown';
    if (actualStatus === 'online' && diffMins > 5) actualStatus = 'offline';
    
    return actualStatus === filterStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center" style={{ color: 'var(--color-text-primary)' }}>
            Loading devices...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header with Navigation */}
      <header className="border-b" style={{ 
        backgroundColor: 'var(--color-bg-secondary)', 
        borderColor: 'var(--color-border-dark)' 
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img
                src="/dreamwalk-logo.webp"
                alt="DreamWalk Logo"
                width={120}
                height={40}
                className="rounded-lg"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="/" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Dashboard
              </a>
              <a href="/interactions" className="hover:opacity-80" style={{ color: 'var(--color-accent-cyan)' }}>
                Interactions
              </a>
              <a href="/characters" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Characters
              </a>
              <a href="/devices" className="font-medium" style={{ color: 'var(--color-accent-purple)' }}>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
              background: 'var(--color-gradient-accent)' 
            }}>
              <span className="text-xl">📱</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent px-1"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #10b981 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: '1.1',
                  paddingTop: '2px',
                  paddingBottom: '2px'
                }}>
              Device Management
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Monitor and manage your connected Raspberry Pi clients • Total: <span className="font-semibold text-cyan-400">{devices.length}</span> devices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Devices List */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border shadow-lg" style={{ 
              backgroundColor: 'var(--color-bg-secondary)', 
              borderColor: 'var(--color-border-dark)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}>
                             {/* Enhanced Filters */}
               <div className="p-6 border-b" style={{ borderColor: 'var(--color-border-dark)' }}>
                 <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold flex items-center space-x-2">
                    <span className="text-2xl">🔍</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>Filter Devices</span>
                  </h3>
                  <div className="px-3 py-1 rounded-full text-sm" style={{ 
                    backgroundColor: 'var(--color-accent-purple)', 
                    color: 'white' 
                  }}>
                    {filteredDevices.length} found
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'all', label: 'All Devices', icon: '📱', count: devices.length },
                    { key: 'online', label: 'Online', icon: '🟢', count: devices.filter(d => {
                      const now = new Date();
                      const lastSeen = new Date(d.last_seen);
                      const diffMins = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
                      return d.status?.toLowerCase() === 'online' && diffMins <= 5;
                    }).length },
                    { key: 'offline', label: 'Offline', icon: '🔴', count: devices.filter(d => {
                      const now = new Date();
                      const lastSeen = new Date(d.last_seen);
                      const diffMins = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));
                      return d.status?.toLowerCase() !== 'online' || diffMins > 5;
                    }).length },
                    { key: 'idle', label: 'Idle', icon: '🟡', count: devices.filter(d => d.status?.toLowerCase() === 'idle').length }
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setFilterStatus(filter.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                        filterStatus === filter.key 
                          ? 'transform scale-105 shadow-lg' 
                          : 'hover:scale-102 hover:shadow-md'
                      }`}
                      style={{ 
                        backgroundColor: filterStatus === filter.key 
                          ? 'var(--color-accent-purple)' 
                          : 'var(--color-bg-tertiary)',
                        color: filterStatus === filter.key 
                          ? 'white' 
                          : 'var(--color-text-secondary)',
                        border: filterStatus === filter.key 
                          ? '2px solid var(--color-accent-purple)' 
                          : '2px solid transparent'
                      }}
                    >
                      <span>{filter.icon}</span>
                      <span>{filter.label}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        filterStatus === filter.key ? 'bg-white/20' : 'bg-black/10'
                      }`}>
                        {filter.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhanced Device Cards */}
              <div className="p-6">
                {filteredDevices.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      No Devices Found
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      {filterStatus === 'all' ? 'No devices are currently registered' : `No ${filterStatus} devices at the moment`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredDevices.map((device) => (
                      <div
                        key={device.id}
                        className={`p-6 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                          selectedDevice?.id === device.id ? 'ring-2 transform scale-102' : 'hover:scale-101'
                        }`}
                        style={{ 
                          backgroundColor: selectedDevice?.id === device.id 
                            ? 'var(--color-bg-tertiary)' 
                            : 'var(--color-surface-dark)',
                          borderColor: selectedDevice?.id === device.id 
                            ? 'var(--color-accent-purple)' 
                            : 'var(--color-border-dark)',
                          boxShadow: selectedDevice?.id === device.id 
                            ? '0 0 20px rgba(139, 92, 246, 0.3)' 
                            : '0 2px 10px rgba(0, 0, 0, 0.1)'
                        }}
                        onClick={() => setSelectedDevice(device)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                          {/* Device Info */}
                          <div className="md:col-span-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ 
                                background: 'var(--color-gradient-accent)' 
                              }}>
                                <span className="text-xl">🖥️</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-lg truncate" style={{ color: 'var(--color-text-primary)' }}>
                                  {safeRender(device.name)}
                                </h4>
                                <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                                  {safeRender(device.device_id)}
                                </p>
                                {device.location && (
                                  <p className="text-sm flex items-center space-x-1 truncate" style={{ color: 'var(--color-accent-cyan)' }}>
                                    <span>📍</span>
                                    <span>{safeRender(device.location)}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="md:col-span-1 flex justify-center md:justify-start">
                            <div className="flex-shrink-0">
                              {getStatusBadge(device.status, device.last_seen)}
                            </div>
                          </div>

                          {/* Character Assignment */}
                          <div className="md:col-span-1">
                            {device.characters ? (
                              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-lg">🎭</span>
                                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    {device.characters.name}
                                  </p>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  {safeRender(device.characters.description)?.substring(0, 60)}...
                                </p>
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg border-2 border-dashed" style={{ 
                                borderColor: 'var(--color-border-medium)',
                                backgroundColor: 'var(--color-bg-primary)' 
                              }}>
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg opacity-50">🎭</span>
                                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                    No character assigned
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Last Seen */}
                          <div className="md:col-span-1 text-center md:text-right">
                            <div className="flex items-center justify-center md:justify-end space-x-2">
                              <span className="text-lg">🕐</span>
                              <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                                  {formatLastSeen(device.last_seen)}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  Last seen
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Device Details Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border shadow-lg sticky top-4" style={{ 
              backgroundColor: 'var(--color-bg-secondary)', 
              borderColor: 'var(--color-border-dark)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}>
                             <div className="p-6 border-b" style={{ borderColor: 'var(--color-border-dark)' }}>
                 <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ 
                    background: 'var(--color-gradient-accent)' 
                  }}>
                    <span className="text-lg">📋</span>
                  </div>
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    Device Details
                  </h3>
                </div>
              </div>
              
              {selectedDevice ? (
                <div className="p-6">
                  {/* Device Header */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ 
                        background: 'var(--color-gradient-accent)' 
                      }}>
                        <span className="text-2xl">🖥️</span>
                      </div>
                                             <div className="min-w-0 flex-1">
                         <h4 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                           {safeRender(selectedDevice.name)}
                         </h4>
                         <p className="text-sm break-all" style={{ color: 'var(--color-text-muted)' }}>
                           {safeRender(selectedDevice.device_id)}
                         </p>
                       </div>
                    </div>
                    
                    <div className="flex justify-center">
                      {getStatusBadge(selectedDevice.status, selectedDevice.last_seen)}
                    </div>
                  </div>

                  {/* Device Info Grid */}
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { icon: '📍', label: 'Location', value: safeRender(selectedDevice.location) },
                        { icon: '🕐', label: 'Last Seen', value: formatLastSeen(selectedDevice.last_seen) },
                        { icon: '📅', label: 'Created', value: selectedDevice.created_at ? new Date(selectedDevice.created_at).toLocaleDateString() : '--' },
                        { icon: '🔧', label: 'Device ID', value: safeRender(selectedDevice.device_id) }
                                             ].map((item, index) => (
                         <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
                           <div className="flex items-center space-x-2 mb-1">
                             <span className="text-lg">{item.icon}</span>
                             <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                               {item.label}
                             </p>
                           </div>
                           <p className={`text-sm font-medium ${item.label === 'Device ID' ? 'break-all' : ''}`} style={{ color: 'var(--color-text-secondary)' }}>
                             {item.value}
                           </p>
                         </div>
                       ))}
                    </div>
                  </div>

                                     {/* Character Assignment Section */}
                   <div className="border-t pt-6" style={{ borderColor: 'var(--color-border-dark)' }}>
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-xl">🎭</span>
                      <h4 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        Character Assignment
                      </h4>
                    </div>
                    
                    <div className="space-y-4">
                      <select
                        value={selectedDevice.assigned_character_id || ''}
                        onChange={(e) => updateDeviceCharacter(selectedDevice.id, e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-purple-500/50"
                        style={{ 
                          backgroundColor: 'var(--color-bg-tertiary)',
                          borderColor: 'var(--color-border-medium)',
                          color: 'var(--color-text-primary)'
                        }}
                      >
                        <option value="">🚫 No character assigned</option>
                        {characters.map((character) => (
                          <option key={character.id} value={character.id}>
                            🎭 {character.name}
                          </option>
                        ))}
                      </select>
                      
                      {selectedDevice.characters ? (
                        <div className="p-4 rounded-lg border" style={{ 
                          backgroundColor: 'var(--color-surface-dark)',
                          borderColor: 'var(--color-accent-purple)'
                        }}>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">✅</span>
                            <p className="font-semibold" style={{ color: 'var(--color-accent-purple)' }}>
                              Currently Assigned
                            </p>
                          </div>
                          <h5 className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                            {selectedDevice.characters.name}
                          </h5>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {safeRender(selectedDevice.characters.description)}
                          </p>
                        </div>
                      ) : (
                                                 <div className="p-4 rounded-lg border-2 border-dashed text-center" style={{ 
                           borderColor: 'var(--color-border-medium)',
                           backgroundColor: 'var(--color-bg-primary)' 
                         }}>
                          <span className="text-2xl mb-2 block opacity-50">🎭</span>
                          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            No character assigned
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            Select a character above to assign
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4 opacity-50">📱</div>
                  <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Select a Device
                  </h4>
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    Click on any device to view its details and manage character assignments
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
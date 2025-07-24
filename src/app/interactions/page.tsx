"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

type Interaction = {
  id: number;
  user_input: string;
  ai_response: string;
  response_time_ms?: number;
  created_at: string;
  session_id?: number;
  sessions?: {
    devices?: {
      name: string;
      location?: string;
    };
    characters?: {
      name: string;
    };
  };
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔧 Interactions - Environment Check:', {
  hasUrl: !!supabaseUrl,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  hasKey: !!supabaseAnonKey,
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
});

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

console.log('🔧 Interactions - Supabase Client:', {
  clientCreated: !!supabase,
  ready: !!(supabase && supabaseUrl && supabaseAnonKey)
});

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterCharacter, setFilterCharacter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const interactionsPerPage = 20;

  // Fetch interactions from Supabase
  const fetchInteractions = async () => {
    console.log('🚀 fetchInteractions called - supabase client exists:', !!supabase);
    
    if (!supabase) {
      console.error('❌ No Supabase client available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('📊 Fetching interactions...', { currentPage, filterDevice, filterCharacter, interactionsPerPage });

      // Build query with relationships
      const query = supabase
        .from('interactions')
        .select(`
          *,
          sessions (
            devices (
              name,
              location
            ),
            characters (
              name
            )
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * interactionsPerPage, currentPage * interactionsPerPage - 1);

      console.log('🔍 Query built for interactions table');

      const { data: interactionData, count, error } = await query;

      console.log('📊 Query result:', {
        hasError: !!error,
        errorDetails: error,
        dataCount: interactionData?.length || 0,
        totalCount: count,
        rawData: interactionData ? interactionData.slice(0, 2) : null // First 2 records for debugging
      });

      if (error) {
        console.error('❌ Error fetching interactions:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setIsLoading(false);
        return;
      }

      console.log('✅ Interactions fetched successfully:', { count: interactionData?.length || 0, total: count });
      setInteractions(interactionData || []);
      setTotalCount(count || 0);

    } catch (error) {
      console.error('❌ Failed to fetch interactions (catch block):', error);
      console.error('❌ Error object:', error);
    } finally {
      setIsLoading(false);
      console.log('🏁 fetchInteractions completed');
    }
  };

  // Get unique devices and characters for filter dropdowns
  const [devices, setDevices] = useState<string[]>([]);
  const [characters, setCharacters] = useState<string[]>([]);
  
  const fetchFilterOptions = async () => {
    if (!supabase) return;

    try {
      // Get unique devices
      const { data: deviceData } = await supabase
        .from('devices')
        .select('name')
        .order('name');

      // Get unique characters
      const { data: characterData } = await supabase
        .from('characters')
        .select('name')
        .order('name');

      setDevices(deviceData?.map(d => d.name) || []);
      setCharacters(characterData?.map(c => c.name) || []);
    } catch (error) {
      console.error('❌ Failed to fetch filter options:', error);
    }
  };



  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

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

  // Get response time color
  const getResponseTimeColor = (responseTime?: number) => {
    if (!responseTime) return 'var(--color-text-muted)';
    if (responseTime < 1000) return 'var(--color-success-green)';
    if (responseTime < 3000) return 'var(--color-warning-yellow)';
    return 'var(--color-error-red)';
  };

  useEffect(() => {
    console.log('🚀 Interactions Page - useEffect triggered');
    fetchInteractions();
    fetchFilterOptions();
  }, [currentPage, filterDevice, filterCharacter, fetchInteractions]);

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return;

    const subscription = supabase
      .channel('interactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interactions' },
        (payload) => {
          console.log('🔄 Interaction change detected:', payload);
          fetchInteractions();
        })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchInteractions]);

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
              <Link href="/" className="text-text_secondary hover:text-text_primary">
                Dashboard
              </Link>
              <Link href="/interactions" className="font-medium" style={{ color: 'var(--color-accent-cyan)' }}>
                Interactions
              </Link>
              <Link href="/characters" className="text-text_secondary hover:text-text_primary">
                Characters
              </Link>
              <Link href="/devices" className="text-text_secondary hover:text-text_primary">
                Devices
              </Link>
              <Link href="/elevenlabs" className="text-text_secondary hover:text-text_primary">
                ElevenLabs
              </Link>
              <Link href="#analytics" className="text-text_secondary hover:text-text_primary">
                Analytics
              </Link>
              <Link href="/error-logs" className="hover:opacity-80" style={{ color: 'var(--color-error-red)' }}>
                Error Logs
              </Link>
              <Link href="#settings" className="text-text_secondary hover:text-text_primary">
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Interactions</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                View all user conversations and AI responses • Total: {totalCount} interactions
              </p>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center space-x-4">
              <select
                value={filterDevice}
                onChange={(e) => {
                  setFilterDevice(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  backgroundColor: 'var(--color-surface-dark)',
                  borderColor: 'var(--color-border-medium)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <option value="all">All Devices</option>
                {devices.map(device => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
              
              <select
                value={filterCharacter}
                onChange={(e) => {
                  setFilterCharacter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  backgroundColor: 'var(--color-surface-dark)',
                  borderColor: 'var(--color-border-medium)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <option value="all">All Characters</option>
                {characters.map(character => (
                  <option key={character} value={character}>{character}</option>
                ))}
              </select>
              
              <button
                onClick={() => fetchInteractions()}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--color-accent-cyan)',
                  color: 'var(--color-text-primary)'
                }}
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactions List */}
          <div className="lg:col-span-2">
            <div className="border rounded-xl" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Recent Conversations
                </h3>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <p style={{ color: 'var(--color-text-muted)' }}>Loading interactions...</p>
                  </div>
                ) : interactions.length > 0 ? (
                  <div className="space-y-4">
                    {interactions.map((interaction) => (
                      <div 
                        key={interaction.id} 
                        className={`p-4 rounded-lg border cursor-pointer hover:opacity-80 ${selectedInteraction?.id === interaction.id ? 'ring-2' : ''}`}
                        style={{ 
                          backgroundColor: 'var(--color-surface-dark)', 
                          borderColor: 'var(--color-border-dark)'
                        }}
                        onClick={() => setSelectedInteraction(interaction)}
                      >
                        {/* User Input */}
                        <div className="mb-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-action-blue)' }}></div>
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              User • {interaction.sessions?.devices?.name || 'Unknown Device'}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {formatDate(interaction.created_at)}
                            </span>
                          </div>
                          <p className="text-sm pl-4" style={{ color: 'var(--color-text-secondary)' }}>
                            {(() => {
                              const userInput = safeRender(interaction.user_input || 'No user input recorded');
                              return userInput.length > 100 ? userInput.substring(0, 100) + '...' : userInput;
                            })()}
                          </p>
                        </div>

                        {/* AI Response */}
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent-purple)' }}></div>
                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                              {interaction.sessions?.characters?.name || 'AI Assistant'}
                            </span>
                            {interaction.response_time_ms && (
                              <span 
                                className="text-xs font-medium"
                                style={{ color: getResponseTimeColor(interaction.response_time_ms) }}
                              >
                                {interaction.response_time_ms}ms
                              </span>
                            )}
                          </div>
                          <p className="text-sm pl-4" style={{ color: 'var(--color-text-primary)' }}>
                            {(() => {
                              const aiResponse = safeRender(interaction.ai_response || 'No AI response recorded');
                              return aiResponse.length > 150 ? aiResponse.substring(0, 150) + '...' : aiResponse;
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
                      No Interactions Found
                    </p>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      User conversations and AI responses will appear here as they happen
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {totalCount > interactionsPerPage && (
                  <div className="flex justify-between items-center mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-border-dark)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Showing {((currentPage - 1) * interactionsPerPage) + 1}-{Math.min(currentPage * interactionsPerPage, totalCount)} of {totalCount}
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
                        disabled={currentPage * interactionsPerPage >= totalCount}
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

          {/* Interaction Details Panel */}
          <div>
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {selectedInteraction ? 'Conversation Details' : 'Select a Conversation'}
              </h3>
              
              {selectedInteraction ? (
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b" style={{ borderColor: 'var(--color-border-dark)' }}>
                    <div>
                      <label className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Device</label>
                      <p style={{ color: 'var(--color-text-primary)' }}>
                        {selectedInteraction.sessions?.devices?.name || 'Unknown Device'}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Character</label>
                      <p style={{ color: 'var(--color-text-primary)' }}>
                        {selectedInteraction.sessions?.characters?.name || 'AI Assistant'}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Time</label>
                      <p style={{ color: 'var(--color-text-primary)' }}>{formatDate(selectedInteraction.created_at)}</p>
                    </div>
                    {selectedInteraction.response_time_ms && (
                      <div>
                        <label className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Response Time</label>
                        <p style={{ color: getResponseTimeColor(selectedInteraction.response_time_ms) }}>
                          {selectedInteraction.response_time_ms}ms
                        </p>
                      </div>
                    )}
                  </div>

                  {/* User Input */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center" style={{ color: 'var(--color-text-muted)' }}>
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: 'var(--color-action-blue)' }}></div>
                      User Input
                    </label>
                    <div className="p-3 rounded text-sm" style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {safeRender(selectedInteraction.user_input || 'No user input recorded')}
                    </div>
                  </div>
                  
                  {/* AI Response */}
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center" style={{ color: 'var(--color-text-muted)' }}>
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: 'var(--color-accent-purple)' }}></div>
                      AI Response
                    </label>
                    <div className="p-3 rounded text-sm" style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      color: 'var(--color-text-primary)'
                    }}>
                      {safeRender(selectedInteraction.ai_response || 'No AI response recorded')}
                    </div>
                  </div>


                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-text-muted)' + '20' }}>
                    <svg className="w-8 h-8" fill="currentColor" style={{ color: 'var(--color-text-muted)' }} viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    Click on a conversation to view full details
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
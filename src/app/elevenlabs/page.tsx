'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useToasts } from '../components/Toast';
import Link from 'next/link';
import Image from 'next/image';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface VoiceSample {
  sample_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
}

interface VoiceLabels {
  [key: string]: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples?: VoiceSample[];
  category: string;
  description?: string;
  preview_url?: string;
  labels?: VoiceLabels;
  settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  sharing?: {
    status: string;
    featured?: boolean;
    category?: string;
    liked_by_count?: number;
    cloned_by_count?: number;
  };
  verified_languages?: Array<{
    language: string;
    accent?: string;
    locale?: string;
  }>;
  is_legacy?: boolean;
  created_at_unix?: number;
}

interface VoiceRecord {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
  description?: string;
  labels?: VoiceLabels;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ElevenLabsPage() {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [localVoices, setLocalVoices] = useState<VoiceRecord[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [selectedVoice, setSelectedVoice] = useState<ElevenLabsVoice | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    premade: 0,
    cloned: 0,
    generated: 0,
    professional: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const toasts = useToasts();

  const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

  // Safe rendering utility (currently unused but kept for future use)
  // const safeRender = (data: unknown) => {
  //   if (data === null || data === undefined || data === '') return '--';
  //   if (typeof data === 'object') return JSON.stringify(data);
  //   return String(data);
  // };

  // No API key needed - handled server-side

    // Fetch local voices from Supabase and populate main display
  const fetchLocalVoices = useCallback(async () => {
    if (!supabase || isInitialized) return;

    try {
      console.log('📊 Loading existing voices from database...');

      const { data, error } = await supabase
        .from('voices')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Error fetching local voices:', error);
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      console.log('✅ Loaded voices from database:', data?.length || 0);
      setLocalVoices(data || []);

      // Convert Supabase data to ElevenLabs format for display
      if (data && data.length > 0) {
        const convertedVoices: ElevenLabsVoice[] = data.map(voice => ({
          voice_id: voice.voice_id,
          name: voice.name,
          description: voice.description || undefined,
          category: voice.category || 'unknown',
          preview_url: voice.preview_url || undefined,
          labels: voice.labels || undefined
        }));

        setVoices(convertedVoices);

        // Calculate stats from local data
        const localStats = {
          total: convertedVoices.length,
          premade: convertedVoices.filter(v => v.category === 'premade').length,
          cloned: convertedVoices.filter(v => v.category === 'cloned').length,
          generated: convertedVoices.filter(v => v.category === 'generated').length,
          professional: convertedVoices.filter(v => v.category === 'professional').length
        };
        setStats(localStats);
        
        toasts.success(`Loaded ${convertedVoices.length} voices from database`);
      } else {
        // No local voices found - show empty state
        setVoices([]);
        setStats({ total: 0, premade: 0, cloned: 0, generated: 0, professional: 0 });
      }

    } catch (error) {
      console.error('❌ Error loading local voices:', error);
      toasts.error('Failed to load voices from database');
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [supabase, isInitialized, toasts]);

  // Refresh local voices (to be called after sync)
  const refreshLocalVoices = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('voices')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Error refreshing local voices:', error);
        return;
      }

      setLocalVoices(data || []);

      // Update main voices display as well
      if (data && data.length > 0) {
        const convertedVoices: ElevenLabsVoice[] = data.map(voice => ({
          voice_id: voice.voice_id,
          name: voice.name,
          description: voice.description || undefined,
          category: voice.category || 'unknown',
          preview_url: voice.preview_url || undefined,
          labels: voice.labels || undefined
        }));

        setVoices(convertedVoices);

        // Update stats
        const localStats = {
          total: convertedVoices.length,
          premade: convertedVoices.filter(v => v.category === 'premade').length,
          cloned: convertedVoices.filter(v => v.category === 'cloned').length,
          generated: convertedVoices.filter(v => v.category === 'generated').length,
          professional: convertedVoices.filter(v => v.category === 'professional').length
        };
        setStats(localStats);
      }

    } catch (error) {
      console.error('❌ Error refreshing voices:', error);
    }
  }, [supabase]);

  // Fetch voices from ElevenLabs API (server-side) and auto-sync
  const fetchAndSyncVoices = async () => {
    setLoading(true);
    
    try {
      console.log('🔄 Fetching voices from ElevenLabs API...');
      
      const response = await fetch('/api/elevenlabs/voices');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.details || 'Failed to fetch voices');
      }

      console.log('✅ Fetched voices:', data.voices.length);
      setVoices(data.voices);
      setStats(data.stats);
      
      toasts.success(`Successfully fetched ${data.voices.length} voices from ElevenLabs!`);

      // Step 2: Automatically sync to database
      console.log('🔄 Auto-syncing voices to database...');
      await syncVoicesToSupabase();

    } catch (error) {
      console.error('❌ Error fetching ElevenLabs voices:', error);
      toasts.error('Failed to fetch voices from ElevenLabs: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Sync voices to Supabase (called automatically after fetching)
  const syncVoicesToSupabase = async () => {
    if (!supabase || voices.length === 0) {
      console.log('⚠️ No voices to sync or no Supabase client');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const detailedErrors: string[] = [];

    try {
      console.log('💾 Syncing voices to Supabase...', voices.length);

      for (const voice of voices) {
        try {
          const now = new Date().toISOString();

          // Create voice data matching the exact table schema
          const voiceData: Partial<VoiceRecord> = {
            // Required fields
            voice_id: voice.voice_id,
            name: voice.name.substring(0, 100), // Ensure it fits varchar(100)
            created_at: voice.created_at_unix ? new Date(voice.created_at_unix * 1000).toISOString() : now,
            updated_at: now,
            
            // Optional fields that match the schema
            preview_url: voice.preview_url || undefined,
            category: voice.category ? voice.category.substring(0, 50) : undefined, // Ensure it fits varchar(50)
            description: voice.description || undefined,
            labels: voice.labels || undefined, // JSONB field - pass object directly
            is_active: true // Default to true for ElevenLabs voices
          };

          const { error } = await supabase
            .from('voices')
            .upsert(voiceData, { 
              onConflict: 'voice_id'
            })
            .select();

          if (error) {
            console.error(`❌ Error syncing voice ${voice.name}:`, error);
            const errorMsg = `${voice.name}: ${error.message || 'Unknown error'}`;
            detailedErrors.push(errorMsg);
            errorCount++;
          } else {
            console.log(`✅ Successfully synced: ${voice.name}`);
            successCount++;
          }

        } catch (voiceError: unknown) {
          const errorMsg = `${voice.name}: ${voiceError instanceof Error ? voiceError.message : String(voiceError)}`;
          console.error(`❌ Exception syncing voice ${voice.name}:`, voiceError);
          detailedErrors.push(errorMsg);
          errorCount++;
        }
      }

      console.log('✅ Voice sync completed:', { successCount, errorCount });

      if (successCount > 0) {
        toasts.success(`Successfully synced ${successCount} voices to database!`);
        // Refresh local voices without causing re-render loops
        refreshLocalVoices();
      }

      if (errorCount > 0) {
        console.log('🔍 Detailed sync errors:', detailedErrors);
        toasts.warning(`${errorCount} voices failed to sync. Check console for details.`);
      }

    } catch (error: unknown) {
      console.error('❌ Error syncing voices:', error);
      toasts.error(`Failed to sync voices: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Load local voices on component mount
  useEffect(() => {
    if (supabase && !isInitialized) {
      fetchLocalVoices();
    }
  }, [supabase, isInitialized, fetchLocalVoices]);

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
              <Image
                src="/dreamwalk-logo.webp"
                alt="DreamWalk Logo"
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
              <Link href="/elevenlabs" className="font-medium" style={{ color: 'var(--color-accent-purple)' }}>
                ElevenLabs
              </Link>
              <Link href="#analytics" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Analytics
              </Link>
              <Link href="/error-logs" className="hover:opacity-80" style={{ color: 'var(--color-error-red)' }}>
                Error Logs
              </Link>
              <Link href="/settings" className="hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
                Settings
              </Link>
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
              <span className="text-xl">🎙️</span>
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
              ElevenLabs Voice Management
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            Sync and manage ElevenLabs voices for character creation • Local: <span className="font-semibold text-cyan-400">{localVoices.length}</span> voices
          </p>
        </div>

        {/* Voice Management Controls */}
        <div className="mb-8">
          <div className="rounded-xl border p-6" style={{ 
            backgroundColor: 'var(--color-bg-secondary)', 
            borderColor: 'var(--color-border-dark)' 
          }}>
            <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
              <span className="text-2xl">⚙️</span>
              <span style={{ color: 'var(--color-text-primary)' }}>Voice Management</span>
            </h3>
            
            <div className="flex justify-center">
              <button
                onClick={fetchAndSyncVoices}
                disabled={loading}
                className="px-8 py-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 text-lg"
                style={{ 
                  backgroundColor: 'var(--color-accent-purple)',
                  color: 'white'
                }}
              >
                {loading ? '⏳ Fetching & Syncing...' : '🔄 Fetch & Sync Voices'}
              </button>
            </div>

            {/* Stats Display */}
            {stats.total > 0 && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-cyan)' }}>{stats.total}</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Total</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-green)' }}>{stats.premade}</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Premade</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-purple)' }}>{stats.cloned}</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Cloned</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-blue)' }}>{stats.generated}</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Generated</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                  <div className="text-2xl font-bold" style={{ color: 'var(--color-accent-gold)' }}>{stats.professional}</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Professional</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Voice Library */}
        <div className="mb-8">
          <div className="rounded-xl border" style={{ 
            backgroundColor: 'var(--color-bg-secondary)', 
            borderColor: 'var(--color-border-dark)' 
          }}>
            <div className="border-b p-6" style={{ borderColor: 'var(--color-border-dark)' }}>
              <h3 className="text-xl font-semibold flex items-center space-x-2">
                <span className="text-2xl">📚</span>
                <span style={{ color: 'var(--color-text-primary)' }}>Voice Library ({voices.length} voices)</span>
              </h3>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">⏳</div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Loading Voices
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    Loading your voice library from database...
                  </p>
                </div>
              ) : voices.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🎙️</div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    No Voices Found
                  </h3>
                  <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                    Your voice library is empty. Click &ldquo;Fetch &amp; Sync Voices&rdquo; to load all available voices from ElevenLabs.
                  </p>
                  <button
                    onClick={fetchAndSyncVoices}
                    disabled={loading}
                    className="px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                    style={{ 
                      backgroundColor: 'var(--color-accent-purple)',
                      color: 'white'
                    }}
                  >
                    {loading ? '⏳ Loading...' : '🔄 Fetch & Sync Voices'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {voices.map((voice) => (
                    <div
                      key={voice.voice_id}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedVoice?.voice_id === voice.voice_id ? 'ring-2 transform scale-102' : 'hover:scale-101'
                      }`}
                      style={{ 
                        backgroundColor: selectedVoice?.voice_id === voice.voice_id 
                          ? 'var(--color-bg-tertiary)' 
                          : 'var(--color-surface-dark)',
                        borderColor: selectedVoice?.voice_id === voice.voice_id 
                          ? 'var(--color-accent-purple)' 
                          : 'var(--color-border-dark)',
                        boxShadow: selectedVoice?.voice_id === voice.voice_id 
                          ? '0 0 20px rgba(139, 92, 246, 0.3)' 
                          : '0 2px 10px rgba(0, 0, 0, 0.1)'
                      }}
                      onClick={() => setSelectedVoice(voice)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                              {voice.name}
                            </h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              voice.category === 'premade' ? 'bg-cyan-500/20 text-cyan-400' :
                              voice.category === 'cloned' ? 'bg-green-500/20 text-green-400' :
                              voice.category === 'generated' ? 'bg-yellow-500/20 text-yellow-400' :
                              voice.category === 'professional' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {voice.category}
                            </span>
                          </div>
                          {voice.description && (
                            <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                              {voice.description.length > 80 ? voice.description.substring(0, 80) + '...' : voice.description}
                            </p>
                          )}
                          {voice.verified_languages && voice.verified_languages.length > 0 && (
                            <div className="flex items-center space-x-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              <span>🌍 {voice.verified_languages[0].language}</span>
                              {voice.verified_languages[0].accent && (
                                <>
                                  <span>•</span>
                                  <span>{voice.verified_languages[0].accent}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {voice.preview_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const audio = new Audio(voice.preview_url);
                              audio.play();
                            }}
                            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
                            style={{ 
                              backgroundColor: 'var(--color-accent-cyan)',
                              color: 'white'
                            }}
                            title="Play Preview"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voice Details Panel */}
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
                  Voice Details
                </h3>
              </div>
            </div>
            
            {selectedVoice ? (
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ 
                      background: 'var(--color-gradient-accent)' 
                    }}>
                      <span className="text-2xl">🎤</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedVoice.name}
                      </h4>
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {selectedVoice.voice_id}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedVoice.description && (
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</p>
                      <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedVoice.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Category</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {selectedVoice.category}
                      </p>
                    </div>
                    
                    {selectedVoice.verified_languages?.[0] && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Language</p>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          {selectedVoice.verified_languages[0].language}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedVoice.settings && (
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Voice Settings</p>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
                        <div className="space-y-1 text-xs">
                          {selectedVoice.settings.stability !== undefined && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--color-text-muted)' }}>Stability:</span>
                              <span style={{ color: 'var(--color-text-secondary)' }}>{selectedVoice.settings.stability}</span>
                            </div>
                          )}
                          {selectedVoice.settings.similarity_boost !== undefined && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--color-text-muted)' }}>Similarity:</span>
                              <span style={{ color: 'var(--color-text-secondary)' }}>{selectedVoice.settings.similarity_boost}</span>
                            </div>
                          )}
                          {selectedVoice.settings.style !== undefined && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--color-text-muted)' }}>Style:</span>
                              <span style={{ color: 'var(--color-text-secondary)' }}>{selectedVoice.settings.style}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedVoice.sharing && (
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Community Stats</p>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
                        <div className="space-y-1 text-xs">
                          {selectedVoice.sharing.liked_by_count !== undefined && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--color-text-muted)' }}>Likes:</span>
                              <span style={{ color: 'var(--color-text-secondary)' }}>👍 {selectedVoice.sharing.liked_by_count}</span>
                            </div>
                          )}
                          {selectedVoice.sharing.cloned_by_count !== undefined && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--color-text-muted)' }}>Clones:</span>
                              <span style={{ color: 'var(--color-text-secondary)' }}>👥 {selectedVoice.sharing.cloned_by_count}</span>
                            </div>
                          )}
                          {selectedVoice.sharing.featured && (
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--color-text-muted)' }}>Featured:</span>
                              <span style={{ color: 'var(--color-accent-cyan)' }}>⭐ Yes</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedVoice.preview_url && (
                    <button
                      onClick={() => {
                        const audio = new Audio(selectedVoice.preview_url);
                        audio.play();
                      }}
                      className="w-full px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-colors"
                      style={{ 
                        backgroundColor: 'var(--color-accent-cyan)',
                        color: 'white'
                      }}
                    >
                      ▶️ Play Voice Preview
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4 opacity-50">🎙️</div>
                <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Select a Voice
                </h4>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Click on any voice to view its details and settings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
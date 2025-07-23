"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

type Character = {
  id: number;
  name: string;
  description?: string;
  voice_id?: string;
  personality?: string;
  system_prompt?: string;
  created_at: string;
  is_active: boolean;
};

type Voice = {
  id: number;
  voice_id: string;
  name: string;
  description?: string;
  gender?: string;
  accent?: string;
  age?: string;
  use_case?: string;
  created_at: string;
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔧 Characters - Environment Check:', {
  hasUrl: !!supabaseUrl,
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  hasKey: !!supabaseAnonKey,
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
});

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Character creation form state
  const [newCharacter, setNewCharacter] = useState({
    name: '',
    description: '',
    personality: '',
    system_prompt: '',
    voice_id: '',
    is_active: true
  });

  // Fetch existing characters
  const fetchCharacters = async () => {
    console.log('🚀 fetchCharacters called - supabase client exists:', !!supabase);
    
    if (!supabase) {
      console.error('❌ No Supabase client available');
      setIsLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching characters...');
      const { data: charactersData, error } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Characters query result:', {
        hasError: !!error,
        errorDetails: error,
        dataCount: charactersData?.length || 0,
        rawData: charactersData ? charactersData.slice(0, 2) : null
      });

      if (error) {
        console.error('❌ Error fetching characters:', error);
        return;
      }

      console.log('✅ Characters fetched successfully:', { count: charactersData?.length || 0 });
      setCharacters(charactersData || []);

    } catch (error) {
      console.error('❌ Failed to fetch characters (catch block):', error);
    }
  };

  // Fetch available ElevenLabs voices
  const fetchVoices = async () => {
    if (!supabase) return;

    try {
      console.log('📊 Fetching ElevenLabs voices...');
      const { data: voicesData, error } = await supabase
        .from('voices')
        .select('*')
        .order('name', { ascending: true });

      console.log('📊 Voices query result:', {
        hasError: !!error,
        errorDetails: error,
        dataCount: voicesData?.length || 0
      });

      if (error) {
        console.error('❌ Error fetching voices:', error);
        return;
      }

      console.log('✅ Voices fetched successfully:', { count: voicesData?.length || 0 });
      setVoices(voicesData || []);

    } catch (error) {
      console.error('❌ Failed to fetch voices (catch block):', error);
    }
  };

  // Create new character
  const createCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    if (!newCharacter.name.trim()) {
      alert('Character name is required');
      return;
    }

    if (!newCharacter.voice_id) {
      alert('Please select a voice for your character');
      return;
    }

    try {
      setIsCreating(true);
      console.log('🚀 Creating new character:', newCharacter);

      const { data, error } = await supabase
        .from('characters')
        .insert([{
          name: newCharacter.name.trim(),
          description: newCharacter.description.trim() || null,
          personality: newCharacter.personality.trim() || null,
          system_prompt: newCharacter.system_prompt.trim() || null,
          voice_id: newCharacter.voice_id,
          is_active: newCharacter.is_active
        }])
        .select();

      if (error) {
        console.error('❌ Error creating character:', error);
        alert('Failed to create character: ' + error.message);
        return;
      }

      console.log('✅ Character created successfully:', data);
      
      // Reset form and close modal
      setNewCharacter({
        name: '',
        description: '',
        personality: '',
        system_prompt: '',
        voice_id: '',
        is_active: true
      });
      setShowCreateModal(false);
      
      // Refresh characters list
      fetchCharacters();

    } catch (error) {
      console.error('❌ Failed to create character (catch):', error);
      alert('Failed to create character');
    } finally {
      setIsCreating(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get selected voice info
  const getSelectedVoice = (voiceId: string) => {
    return voices.find(v => v.voice_id === voiceId);
  };

  // Safely render data that might be an object
  const safeRender = (data: any): string => {
    if (data === null || data === undefined) return '';
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch (e) {
        return '[Complex Object]';
      }
    }
    return String(data);
  };

  useEffect(() => {
    console.log('🚀 Characters Page - useEffect triggered');
    const loadData = async () => {
      await Promise.all([
        fetchCharacters(),
        fetchVoices()
      ]);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  // Real-time subscription for characters
  useEffect(() => {
    if (!supabase) return;

    const subscription = supabase
      .channel('characters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' },
        (payload) => {
          console.log('🔄 Character change detected:', payload);
          fetchCharacters();
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
              <a href="/interactions" className="hover:opacity-80" style={{ color: 'var(--color-accent-cyan)' }}>
                Interactions
              </a>
              <a href="/characters" className="font-medium" style={{ color: 'var(--color-accent-purple)' }}>
                Characters
              </a>
              <a href="#devices" className="text-text_secondary hover:text-text_primary">
                Devices
              </a>
              <a href="#analytics" className="text-text_secondary hover:text-text_primary">
                Analytics
              </a>
              <a href="/error-logs" className="hover:opacity-80" style={{ color: 'var(--color-error-red)' }}>
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
              <h2 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Characters</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Manage your AI characters and their ElevenLabs voices • Total: {characters.length} characters
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-lg font-medium hover:opacity-90"
                style={{ 
                  backgroundColor: 'var(--color-accent-purple)',
                  color: 'var(--color-text-primary)'
                }}
              >
                Create New Character
              </button>
              
              <button
                onClick={() => {
                  fetchCharacters();
                  fetchVoices();
                }}
                disabled={isLoading}
                className="px-4 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--color-action-blue)',
                  color: 'var(--color-text-primary)'
                }}
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Characters List */}
          <div className="lg:col-span-2">
            <div className="border rounded-xl" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  Your Characters
                </h3>
                
                {isLoading ? (
                  <div className="text-center py-8">
                    <p style={{ color: 'var(--color-text-muted)' }}>Loading characters...</p>
                  </div>
                ) : characters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {characters.map((character) => (
                      <div 
                        key={character.id} 
                        className={`p-4 rounded-lg border cursor-pointer hover:opacity-80 transition-all ${selectedCharacter?.id === character.id ? 'ring-2' : ''}`}
                        style={{ 
                          backgroundColor: 'var(--color-surface-dark)', 
                          borderColor: character.is_active ? 'var(--color-success-green)' : 'var(--color-border-dark)',
                          ...(selectedCharacter?.id === character.id && {
                            borderColor: 'var(--color-accent-purple)'
                          })
                        }}
                        onClick={() => setSelectedCharacter(character)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                {character.name}
                              </h4>
                              <div className={`w-2 h-2 rounded-full ${character.is_active ? 'animate-pulse' : ''}`} style={{ 
                                backgroundColor: character.is_active ? 'var(--color-success-green)' : 'var(--color-text-muted)'
                              }}></div>
                            </div>
                            {character.description && (
                              <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                                {(() => {
                                  const desc = safeRender(character.description);
                                  return desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
                                })()}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              <span>Voice: {character.voice_id || 'None'}</span>
                              <span>•</span>
                              <span>{formatDate(character.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {character.personality && (
                          <div className="border-t pt-2" style={{ borderColor: 'var(--color-border-dark)' }}>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              Personality: {(() => {
                                const personality = safeRender(character.personality);
                                return personality.length > 50 ? personality.substring(0, 50) + '...' : personality;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-text-muted)' + '20' }}>
                      <svg className="w-8 h-8" fill="currentColor" style={{ color: 'var(--color-text-muted)' }} viewBox="0 0 24 24">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V3.5C15 2.7 14.3 2 13.5 2S12 2.7 12 3.5V6.5L6 7V9C6 10.1 6.9 11 8 11H9L9.5 17C9.6 17.6 10.1 18 10.7 18H13.3C13.9 18 14.4 17.6 14.5 17L15 11H16C17.1 11 18 10.1 18 9Z"/>
                      </svg>
                    </div>
                    <p className="text-lg font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                      No Characters Yet
                    </p>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                      Create your first AI character using ElevenLabs voices
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 px-6 py-2 rounded-lg font-medium hover:opacity-90"
                      style={{ 
                        backgroundColor: 'var(--color-accent-purple)',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      Create Your First Character
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Character Details Panel */}
          <div>
            <div className="border rounded-xl p-6" style={{ 
              backgroundColor: 'var(--color-secondary-dark)', 
              borderColor: 'var(--color-border-medium)' 
            }}>
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {selectedCharacter ? 'Character Details' : 'Select a Character'}
              </h3>
              
              {selectedCharacter ? (
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {selectedCharacter.name}
                      </h4>
                      <span 
                        className="px-2 py-1 text-xs rounded-full font-medium"
                        style={{ 
                          backgroundColor: selectedCharacter.is_active ? 'var(--color-success-green)' + '20' : 'var(--color-text-muted)' + '20',
                          color: selectedCharacter.is_active ? 'var(--color-success-green)' : 'var(--color-text-muted)'
                        }}
                      >
                        {selectedCharacter.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Created {formatDate(selectedCharacter.created_at)}
                    </p>
                  </div>

                  {/* Description */}
                  {selectedCharacter.description && (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Description</label>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {safeRender(selectedCharacter.description)}
                      </p>
                    </div>
                  )}

                  {/* Voice */}
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>ElevenLabs Voice</label>
                    <div className="mt-1">
                      {selectedCharacter.voice_id ? (
                        <div className="p-3 rounded" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {getSelectedVoice(selectedCharacter.voice_id)?.name || 'Unknown Voice'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            ID: {selectedCharacter.voice_id}
                          </p>
                          {getSelectedVoice(selectedCharacter.voice_id)?.description && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                              {safeRender(getSelectedVoice(selectedCharacter.voice_id)?.description)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No voice assigned</p>
                      )}
                    </div>
                  </div>

                  {/* Personality */}
                  {selectedCharacter.personality && (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Personality</label>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {safeRender(selectedCharacter.personality)}
                      </p>
                    </div>
                  )}

                  {/* System Prompt */}
                  {selectedCharacter.system_prompt && (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>System Prompt</label>
                      <pre className="text-xs p-3 rounded mt-1 overflow-auto max-h-32" style={{ 
                        backgroundColor: 'var(--color-surface-dark)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {safeRender(selectedCharacter.system_prompt)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-text-muted)' + '20' }}>
                    <svg className="w-8 h-8" fill="currentColor" style={{ color: 'var(--color-text-muted)' }} viewBox="0 0 24 24">
                      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V3.5C15 2.7 14.3 2 13.5 2S12 2.7 12 3.5V6.5L6 7V9C6 10.1 6.9 11 8 11H9L9.5 17C9.6 17.6 10.1 18 10.7 18H13.3C13.9 18 14.4 17.6 14.5 17L15 11H16C17.1 11 18 10.1 18 9Z"/>
                    </svg>
                  </div>
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    Click on a character to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Character Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl" style={{ 
            backgroundColor: 'var(--color-secondary-dark)', 
            borderColor: 'var(--color-border-medium)',
            border: '1px solid'
          }}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Create New Character
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-2xl hover:opacity-70"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={createCharacter} className="space-y-6">
                {/* Character Name */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Character Name *
                  </label>
                  <input
                    type="text"
                    value={newCharacter.name}
                    onChange={(e) => setNewCharacter({...newCharacter, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      borderColor: 'var(--color-border-medium)',
                      color: 'var(--color-text-primary)'
                    }}
                    placeholder="Enter character name..."
                    required
                  />
                </div>

                {/* ElevenLabs Voice Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    ElevenLabs Voice *
                  </label>
                  <select
                    value={newCharacter.voice_id}
                    onChange={(e) => setNewCharacter({...newCharacter, voice_id: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      borderColor: 'var(--color-border-medium)',
                      color: 'var(--color-text-primary)'
                    }}
                    required
                  >
                    <option value="">Select a voice...</option>
                    {voices.map(voice => (
                      <option key={voice.id} value={voice.voice_id}>
                        {voice.name} {voice.gender ? `(${voice.gender})` : ''} {voice.accent ? `- ${voice.accent}` : ''}
                      </option>
                    ))}
                  </select>
                  {newCharacter.voice_id && (
                    <div className="mt-2 p-3 rounded" style={{ backgroundColor: 'var(--color-surface-dark)' }}>
                      {(() => {
                        const selectedVoice = getSelectedVoice(newCharacter.voice_id);
                        return selectedVoice ? (
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                              {selectedVoice.name}
                            </p>
                            {selectedVoice.description && (
                              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                {safeRender(selectedVoice.description)}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {selectedVoice.gender && <span>Gender: {selectedVoice.gender}</span>}
                              {selectedVoice.accent && <span>Accent: {selectedVoice.accent}</span>}
                              {selectedVoice.age && <span>Age: {selectedVoice.age}</span>}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Description
                  </label>
                  <textarea
                    value={newCharacter.description}
                    onChange={(e) => setNewCharacter({...newCharacter, description: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      borderColor: 'var(--color-border-medium)',
                      color: 'var(--color-text-primary)'
                    }}
                    placeholder="Brief description of your character..."
                  />
                </div>

                {/* Personality */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    Personality Traits
                  </label>
                  <textarea
                    value={newCharacter.personality}
                    onChange={(e) => setNewCharacter({...newCharacter, personality: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      borderColor: 'var(--color-border-medium)',
                      color: 'var(--color-text-primary)'
                    }}
                    placeholder="Describe the character's personality, mannerisms, speaking style..."
                  />
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    System Prompt
                  </label>
                  <textarea
                    value={newCharacter.system_prompt}
                    onChange={(e) => setNewCharacter({...newCharacter, system_prompt: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border text-sm font-mono"
                    style={{ 
                      backgroundColor: 'var(--color-surface-dark)',
                      borderColor: 'var(--color-border-medium)',
                      color: 'var(--color-text-primary)'
                    }}
                    placeholder="System prompt that defines how the AI should behave as this character..."
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={newCharacter.is_active}
                    onChange={(e) => setNewCharacter({...newCharacter, is_active: e.target.checked})}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Make character active immediately
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-4 border-t" style={{ borderColor: 'var(--color-border-dark)' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 rounded-lg font-medium hover:opacity-90"
                    style={{ 
                      backgroundColor: 'var(--color-text-muted)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                    style={{ 
                      backgroundColor: 'var(--color-accent-purple)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {isCreating ? 'Creating...' : 'Create Character'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
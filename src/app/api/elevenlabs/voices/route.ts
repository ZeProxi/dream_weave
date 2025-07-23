import { NextRequest, NextResponse } from 'next/server';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  samples?: any[];
  category: string;
  description?: string;
  preview_url?: string;
  labels?: any;
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

interface ElevenLabsResponse {
  voices: ElevenLabsVoice[];
  has_more: boolean;
  total_count: number;
  next_page_token?: string;
}

export async function GET(request: NextRequest) {
  console.log('🎙️ ElevenLabs API route called');

  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ElevenLabs API key not found in environment variables');
    return NextResponse.json(
      { error: 'ElevenLabs API key not configured' }, 
      { status: 500 }
    );
  }

  try {
    let allVoices: ElevenLabsVoice[] = [];
    let nextPageToken: string | undefined = undefined;

    console.log('🔄 Starting to fetch voices from ElevenLabs API...');

    // Fetch all pages of voices
    do {
      const params = new URLSearchParams({
        page_size: '100',
        include_total_count: 'true'
      });

      if (nextPageToken) {
        params.append('next_page_token', nextPageToken);
      }

      console.log('📄 Fetching page:', { page: nextPageToken || 'first' });

      const response = await fetch(`https://api.elevenlabs.io/v2/voices?${params}`, {
        headers: {
          'xi-api-key': apiKey
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Invalid ElevenLabs API key');
          return NextResponse.json(
            { error: 'Invalid ElevenLabs API key' }, 
            { status: 401 }
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ElevenLabsResponse = await response.json();
      allVoices = [...allVoices, ...data.voices];
      nextPageToken = data.next_page_token;

      console.log('📊 Fetched page:', {
        page_voices: data.voices.length,
        total_so_far: allVoices.length,
        has_more: data.has_more
      });

    } while (nextPageToken);

    console.log('✅ All ElevenLabs voices fetched:', allVoices.length);

    // Calculate stats
    const stats = {
      total: allVoices.length,
      premade: allVoices.filter(v => v.category === 'premade').length,
      cloned: allVoices.filter(v => v.category === 'cloned').length,
      generated: allVoices.filter(v => v.category === 'generated').length,
      professional: allVoices.filter(v => v.category === 'professional').length
    };

    return NextResponse.json({
      voices: allVoices,
      stats: stats,
      success: true
    });

  } catch (error: any) {
    console.error('❌ Error fetching ElevenLabs voices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch voices from ElevenLabs', 
        details: error?.message || String(error) 
      }, 
      { status: 500 }
    );
  }
} 
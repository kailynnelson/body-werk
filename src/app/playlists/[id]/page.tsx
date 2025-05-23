'use client';

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SpotifyTrack {
  track: {
    id: string;
    name: string;
    uri: string;
    preview_url: string | null;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
  } | null;
}

interface TrackWithPlayState extends SpotifyTrack {
  isPlaying?: boolean;
}

interface PlaylistDetails {
  name: string;
  images: Array<{ url: string }>;
}

// Utility function for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Batch size for track fetching
const BATCH_SIZE = 20;
const RATE_LIMIT_DELAY = 1000;

export default function PlaylistPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tracks, setTracks] = useState<TrackWithPlayState[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const fetchInProgress = useRef(false);

  // Rate-limited fetch function
  const rateLimitedFetch = async (url: string, options: RequestInit) => {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = (parseInt(retryAfter || '1') + 1) * 1000;
      console.log(`Rate limited. Waiting ${delayMs}ms before retry...`);
      await delay(delayMs);
      return rateLimitedFetch(url, options);
    }
    
    return response;
  };

  const handlePlayPreview = useCallback((trackId: string, previewUrl: string | null) => {
    if (!previewUrl) {
      console.log('No preview URL available for this track');
      return;
    }

    if (currentlyPlaying === trackId) {
      audioRef.current?.pause();
      setCurrentlyPlaying(null);
      setTracks(tracks => tracks.map(track => ({
        ...track,
        isPlaying: false
      })));
    } else {
      if (audioRef.current) {
        audioRef.current.src = previewUrl;
        audioRef.current.play();
      }
      setCurrentlyPlaying(trackId);
      setTracks(tracks => tracks.map(track => ({
        ...track,
        isPlaying: track.track?.id === trackId
      })));
    }
  }, [currentlyPlaying]);

  useEffect(() => {
    async function fetchPlaylistData() {
      if (!session?.accessToken || !id || fetchInProgress.current) {
        return;
      }

      try {
        fetchInProgress.current = true;
        const response = await rateLimitedFetch(`https://api.spotify.com/v1/playlists/${id}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch playlist: ${response.status}`);
        }

        const data = await response.json();
        setPlaylist(data);
        setProgress({ current: 0, total: data.tracks.total });
        
        // Fetch tracks in batches
        const allTracks = [];
        let offset = 0;
        
        while (offset < data.tracks.total) {
          const tracksResponse = await rateLimitedFetch(
            `https://api.spotify.com/v1/playlists/${id}/tracks?offset=${offset}&limit=${BATCH_SIZE}`,
            {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }
          );

          if (!tracksResponse.ok) {
            throw new Error(`Failed to fetch tracks: ${tracksResponse.status}`);
          }

          const batch = await tracksResponse.json();
          const validTracks = batch.items
            .filter((item: SpotifyTrack): item is SpotifyTrack => item?.track?.id != null);
          
          console.log(`Fetched batch ${offset}-${offset + validTracks.length}:`, {
            total: batch.items.length,
            valid: validTracks.length,
            withPreviews: validTracks.filter((t: SpotifyTrack) => t.track?.preview_url).length
          });

          allTracks.push(...validTracks.map((track: SpotifyTrack) => ({
            ...track,
            isPlaying: false
          })));
          
          offset += BATCH_SIZE;
          setProgress({ current: allTracks.length, total: data.tracks.total });
          
          await delay(RATE_LIMIT_DELAY);
        }

        setTracks(allTracks);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load playlist data");
      } finally {
        fetchInProgress.current = false;
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchPlaylistData();
    } else if (status === "unauthenticated") {
      setError("Please sign in to view playlists");
      setLoading(false);
    }
  }, [session, id, status]);

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => {
      setCurrentlyPlaying(null);
      setTracks(tracks => tracks.map(track => ({
        ...track,
        isPlaying: false
      })));
    };

    audio?.addEventListener('ended', handleEnded);
    return () => audio?.removeEventListener('ended', handleEnded);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold animate-pulse">Loading playlist...</h1>
        <div className="text-sm text-white/70">
          Loaded {progress.current} of {progress.total} tracks
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        {status === "authenticated" && (
          <button
            onClick={() => window.location.reload()}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <audio ref={audioRef} />
      
      {/* Playlist Header */}
      <div className="flex items-center gap-6">
        {playlist?.images?.[0] && (
          <img 
            src={playlist.images[0].url} 
            alt={playlist.name}
            className="w-32 h-32 rounded-lg shadow-lg"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold mb-2">{playlist?.name}</h1>
          <p className="text-white/70">{tracks.length} tracks</p>
        </div>
      </div>

      {/* Track List */}
      <div className="space-y-2">
        {tracks.map((item, index) => {
          if (!item.track) return null;
          return (
            <div
              key={item.track.id}
              className="group flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="w-12 text-center text-white/50">{index + 1}</div>
              
              {item.track.album.images[0] && (
                <img
                  src={item.track.album.images[0].url}
                  alt={item.track.album.name}
                  className="w-12 h-12 rounded shadow"
                />
              )}
              
              <div className="flex-grow min-w-0">
                <div className="font-medium truncate">{item.track.name}</div>
                <div className="text-sm text-white/70 truncate">
                  {item.track.artists.map(a => a.name).join(', ')}
                </div>
              </div>

              {item.track.preview_url && (
                <button
                  onClick={() => handlePlayPreview(item.track.id, item.track.preview_url)}
                  className={`p-2 rounded-full ${
                    item.isPlaying
                      ? 'bg-green-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {item.isPlaying ? '⏸' : '▶'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 
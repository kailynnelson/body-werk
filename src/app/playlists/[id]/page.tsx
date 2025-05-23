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

interface TrackWithDanceability extends SpotifyTrack {
  danceability: number;
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
  const [tracks, setTracks] = useState<TrackWithDanceability[]>([]);
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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

  async function fetchTrackAudioFeatures(trackId: string, accessToken: string) {
    const response = await rateLimitedFetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch audio features for track ${trackId}: ${response.status}`);
      return null;
    }

    return response.json();
  }

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
        const tracks = [];
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
          const validTracks = batch.items.filter((item: SpotifyTrack) => item?.track?.id);
          
          console.log(`Fetched batch ${offset}-${offset + validTracks.length}:`, {
            total: batch.items.length,
            valid: validTracks.length,
            withPreviews: validTracks.filter((t: SpotifyTrack) => t.track?.preview_url).length
          });

          tracks.push(...validTracks);
          offset += BATCH_SIZE;
          setProgress({ current: tracks.length, total: data.tracks.total });
          
          await delay(RATE_LIMIT_DELAY);
        }

        // Fetch audio features one by one
        const tracksWithFeatures = [];
        for (const track of tracks) {
          if (!track.track?.id) continue;

          const features = await fetchTrackAudioFeatures(track.track.id, session.accessToken);
          tracksWithFeatures.push({
            ...track,
            danceability: features?.danceability || 0,
            isPlaying: false
          });

          // Update progress to show audio features fetching
          setProgress({ 
            current: tracksWithFeatures.length, 
            total: tracks.length 
          });

          await delay(RATE_LIMIT_DELAY); // Rate limiting between requests
        }

        setTracks(tracksWithFeatures);
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

  const handleCreateSortedPlaylist = async () => {
    if (!session?.accessToken || !tracks.length) return;

    setCreating(true);
    try {
      // Sort tracks by danceability
      const sortedTracks = [...tracks].sort((a, b) => b.danceability - a.danceability);

      // Create new playlist
      const createResponse = await fetch(`https://api.spotify.com/v1/users/${session.user?.id}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${playlist?.name || 'Playlist'} - Sorted by Danceability`,
          description: "Created by Body Werk - Tracks sorted by danceability score",
          public: false,
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create playlist: ${createResponse.status}`);
      }

      const newPlaylist = await createResponse.json();

      // Add sorted tracks to new playlist
      const trackUris = sortedTracks
        .map((track) => track.track?.uri)
        .filter((uri): uri is string => uri !== undefined && uri !== null);

      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: trackUris,
        }),
      });

      if (!addTracksResponse.ok) {
        throw new Error(`Failed to add tracks: ${addTracksResponse.status}`);
      }

      // Navigate to the new playlist
      router.push(`/playlists/${newPlaylist.id}`);
    } catch (error) {
      console.error("Error creating sorted playlist:", error);
      setError("Failed to create sorted playlist");
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="space-y-4 text-center">
          <div className="animate-pulse text-xl">Loading playlist...</div>
          {progress.total > 0 && (
            <div className="text-sm text-white/70">
              Loaded {progress.current} of {progress.total} tracks
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24 space-y-4">
        <div className="text-red-500">{error}</div>
        <Link
          href="/"
          className="px-6 py-3 rounded-full border border-white/20 hover:border-pink-500/30 text-white transition-all duration-300 backdrop-blur-sm"
        >
          Back to Search
        </Link>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <audio ref={audioRef} />
      <div className="w-full max-w-6xl space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          {playlist?.images?.[0] && (
            <img
              src={playlist.images[0].url}
              alt={playlist.name}
              className="w-32 h-32 rounded-lg shadow-lg"
            />
          )}
          <h1 className="text-4xl font-bold">{playlist?.name}</h1>
          <p className="text-xl text-white/70">
            {tracks.length} tracks
            <span className="text-sm ml-2 text-white/50">
              ({tracks.filter(t => t.track?.preview_url).length} with previews)
            </span>
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-full border border-white/20 hover:border-pink-500/30 text-white transition-all duration-300 backdrop-blur-sm"
          >
            Back to Search
          </Link>
          <button
            onClick={handleCreateSortedPlaylist}
            disabled={creating || tracks.length === 0}
            className="bg-pink-500 hover:bg-pink-600 disabled:bg-pink-800 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg hover:shadow-pink-500/20"
          >
            {creating ? (
              <>
                <span className="animate-spin inline-block mr-2">⭮</span>
                Creating...
              </>
            ) : (
              'Create Sorted Playlist'
            )}
          </button>
        </div>

        <div className="space-y-4">
          {tracks.map((item, index) => {
            const danceabilityPercentage = (item.danceability * 100).toFixed(0);
            const track = item.track;
            
            if (!track) return null;
            
            return (
              <div
                key={track.id || `track-${index}`}
                className="group bg-white/5 hover:bg-white/10 p-4 rounded-lg flex items-center justify-between transition-all duration-300 border border-white/10 hover:border-pink-500/30"
              >
                <div className="flex items-center flex-grow">
                  <div className="w-12 flex items-center justify-center">
                    {track.preview_url ? (
                      <button
                        onClick={() => handlePlayPreview(track.id, track.preview_url)}
                        className="text-2xl text-white/70 hover:text-pink-500 transition-colors"
                        title="Play preview"
                      >
                        {item.isPlaying ? '⏸' : '▶️'}
                      </button>
                    ) : (
                      <span className="text-white/30 text-sm" title="No preview available">♪</span>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-white group-hover:text-white/90 transition-colors">
                      {track.name || 'Unknown Track'}
                    </h3>
                    <p className="text-white/70">
                      {track.artists?.map((artist) => artist.name).join(", ") || 'Unknown Artist'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-pink-500">
                      {danceabilityPercentage}%
                    </div>
                    <div className="text-sm text-white/70">
                      Danceability
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
} 
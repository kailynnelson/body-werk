'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface SpotifyPlaylist {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  tracks: {
    total: number;
  };
  owner: {
    display_name: string;
  };
}

const PLAYLISTS_PER_PAGE = 21;

export default function PlaylistList() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PLAYLISTS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPlaylists() {
      if (!session?.accessToken) {
        console.log('No access token available, session:', session);
        setError('No access token available. Please try logging in again.');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching playlists with token:', session.accessToken.slice(-10));
        const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('Playlist fetch failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(`Failed to fetch playlists: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Fetched initial ${data.items.length} playlists`);
        
        let allPlaylists = [...data.items];
        let nextUrl = data.next;
        
        while (nextUrl) {
          console.log('Fetching next page:', nextUrl);
          const nextResponse = await fetch(nextUrl, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          });
          
          if (!nextResponse.ok) {
            console.error('Failed to fetch additional page:', nextResponse.status);
            throw new Error('Failed to fetch additional playlists');
          }
          
          const nextData = await nextResponse.json();
          console.log(`Fetched additional ${nextData.items.length} playlists`);
          allPlaylists = [...allPlaylists, ...nextData.items];
          nextUrl = nextData.next;
        }

        console.log(`Total playlists fetched: ${allPlaylists.length}`);
        setPlaylists(allPlaylists);
        setError(null);
      } catch (err) {
        console.error('Error in fetchPlaylists:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch playlists');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated' && session?.accessToken) {
      console.log('Session authenticated, starting fetch...');
      setLoading(true);
      fetchPlaylists();
    } else if (status === 'unauthenticated') {
      setLoading(false);
      setError('Please log in to view your playlists');
    }
  }, [session, status]);

  // Reset visible count when search query changes
  useEffect(() => {
    setVisibleCount(PLAYLISTS_PER_PAGE);
  }, [searchQuery]);

  // Set up intersection observer for infinite scrolling
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPlaylistRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + PLAYLISTS_PER_PAGE);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading]);

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visiblePlaylists = filteredPlaylists.slice(0, visibleCount);
  const hasMore = visiblePlaylists.length < filteredPlaylists.length;

  const handlePlaylistClick = (playlistId: string) => {
    router.push(`/playlists/${playlistId}`);
  };

  if (loading) {
    return <div className="text-center animate-pulse">Loading your playlists...</div>;
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        {status === 'authenticated' && (
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
      <div className="relative max-w-md mx-auto">
        <input
          type="text"
          placeholder="Search playlists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-6 py-3 bg-white/10 backdrop-blur-md rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-white placeholder-white/70 border border-white/20 hover:border-pink-500/30 transition-all duration-300"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-pink-300 transition-colors duration-300"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visiblePlaylists.map((playlist, index) => (
          <div
            key={playlist.id}
            ref={index === visiblePlaylists.length - 1 ? lastPlaylistRef : null}
            onClick={() => handlePlaylistClick(playlist.id)}
            className="playlist-card bg-white/10 backdrop-blur-md rounded-lg p-4 hover:bg-white/15 transition-all duration-300 cursor-pointer border border-white/20 hover:border-pink-500/30 shadow-lg hover:shadow-pink-500/20"
          >
            {playlist.images?.length > 0 && (
              <Image
                src={playlist.images[0].url}
                alt={`${playlist.name} cover`}
                width={400}
                height={400}
                className="w-full h-48 object-cover rounded-md mb-4 hover:scale-[1.02] transition-transform duration-300 shadow-md"
              />
            )}
            <h3 className="text-lg font-semibold mb-2 text-white">{playlist.name || 'Untitled Playlist'}</h3>
            <div className="text-white/80">
              <p>{playlist.tracks?.total || 0} tracks</p>
              <p className="text-sm">By {playlist.owner?.display_name || 'Unknown'}</p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div 
          ref={loadMoreRef}
          className="text-center py-4"
        >
          <div className="animate-pulse text-white/70">Loading more playlists...</div>
        </div>
      )}

      {filteredPlaylists.length === 0 && searchQuery && (
        <p className="text-center text-white/70">
          No playlists found matching "{searchQuery}"
        </p>
      )}

      {filteredPlaylists.length === 0 && !searchQuery && (
        <p className="text-center text-white/70">
          No playlists found. Try refreshing the page.
        </p>
      )}
    </div>
  );
} 
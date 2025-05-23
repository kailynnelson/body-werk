'use client';

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getUserPlaylists } from "@/utils/spotify";
import Link from "next/link";

interface Playlist {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
}

export default function Playlists() {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlaylists() {
      if (session?.accessToken) {
        try {
          const userPlaylists = await getUserPlaylists(session.accessToken);
          setPlaylists(userPlaylists);
        } catch (error) {
          console.error("Error fetching playlists:", error);
        }
        setLoading(false);
      }
    }

    fetchPlaylists();
  }, [session]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Playlists</h1>
        <Link
          href="/"
          className="text-zinc-400 hover:text-white transition-colors"
        >
          Back to Home
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists.map((playlist) => (
          <Link
            key={playlist.id}
            href={`/playlists/${playlist.id}`}
            className="bg-zinc-800 rounded-lg p-4 hover:bg-zinc-700 transition-colors"
          >
            {playlist.images[0] && (
              <img
                src={playlist.images[0].url}
                alt={playlist.name}
                className="w-full aspect-square object-cover rounded-md mb-4"
              />
            )}
            <h2 className="text-lg font-semibold mb-2">{playlist.name}</h2>
            <p className="text-zinc-400">
              {playlist.tracks.total} tracks
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
} 
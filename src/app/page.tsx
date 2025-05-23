'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import PlaylistList from './components/PlaylistList';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to Body Werk</h1>
      <p className="text-xl mb-8">Sort your Spotify playlists by danceability</p>
      
      {status === 'loading' && (
        <div className="animate-pulse">Loading...</div>
      )}
      
      {status === 'unauthenticated' && (
        <button
          onClick={() => signIn('spotify')}
          className="bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 transition"
        >
          Login with Spotify
        </button>
      )}
      
      {status === 'authenticated' && session?.user && (
        <div className="w-full max-w-6xl">
          <div className="flex flex-col items-center gap-4 mb-8">
            <p className="text-green-500">✓ Connected as {session.user.name}</p>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
          <PlaylistList />
        </div>
      )}
    </main>
  );
}

'use client';

import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

export default function SignIn() {
  useEffect(() => {
    // Automatically trigger Spotify sign in
    signIn('spotify', { callbackUrl: '/' });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="animate-pulse">Redirecting to Spotify...</div>
    </div>
  );
} 
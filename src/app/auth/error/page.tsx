'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8 text-red-500">Authentication Error</h1>
      <p className="text-xl mb-8">{error || 'An error occurred during authentication'}</p>
      <Link 
        href="/"
        className="bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 transition"
      >
        Return Home
      </Link>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">Loading...</h1>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
} 
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Markets Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="ascii-box p-8 max-w-lg text-center">
        <h2 className="text-lg font-bold mb-2 text-[hsl(var(--error))]">[MARKETS ERROR]</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          {error.message || 'Failed to load markets'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="text-sm px-4 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
          >
            RETRY
          </button>
          <Link
            href="/"
            className="text-sm px-4 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] transition-colors"
          >
            HOME
          </Link>
        </div>
      </div>
    </div>
  );
}

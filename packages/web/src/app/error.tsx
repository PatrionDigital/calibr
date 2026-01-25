'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="ascii-box p-8 max-w-lg text-center">
        <pre className="text-[hsl(var(--error))] text-xs mb-4">
{`
 ███████╗██████╗ ██████╗  ██████╗ ██████╗
 ██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
 █████╗  ██████╔╝██████╔╝██║   ██║██████╔╝
 ██╔══╝  ██╔══██╗██╔══██╗██║   ██║██╔══██╗
 ███████╗██║  ██║██║  ██║╚██████╔╝██║  ██║
 ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
`}
        </pre>
        <h2 className="text-lg font-bold mb-2 text-[hsl(var(--error))]">[SYSTEM ERROR]</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="text-sm px-4 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
        >
          RETRY
        </button>
      </div>
    </div>
  );
}

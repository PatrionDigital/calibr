'use client';

import { useEffect } from 'react';

export default function ForecastsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Forecasts page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="ascii-box p-8 max-w-md w-full text-center">
        <h2 className="text-lg font-bold text-[hsl(var(--error))] mb-4">
          [FORECAST ERROR]
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          {error.message || 'Something went wrong loading forecasts'}
        </p>
        <button
          onClick={reset}
          className="text-sm px-4 py-2 border border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}

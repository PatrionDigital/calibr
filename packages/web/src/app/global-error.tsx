'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="font-mono bg-black text-green-500">
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="border border-red-500 p-8 max-w-lg text-center">
            <h2 className="text-lg font-bold mb-2 text-red-500">[CRITICAL ERROR]</h2>
            <p className="text-sm text-gray-400 mb-4">
              {error.message || 'A critical error occurred'}
            </p>
            <button
              onClick={reset}
              className="text-sm px-4 py-2 border border-green-500 text-green-500 hover:bg-green-500 hover:text-black transition-colors"
            >
              RETRY
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

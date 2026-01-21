import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <pre className="text-[hsl(var(--primary))] text-sm mb-8 terminal-glow">
          {`
 ██████╗ █████╗ ██╗     ██╗██████╗ ██████╗    ██╗  ██╗   ██╗
██╔════╝██╔══██╗██║     ██║██╔══██╗██╔══██╗   ██║  ╚██╗ ██╔╝
██║     ███████║██║     ██║██████╔╝██████╔╝   ██║   ╚████╔╝
██║     ██╔══██║██║     ██║██╔══██╗██╔══██╗   ██║    ╚██╔╝
╚██████╗██║  ██║███████╗██║██████╔╝██║  ██║██╗███████╗██║
 ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝
          `}
        </pre>
        <h1 className="text-2xl mb-4 terminal-glow">Prediction Market Portfolio Manager</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">
          Aggregate, analyze, and optimize your forecasting performance.
        </p>

        <div className="ascii-box p-4 mb-8">
          <p className="text-sm mb-2">{">"} System initializing...</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 1 complete: Monorepo structure</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 2 complete: Polymarket Data Integration</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{">"} Phase 3 pending: Smart Contracts</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold">[NAVIGATION]</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/markets"
              className="ascii-box p-4 hover:border-[hsl(var(--primary))] transition-colors block"
            >
              <div className="text-[hsl(var(--primary))] font-bold mb-1">MARKETS DASHBOARD</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                View aggregated prediction markets, sync status, and live prices
              </div>
            </Link>
            <div className="ascii-box p-4 opacity-50">
              <div className="font-bold mb-1 text-[hsl(var(--muted-foreground))]">PORTFOLIO</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Coming soon - Track your positions across platforms
              </div>
            </div>
            <div className="ascii-box p-4 opacity-50">
              <div className="font-bold mb-1 text-[hsl(var(--muted-foreground))]">FORECASTS</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Coming soon - Journal your predictions and track calibration
              </div>
            </div>
            <div className="ascii-box p-4 opacity-50">
              <div className="font-bold mb-1 text-[hsl(var(--muted-foreground))]">IDENTITY</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Coming soon - EAS attestations and on-chain identity
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-[hsl(var(--muted-foreground))]">
          <p>Built on Base L2 with Polymarket integration via Polygon</p>
        </div>
      </div>
    </main>
  );
}

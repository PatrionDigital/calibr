import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <pre className="text-[hsl(var(--primary))] text-xs mb-8 terminal-glow">
          {`
 ██████╗ █████╗ ██╗     ██╗██████╗ ██████╗    ██╗  ██╗██╗   ██╗███████╗
██╔════╝██╔══██╗██║     ██║██╔══██╗██╔══██╗   ╚██╗██╔╝╚██╗ ██╔╝╚══███╔╝
██║     ███████║██║     ██║██████╔╝██████╔╝    ╚███╔╝  ╚████╔╝   ███╔╝
██║     ██╔══██║██║     ██║██╔══██╗██╔══██╗    ██╔██╗   ╚██╔╝   ███╔╝
╚██████╗██║  ██║███████╗██║██████╔╝██║  ██║██╗██╔╝ ██╗   ██║   ███████╗
 ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
          `}
        </pre>
        <h1 className="text-2xl mb-4 terminal-glow">Prediction Market Portfolio Manager</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">
          Aggregate, analyze, and optimize your forecasting performance.
        </p>

        <div className="ascii-box p-4 mb-8">
          <p className="text-sm mb-2">{">"} System initializing...</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 1 complete: Monorepo structure</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 2 complete: Limitless Data Integration</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 2.5 complete: Multi-outcome market support</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 2.6 complete: Opinion, Predict.fun, Manifold adapters</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 3 complete: Portfolio dashboard live</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 4 complete: Kelly Criterion, Forecasts, Privacy Settings</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 2.7 complete: Category/platform filters + platform badges</p>
          <p className="text-sm mb-2 text-[hsl(var(--success))]">{">"} Phase 5 complete: Cross-chain execution infrastructure</p>
          <p className="text-sm text-[hsl(var(--warning))]">{">"} Phase 6 in progress: Superforecaster leaderboard system</p>
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
            <Link
              href="/portfolio"
              className="ascii-box p-4 hover:border-[hsl(var(--primary))] transition-colors block"
            >
              <div className="text-[hsl(var(--primary))] font-bold mb-1">PORTFOLIO</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Track your positions across platforms, view P&L
              </div>
            </Link>
            <Link
              href="/forecasts"
              className="ascii-box p-4 hover:border-[hsl(var(--primary))] transition-colors block"
            >
              <div className="text-[hsl(var(--primary))] font-bold mb-1">FORECAST JOURNAL</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Record predictions, track calibration, Kelly recommendations
              </div>
            </Link>
            <Link
              href="/settings"
              className="ascii-box p-4 hover:border-[hsl(var(--primary))] transition-colors block"
            >
              <div className="text-[hsl(var(--primary))] font-bold mb-1">SETTINGS</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Privacy, Kelly config, attestation modes, account
              </div>
            </Link>
            <Link
              href="/leaderboard"
              className="ascii-box p-4 hover:border-[hsl(var(--primary))] transition-colors block"
            >
              <div className="text-[hsl(var(--primary))] font-bold mb-1">LEADERBOARD</div>
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                Superforecaster rankings, tier progression, achievements
              </div>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-xs text-[hsl(var(--muted-foreground))]">
          <p className="mb-1">Supported platforms: Polymarket, Limitless, Opinion, Predict.fun, Manifold</p>
          <p>Built on Base L2 with cross-chain integrations (Polygon, BNB, Blast)</p>
        </div>
      </div>
    </main>
  );
}

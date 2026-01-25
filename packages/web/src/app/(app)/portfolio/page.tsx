'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, type PortfolioSummary, type PortfolioPosition, type AlertsResponse, type ResolutionAlert, type WalletScanResponse } from '@/lib/api';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<WalletScanResponse | null>(null);

  const fetchPortfolio = useCallback(async (wallet: string) => {
    if (!wallet) return;

    try {
      setIsLoading(true);
      setError(null);
      const [portfolioData, alertsData] = await Promise.all([
        api.getPortfolioSummary({ wallet }),
        api.getAlerts({ wallet, days: 30 }).catch(() => null),
      ]);
      setPortfolio(portfolioData);
      setAlerts(alertsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
      setPortfolio(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConnectWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;

    try {
      setIsConnecting(true);
      setError(null);
      const { wallet } = await api.connectWallet(walletAddress);
      setConnectedWallet(wallet.address);
      await fetchPortfolio(wallet.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('calibr_wallet');
    if (savedWallet) {
      setConnectedWallet(savedWallet);
      setWalletAddress(savedWallet);
      fetchPortfolio(savedWallet);
    } else {
      setIsLoading(false);
    }
  }, [fetchPortfolio]);

  // Save wallet to localStorage when connected
  useEffect(() => {
    if (connectedWallet) {
      localStorage.setItem('calibr_wallet', connectedWallet);
    }
  }, [connectedWallet]);

  const handleDisconnect = () => {
    localStorage.removeItem('calibr_wallet');
    setConnectedWallet(null);
    setWalletAddress('');
    setPortfolio(null);
    setScanResult(null);
  };

  const handleScanWallet = async () => {
    if (!connectedWallet) return;

    try {
      setIsScanning(true);
      setError(null);
      setScanResult(null);

      const result = await api.scanWallet(connectedWallet, {
        platforms: ['LIMITLESS'],
        importPositions: true,
      });

      setScanResult(result);

      // Refresh portfolio after import
      if (result.import && result.import.imported > 0) {
        await fetchPortfolio(connectedWallet);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan wallet');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/"
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] text-sm"
            >
              &larr; HOME
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold terminal-glow mb-2">
              CALIBR.XYZ // PORTFOLIO DASHBOARD
            </h1>
            <Link
              href="/portfolio/analytics"
              className="text-sm px-3 py-1 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
            >
              VIEW ANALYTICS
            </Link>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Track your positions across prediction markets
          </p>
        </header>

        {/* Wallet Connection */}
        {!connectedWallet ? (
          <div className="ascii-box p-6 max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">[CONNECT WALLET]</h2>
            <form onSubmit={handleConnectWallet} className="space-y-4">
              <div>
                <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
                  WALLET ADDRESS
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isConnecting || !walletAddress}
                className="w-full text-sm px-4 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
              </button>
            </form>
            <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">
              Enter your wallet address to view your positions. No signature required for read-only access.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connected Wallet Info */}
            <div className="flex items-center justify-between ascii-box p-4">
              <div>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">CONNECTED:</span>
                <span className="ml-2 font-mono text-sm">
                  {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleScanWallet}
                  disabled={isScanning}
                  className="text-xs px-3 py-1 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors disabled:opacity-50"
                >
                  {isScanning ? 'SCANNING...' : 'SCAN ON-CHAIN'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="text-xs px-2 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))] transition-colors"
                >
                  DISCONNECT
                </button>
              </div>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div className={`ascii-box p-4 ${scanResult.scan.errors.length > 0 ? 'border-[hsl(var(--warning))]' : 'border-[hsl(var(--success))]'}`}>
                <h3 className="text-sm font-bold mb-2">
                  [SCAN COMPLETE]
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center mb-3">
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">POSITIONS FOUND</div>
                    <div className="text-lg font-bold text-[hsl(var(--primary))]">
                      {scanResult.scan.positionsFound}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">TOTAL VALUE</div>
                    <div className="text-lg font-bold">
                      ${scanResult.scan.totalValue.toFixed(2)}
                    </div>
                  </div>
                  {scanResult.import && (
                    <div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">IMPORTED</div>
                      <div className="text-lg font-bold text-[hsl(var(--success))]">
                        {scanResult.import.imported}
                      </div>
                    </div>
                  )}
                </div>

                {scanResult.positions.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {scanResult.positions.map((pos, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{pos.marketQuestion}</div>
                          <div className="text-[hsl(var(--muted-foreground))]">
                            {pos.outcomeLabel} • {pos.balanceFormatted.toFixed(2)} shares
                          </div>
                        </div>
                        {pos.currentPrice !== undefined && (
                          <div className="text-right ml-2">
                            <div className="font-mono">${(pos.balanceFormatted * pos.currentPrice).toFixed(2)}</div>
                            <div className="text-[hsl(var(--muted-foreground))]">@ ${pos.currentPrice.toFixed(3)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {scanResult.scan.errors.length > 0 && (
                  <div className="mt-3 text-xs text-[hsl(var(--warning))]">
                    {scanResult.scan.errors.length} error(s) during scan
                  </div>
                )}

                <button
                  onClick={() => setScanResult(null)}
                  className="mt-3 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  DISMISS
                </button>
              </div>
            )}

            {error && (
              <div className="ascii-box p-4 border-[hsl(var(--error))]">
                <span className="text-[hsl(var(--error))]">[ERROR]</span> {error}
              </div>
            )}

            {isLoading ? (
              <div className="ascii-box p-8 text-center">
                <div className="terminal-glow cursor-blink">LOADING PORTFOLIO</div>
              </div>
            ) : portfolio ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard
                    label="TOTAL VALUE"
                    value={`$${portfolio.totalValue.toFixed(2)}`}
                    variant="default"
                  />
                  <SummaryCard
                    label="TOTAL COST"
                    value={`$${portfolio.totalCost.toFixed(2)}`}
                    variant="muted"
                  />
                  <SummaryCard
                    label="UNREALIZED P&L"
                    value={`${portfolio.unrealizedPnl >= 0 ? '+' : ''}$${portfolio.unrealizedPnl.toFixed(2)}`}
                    subValue={`${portfolio.unrealizedPnlPct >= 0 ? '+' : ''}${portfolio.unrealizedPnlPct.toFixed(1)}%`}
                    variant={portfolio.unrealizedPnl >= 0 ? 'bullish' : 'bearish'}
                  />
                  <SummaryCard
                    label="POSITIONS"
                    value={String(portfolio.positionCount)}
                    variant="default"
                  />
                </div>

                {/* Resolution Alerts */}
                {alerts && alerts.count > 0 && showAlerts && (
                  <div className="ascii-box p-4 border-[hsl(var(--warning))]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-[hsl(var(--warning))]">
                        [RESOLUTION ALERTS] - {alerts.count} market{alerts.count !== 1 ? 's' : ''} resolved
                      </h3>
                      <button
                        onClick={() => setShowAlerts(false)}
                        className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      >
                        DISMISS
                      </button>
                    </div>

                    {/* Alert Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                      <div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">WINS</div>
                        <div className="text-lg font-bold text-[hsl(var(--bullish))]">{alerts.wins}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">LOSSES</div>
                        <div className="text-lg font-bold text-[hsl(var(--bearish))]">{alerts.losses}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))]">REALIZED P&L</div>
                        <div className={`text-lg font-bold ${alerts.totalRealizedPnl >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}`}>
                          {alerts.totalRealizedPnl >= 0 ? '+' : ''}${alerts.totalRealizedPnl.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Individual Alerts */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {alerts.alerts.map((alert) => (
                        <AlertRow key={alert.id} alert={alert} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Platform Breakdown */}
                {Object.keys(portfolio.byPlatform).length > 0 && (
                  <div className="ascii-box p-4">
                    <h3 className="text-sm font-bold mb-3">[BY PLATFORM]</h3>
                    <div className="space-y-2">
                      {Object.entries(portfolio.byPlatform).map(([platform, data]) => (
                        <div key={platform} className="flex items-center justify-between text-sm">
                          <span className="text-[hsl(var(--muted-foreground))]">{platform}</span>
                          <div className="flex items-center gap-4">
                            <span>${data.value.toFixed(2)}</span>
                            <span className={data.value - data.cost >= 0 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}>
                              {data.value - data.cost >= 0 ? '+' : ''}${(data.value - data.cost).toFixed(2)}
                            </span>
                            <span className="text-[hsl(var(--muted-foreground))]">{data.count} pos</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outcome Breakdown */}
                <div className="ascii-box p-4">
                  <h3 className="text-sm font-bold mb-3">[BY OUTCOME]</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">YES</div>
                      <div className="text-lg font-bold text-[hsl(var(--bullish))]">
                        ${portfolio.byOutcome.YES.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">NO</div>
                      <div className="text-lg font-bold text-[hsl(var(--bearish))]">
                        ${portfolio.byOutcome.NO.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">OTHER</div>
                      <div className="text-lg font-bold text-[hsl(var(--primary))]">
                        ${portfolio.byOutcome.OTHER.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Positions Table */}
                <div className="ascii-box p-4">
                  <h3 className="text-sm font-bold mb-3">[POSITIONS]</h3>
                  {portfolio.positions.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
                      No positions found. Add positions manually or import from your wallet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                            <th className="pb-2 pr-4">MARKET</th>
                            <th className="pb-2 pr-4">OUTCOME</th>
                            <th className="pb-2 pr-4 text-right">SHARES</th>
                            <th className="pb-2 pr-4 text-right">AVG COST</th>
                            <th className="pb-2 pr-4 text-right">CURRENT</th>
                            <th className="pb-2 pr-4 text-right">VALUE</th>
                            <th className="pb-2 text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolio.positions.map((pos) => (
                            <PositionRow key={pos.id} position={pos} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Refresh Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => fetchPortfolio(connectedWallet)}
                    disabled={isLoading}
                    className="text-sm px-4 py-2 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors disabled:opacity-50"
                  >
                    REFRESH PORTFOLIO
                  </button>
                </div>
              </>
            ) : (
              <div className="ascii-box p-8 text-center">
                <p className="text-[hsl(var(--muted-foreground))]">
                  No portfolio data found for this wallet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

interface SummaryCardProps {
  label: string;
  value: string;
  subValue?: string;
  variant: 'default' | 'muted' | 'bullish' | 'bearish';
}

function SummaryCard({ label, value, subValue, variant }: SummaryCardProps) {
  const valueColor = {
    default: 'text-[hsl(var(--foreground))]',
    muted: 'text-[hsl(var(--muted-foreground))]',
    bullish: 'text-[hsl(var(--bullish))]',
    bearish: 'text-[hsl(var(--bearish))]',
  }[variant];

  return (
    <div className="ascii-box p-4">
      <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      {subValue && (
        <div className={`text-xs ${valueColor}`}>{subValue}</div>
      )}
    </div>
  );
}

interface PositionRowProps {
  position: PortfolioPosition;
}

function PositionRow({ position }: PositionRowProps) {
  const pnlColor = position.unrealizedPnl >= 0
    ? 'text-[hsl(var(--bullish))]'
    : 'text-[hsl(var(--bearish))]';

  const outcomeColor = position.outcome.toUpperCase() === 'YES'
    ? 'text-[hsl(var(--bullish))]'
    : position.outcome.toUpperCase() === 'NO'
      ? 'text-[hsl(var(--bearish))]'
      : 'text-[hsl(var(--primary))]';

  return (
    <tr className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))/0.3] transition-colors cursor-pointer group">
      <td className="py-3 pr-4">
        <Link href={`/portfolio/position/${position.id}`} className="block">
          <div className="max-w-[200px]">
            <div className="truncate font-medium group-hover:text-[hsl(var(--primary))]">{position.marketQuestion}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">{position.platformName}</div>
          </div>
        </Link>
      </td>
      <td className={`py-3 pr-4 font-bold ${outcomeColor}`}>
        <Link href={`/portfolio/position/${position.id}`} className="block">
          {position.outcome.toUpperCase()}
        </Link>
      </td>
      <td className="py-3 pr-4 text-right font-mono">
        <Link href={`/portfolio/position/${position.id}`} className="block">
          {position.shares.toFixed(2)}
        </Link>
      </td>
      <td className="py-3 pr-4 text-right font-mono">
        <Link href={`/portfolio/position/${position.id}`} className="block">
          ${position.avgCostBasis.toFixed(3)}
        </Link>
      </td>
      <td className="py-3 pr-4 text-right font-mono">
        <Link href={`/portfolio/position/${position.id}`} className="block">
          {position.currentPrice !== null ? `$${position.currentPrice.toFixed(3)}` : '--'}
        </Link>
      </td>
      <td className="py-3 pr-4 text-right font-mono">
        <Link href={`/portfolio/position/${position.id}`} className="block">
          ${position.currentValue.toFixed(2)}
        </Link>
      </td>
      <td className={`py-3 text-right font-mono ${pnlColor}`}>
        <Link href={`/portfolio/position/${position.id}`} className="block">
          <div>{position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}</div>
          <div className="text-xs">
            {position.unrealizedPnlPct >= 0 ? '+' : ''}{position.unrealizedPnlPct.toFixed(1)}%
          </div>
        </Link>
      </td>
    </tr>
  );
}

interface AlertRowProps {
  alert: ResolutionAlert;
}

function AlertRow({ alert }: AlertRowProps) {
  const statusIcon = alert.isWinner ? '✓' : '✗';
  const statusColor = alert.isWinner
    ? 'text-[hsl(var(--bullish))]'
    : 'text-[hsl(var(--bearish))]';
  const pnlColor = alert.realizedPnl >= 0
    ? 'text-[hsl(var(--bullish))]'
    : 'text-[hsl(var(--bearish))]';

  const resolvedDate = alert.resolvedAt
    ? new Date(alert.resolvedAt).toLocaleDateString()
    : 'Unknown';

  return (
    <div className="flex items-center justify-between p-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className={`text-lg font-bold ${statusColor}`}>{statusIcon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{alert.marketQuestion}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            {alert.platformName} | Your bet: {alert.outcome.toUpperCase()} | Resolved: {alert.resolution?.toUpperCase() || 'N/A'} | {resolvedDate}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">SHARES</div>
          <div className="text-sm font-mono">{alert.shares.toFixed(2)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">PAYOUT</div>
          <div className="text-sm font-mono">${alert.payout.toFixed(2)}</div>
        </div>
        <div className="text-right min-w-[80px]">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">P&L</div>
          <div className={`text-sm font-mono font-bold ${pnlColor}`}>
            {alert.realizedPnl >= 0 ? '+' : ''}${alert.realizedPnl.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

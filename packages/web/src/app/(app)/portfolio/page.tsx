'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, type PortfolioSummary as APIPortfolioSummary, type AlertsResponse, type ResolutionAlert, type WalletScanResponse } from '@/lib/api';
import {
  toPositions,
  toExposureByPlatform,
  calculateExposureByCategory,
  toPortfolioSummaryProps,
  filterPositions,
} from '@/lib/portfolio-adapters';
import {
  PortfolioSummary,
  PositionTable,
  ExposureBreakdown,
  type Position,
  type PositionFilter,
} from '@/components/portfolio';

export default function PortfolioPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<APIPortfolioSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<WalletScanResponse | null>(null);

  // Position filtering and sorting state
  const [positionFilter, setPositionFilter] = useState<PositionFilter | undefined>();
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Exposure breakdown state
  const [exposureGroupBy, setExposureGroupBy] = useState<'category' | 'platform'>('platform');

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

  // Transform portfolio data for components
  const positions: Position[] = portfolio ? toPositions(portfolio.positions) : [];
  const filteredPositions = filterPositions(positions, positionFilter, sortKey, sortDirection);

  const exposureByPlatform = portfolio
    ? toExposureByPlatform(portfolio.byPlatform, portfolio.totalValue)
    : [];
  const exposureByCategory = portfolio
    ? calculateExposureByCategory(portfolio.positions)
    : [];

  const summaryProps = portfolio ? toPortfolioSummaryProps(portfolio) : null;

  // Handlers for components
  const handlePositionClick = (position: Position) => {
    router.push(`/portfolio/position/${position.id}`);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleFilter = (filter: PositionFilter) => {
    setPositionFilter(filter);
  };

  const handleExposureItemClick = (name: string, type: 'category' | 'platform') => {
    if (type === 'platform') {
      setPositionFilter({ platform: name });
    } else {
      setPositionFilter({ category: name });
    }
  };

  const clearFilter = () => {
    setPositionFilter(undefined);
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
              <ScanResultCard scanResult={scanResult} onDismiss={() => setScanResult(null)} />
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
            ) : portfolio && summaryProps ? (
              <>
                {/* Portfolio Summary */}
                <PortfolioSummary {...summaryProps} />

                {/* Resolution Alerts */}
                {alerts && alerts.count > 0 && showAlerts && (
                  <AlertsCard alerts={alerts} onDismiss={() => setShowAlerts(false)} />
                )}

                {/* Exposure Breakdown */}
                <ExposureBreakdown
                  byCategory={exposureByCategory}
                  byPlatform={exposureByPlatform}
                  groupBy={exposureGroupBy}
                  onGroupByChange={setExposureGroupBy}
                  onItemClick={handleExposureItemClick}
                />

                {/* Active Filter Indicator */}
                {positionFilter && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">Filtering by:</span>
                    <span className="px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                      {positionFilter.platform || positionFilter.category}
                    </span>
                    <button
                      onClick={clearFilter}
                      className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    >
                      [CLEAR]
                    </button>
                  </div>
                )}

                {/* Positions Table */}
                <PositionTable
                  positions={filteredPositions}
                  onPositionClick={handlePositionClick}
                  onSort={handleSort}
                  onFilter={handleFilter}
                />

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
// Sub-components
// =============================================================================

interface ScanResultCardProps {
  scanResult: WalletScanResponse;
  onDismiss: () => void;
}

function ScanResultCard({ scanResult, onDismiss }: ScanResultCardProps) {
  return (
    <div className={`ascii-box p-4 ${scanResult.scan.errors.length > 0 ? 'border-[hsl(var(--warning))]' : 'border-[hsl(var(--success))]'}`}>
      <h3 className="text-sm font-bold mb-2">[SCAN COMPLETE]</h3>
      <div className="grid grid-cols-3 gap-4 text-center mb-3">
        <div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">POSITIONS FOUND</div>
          <div className="text-lg font-bold text-[hsl(var(--primary))]">
            {scanResult.scan.positionsFound}
          </div>
        </div>
        <div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">TOTAL VALUE</div>
          <div className="text-lg font-bold">${scanResult.scan.totalValue.toFixed(2)}</div>
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
            <div
              key={idx}
              className="flex items-center justify-between text-xs p-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
            >
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
        onClick={onDismiss}
        className="mt-3 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        DISMISS
      </button>
    </div>
  );
}

interface AlertsCardProps {
  alerts: AlertsResponse;
  onDismiss: () => void;
}

function AlertsCard({ alerts, onDismiss }: AlertsCardProps) {
  return (
    <div className="ascii-box p-4 border-[hsl(var(--warning))]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[hsl(var(--warning))]">
          [RESOLUTION ALERTS] - {alerts.count} market{alerts.count !== 1 ? 's' : ''} resolved
        </h3>
        <button
          onClick={onDismiss}
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

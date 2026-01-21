'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, type UnifiedMarket, type SyncStatus } from '@/lib/api';
import { MarketCard } from '@/components/market-card';
import { SyncStatusPanel } from '@/components/sync-status';

export default function MarketsPage() {
  const [markets, setMarkets] = useState<UnifiedMarket[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<UnifiedMarket | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [marketsRes, statusRes] = await Promise.all([
        api.getMarkets({ limit: 50, active: activeOnly, search: search || undefined }),
        api.getSyncStatus(),
      ]);
      setMarkets(marketsRes?.markets || []);
      setSyncStatus(statusRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setMarkets([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeOnly, search]);

  const refreshStatus = useCallback(async () => {
    try {
      const statusRes = await api.getSyncStatus();
      setSyncStatus(statusRes);
    } catch (err) {
      console.error('Failed to refresh status:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    fetchData();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold terminal-glow mb-2">
            CALIBR.LY // MARKETS DASHBOARD
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Phase 2 Test Interface - Polymarket Data Integration
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <SyncStatusPanel
              status={syncStatus}
              onRefresh={refreshStatus}
              isLoading={isLoading}
            />

            {/* Filters */}
            <div className="ascii-box p-4">
              <h2 className="text-sm font-bold mb-4">[FILTERS]</h2>

              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
                    SEARCH
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search markets..."
                    className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activeOnly"
                    checked={activeOnly}
                    onChange={(e) => setActiveOnly(e.target.checked)}
                    className="accent-[hsl(var(--primary))]"
                  />
                  <label htmlFor="activeOnly" className="text-sm">
                    Active markets only
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-sm px-4 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'LOADING...' : 'APPLY FILTERS'}
                </button>
              </form>
            </div>

            {/* Connection Status */}
            <div className="ascii-box p-4">
              <h2 className="text-sm font-bold mb-2">[CONNECTION]</h2>
              <div className="text-xs space-y-1 text-[hsl(var(--muted-foreground))]">
                <div>API: {error ? (
                  <span className="text-[hsl(var(--error))]">ERROR</span>
                ) : (
                  <span className="text-[hsl(var(--success))]">CONNECTED</span>
                )}</div>
                <div>Endpoint: localhost:3001</div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {error ? (
              <div className="ascii-box p-8 text-center">
                <div className="text-[hsl(var(--error))] mb-4">
                  [ERROR] {error}
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  Make sure the API server is running on port 3001
                </p>
                <button
                  onClick={() => {
                    setIsLoading(true);
                    fetchData();
                  }}
                  className="text-sm px-4 py-2 border border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
                >
                  RETRY
                </button>
              </div>
            ) : isLoading ? (
              <div className="ascii-box p-8 text-center">
                <div className="terminal-glow cursor-blink">LOADING MARKETS</div>
              </div>
            ) : !markets || markets.length === 0 ? (
              <div className="ascii-box p-8 text-center">
                <div className="text-[hsl(var(--muted-foreground))] mb-4">
                  No markets found
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Try triggering a market sync from the sidebar
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    Showing {markets.length} markets
                  </div>
                  <button
                    onClick={() => {
                      setIsLoading(true);
                      fetchData();
                    }}
                    className="text-xs px-2 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
                  >
                    REFRESH
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {markets.map((market) => (
                    <MarketCard
                      key={market.id}
                      market={market}
                      onClick={() => setSelectedMarket(market)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Market Detail Modal */}
        {selectedMarket && (
          <MarketDetailModal
            market={selectedMarket}
            onClose={() => setSelectedMarket(null)}
          />
        )}
      </div>
    </div>
  );
}

interface MarketDetailModalProps {
  market: UnifiedMarket;
  onClose: () => void;
}

function MarketDetailModal({ market, onClose }: MarketDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="ascii-box p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold terminal-glow pr-4">
            {market.question}
          </h2>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {market.description && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            {market.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="ascii-box p-4 text-center">
            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">YES PRICE</div>
            <div className="text-3xl font-bold text-[hsl(var(--bullish))]">
              {market.bestYesPrice !== null ? (market.bestYesPrice * 100).toFixed(1) : '--'}%
            </div>
            {market.bestYesPlatform && (
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Best on {market.bestYesPlatform}
              </div>
            )}
          </div>
          <div className="ascii-box p-4 text-center">
            <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">NO PRICE</div>
            <div className="text-3xl font-bold text-[hsl(var(--bearish))]">
              {market.bestNoPrice !== null ? (market.bestNoPrice * 100).toFixed(1) : '--'}%
            </div>
            {market.bestNoPlatform && (
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Best on {market.bestNoPlatform}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">ID:</span>
            <span className="font-mono text-xs">{market.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Slug:</span>
            <span>{market.slug}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Category:</span>
            <span>{market.category || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Volume:</span>
            <span>${market.totalVolume.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Liquidity:</span>
            <span>${market.totalLiquidity.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Spread:</span>
            <span>{market.currentSpread !== null ? (market.currentSpread * 100).toFixed(2) : '--'}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Status:</span>
            <span className={market.isActive ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--muted-foreground))]'}>
              {market.isActive ? 'Active' : market.resolvedAt ? `Resolved: ${market.resolution}` : 'Closed'}
            </span>
          </div>
          {market.closesAt && (
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Closes:</span>
              <span>{new Date(market.closesAt).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Updated:</span>
            <span>{new Date(market.updatedAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[hsl(var(--border))]">
          <button
            onClick={onClose}
            className="w-full text-sm px-4 py-2 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

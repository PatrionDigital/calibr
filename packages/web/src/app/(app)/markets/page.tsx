'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, type UnifiedMarket, type SyncStatus } from '@/lib/api';
import { MarketCard } from '@/components/market-card';
import { SyncStatusPanel } from '@/components/sync-status';
import { KellyCalculator } from '@/components/kelly-calculator';
import { KellySettingsPanel } from '@/components/kelly-settings-panel';
import { TradingPanel } from '@/components/trading-panel';

// =============================================================================
// Category & Platform Definitions
// =============================================================================

const CATEGORIES = [
  { id: 'all', label: 'ALL', icon: '◉' },
  { id: 'POLITICS', label: 'POLITICS', icon: '🏛️' },
  { id: 'CRYPTO', label: 'CRYPTO', icon: '₿' },
  { id: 'SPORTS', label: 'SPORTS', icon: '⚽' },
  { id: 'ECONOMICS', label: 'ECONOMICS', icon: '📈' },
  { id: 'TECHNOLOGY', label: 'TECH', icon: '💻' },
  { id: 'OTHER', label: 'OTHER', icon: '📦' },
] as const;

const PLATFORMS = [
  { id: 'all', label: 'All Platforms', icon: '◉', color: 'text-[hsl(var(--primary))]' },
  { id: 'POLYMARKET', label: 'Polymarket', icon: '🟣', color: 'text-purple-400' },
  { id: 'LIMITLESS', label: 'Limitless', icon: '🔵', color: 'text-blue-400' },
  { id: 'OPINION', label: 'Opinion', icon: '🟡', color: 'text-yellow-400' },
  { id: 'PREDICTFUN', label: 'Predict.fun', icon: '🟠', color: 'text-orange-400' },
  { id: 'MANIFOLD', label: 'Manifold', icon: '🟢', color: 'text-green-400' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];
type PlatformId = typeof PLATFORMS[number]['id'];

export default function MarketsPage() {
  const [markets, setMarkets] = useState<UnifiedMarket[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<UnifiedMarket | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('all');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [marketsRes, statusRes] = await Promise.all([
        api.getMarkets({
          limit: 100,
          active: activeOnly,
          search: search || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        }),
        api.getSyncStatus(),
      ]);

      let filteredMarkets = marketsRes?.markets || [];

      // Client-side platform filtering
      if (selectedPlatform !== 'all') {
        filteredMarkets = filteredMarkets.filter((market) => {
          const platforms = market.platformMarkets
            ?.map((pm) => pm.platformConfig?.slug?.toUpperCase())
            .filter(Boolean) || [];
          return platforms.includes(selectedPlatform);
        });
      }

      setMarkets(filteredMarkets);
      setSyncStatus(statusRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setMarkets([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeOnly, search, selectedCategory, selectedPlatform]);

  const refreshStatus = useCallback(async () => {
    try {
      const statusRes = await api.getSyncStatus();
      setSyncStatus(statusRes);
    } catch {
      // Silently ignore refresh errors - don't spam console
      // Status will update on next successful refresh
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
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/"
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] text-sm"
            >
              &larr; HOME
            </Link>
          </div>
          <h1 className="text-2xl font-bold terminal-glow mb-2">
            CALIBR.XYZ // MARKETS DASHBOARD
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
            Aggregated prediction markets from multiple platforms
          </p>
          {/* Active filter indicators */}
          <div className="flex flex-wrap gap-2 text-xs">
            {selectedCategory !== 'all' && (
              <span className="px-2 py-1 border border-[hsl(var(--primary))] text-[hsl(var(--primary))]">
                {CATEGORIES.find((c) => c.id === selectedCategory)?.icon}{' '}
                {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
              </span>
            )}
            {selectedPlatform !== 'all' && (
              <span className="px-2 py-1 border border-[hsl(var(--info))] text-[hsl(var(--info))]">
                {PLATFORMS.find((p) => p.id === selectedPlatform)?.icon}{' '}
                {PLATFORMS.find((p) => p.id === selectedPlatform)?.label}
              </span>
            )}
            {(selectedCategory !== 'all' || selectedPlatform !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedPlatform('all');
                  setIsLoading(true);
                }}
                className="px-2 py-1 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))] transition-colors"
              >
                × Clear filters
              </button>
            )}
          </div>
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
                {/* Search */}
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

                {/* Category Filter */}
                <div>
                  <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-2">
                    CATEGORY
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setIsLoading(true);
                        }}
                        className={`text-xs px-2 py-1 border transition-colors ${
                          selectedCategory === cat.id
                            ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                            : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
                        }`}
                      >
                        <span className="mr-1">{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform Filter */}
                <div>
                  <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-2">
                    PLATFORM
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => {
                      setSelectedPlatform(e.target.value as PlatformId);
                      setIsLoading(true);
                    }}
                    className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none"
                  >
                    {PLATFORMS.map((platform) => (
                      <option key={platform.id} value={platform.id} className="bg-black">
                        {platform.icon} {platform.label}
                      </option>
                    ))}
                  </select>
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

            {/* Kelly Settings */}
            <KellySettingsPanel compact showBankroll />
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

/**
 * Format price as percentage, normalizing if needed
 */
function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '--';
  // Normalize to 0-1 if it looks like a percentage (> 1)
  const normalizedPrice = price > 1 ? price / 100 : price;
  return (normalizedPrice * 100).toFixed(1);
}

interface MarketOutcome {
  index: number;
  label: string;
  price: number;
  tokenId?: string;
  isWinner?: boolean | null;
}

/**
 * Get market info including whether it's binary and its outcomes
 */
function getMarketOutcomes(market: UnifiedMarket): {
  isBinary: boolean;
  outcomes: MarketOutcome[];
} {
  const platformMarket = market.platformMarkets?.[0];
  const platformData = platformMarket?.platformData;

  if (platformData?.outcomes && Array.isArray(platformData.outcomes) && platformData.outcomes.length > 0) {
    const outcomes = platformData.outcomes as MarketOutcome[];
    if (outcomes.length > 2) {
      return { isBinary: false, outcomes };
    }
    if (outcomes.length === 2) {
      const labels = outcomes.map(o => o.label.toLowerCase());
      const isYesNo = labels.includes('yes') && labels.includes('no');
      return { isBinary: isYesNo, outcomes };
    }
    return { isBinary: false, outcomes };
  }

  // Default binary outcomes from bestYesPrice/bestNoPrice
  let yesPrice = market.bestYesPrice;
  let noPrice = market.bestNoPrice;
  if (yesPrice !== null && yesPrice > 1) yesPrice = yesPrice / 100;
  if (noPrice !== null && noPrice > 1) noPrice = noPrice / 100;

  return {
    isBinary: true,
    outcomes: [
      { index: 0, label: 'Yes', price: yesPrice ?? 0.5 },
      { index: 1, label: 'No', price: noPrice ?? 0.5 },
    ],
  };
}

function MarketDetailModal({ market, onClose }: MarketDetailModalProps) {
  const { isBinary, outcomes } = getMarketOutcomes(market);

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

        {/* Outcomes Section */}
        {isBinary ? (
          // Binary market: YES/NO display
          <div className="grid grid-cols-2 gap-6 mb-6">
            {outcomes.map((outcome) => (
              <div key={outcome.index} className="ascii-box p-4 text-center">
                <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
                  {outcome.label.toUpperCase()} PRICE
                </div>
                <div className={`text-3xl font-bold ${
                  outcome.label.toLowerCase() === 'yes'
                    ? 'text-[hsl(var(--bullish))]'
                    : 'text-[hsl(var(--bearish))]'
                }`}>
                  {formatPrice(outcome.price)}%
                </div>
                {market.bestYesPlatform && outcome.label.toLowerCase() === 'yes' && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Best on {market.bestYesPlatform}
                  </div>
                )}
                {market.bestNoPlatform && outcome.label.toLowerCase() === 'no' && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    Best on {market.bestNoPlatform}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Multi-outcome market
          <div className="mb-6">
            <div className="text-xs text-[hsl(var(--info))] mb-2">
              [MULTI-OUTCOME MARKET: {outcomes.length} choices]
            </div>
            <div className="ascii-box p-4 space-y-3 max-h-60 overflow-y-auto">
              {outcomes
                .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
                .map((outcome) => (
                  <div key={outcome.index} className="flex items-center justify-between gap-4">
                    <span className="text-sm truncate flex-1">
                      {outcome.label}
                    </span>
                    <span className="text-lg font-bold text-[hsl(var(--primary))]">
                      {formatPrice(outcome.price)}%
                    </span>
                    {outcome.isWinner && (
                      <span className="text-xs text-[hsl(var(--success))]">[WINNER]</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Trading Panel */}
        {market.isActive && (() => {
          // Get the best trading platform (prefer Limitless)
          const platforms = market.platformMarkets
            ?.map((pm) => ({
              slug: pm.platformConfig?.slug?.toUpperCase() || 'UNKNOWN',
              name: pm.platformConfig?.name || 'Unknown',
              yesPrice: pm.yesPrice,
              noPrice: pm.noPrice,
              externalId: pm.externalId,
              platformData: pm.platformData,
            }))
            .filter((p) => p.slug !== 'UNKNOWN') || [];
          const tradingPlatform = platforms.find((p) => p.slug === 'LIMITLESS') || platforms[0];

          if (tradingPlatform) {
            // Get outcomes from platformData or use the modal's outcomes
            const tradingOutcomes = (tradingPlatform.platformData?.outcomes as MarketOutcome[]) || outcomes;

            // Extract platform data for trading (contract addresses, etc.)
            const tradingPlatformData = tradingPlatform.platformData ? {
              address: tradingPlatform.platformData.address as string | undefined,
              tradeType: tradingPlatform.platformData.tradeType as string | undefined,
              exchangeAddress: (tradingPlatform.platformData.venue as { exchange?: string } | undefined)?.exchange,
              collateralToken: tradingPlatform.platformData.collateralToken as { address?: string; decimals?: number; symbol?: string } | undefined,
              yesTokenId: tradingPlatform.platformData.yesTokenId as string | undefined,
              noTokenId: tradingPlatform.platformData.noTokenId as string | undefined,
              tokens: tradingPlatform.platformData.tokens as Record<string, string> | undefined,
            } : undefined;

            return (
              <div className="mb-6">
                <TradingPanel
                  marketId={tradingPlatform.externalId}
                  marketSlug={market.slug}
                  marketQuestion={market.question}
                  platform={tradingPlatform.slug}
                  yesPrice={tradingPlatform.yesPrice}
                  noPrice={tradingPlatform.noPrice}
                  outcomes={tradingOutcomes}
                  platformData={tradingPlatformData}
                  onTradeSuccess={onClose}
                />
              </div>
            );
          }
          return null;
        })()}

        {/* Kelly Criterion Calculator */}
        {isBinary && market.isActive && (
          <KellyCalculator
            marketPrice={outcomes[0]?.price ?? 0.5}
            marketQuestion={market.question}
          />
        )}

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
          {isBinary && (
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Spread:</span>
              <span>{formatPrice(market.currentSpread)}%</span>
            </div>
          )}
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

        <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] flex gap-4">
          <Link
            href={`/markets/${market.slug}`}
            className="flex-1 text-center text-sm px-4 py-2 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
          >
            VIEW FULL PAGE
          </Link>
          <button
            onClick={onClose}
            className="flex-1 text-sm px-4 py-2 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

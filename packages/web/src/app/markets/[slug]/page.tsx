'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { api, type UnifiedMarket } from '@/lib/api';
import { TradingPanel } from '@/components/trading-panel';

// Platform badge configuration
const PLATFORM_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  POLYMARKET: { icon: '~', label: 'Polymarket', color: 'text-purple-400' },
  LIMITLESS: { icon: '~', label: 'Limitless', color: 'text-blue-400' },
  OPINION: { icon: '~', label: 'Opinion', color: 'text-yellow-400' },
  PREDICTFUN: { icon: '~', label: 'Predict.fun', color: 'text-orange-400' },
  MANIFOLD: { icon: '~', label: 'Manifold', color: 'text-green-400' },
};

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '--';
  const normalizedPrice = price > 1 ? price / 100 : price;
  return (normalizedPrice * 100).toFixed(1);
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toFixed(0);
}

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [market, setMarket] = useState<UnifiedMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMarket() {
      try {
        setLoading(true);
        const response = await api.getMarkets({ limit: 500 });
        const found = response.markets.find((m) => m.slug === slug);
        if (found) {
          setMarket(found);
        } else {
          setError('Market not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load market');
      } finally {
        setLoading(false);
      }
    }
    fetchMarket();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-[hsl(var(--primary))] animate-pulse">
            Loading market data...
          </div>
        </div>
      </main>
    );
  }

  if (error || !market) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/markets"
            className="text-[hsl(var(--primary))] hover:underline mb-4 inline-block"
          >
            &lt; Back to Markets
          </Link>
          <div className="ascii-box p-4 text-[hsl(var(--destructive))]">
            {error || 'Market not found'}
          </div>
        </div>
      </main>
    );
  }

  // Get platforms from this market
  const platforms = market.platformMarkets
    ?.map((pm) => ({
      slug: pm.platformConfig?.slug?.toUpperCase() || 'UNKNOWN',
      name: pm.platformConfig?.name || 'Unknown',
      yesPrice: pm.yesPrice,
      noPrice: pm.noPrice,
      externalId: pm.externalId,
    }))
    .filter((p) => p.slug !== 'UNKNOWN') || [];

  const statusColor = market.isActive
    ? 'text-[hsl(var(--success))]'
    : market.resolvedAt
      ? 'text-[hsl(var(--info))]'
      : 'text-[hsl(var(--muted-foreground))]';

  const statusText = market.isActive
    ? 'ACTIVE'
    : market.resolvedAt
      ? `RESOLVED: ${market.resolution?.toUpperCase() || 'UNKNOWN'}`
      : 'CLOSED';

  // Find the best platform to trade on (prefer Limitless)
  const tradingPlatform = platforms.find((p) => p.slug === 'LIMITLESS') || platforms[0];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link
          href="/markets"
          className="text-[hsl(var(--primary))] hover:underline mb-4 inline-block text-sm"
        >
          &lt; Back to Markets
        </Link>

        {/* Header */}
        <div className="ascii-box p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold leading-tight flex-1">
              {market.question}
            </h1>
            <span className={`text-sm font-mono shrink-0 ${statusColor}`}>
              [{statusText}]
            </span>
          </div>

          {/* Platform Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {platforms.map((platform) => {
              const badge = PLATFORM_BADGES[platform.slug];
              return (
                <span
                  key={platform.slug}
                  className={`text-xs px-2 py-1 border border-current rounded ${badge?.color || 'text-gray-400'}`}
                >
                  {badge?.label || platform.name}
                </span>
              );
            })}
          </div>

          {/* Description */}
          {market.description && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {market.description}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-[hsl(var(--border))] p-3">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">YES PRICE</div>
              <div className="text-2xl font-bold text-[hsl(var(--bullish))]">
                {formatPrice(market.bestYesPrice)}%
              </div>
            </div>
            <div className="border border-[hsl(var(--border))] p-3">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">NO PRICE</div>
              <div className="text-2xl font-bold text-[hsl(var(--bearish))]">
                {formatPrice(market.bestNoPrice)}%
              </div>
            </div>
            <div className="border border-[hsl(var(--border))] p-3">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">VOLUME</div>
              <div className="text-2xl font-bold">${formatVolume(market.totalVolume)}</div>
            </div>
            <div className="border border-[hsl(var(--border))] p-3">
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">LIQUIDITY</div>
              <div className="text-2xl font-bold">${formatVolume(market.totalLiquidity)}</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-[hsl(var(--muted-foreground))]">
            {market.category && (
              <div>
                <span className="opacity-60">CATEGORY:</span> {market.category}
              </div>
            )}
            {market.closesAt && (
              <div>
                <span className="opacity-60">CLOSES:</span>{' '}
                {new Date(market.closesAt).toLocaleDateString()}
              </div>
            )}
            {market.currentSpread !== null && (
              <div>
                <span className="opacity-60">SPREAD:</span>{' '}
                {formatPrice(market.currentSpread)}%
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Platform Prices */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold">[PRICES BY PLATFORM]</h2>
            {platforms.map((platform) => {
              const badge = PLATFORM_BADGES[platform.slug];
              return (
                <div key={platform.slug} className="ascii-box p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-bold ${badge?.color || ''}`}>
                      {badge?.label || platform.name}
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      ID: {platform.externalId.slice(0, 20)}...
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">YES</div>
                      <div className="text-xl font-bold text-[hsl(var(--bullish))]">
                        {formatPrice(platform.yesPrice)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">NO</div>
                      <div className="text-xl font-bold text-[hsl(var(--bearish))]">
                        {formatPrice(platform.noPrice)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Order Book Placeholder */}
            <h2 className="text-lg font-bold mt-6">[ORDER BOOK]</h2>
            <div className="ascii-box p-4 text-sm text-[hsl(var(--muted-foreground))]">
              Order book display coming soon. Connect your wallet to see live orders.
            </div>
          </div>

          {/* Trading Panel */}
          <div>
            <h2 className="text-lg font-bold mb-4">[TRADE]</h2>
            {tradingPlatform && market.isActive ? (
              <TradingPanel
                marketId={tradingPlatform.externalId}
                marketSlug={market.slug}
                marketQuestion={market.question}
                platform={tradingPlatform.slug}
                yesPrice={tradingPlatform.yesPrice}
                noPrice={tradingPlatform.noPrice}
              />
            ) : (
              <div className="ascii-box p-4 text-sm text-[hsl(var(--muted-foreground))]">
                {!market.isActive
                  ? 'This market is no longer active for trading.'
                  : 'No trading platforms available for this market.'}
              </div>
            )}

            {/* Kelly Calculator Link */}
            <div className="mt-4 text-center">
              <Link
                href={`/forecasts?market=${market.slug}`}
                className="text-sm text-[hsl(var(--primary))] hover:underline"
              >
                Calculate Kelly Criterion position size
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

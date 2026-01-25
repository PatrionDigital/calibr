'use client';

import Link from 'next/link';
import { type UnifiedMarket, type MarketOutcome } from '@/lib/api';

// Platform badge configuration
const PLATFORM_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  POLYMARKET: { icon: '🟣', label: 'PM', color: 'text-purple-400 border-purple-400/50' },
  LIMITLESS: { icon: '🔵', label: 'LM', color: 'text-blue-400 border-blue-400/50' },
  OPINION: { icon: '🟡', label: 'OP', color: 'text-yellow-400 border-yellow-400/50' },
  PREDICTFUN: { icon: '🟠', label: 'PF', color: 'text-orange-400 border-orange-400/50' },
  MANIFOLD: { icon: '🟢', label: 'MF', color: 'text-green-400 border-green-400/50' },
};

interface MarketCardProps {
  market: UnifiedMarket;
  onClick?: () => void;
}

/**
 * Determine if a market is binary (YES/NO) or multi-outcome
 * Uses platformData from the first platformMarket to check
 */
function getMarketInfo(market: UnifiedMarket): {
  isBinary: boolean;
  outcomes: MarketOutcome[];
} {
  // Check platformMarkets for outcome data
  const platformMarket = market.platformMarkets?.[0];
  const platformData = platformMarket?.platformData;

  // Check if we have explicit outcomes from the platform
  if (platformData?.outcomes && Array.isArray(platformData.outcomes) && platformData.outcomes.length > 0) {
    const outcomes = platformData.outcomes as MarketOutcome[];
    // If more than 2 outcomes, it's definitely multi-choice
    if (outcomes.length > 2) {
      return { isBinary: false, outcomes };
    }
    // If exactly 2 outcomes, check if they're YES/NO variants
    if (outcomes.length === 2) {
      const labels = outcomes.map(o => o.label.toLowerCase());
      const isYesNo = labels.includes('yes') && labels.includes('no');
      return { isBinary: isYesNo, outcomes };
    }
    return { isBinary: false, outcomes };
  }

  // Check marketType from platformData
  if (platformData?.marketType === 'MULTIPLE_CHOICE') {
    return { isBinary: false, outcomes: [] };
  }

  // Default to binary using bestYesPrice/bestNoPrice
  // Normalize prices to 0-1 range if they appear to be in percentage form
  let yesPrice = market.bestYesPrice;
  let noPrice = market.bestNoPrice;

  // If prices look like percentages (> 1), normalize them
  if (yesPrice !== null && yesPrice > 1) {
    yesPrice = yesPrice / 100;
  }
  if (noPrice !== null && noPrice > 1) {
    noPrice = noPrice / 100;
  }

  const defaultOutcomes: MarketOutcome[] = [
    {
      index: 0,
      label: 'Yes',
      price: yesPrice ?? 0.5,
    },
    {
      index: 1,
      label: 'No',
      price: noPrice ?? 0.5,
    },
  ];

  return { isBinary: true, outcomes: defaultOutcomes };
}

/**
 * Format price as percentage
 * Handles both 0-1 range and 0-100 range inputs
 */
function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '--';

  // Normalize to 0-1 if it looks like a percentage
  const normalizedPrice = price > 1 ? price / 100 : price;

  // Format as percentage
  return (normalizedPrice * 100).toFixed(1);
}

/**
 * Format volume with K/M suffixes
 */
function formatVolume(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

export function MarketCard({ market, onClick }: MarketCardProps) {
  const { isBinary, outcomes } = getMarketInfo(market);

  const spread = market.currentSpread !== null
    ? formatPrice(market.currentSpread > 1 ? market.currentSpread / 100 : market.currentSpread)
    : '--';

  const volume = formatVolume(market.totalVolume);
  const liquidity = formatVolume(market.totalLiquidity);

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

  // Get unique platforms from platformMarkets
  const platforms = Array.from(
    new Set(
      market.platformMarkets
        ?.map((pm) => pm.platformConfig?.slug?.toUpperCase())
        .filter((p): p is string => Boolean(p)) || []
    )
  );

  const content = (
    <>
      {/* Platform badges */}
      {platforms.length > 0 && (
        <div className="flex gap-1 mb-2">
          {platforms.map((platform) => {
            const badge = PLATFORM_BADGES[platform];
            if (!badge) return null;
            return (
              <span
                key={platform}
                className={`text-xs px-1.5 py-0.5 border rounded ${badge.color}`}
                title={platform}
              >
                {badge.icon} {badge.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2 flex-1">
          {market.question}
        </h3>
        <span className={`text-xs font-mono shrink-0 ${statusColor}`}>
          [{statusText}]
        </span>
      </div>

      {/* Outcomes */}
      {isBinary ? (
        // Binary market: YES/NO display
        <div className="grid grid-cols-2 gap-4 mb-3">
          {outcomes.map((outcome, idx) => (
            <div key={outcome.index ?? idx} className="space-y-1">
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                {outcome.label.toUpperCase()}
              </div>
              <div className={`text-xl font-bold ${
                outcome.label.toLowerCase() === 'yes'
                  ? 'text-[hsl(var(--bullish))]'
                  : 'text-[hsl(var(--bearish))]'
              }`}>
                {formatPrice(outcome.price)}<span className="text-sm">%</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Multi-outcome market: Show all outcomes
        <div className="space-y-2 mb-3">
          {outcomes.length > 0 ? (
            // Show top outcomes (limit to 5 for card view)
            <>
              {outcomes
                .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
                .slice(0, 5)
                .map((outcome, idx) => (
                  <div key={outcome.index ?? idx} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[hsl(var(--muted-foreground))] truncate flex-1">
                      {outcome.label}
                    </span>
                    <span className="text-sm font-bold text-[hsl(var(--primary))]">
                      {formatPrice(outcome.price)}%
                    </span>
                  </div>
                ))}
              {outcomes.length > 5 && (
                <div className="text-xs text-[hsl(var(--muted-foreground))] italic">
                  +{outcomes.length - 5} more outcomes
                </div>
              )}
            </>
          ) : (
            // Fallback if no outcomes data
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Multi-outcome market (click for details)
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-3">
        <div>
          <span className="opacity-60">VOL:</span> ${volume}
        </div>
        <div>
          <span className="opacity-60">LIQ:</span> ${liquidity}
        </div>
        {isBinary && (
          <div>
            <span className="opacity-60">SPREAD:</span> {spread}%
          </div>
        )}
        {market.category && (
          <div className="ml-auto">
            <span className="opacity-60">CAT:</span> {market.category}
          </div>
        )}
      </div>

      {/* Market type indicator for multi-outcome */}
      {!isBinary && (
        <div className="mt-2 text-xs text-[hsl(var(--info))]">
          [MULTI-OUTCOME: {outcomes.length} choices]
        </div>
      )}

      {/* Close date */}
      {market.closesAt && (
        <div className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
          Closes: {new Date(market.closesAt).toLocaleDateString()}
        </div>
      )}
    </>
  );

  // If onClick is provided, use div with onClick; otherwise link to detail page
  if (onClick) {
    return (
      <div
        className="ascii-box p-4 hover:border-[hsl(var(--primary))] transition-colors cursor-pointer"
        onClick={onClick}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/markets/${market.slug}`}
      className="ascii-box p-4 hover:border-[hsl(var(--primary))] transition-colors cursor-pointer block"
    >
      {content}
    </Link>
  );
}

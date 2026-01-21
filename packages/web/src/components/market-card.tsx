'use client';

import { type UnifiedMarket } from '@/lib/api';

interface MarketCardProps {
  market: UnifiedMarket;
  onClick?: () => void;
}

export function MarketCard({ market, onClick }: MarketCardProps) {
  const yesPrice = market.bestYesPrice !== null ? (market.bestYesPrice * 100).toFixed(1) : '--';
  const noPrice = market.bestNoPrice !== null ? (market.bestNoPrice * 100).toFixed(1) : '--';
  const spread = market.currentSpread !== null ? (market.currentSpread * 100).toFixed(2) : '--';

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

  return (
    <div
      className="ascii-box p-4 hover:border-[hsl(var(--primary))] transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2 flex-1">
          {market.question}
        </h3>
        <span className={`text-xs font-mono shrink-0 ${statusColor}`}>
          [{statusText}]
        </span>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="space-y-1">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">YES</div>
          <div className="text-xl font-bold text-[hsl(var(--bullish))]">
            {yesPrice}<span className="text-sm">%</span>
          </div>
          {market.bestYesPlatform && (
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              via {market.bestYesPlatform}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">NO</div>
          <div className="text-xl font-bold text-[hsl(var(--bearish))]">
            {noPrice}<span className="text-sm">%</span>
          </div>
          {market.bestNoPlatform && (
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              via {market.bestNoPlatform}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-3">
        <div>
          <span className="opacity-60">VOL:</span> ${volume}
        </div>
        <div>
          <span className="opacity-60">LIQ:</span> ${liquidity}
        </div>
        <div>
          <span className="opacity-60">SPREAD:</span> {spread}%
        </div>
        {market.category && (
          <div className="ml-auto">
            <span className="opacity-60">CAT:</span> {market.category}
          </div>
        )}
      </div>

      {/* Close date */}
      {market.closesAt && (
        <div className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
          Closes: {new Date(market.closesAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

'use client';

import { cn } from '@/lib/utils';
import { TierBadge, type SuperforecasterTier } from './tier-badge';

// =============================================================================
// Types
// =============================================================================

interface UserRankCardProps {
  userId: string;
  displayName: string | null;
  rank: number | null;
  percentile: number;
  tier: SuperforecasterTier;
  tierProgress: number;
  compositeScore: number;
  brierScore: number | null;
  totalForecasts: number;
  resolvedForecasts: number;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// Skeleton
// =============================================================================

function Skeleton() {
  return (
    <div data-testid="user-rank-card-skeleton" className="ascii-box p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-8 w-20 bg-[hsl(var(--muted))] rounded mb-2" />
          <div className="h-5 w-32 bg-[hsl(var(--muted))] rounded" />
        </div>
        <div className="h-6 w-24 bg-[hsl(var(--muted))] rounded" />
      </div>
      <div className="h-2 w-full bg-[hsl(var(--muted))] rounded mb-4" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-16 bg-[hsl(var(--muted))] rounded" />
        <div className="h-16 bg-[hsl(var(--muted))] rounded" />
        <div className="h-16 bg-[hsl(var(--muted))] rounded" />
      </div>
    </div>
  );
}

// =============================================================================
// Stat Item
// =============================================================================

interface StatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
}

function StatItem({ label, value, subValue }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-xl font-mono font-bold">{value}</div>
      {subValue && (
        <div className="text-xs text-[hsl(var(--muted-foreground))]">{subValue}</div>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function UserRankCard({
  userId: _userId,
  displayName,
  rank,
  percentile,
  tier,
  tierProgress,
  compositeScore,
  brierScore,
  totalForecasts,
  resolvedForecasts,
  isLoading = false,
  className,
}: UserRankCardProps) {
  if (isLoading) {
    return <Skeleton />;
  }

  // No data state
  if (!displayName || rank === null) {
    return (
      <div className={cn('ascii-box p-6', className)}>
        <div className="text-center text-[hsl(var(--muted-foreground))]">
          <div className="text-2xl mb-2">?</div>
          <div className="text-sm">No ranking data available</div>
          <div className="text-xs mt-1">Start making forecasts to get ranked</div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(tierProgress * 100);

  return (
    <div className={cn('ascii-box p-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-3xl font-mono font-bold terminal-glow">#{rank}</div>
          <div className="text-sm text-[hsl(var(--muted-foreground))]">{displayName}</div>
        </div>
        <TierBadge tier={tier} showEmoji />
      </div>

      {/* Tier Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[hsl(var(--muted-foreground))]">Tier Progress</span>
          <span className="font-mono">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
          <div
            data-testid="tier-progress"
            className="h-full bg-[hsl(var(--primary))] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Percentile */}
      <div className="text-center mb-4 p-3 bg-[hsl(var(--muted)/0.3)] rounded">
        <div className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
          Percentile
        </div>
        <div className="text-2xl font-mono font-bold text-[hsl(var(--success))]">
          {percentile.toFixed(1)}%
        </div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          Better than {percentile.toFixed(0)}% of forecasters
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[hsl(var(--border))]">
        <StatItem label="Score" value={compositeScore} />
        <StatItem
          label="Brier"
          value={brierScore !== null ? brierScore.toFixed(2) : '-'}
          subValue="Lower is better"
        />
        <StatItem
          label="Forecasts"
          value={resolvedForecasts}
          subValue={`of ${totalForecasts}`}
        />
      </div>
    </div>
  );
}

export type { UserRankCardProps };

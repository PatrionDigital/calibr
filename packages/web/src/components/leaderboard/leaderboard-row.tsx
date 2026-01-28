'use client';

import { cn } from '@/lib/utils';
import { TierBadge, type SuperforecasterTier } from './tier-badge';

// =============================================================================
// Types
// =============================================================================

export interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  userId: string;
  displayName: string;
  tier: SuperforecasterTier;
  compositeScore: number;
  brierScore: number | null;
  calibrationScore: number | null;
  totalForecasts: number;
  resolvedForecasts: number;
  streakDays: number;
  isPrivate: boolean;
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isHighlighted?: boolean;
  onClick?: (userId: string) => void;
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function RankChangeIndicator({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) {
    return (
      <span data-testid="rank-change" className="text-xs text-[hsl(var(--muted-foreground))]">
        NEW
      </span>
    );
  }

  const delta = previous - current;

  if (delta > 0) {
    return (
      <span data-testid="rank-change" className="text-xs text-[hsl(var(--success))]">
        +{delta}
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span data-testid="rank-change" className="text-xs text-[hsl(var(--destructive))]">
        {delta}
      </span>
    );
  }

  return (
    <span data-testid="rank-change" className="text-xs text-[hsl(var(--muted-foreground))]">
      =
    </span>
  );
}

function StreakBadge({ days }: { days: number }) {
  if (days < 7) return null;

  return (
    <span
      data-testid="streak-badge"
      className="inline-flex items-center gap-0.5 text-xs text-orange-400"
    >
      🔥 {days}d
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

export function LeaderboardRow({
  entry,
  isHighlighted = false,
  onClick,
  className,
}: LeaderboardRowProps) {
  const displayName = entry.isPrivate ? 'Anonymous Forecaster' : entry.displayName;

  const handleClick = () => {
    if (onClick && !entry.isPrivate) {
      onClick(entry.userId);
    }
  };

  return (
    <tr
      data-testid={`leaderboard-row${isHighlighted ? `-${entry.userId}` : ''}`}
      className={cn(
        'border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/0.3)] transition-colors',
        isHighlighted && 'highlight bg-[hsl(var(--primary)/0.1)]',
        onClick && !entry.isPrivate && 'cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {/* Rank */}
      <td className="py-3 px-2 text-center font-mono">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-lg font-bold">#{entry.rank}</span>
          <RankChangeIndicator current={entry.rank} previous={entry.previousRank} />
        </div>
      </td>

      {/* Forecaster */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium', entry.isPrivate && 'text-[hsl(var(--muted-foreground))]')}>
            {displayName}
          </span>
          {entry.streakDays >= 7 && <StreakBadge days={entry.streakDays} />}
        </div>
      </td>

      {/* Tier */}
      <td className="py-3 px-2">
        <TierBadge tier={entry.tier} compact />
      </td>

      {/* Score */}
      <td className="py-3 px-2 text-right font-mono">
        <span className="text-lg">{entry.compositeScore}</span>
      </td>

      {/* Brier Score */}
      <td className="py-3 px-2 text-right font-mono text-sm text-[hsl(var(--muted-foreground))]">
        {entry.brierScore !== null ? entry.brierScore.toFixed(2) : '-'}
      </td>

      {/* Forecasts */}
      <td className="py-3 px-2 text-right font-mono text-sm text-[hsl(var(--muted-foreground))]">
        {entry.resolvedForecasts}
      </td>
    </tr>
  );
}

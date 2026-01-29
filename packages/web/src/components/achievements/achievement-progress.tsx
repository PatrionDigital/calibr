'use client';

import { cn } from '@/lib/utils';
import type { AchievementTier } from './types';

// =============================================================================
// Types
// =============================================================================

export interface AchievementProgressProps {
  progress: number;
  maxProgress: number;
  tier?: AchievementTier;
  displayMode?: 'fraction' | 'percentage';
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_COLORS: Record<AchievementTier, string> = {
  BRONZE: 'bg-amber-600',
  SILVER: 'bg-gray-400',
  GOLD: 'bg-yellow-500',
  PLATINUM: 'bg-slate-300',
  DIAMOND: 'bg-cyan-400',
};

// =============================================================================
// Component
// =============================================================================

export function AchievementProgress({
  progress,
  maxProgress,
  tier,
  displayMode = 'fraction',
  className,
}: AchievementProgressProps) {
  const percentage = Math.min((progress / maxProgress) * 100, 100);
  const isComplete = progress >= maxProgress;

  return (
    <div
      data-testid="achievement-progress"
      data-complete={isComplete ? 'true' : 'false'}
      className={cn('w-full', className)}
    >
      {/* Progress Bar */}
      <div
        data-testid="achievement-progress-bar"
        className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden"
      >
        <div
          data-testid="progress-fill"
          data-tier={tier}
          className={cn(
            'h-full transition-all duration-500',
            tier ? TIER_COLORS[tier] : 'bg-[hsl(var(--primary))]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Progress Text */}
      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))] font-mono text-right">
        {displayMode === 'percentage' ? (
          <span>{Math.round(percentage)}%</span>
        ) : (
          <span>{progress} / {maxProgress}</span>
        )}
      </div>
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';
import type { Achievement, AchievementTier, AchievementCategory } from './types';

// =============================================================================
// Types
// =============================================================================

export interface AchievementBadgeProps {
  achievement: Achievement;
  compact?: boolean;
  showCategory?: boolean;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_CONFIG: Record<AchievementTier, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  BRONZE: {
    label: 'BRONZE',
    color: 'text-amber-600',
    bgColor: 'bg-amber-600/10',
    borderColor: 'border-amber-600/30',
  },
  SILVER: {
    label: 'SILVER',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30',
  },
  GOLD: {
    label: 'GOLD',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  PLATINUM: {
    label: 'PLATINUM',
    color: 'text-slate-300',
    bgColor: 'bg-slate-300/10',
    borderColor: 'border-slate-300/30',
  },
  DIAMOND: {
    label: 'DIAMOND',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/30',
  },
};

const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  STREAK: '🔥',
  VOLUME: '📊',
  ACCURACY: '🎯',
  CALIBRATION: '⚖️',
  SPECIAL: '⭐',
};

// =============================================================================
// Component
// =============================================================================

export function AchievementBadge({
  achievement,
  compact = false,
  showCategory = false,
  className,
}: AchievementBadgeProps) {
  const isUnlocked = achievement.unlockedAt !== null;
  const tierConfig = TIER_CONFIG[achievement.tier];

  return (
    <div
      data-testid="achievement-badge"
      data-tier={achievement.tier}
      className={cn(
        'inline-flex items-center gap-2 font-mono',
        compact && 'compact text-xs',
        !compact && 'text-sm',
        className
      )}
    >
      {/* Category Icon */}
      {showCategory && (
        <span data-testid="achievement-category-icon" className="text-base">
          {CATEGORY_ICONS[achievement.category]}
        </span>
      )}

      {/* Unlock Status */}
      {isUnlocked ? (
        <span data-testid="achievement-unlocked" className="text-[hsl(var(--success))]">
          ✓
        </span>
      ) : (
        <span data-testid="achievement-locked" className="text-[hsl(var(--muted-foreground))]">
          🔒
        </span>
      )}

      {/* Achievement Name */}
      <span className={cn(
        'font-medium',
        isUnlocked ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'
      )}>
        {achievement.name}
      </span>

      {/* Tier Badge */}
      <span
        className={cn(
          'inline-flex items-center px-1.5 py-0.5 border rounded text-xs',
          tierConfig.color,
          tierConfig.bgColor,
          tierConfig.borderColor
        )}
      >
        {tierConfig.label}
      </span>
    </div>
  );
}

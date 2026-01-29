'use client';

import { cn } from '@/lib/utils';
import { AchievementProgress } from './achievement-progress';
import type { Achievement, AchievementTier, AchievementCategory } from './types';

// =============================================================================
// Types
// =============================================================================

export interface AchievementCardProps {
  achievement: Achievement;
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

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  STREAK: 'Consistency',
  VOLUME: 'Volume',
  ACCURACY: 'Accuracy',
  CALIBRATION: 'Calibration',
  SPECIAL: 'Special',
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

export function AchievementCard({
  achievement,
  className,
}: AchievementCardProps) {
  const isUnlocked = achievement.unlockedAt !== null;
  const isInProgress = !isUnlocked && achievement.progress > 0;
  const tierConfig = TIER_CONFIG[achievement.tier];
  const percentage = Math.round((achievement.progress / achievement.maxProgress) * 100);

  return (
    <div
      data-testid="achievement-card"
      data-locked={!isUnlocked ? 'true' : 'false'}
      className={cn(
        'ascii-box p-4 transition-all',
        isUnlocked && 'border-[hsl(var(--success))]',
        !isUnlocked && 'opacity-70',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{CATEGORY_ICONS[achievement.category]}</span>
          <div>
            <h4 className={cn(
              'font-mono font-bold',
              isUnlocked ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'
            )}>
              {achievement.name}
            </h4>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {CATEGORY_LABELS[achievement.category]}
            </span>
          </div>
        </div>

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

      {/* Description */}
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
        {achievement.description}
      </p>

      {/* Progress or Unlocked Date */}
      {isUnlocked ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[hsl(var(--success))]">✓ Unlocked</span>
          <span className="text-[hsl(var(--muted-foreground))]">
            {achievement.unlockedAt?.toLocaleDateString()}
          </span>
        </div>
      ) : isInProgress ? (
        <div data-testid="achievement-card-progress">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[hsl(var(--muted-foreground))]">Progress</span>
            <span className="font-mono">{percentage}%</span>
          </div>
          <AchievementProgress
            progress={achievement.progress}
            maxProgress={achievement.maxProgress}
            tier={achievement.tier}
            displayMode="fraction"
          />
        </div>
      ) : null}
    </div>
  );
}

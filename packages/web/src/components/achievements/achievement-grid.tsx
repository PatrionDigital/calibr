'use client';

import { cn } from '@/lib/utils';
import { AchievementCard } from './achievement-card';
import type { Achievement, AchievementCategory } from './types';

// =============================================================================
// Types
// =============================================================================

export interface AchievementGridProps {
  achievements: Achievement[];
  /** @deprecated Use filterCategory instead */
  category?: AchievementCategory;
  filterCategory?: AchievementCategory;
  showUnlockedOnly?: boolean;
  isLoading?: boolean;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

// =============================================================================
// Skeleton
// =============================================================================

function Skeleton() {
  return (
    <div data-testid="achievement-grid-skeleton" className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="ascii-box p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[hsl(var(--muted))] rounded" />
            <div>
              <div className="h-4 w-24 bg-[hsl(var(--muted))] rounded mb-1" />
              <div className="h-3 w-16 bg-[hsl(var(--muted))] rounded" />
            </div>
          </div>
          <div className="h-3 w-full bg-[hsl(var(--muted))] rounded mb-2" />
          <div className="h-2 w-full bg-[hsl(var(--muted))] rounded" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function AchievementGrid({
  achievements,
  category,
  filterCategory,
  showUnlockedOnly = false,
  isLoading = false,
  columns = 2,
  className,
}: AchievementGridProps) {
  // Use filterCategory, falling back to deprecated category prop
  const categoryFilter = filterCategory || category;
  if (isLoading) {
    return <Skeleton />;
  }

  // Filter achievements
  let filteredAchievements = achievements;

  if (categoryFilter) {
    filteredAchievements = filteredAchievements.filter(
      (a) => a.category === categoryFilter
    );
  }

  if (showUnlockedOnly) {
    filteredAchievements = filteredAchievements.filter(
      (a) => a.unlockedAt !== null
    );
  }

  // Count stats
  const unlockedCount = filteredAchievements.filter((a) => a.unlockedAt !== null).length;
  const totalCount = filteredAchievements.length;

  // Empty state
  if (filteredAchievements.length === 0) {
    return (
      <div className="ascii-box p-6 text-center">
        <div className="text-2xl mb-2">🏆</div>
        <div className="text-[hsl(var(--muted-foreground))]">
          No achievements {showUnlockedOnly ? 'unlocked' : 'found'}
        </div>
      </div>
    );
  }

  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns];

  return (
    <div className={className}>
      {/* Header with count */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[hsl(var(--primary))]">
          [ACHIEVEMENTS]
        </h3>
        <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
          {unlockedCount} of {totalCount} unlocked
        </span>
      </div>

      {/* Grid */}
      <div
        data-testid="achievement-grid"
        className={cn('grid gap-4', gridColsClass)}
      >
        {filteredAchievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  );
}

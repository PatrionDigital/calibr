'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface AchievementUnlockRecord {
  achievementId: string;
  achievementName: string;
  achievementIcon: string;
  category: 'streak' | 'accuracy' | 'volume' | 'tier' | 'special';
  tier: string;
  unlockedAt: string;
  totalEligible: number;
  totalUnlocked: number;
}

export interface AchievementAnalyticsData {
  totalAchievements: number;
  totalUnlocked: number;
  overallUnlockRate: number;
  unlocks: AchievementUnlockRecord[];
  periodLabel: string;
}

// =============================================================================
// UnlockRateCard Component
// =============================================================================

interface UnlockRateCardProps {
  totalAchievements: number;
  totalUnlocked: number;
  unlockRate: number;
}

export function UnlockRateCard({ totalAchievements, totalUnlocked, unlockRate }: UnlockRateCardProps) {
  return (
    <div data-testid="unlock-rate-card" className="border border-[var(--terminal-green)] font-mono p-4">
      <div className="text-[var(--terminal-dim)] text-xs mb-2">Unlock Rate</div>
      <div className="text-[var(--terminal-green)] text-3xl font-bold mb-2">{unlockRate}%</div>
      <div className="flex justify-between text-xs text-[var(--terminal-dim)]">
        <span>{totalUnlocked} unlocked</span>
        <span>{totalAchievements} total</span>
      </div>
      <div className="mt-2 h-2 border border-[var(--terminal-dim)]">
        <div
          className="h-full bg-[var(--terminal-green)]"
          style={{ width: `${Math.min(unlockRate, 100)}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// UnlockTimeline Component
// =============================================================================

interface UnlockTimelineProps {
  unlocks: AchievementUnlockRecord[];
}

export function UnlockTimeline({ unlocks }: UnlockTimelineProps) {
  const sorted = useMemo(
    () => [...unlocks].sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()),
    [unlocks]
  );

  return (
    <div data-testid="unlock-timeline" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">Unlock Timeline</div>
      {sorted.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No unlocks yet</div>
      ) : (
        <div className="space-y-1">
          {sorted.map((unlock) => {
            const ts = new Date(unlock.unlockedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            return (
              <div
                key={unlock.achievementId}
                data-testid="timeline-entry"
                className="flex items-center gap-3 p-2 border border-[var(--terminal-dim)]"
              >
                <span className="text-sm">{unlock.achievementIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--terminal-green)] text-sm">{unlock.achievementName}</div>
                  <div className="text-[var(--terminal-dim)] text-xs">{unlock.tier}</div>
                </div>
                <div className="text-[var(--terminal-dim)] text-xs">{ts}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CategoryBreakdownChart Component
// =============================================================================

interface CategoryBreakdownChartProps {
  unlocks: AchievementUnlockRecord[];
}

export function CategoryBreakdownChart({ unlocks }: CategoryBreakdownChartProps) {
  const breakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of unlocks) {
      map[u.category] = (map[u.category] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [unlocks]);

  const maxCount = breakdown.length > 0 ? Math.max(...breakdown.map(([, c]) => c)) : 0;

  return (
    <div data-testid="category-breakdown" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">By Category</div>
      {breakdown.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No data</div>
      ) : (
        <div className="space-y-2">
          {breakdown.map(([category, count]) => (
            <div key={category} data-testid="category-bar">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--terminal-green)] capitalize">{category}</span>
                <span className="text-[var(--terminal-dim)]">{count}</span>
              </div>
              <div className="h-2 border border-[var(--terminal-dim)]">
                <div
                  className="h-full bg-[var(--terminal-green)]"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RarestAchievementsPanel Component
// =============================================================================

interface RarestAchievementsPanelProps {
  unlocks: AchievementUnlockRecord[];
  limit?: number;
}

export function RarestAchievementsPanel({ unlocks, limit = 5 }: RarestAchievementsPanelProps) {
  const sorted = useMemo(
    () =>
      [...unlocks]
        .sort((a, b) => a.totalUnlocked / a.totalEligible - b.totalUnlocked / b.totalEligible)
        .slice(0, limit),
    [unlocks, limit]
  );

  return (
    <div data-testid="rarest-achievements" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">Rarest Achievements</div>
      {sorted.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No achievements</div>
      ) : (
        <div className="space-y-1">
          {sorted.map((unlock) => {
            const rate = ((unlock.totalUnlocked / unlock.totalEligible) * 100).toFixed(1);
            return (
              <div
                key={unlock.achievementId}
                data-testid="rarest-item"
                className="flex items-center gap-2 p-2 border border-[var(--terminal-dim)]"
              >
                <span className="text-sm">{unlock.achievementIcon}</span>
                <span className="text-[var(--terminal-green)] text-sm flex-1">{unlock.achievementName}</span>
                <span className="text-[var(--terminal-dim)] text-xs">{rate}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PopularAchievementsPanel Component
// =============================================================================

interface PopularAchievementsPanelProps {
  unlocks: AchievementUnlockRecord[];
  limit?: number;
}

export function PopularAchievementsPanel({ unlocks, limit = 5 }: PopularAchievementsPanelProps) {
  const sorted = useMemo(
    () =>
      [...unlocks]
        .sort((a, b) => b.totalUnlocked / b.totalEligible - a.totalUnlocked / a.totalEligible)
        .slice(0, limit),
    [unlocks, limit]
  );

  return (
    <div data-testid="popular-achievements" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">Most Popular</div>
      {sorted.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No achievements</div>
      ) : (
        <div className="space-y-1">
          {sorted.map((unlock) => {
            const rate = ((unlock.totalUnlocked / unlock.totalEligible) * 100).toFixed(0);
            return (
              <div
                key={unlock.achievementId}
                data-testid="popular-item"
                className="flex items-center gap-2 p-2 border border-[var(--terminal-dim)]"
              >
                <span className="text-sm">{unlock.achievementIcon}</span>
                <span className="text-[var(--terminal-green)] text-sm flex-1">{unlock.achievementName}</span>
                <span className="text-[var(--terminal-dim)] text-xs">{rate}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AchievementCompletionFunnel Component
// =============================================================================

interface AchievementCompletionFunnelProps {
  unlocks: AchievementUnlockRecord[];
}

const TIER_ORDER = ['NOVICE', 'APPRENTICE', 'EXPERT', 'MASTER', 'GRANDMASTER'];

export function AchievementCompletionFunnel({ unlocks }: AchievementCompletionFunnelProps) {
  const tierCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of unlocks) {
      map[u.tier] = (map[u.tier] ?? 0) + 1;
    }
    return TIER_ORDER.filter((t) => map[t]).map((tier) => ({ tier, count: map[tier]! }));
  }, [unlocks]);

  return (
    <div data-testid="completion-funnel" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">Tier Funnel</div>
      {tierCounts.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No data</div>
      ) : (
        <div className="space-y-1">
          {tierCounts.map(({ tier, count }) => (
            <div
              key={tier}
              data-testid="funnel-step"
              className="flex items-center gap-3 p-2 border border-[var(--terminal-dim)]"
            >
              <span className="text-[var(--terminal-green)] text-xs w-28 capitalize">{tier.toLowerCase()}</span>
              <div className="flex-1 h-2 border border-[var(--terminal-dim)]">
                <div
                  className="h-full bg-[var(--terminal-green)]"
                  style={{ width: `${(count / unlocks.length) * 100}%` }}
                />
              </div>
              <span className="text-[var(--terminal-dim)] text-xs w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AchievementAnalyticsDashboard Component
// =============================================================================

interface AchievementAnalyticsDashboardProps {
  analytics: AchievementAnalyticsData;
  loading?: boolean;
}

export function AchievementAnalyticsDashboard({
  analytics,
  loading = false,
}: AchievementAnalyticsDashboardProps) {
  if (loading) {
    return (
      <div data-testid="analytics-dashboard" className="max-w-4xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="analytics-dashboard" className="max-w-4xl mx-auto p-4 font-mono space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-[var(--terminal-green)] text-2xl">Achievement Analytics</h1>
        <span className="text-[var(--terminal-dim)] text-sm">{analytics.periodLabel}</span>
      </div>

      <UnlockRateCard
        totalAchievements={analytics.totalAchievements}
        totalUnlocked={analytics.totalUnlocked}
        unlockRate={analytics.overallUnlockRate}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <RarestAchievementsPanel unlocks={analytics.unlocks} />
        <PopularAchievementsPanel unlocks={analytics.unlocks} />
      </div>

      <CategoryBreakdownChart unlocks={analytics.unlocks} />
      <AchievementCompletionFunnel unlocks={analytics.unlocks} />
      <UnlockTimeline unlocks={analytics.unlocks} />
    </div>
  );
}

// =============================================================================
// useAchievementAnalytics Hook
// =============================================================================

interface UseAchievementAnalyticsReturn {
  analytics: AchievementAnalyticsData;
  rarestAchievements: AchievementUnlockRecord[];
  popularAchievements: AchievementUnlockRecord[];
  categoryBreakdown: Record<string, number>;
  tierBreakdown: Record<string, number>;
  averageUnlockRate: number;
}

export function useAchievementAnalytics(
  unlocks: AchievementUnlockRecord[],
  totalAchievements: number
): UseAchievementAnalyticsReturn {
  const analytics = useMemo<AchievementAnalyticsData>(() => {
    const totalUnlocked = unlocks.length;
    const overallUnlockRate = totalAchievements > 0
      ? Math.round((totalUnlocked / totalAchievements) * 1000) / 10
      : 0;
    return {
      totalAchievements,
      totalUnlocked,
      overallUnlockRate,
      unlocks,
      periodLabel: 'All Time',
    };
  }, [unlocks, totalAchievements]);

  const rarestAchievements = useMemo(
    () => [...unlocks].sort((a, b) => a.totalUnlocked / a.totalEligible - b.totalUnlocked / b.totalEligible),
    [unlocks]
  );

  const popularAchievements = useMemo(
    () => [...unlocks].sort((a, b) => b.totalUnlocked / b.totalEligible - a.totalUnlocked / a.totalEligible),
    [unlocks]
  );

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of unlocks) {
      map[u.category] = (map[u.category] ?? 0) + 1;
    }
    return map;
  }, [unlocks]);

  const tierBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const u of unlocks) {
      map[u.tier] = (map[u.tier] ?? 0) + 1;
    }
    return map;
  }, [unlocks]);

  const averageUnlockRate = useMemo(() => {
    if (unlocks.length === 0) return 0;
    const sum = unlocks.reduce((acc, u) => acc + (u.totalUnlocked / u.totalEligible) * 100, 0);
    return sum / unlocks.length;
  }, [unlocks]);

  return {
    analytics,
    rarestAchievements,
    popularAchievements,
    categoryBreakdown,
    tierBreakdown,
    averageUnlockRate,
  };
}

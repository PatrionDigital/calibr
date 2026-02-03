'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ACHIEVEMENT_DEFINITIONS } from '../achievement-definitions';
import type { AchievementCategory } from '../achievement-definitions';

// =============================================================================
// Types
// =============================================================================

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  totalForecasts: number;
  accuracyPercent: number;
  currentTier: string;
}

export interface TrackedAchievement {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  completed: boolean;
}

export interface AchievementEvent {
  id: string;
  achievementId: string;
  type: 'unlocked' | 'progress' | 'milestone';
  timestamp: string;
  detail?: string;
}

// =============================================================================
// Tier Ordering
// =============================================================================

const TIER_ORDER: Record<string, number> = {
  NOVICE: 0,
  APPRENTICE: 1,
  EXPERT: 2,
  MASTER: 3,
  GRANDMASTER: 4,
};

// =============================================================================
// Core Logic: evaluateAchievement
// =============================================================================

export function evaluateAchievement(
  achievementId: string,
  stats: UserStats
): TrackedAchievement {
  const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId);
  if (!def) {
    return {
      achievementId,
      currentValue: 0,
      targetValue: 0,
      percentage: 0,
      completed: false,
    };
  }

  let currentValue = 0;

  switch (def.category) {
    case 'streak':
      currentValue = Math.max(stats.currentStreak, stats.longestStreak);
      break;
    case 'volume':
      currentValue = stats.totalForecasts;
      break;
    case 'accuracy':
      currentValue = stats.accuracyPercent;
      break;
    case 'tier': {
      const userTierLevel = TIER_ORDER[stats.currentTier] ?? 0;
      const requiredTierLevel = TIER_ORDER[def.tier] ?? 0;
      currentValue = userTierLevel >= requiredTierLevel ? 1 : 0;
      break;
    }
  }

  const completed = currentValue >= def.targetValue;
  const percentage = def.targetValue > 0
    ? Math.min(100, Math.round((currentValue / def.targetValue) * 100))
    : 0;

  return {
    achievementId,
    currentValue,
    targetValue: def.targetValue,
    percentage,
    completed,
  };
}

// =============================================================================
// Core Logic: checkAchievements
// =============================================================================

export function checkAchievements(stats: UserStats): TrackedAchievement[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => evaluateAchievement(def.id, stats));
}

// =============================================================================
// AchievementTracker Component
// =============================================================================

interface AchievementTrackerProps {
  stats: UserStats;
  category?: AchievementCategory;
}

export function AchievementTracker({ stats, category }: AchievementTrackerProps) {
  const tracked = useMemo(() => checkAchievements(stats), [stats]);
  const filtered = category
    ? tracked.filter((t) => {
        const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === t.achievementId);
        return def?.category === category;
      })
    : tracked;

  const completedCount = filtered.filter((t) => t.completed).length;

  return (
    <div data-testid="achievement-tracker" className="font-mono">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[var(--terminal-green)] font-bold">Achievement Tracker</h3>
        <span className="text-[var(--terminal-green)] text-sm">
          {completedCount}/{filtered.length} completed
        </span>
      </div>
      <div className="space-y-2">
        {filtered.map((t) => {
          const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === t.achievementId);
          if (!def) return null;
          return (
            <div
              key={t.achievementId}
              data-testid="tracked-achievement"
              className={`flex items-center gap-3 p-2 border ${
                t.completed
                  ? 'completed border-[var(--terminal-green)]'
                  : 'border-[var(--terminal-dim)]'
              }`}
            >
              <span className="text-lg">{def.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--terminal-green)]">{def.name}</div>
                {!t.completed && (
                  <div
                    data-testid="tracking-progress-bar"
                    className="h-1.5 border border-[var(--terminal-dim)] bg-black mt-1"
                  >
                    <div
                      className="h-full bg-[var(--terminal-green)] transition-all"
                      style={{ width: `${t.percentage}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="text-xs text-[var(--terminal-dim)]">
                {t.completed ? 'Done' : `${t.percentage}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// AchievementEventLog Component
// =============================================================================

interface AchievementEventLogProps {
  events: AchievementEvent[];
  maxEvents?: number;
}

export function AchievementEventLog({ events, maxEvents }: AchievementEventLogProps) {
  const displayed = maxEvents ? events.slice(0, maxEvents) : events;

  return (
    <div data-testid="achievement-event-log" className="font-mono">
      <h3 className="text-[var(--terminal-green)] font-bold mb-3">Event Log</h3>
      {displayed.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">
          No events yet
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((evt) => {
            const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === evt.achievementId);
            const ts = new Date(evt.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            return (
              <div
                key={evt.id}
                data-testid="event-entry"
                className="flex items-center gap-3 p-2 border border-[var(--terminal-dim)]"
              >
                <span className="text-sm">{def?.icon ?? '?'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--terminal-green)]">
                    {def?.name ?? evt.achievementId}{' '}
                    <span className="text-[var(--terminal-dim)]">
                      — {evt.type === 'unlocked' ? 'Unlocked' : evt.type === 'progress' ? 'Progress' : 'Milestone'}
                    </span>
                  </div>
                  {evt.detail && (
                    <div className="text-xs text-[var(--terminal-dim)]">{evt.detail}</div>
                  )}
                </div>
                <span className="text-xs text-[var(--terminal-dim)]">{ts}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AchievementUnlockBanner Component
// =============================================================================

interface AchievementUnlockBannerProps {
  achievementId: string;
  onDismiss: () => void;
}

export function AchievementUnlockBanner({ achievementId, onDismiss }: AchievementUnlockBannerProps) {
  const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId);

  return (
    <div
      data-testid="unlock-banner"
      className="border-2 border-[var(--terminal-green)] bg-black font-mono p-4 flex items-center gap-4"
    >
      <span className="text-3xl">{def?.icon ?? '🏆'}</span>
      <div className="flex-1">
        <div className="text-[var(--terminal-green)] font-bold text-lg">
          Achievement Unlocked!
        </div>
        <div className="text-[var(--terminal-green)]">
          {def?.name ?? achievementId}
        </div>
        {def && (
          <div className="text-[var(--terminal-dim)] text-sm">{def.description}</div>
        )}
      </div>
      <button
        data-testid="dismiss-banner"
        onClick={onDismiss}
        className="border border-[var(--terminal-green)] text-[var(--terminal-green)] px-3 py-1 text-sm hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
      >
        OK
      </button>
    </div>
  );
}

// =============================================================================
// NearestAchievementCard Component
// =============================================================================

interface NearestAchievementCardProps {
  stats: UserStats;
}

export function NearestAchievementCard({ stats }: NearestAchievementCardProps) {
  const tracked = useMemo(() => checkAchievements(stats), [stats]);

  const nearest = useMemo(() => {
    const incomplete = tracked
      .filter((t) => !t.completed && t.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);
    return incomplete[0] ?? null;
  }, [tracked]);

  const def = nearest
    ? ACHIEVEMENT_DEFINITIONS.find((a) => a.id === nearest.achievementId)
    : null;

  return (
    <div data-testid="nearest-achievement" className="border border-[var(--terminal-green)] font-mono p-4">
      <h3 className="text-[var(--terminal-green)] font-bold mb-2">Next Achievement</h3>
      {nearest && def ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{def.icon}</span>
            <span className="text-[var(--terminal-green)] font-bold">{def.name}</span>
          </div>
          <div
            data-testid="nearest-progress-bar"
            className="h-3 border border-[var(--terminal-green)] bg-black mb-1"
          >
            <div
              className="h-full bg-[var(--terminal-green)] transition-all"
              style={{ width: `${nearest.percentage}%` }}
            />
          </div>
          <div className="text-right text-[var(--terminal-dim)] text-xs">
            {nearest.currentValue}/{nearest.targetValue} ({nearest.percentage}%)
          </div>
        </div>
      ) : (
        <div className="text-[var(--terminal-green)] text-center py-2">
          All achievements completed!
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AchievementTrackerDashboard Component
// =============================================================================

interface AchievementTrackerDashboardProps {
  stats: UserStats;
  events: AchievementEvent[];
  loading?: boolean;
}

export function AchievementTrackerDashboard({
  stats,
  events,
  loading = false,
}: AchievementTrackerDashboardProps) {
  if (loading) {
    return (
      <div data-testid="achievement-tracker-dashboard" className="max-w-4xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading tracker...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="achievement-tracker-dashboard" className="max-w-4xl mx-auto p-4 font-mono space-y-6">
      <h1 className="text-[var(--terminal-green)] text-2xl">Achievement Tracker</h1>

      <NearestAchievementCard stats={stats} />

      <AchievementTracker stats={stats} />

      <AchievementEventLog events={events} maxEvents={10} />
    </div>
  );
}

// =============================================================================
// useAchievementTracker Hook
// =============================================================================

interface UseAchievementTrackerReturn {
  trackedAchievements: TrackedAchievement[];
  completedCount: number;
  totalCount: number;
  nearestAchievement: TrackedAchievement | null;
  newlyUnlocked: string[];
  dismissUnlock: (achievementId: string) => void;
}

export function useAchievementTracker(stats: UserStats): UseAchievementTrackerReturn {
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const prevCompletedRef = useRef<Set<string>>(new Set());

  const trackedAchievements = useMemo(() => checkAchievements(stats), [stats]);

  const completedCount = useMemo(
    () => trackedAchievements.filter((t) => t.completed).length,
    [trackedAchievements]
  );

  const nearestAchievement = useMemo(() => {
    const incomplete = trackedAchievements
      .filter((t) => !t.completed && t.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage);
    return incomplete[0] ?? null;
  }, [trackedAchievements]);

  useEffect(() => {
    const currentCompleted = new Set(
      trackedAchievements.filter((t) => t.completed).map((t) => t.achievementId)
    );
    const prev = prevCompletedRef.current;

    const unlocked: string[] = [];
    for (const id of currentCompleted) {
      if (!prev.has(id)) {
        unlocked.push(id);
      }
    }

    if (unlocked.length > 0) {
      setNewlyUnlocked((existing) => [...existing, ...unlocked]);
    }

    prevCompletedRef.current = currentCompleted;
  }, [trackedAchievements]);

  const dismissUnlock = useCallback((achievementId: string) => {
    setNewlyUnlocked((prev) => prev.filter((id) => id !== achievementId));
  }, []);

  return {
    trackedAchievements,
    completedCount,
    totalCount: ACHIEVEMENT_DEFINITIONS.length,
    nearestAchievement,
    newlyUnlocked,
    dismissUnlock,
  };
}

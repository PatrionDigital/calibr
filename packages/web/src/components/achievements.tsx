'use client';

import { useState, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

type AchievementCategory = 'STREAK' | 'VOLUME' | 'ACCURACY' | 'CALIBRATION' | 'SPECIAL';
type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  unlockedAt: Date | null;
  progress: number;
  maxProgress: number;
}

// AchievementDefinition type available if needed:
// { id, name, description, category, tier, maxProgress }

// =============================================================================
// Constants
// =============================================================================

const TIER_COLORS: Record<AchievementTier, string> = {
  BRONZE: 'text-amber-600',
  SILVER: 'text-gray-300',
  GOLD: 'text-yellow-400',
  PLATINUM: 'text-blue-200',
  DIAMOND: 'text-cyan-300',
};

const TIER_BORDERS: Record<AchievementTier, string> = {
  BRONZE: 'border-amber-600',
  SILVER: 'border-gray-300',
  GOLD: 'border-yellow-400',
  PLATINUM: 'border-blue-200',
  DIAMOND: 'border-cyan-300',
};

const TIER_BADGES: Record<AchievementTier, string> = {
  BRONZE: '[B]',
  SILVER: '[S]',
  GOLD: '[G]',
  PLATINUM: '[P]',
  DIAMOND: '[D]',
};

const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  STREAK: '🔥',
  VOLUME: '📊',
  ACCURACY: '🎯',
  CALIBRATION: '⚖️',
  SPECIAL: '⭐',
};

// =============================================================================
// Components
// =============================================================================

function AchievementBadge({ tier }: { tier: AchievementTier }) {
  return (
    <span className={`font-mono text-xs ${TIER_COLORS[tier]}`}>
      {TIER_BADGES[tier]}
    </span>
  );
}

function ProgressBar({ progress, maxProgress }: { progress: number; maxProgress: number }) {
  const percentage = Math.min((progress / maxProgress) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[hsl(var(--accent))] overflow-hidden">
        <div
          className="h-full bg-[hsl(var(--primary))] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
        {progress}/{maxProgress}
      </span>
    </div>
  );
}

export function AchievementCard({
  achievement,
  compact = false,
}: {
  achievement: Achievement;
  compact?: boolean;
}) {
  const isUnlocked = achievement.unlockedAt !== null;

  if (compact) {
    return (
      <div
        className={`ascii-box p-2 ${
          isUnlocked
            ? TIER_BORDERS[achievement.tier]
            : 'border-[hsl(var(--border))] opacity-60'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{CATEGORY_ICONS[achievement.category]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <AchievementBadge tier={achievement.tier} />
              <span className="text-sm truncate">{achievement.name}</span>
            </div>
          </div>
          {isUnlocked ? (
            <span className="text-[hsl(var(--success))]">✓</span>
          ) : (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {Math.round((achievement.progress / achievement.maxProgress) * 100)}%
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ascii-box p-4 ${
        isUnlocked
          ? TIER_BORDERS[achievement.tier]
          : 'border-[hsl(var(--border))] opacity-75'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{CATEGORY_ICONS[achievement.category]}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AchievementBadge tier={achievement.tier} />
            <h4 className={`font-bold ${isUnlocked ? TIER_COLORS[achievement.tier] : ''}`}>
              {achievement.name}
            </h4>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
            {achievement.description}
          </p>
          {!isUnlocked && (
            <ProgressBar
              progress={achievement.progress}
              maxProgress={achievement.maxProgress}
            />
          )}
          {isUnlocked && (
            <p className="text-xs text-[hsl(var(--success))]">
              Unlocked {new Date(achievement.unlockedAt!).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AchievementGrid({
  achievements,
  category,
}: {
  achievements: Achievement[];
  category?: AchievementCategory;
}) {
  const filtered = category
    ? achievements.filter((a) => a.category === category)
    : achievements;

  const unlocked = filtered.filter((a) => a.unlockedAt !== null);
  const inProgress = filtered.filter((a) => a.unlockedAt === null && a.progress > 0);
  const locked = filtered.filter((a) => a.unlockedAt === null && a.progress === 0);

  return (
    <div className="space-y-6">
      {unlocked.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[hsl(var(--success))] mb-3">
            [UNLOCKED] ({unlocked.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {unlocked.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}

      {inProgress.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[hsl(var(--warning))] mb-3">
            [IN PROGRESS] ({inProgress.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {inProgress.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[hsl(var(--muted-foreground))] mb-3">
            [LOCKED] ({locked.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {locked.map((a) => (
              <AchievementCard key={a.id} achievement={a} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AchievementSummary({
  unlockedCount,
  totalCount,
  achievementScore,
}: {
  unlockedCount: number;
  totalCount: number;
  achievementScore: number;
}) {
  const percentage = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="ascii-box p-4">
      <h3 className="text-sm font-bold text-[hsl(var(--primary))] mb-3">
        [ACHIEVEMENT PROGRESS]
      </h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-[hsl(var(--primary))]">
            {unlockedCount}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Unlocked</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{totalCount}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Total</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-[hsl(var(--warning))]">
            {achievementScore}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Score</div>
        </div>
      </div>
      <div className="mt-4">
        <ProgressBar progress={unlockedCount} maxProgress={totalCount} />
      </div>
      <div className="text-center mt-2 text-sm text-[hsl(var(--muted-foreground))]">
        {percentage}% Complete
      </div>
    </div>
  );
}

export function AchievementCategoryFilter({
  selected,
  onSelect,
}: {
  selected: AchievementCategory | 'ALL';
  onSelect: (category: AchievementCategory | 'ALL') => void;
}) {
  const categories: (AchievementCategory | 'ALL')[] = [
    'ALL',
    'STREAK',
    'VOLUME',
    'ACCURACY',
    'CALIBRATION',
    'SPECIAL',
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-3 py-1 text-sm font-mono border transition-colors ${
            selected === cat
              ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
              : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'
          }`}
        >
          {cat === 'ALL' ? 'ALL' : `${CATEGORY_ICONS[cat]} ${cat}`}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Achievement Panel (Full Component)
// =============================================================================

interface AchievementPanelProps {
  userId?: string;
}

export function AchievementPanel({ userId }: AchievementPanelProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'ALL'>('ALL');
  const [stats, setStats] = useState({
    unlockedCount: 0,
    totalCount: 0,
    achievementScore: 0,
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    async function fetchAchievements() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/leaderboard/achievements/user/${userId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch achievements');
        }

        const data = await response.json();
        if (data.success) {
          // Combine unlocked and in-progress achievements
          const allAchievements = [...data.data.unlocked, ...data.data.inProgress];
          setAchievements(allAchievements);
          setStats({
            unlockedCount: data.data.unlockedCount,
            totalCount: data.data.totalCount,
            achievementScore: data.data.achievementScore,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAchievements();
  }, [API_BASE, userId]);

  if (!userId) {
    return (
      <div className="ascii-box p-4">
        <h3 className="text-sm font-bold text-[hsl(var(--primary))] mb-3">
          [ACHIEVEMENTS]
        </h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Connect wallet to view your achievements
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ascii-box p-4">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Loading achievements...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ascii-box p-4 border-[hsl(var(--destructive))]">
        <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AchievementSummary
        unlockedCount={stats.unlockedCount}
        totalCount={stats.totalCount}
        achievementScore={stats.achievementScore}
      />

      <div>
        <h3 className="text-sm font-bold text-[hsl(var(--primary))] mb-3">
          [FILTER BY CATEGORY]
        </h3>
        <AchievementCategoryFilter
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      <AchievementGrid
        achievements={achievements}
        category={selectedCategory === 'ALL' ? undefined : selectedCategory}
      />
    </div>
  );
}

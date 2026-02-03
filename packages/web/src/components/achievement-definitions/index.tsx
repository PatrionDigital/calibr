'use client';

import { useState, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type AchievementCategory = 'streak' | 'accuracy' | 'volume' | 'tier' | 'special';
export type AchievementTier = 'NOVICE' | 'APPRENTICE' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  targetValue: number;
  tier: AchievementTier;
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  completed: boolean;
  completedAt?: string;
}

// =============================================================================
// Achievement Definitions Constants
// =============================================================================

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Streak achievements
  {
    id: 'streak-7',
    name: '7 Day Streak',
    description: 'Forecast for 7 consecutive days',
    category: 'streak',
    icon: '🔥',
    targetValue: 7,
    tier: 'NOVICE',
  },
  {
    id: 'streak-30',
    name: '30 Day Streak',
    description: 'Forecast for 30 consecutive days',
    category: 'streak',
    icon: '🔥',
    targetValue: 30,
    tier: 'EXPERT',
  },
  {
    id: 'streak-100',
    name: '100 Day Streak',
    description: 'Forecast for 100 consecutive days',
    category: 'streak',
    icon: '💪',
    targetValue: 100,
    tier: 'MASTER',
  },
  // Accuracy achievements
  {
    id: 'accuracy-70',
    name: 'Calibrated',
    description: 'Achieve 70% accuracy over 50 forecasts',
    category: 'accuracy',
    icon: '🎯',
    targetValue: 70,
    tier: 'APPRENTICE',
  },
  {
    id: 'accuracy-80',
    name: 'Sharp Shooter',
    description: 'Achieve 80% accuracy over 100 forecasts',
    category: 'accuracy',
    icon: '🎯',
    targetValue: 80,
    tier: 'EXPERT',
  },
  {
    id: 'accuracy-90',
    name: 'Oracle',
    description: 'Achieve 90% accuracy over 200 forecasts',
    category: 'accuracy',
    icon: '🔮',
    targetValue: 90,
    tier: 'GRANDMASTER',
  },
  // Volume achievements
  {
    id: 'forecasts-10',
    name: 'Getting Started',
    description: 'Complete 10 forecasts',
    category: 'volume',
    icon: '📊',
    targetValue: 10,
    tier: 'NOVICE',
  },
  {
    id: 'forecasts-50',
    name: 'Active Forecaster',
    description: 'Complete 50 forecasts',
    category: 'volume',
    icon: '📊',
    targetValue: 50,
    tier: 'APPRENTICE',
  },
  {
    id: 'forecasts-200',
    name: 'Dedicated Analyst',
    description: 'Complete 200 forecasts',
    category: 'volume',
    icon: '📈',
    targetValue: 200,
    tier: 'EXPERT',
  },
  {
    id: 'forecasts-1000',
    name: 'Forecasting Machine',
    description: 'Complete 1000 forecasts',
    category: 'volume',
    icon: '🏭',
    targetValue: 1000,
    tier: 'MASTER',
  },
  // Tier achievements
  {
    id: 'tier-apprentice',
    name: 'Apprentice',
    description: 'Reach Apprentice tier',
    category: 'tier',
    icon: '🌱',
    targetValue: 1,
    tier: 'APPRENTICE',
  },
  {
    id: 'tier-expert',
    name: 'Expert Forecaster',
    description: 'Reach Expert tier',
    category: 'tier',
    icon: '⭐',
    targetValue: 1,
    tier: 'EXPERT',
  },
  {
    id: 'tier-master',
    name: 'Master Forecaster',
    description: 'Reach Master tier',
    category: 'tier',
    icon: '💎',
    targetValue: 1,
    tier: 'MASTER',
  },
  {
    id: 'tier-grandmaster',
    name: 'Grandmaster',
    description: 'Reach Grandmaster tier',
    category: 'tier',
    icon: '👑',
    targetValue: 1,
    tier: 'GRANDMASTER',
  },
];

// =============================================================================
// AchievementList Component
// =============================================================================

interface AchievementListProps {
  definitions: AchievementDefinition[];
  progress: AchievementProgress[];
  onSelect?: (achievementId: string) => void;
}

export function AchievementList({ definitions, progress, onSelect }: AchievementListProps) {
  const progressMap = useMemo(() => {
    const map = new Map<string, AchievementProgress>();
    for (const p of progress) {
      map.set(p.achievementId, p);
    }
    return map;
  }, [progress]);

  return (
    <div data-testid="achievement-list" className="space-y-2 font-mono">
      {definitions.map((def) => {
        const prog = progressMap.get(def.id);
        return (
          <div
            key={def.id}
            data-testid="achievement-list-item"
            onClick={() => onSelect?.(def.id)}
            className={`flex items-center gap-3 p-3 border transition-colors ${
              prog?.completed
                ? 'border-[var(--terminal-green)]'
                : 'border-[var(--terminal-dim)]'
            } ${onSelect ? 'cursor-pointer hover:bg-[var(--terminal-green)] hover:bg-opacity-10' : ''}`}
          >
            <span className="text-xl">{def.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[var(--terminal-green)] font-bold text-sm">{def.name}</div>
              <div className="text-[var(--terminal-dim)] text-xs">{def.description}</div>
            </div>
            <div className="text-right">
              {prog?.completed ? (
                <span className="text-[var(--terminal-green)] text-xs">Completed</span>
              ) : prog ? (
                <span className="text-[var(--terminal-dim)] text-xs">{prog.percentage}%</span>
              ) : (
                <span className="text-[var(--terminal-dim)] text-xs">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// AchievementDetail Component
// =============================================================================

interface AchievementDetailProps {
  definition: AchievementDefinition;
  progress: AchievementProgress;
}

export function AchievementDetail({ definition, progress }: AchievementDetailProps) {
  const formattedDate = progress.completedAt
    ? new Date(progress.completedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div data-testid="achievement-detail" className="border border-[var(--terminal-green)] font-mono p-4">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">{definition.icon}</span>
        <div>
          <h3 className="text-[var(--terminal-green)] font-bold text-lg">{definition.name}</h3>
          <p className="text-[var(--terminal-dim)] text-sm">{definition.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Tier</div>
          <div className="text-[var(--terminal-green)] font-bold">{definition.tier}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Category</div>
          <div className="text-[var(--terminal-green)]">{definition.category}</div>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[var(--terminal-dim)]">Progress</span>
          <span className="text-[var(--terminal-green)]">
            {progress.currentValue}/{progress.targetValue}
          </span>
        </div>
        <div className="h-3 border border-[var(--terminal-green)] bg-black">
          <div
            className="h-full bg-[var(--terminal-green)] transition-all"
            style={{ width: `${Math.min(progress.percentage, 100)}%` }}
          />
        </div>
      </div>

      {progress.completed && (
        <div className="text-center text-[var(--terminal-green)] text-sm mt-3">
          Completed{formattedDate ? ` on ${formattedDate}` : ''}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AchievementCategoryFilter Component
// =============================================================================

interface AchievementCategoryFilterProps {
  categories: AchievementCategory[];
  selected: string;
  onSelect: (category: string) => void;
}

export function AchievementCategoryFilter({
  categories,
  selected,
  onSelect,
}: AchievementCategoryFilterProps) {
  return (
    <div data-testid="achievement-category-filter" className="flex flex-wrap gap-2 font-mono">
      <button
        data-testid="category-all"
        onClick={() => onSelect('all')}
        className={`border px-3 py-1 text-sm transition-colors ${
          selected === 'all'
            ? 'selected border-[var(--terminal-green)] bg-[var(--terminal-green)] text-black'
            : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          data-testid={`category-${cat}`}
          onClick={() => onSelect(cat)}
          className={`border px-3 py-1 text-sm transition-colors capitalize ${
            selected === cat
              ? 'selected border-[var(--terminal-green)] bg-[var(--terminal-green)] text-black'
              : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// AchievementProgressCard Component
// =============================================================================

interface AchievementProgressCardProps {
  progress: AchievementProgress;
  definition: AchievementDefinition;
}

export function AchievementProgressCard({ progress, definition }: AchievementProgressCardProps) {
  return (
    <div data-testid="achievement-progress-card" className="border border-[var(--terminal-green)] font-mono p-3">
      <div className="flex items-center gap-2 mb-2">
        <span>{definition.icon}</span>
        <span className="text-[var(--terminal-green)] font-bold text-sm">{definition.name}</span>
        {progress.completed && (
          <span className="text-[var(--terminal-green)] text-xs ml-auto">Completed</span>
        )}
      </div>
      <div data-testid="progress-bar" className="h-2 border border-[var(--terminal-green)] bg-black">
        <div
          className="h-full bg-[var(--terminal-green)] transition-all"
          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
        />
      </div>
      <div className="text-right text-[var(--terminal-dim)] text-xs mt-1">
        {progress.percentage}%
      </div>
    </div>
  );
}

// =============================================================================
// AchievementMilestone Component
// =============================================================================

interface AchievementMilestoneProps {
  label: string;
  currentValue: number;
  milestoneValue: number;
  icon: string;
}

export function AchievementMilestone({
  label,
  currentValue,
  milestoneValue,
  icon,
}: AchievementMilestoneProps) {
  const isReached = currentValue >= milestoneValue;

  return (
    <div
      data-testid="achievement-milestone"
      className={`flex items-center gap-3 p-3 border font-mono ${
        isReached
          ? 'reached border-[var(--terminal-green)]'
          : 'border-[var(--terminal-dim)]'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <div className={isReached ? 'text-[var(--terminal-green)]' : 'text-[var(--terminal-dim)]'}>
          {label}
        </div>
      </div>
      <div className="text-right text-sm">
        <span className="text-[var(--terminal-green)]">{currentValue}</span>
        <span className="text-[var(--terminal-dim)]">/{milestoneValue}</span>
      </div>
    </div>
  );
}

// =============================================================================
// AchievementDefinitionsPage Component
// =============================================================================

interface AchievementDefinitionsPageProps {
  progress: AchievementProgress[];
  loading?: boolean;
}

export function AchievementDefinitionsPage({ progress, loading = false }: AchievementDefinitionsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories: AchievementCategory[] = ['streak', 'accuracy', 'volume', 'tier'];

  if (loading) {
    return (
      <div data-testid="achievement-definitions-page" className="max-w-4xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading achievements...</div>
        </div>
      </div>
    );
  }

  const filtered =
    selectedCategory === 'all'
      ? ACHIEVEMENT_DEFINITIONS
      : ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === selectedCategory);

  return (
    <div data-testid="achievement-definitions-page" className="max-w-4xl mx-auto p-4 font-mono">
      <h1 className="text-[var(--terminal-green)] text-2xl mb-6">Achievements</h1>

      <div className="mb-4">
        <AchievementCategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      <AchievementList definitions={filtered} progress={progress} />
    </div>
  );
}

// =============================================================================
// useAchievementDefinitions Hook
// =============================================================================

interface UseAchievementDefinitionsReturn {
  definitions: AchievementDefinition[];
  filteredDefinitions: AchievementDefinition[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  completedCount: number;
  totalCount: number;
  nextAchievement: AchievementDefinition | null;
}

export function useAchievementDefinitions(
  progress: AchievementProgress[]
): UseAchievementDefinitionsReturn {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const completedIds = useMemo(() => {
    return new Set(progress.filter((p) => p.completed).map((p) => p.achievementId));
  }, [progress]);

  const filteredDefinitions = useMemo(() => {
    if (selectedCategory === 'all') return ACHIEVEMENT_DEFINITIONS;
    return ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === selectedCategory);
  }, [selectedCategory]);

  const nextAchievement = useMemo(() => {
    const incomplete = progress
      .filter((p) => !p.completed)
      .sort((a, b) => b.percentage - a.percentage);
    if (incomplete.length === 0) return null;
    return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === incomplete[0]!.achievementId) ?? null;
  }, [progress]);

  return {
    definitions: ACHIEVEMENT_DEFINITIONS,
    filteredDefinitions,
    selectedCategory,
    setSelectedCategory,
    completedCount: completedIds.size,
    totalCount: ACHIEVEMENT_DEFINITIONS.length,
    nextAchievement,
  };
}

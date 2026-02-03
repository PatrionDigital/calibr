'use client';

import { useState, useMemo } from 'react';
import { TierBadge, type LeaderboardTier } from '../leaderboard';

// =============================================================================
// Types
// =============================================================================

export interface LeaderboardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  entryCount: number;
}

export interface PlatformLeaderboard {
  id: string;
  name: string;
  icon: string;
  topForecasters: {
    address: string;
    ensName: string | null;
    score: number;
    rank: number;
  }[];
  totalParticipants: number;
}

export interface CategoryEntry {
  address: string;
  ensName: string | null;
  score: number;
  rank: number;
  brierScore: number;
  forecasts: number;
  tier: LeaderboardTier;
}

// =============================================================================
// CategorySelector Component
// =============================================================================

interface CategorySelectorProps {
  categories: LeaderboardCategory[];
  selectedId: string;
  onSelect: (id: string) => void;
  compact?: boolean;
}

export function CategorySelector({
  categories,
  selectedId,
  onSelect,
  compact = false,
}: CategorySelectorProps) {
  return (
    <div
      data-testid="category-selector"
      className={`flex flex-wrap gap-2 font-mono ${compact ? 'compact gap-1' : ''}`}
    >
      {categories.map((category) => (
        <button
          key={category.id}
          data-testid={`category-option-${category.id}`}
          onClick={() => onSelect(category.id)}
          className={`border px-3 py-2 text-sm transition-colors ${
            selectedId === category.id
              ? 'selected border-[var(--terminal-green)] bg-[var(--terminal-green)] text-black'
              : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
          } ${compact ? 'px-2 py-1 text-xs' : ''}`}
        >
          <span className="mr-1">{category.icon}</span>
          <span>{category.name}</span>
          <span className="ml-2 opacity-60 text-xs">
            {category.entryCount.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// CategoryLeaderboardCard Component
// =============================================================================

interface CategoryLeaderboardCardProps {
  category: LeaderboardCategory;
  entries: CategoryEntry[];
  maxEntries?: number;
  onViewAll?: (categoryId: string) => void;
}

export function CategoryLeaderboardCard({
  category,
  entries,
  maxEntries = 5,
  onViewAll,
}: CategoryLeaderboardCardProps) {
  const displayEntries = entries.slice(0, maxEntries);

  return (
    <div data-testid="category-leaderboard-card" className="border border-[var(--terminal-green)] font-mono">
      <div className="p-4 border-b border-[var(--terminal-green)] bg-[var(--terminal-green)] bg-opacity-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">{category.icon}</span>
          <div>
            <h3 className="text-[var(--terminal-green)] font-bold">{category.name}</h3>
            <p className="text-[var(--terminal-dim)] text-xs">{category.description}</p>
          </div>
        </div>
      </div>

      {displayEntries.length === 0 ? (
        <div className="p-4 text-center text-[var(--terminal-dim)]">
          No forecasters in this category
        </div>
      ) : (
        <div>
          {displayEntries.map((entry) => (
            <div
              key={entry.address}
              className="flex items-center gap-3 p-3 border-b border-[var(--terminal-green)] border-opacity-20"
            >
              <div className="w-10 text-[var(--terminal-green)] font-bold">#{entry.rank}</div>
              <div className="flex-1">
                <div className="text-[var(--terminal-green)]">{entry.ensName || entry.address}</div>
                <TierBadge tier={entry.tier} compact />
              </div>
              <div className="text-right">
                <div className="text-[var(--terminal-green)] font-bold">{entry.score}</div>
                <div className="text-[var(--terminal-dim)] text-xs">{entry.brierScore.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {onViewAll && entries.length > 0 && (
        <button
          onClick={() => onViewAll(category.id)}
          className="w-full p-3 text-center text-[var(--terminal-green)] text-sm hover:bg-[var(--terminal-green)] hover:bg-opacity-10 transition-colors"
        >
          View all {category.entryCount.toLocaleString()} forecasters →
        </button>
      )}
    </div>
  );
}

// =============================================================================
// PlatformLeaderboardCard Component
// =============================================================================

interface PlatformLeaderboardCardProps {
  platform: PlatformLeaderboard;
}

export function PlatformLeaderboardCard({ platform }: PlatformLeaderboardCardProps) {
  return (
    <div data-testid="platform-leaderboard-card" className="border border-[var(--terminal-green)] font-mono">
      <div className="p-4 border-b border-[var(--terminal-green)] bg-[var(--terminal-green)] bg-opacity-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{platform.icon}</span>
            <h3 className="text-[var(--terminal-green)] font-bold">{platform.name}</h3>
          </div>
          <span className="text-[var(--terminal-dim)] text-xs">
            {platform.totalParticipants.toLocaleString()} participants
          </span>
        </div>
      </div>

      <div>
        {platform.topForecasters.map((forecaster) => (
          <div
            key={forecaster.address}
            className="flex items-center gap-3 p-3 border-b border-[var(--terminal-green)] border-opacity-20"
          >
            <div className="w-10 text-[var(--terminal-green)] font-bold">#{forecaster.rank}</div>
            <div className="flex-1 text-[var(--terminal-green)]">
              {forecaster.ensName || forecaster.address}
            </div>
            <div className="text-[var(--terminal-green)] font-bold">{forecaster.score}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// CategoryStatsBar Component
// =============================================================================

interface CategoryStatsBarProps {
  categories: LeaderboardCategory[];
}

export function CategoryStatsBar({ categories }: CategoryStatsBarProps) {
  const totalForecasters = categories.reduce((sum, c) => sum + c.entryCount, 0);
  const largestCategory = categories.length > 0
    ? categories.reduce((max, c) => (c.entryCount > max.entryCount ? c : max), categories[0]!)
    : null;

  return (
    <div data-testid="category-stats-bar" className="flex flex-wrap gap-6 p-4 border border-[var(--terminal-green)] font-mono mb-6">
      <div>
        <div className="text-[var(--terminal-dim)] text-xs">Total Forecasters</div>
        <div className="text-[var(--terminal-green)] font-bold">{totalForecasters.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-[var(--terminal-dim)] text-xs">Categories</div>
        <div className="text-[var(--terminal-green)] font-bold">{categories.length} categories</div>
      </div>
      {largestCategory && (
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Largest Category</div>
          <div className="text-[var(--terminal-green)] font-bold">
            {largestCategory.icon} {largestCategory.name}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LeaderboardCategoriesPage Component
// =============================================================================

interface LeaderboardCategoriesPageProps {
  categories: LeaderboardCategory[];
  platforms: PlatformLeaderboard[];
  entries: CategoryEntry[];
  loading?: boolean;
}

export function LeaderboardCategoriesPage({
  categories,
  platforms,
  entries,
  loading = false,
}: LeaderboardCategoriesPageProps) {
  const [selectedCategory, setSelectedCategory] = useState('overall');

  if (loading) {
    return (
      <div data-testid="leaderboard-categories-page" className="max-w-4xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading leaderboard categories...</div>
        </div>
      </div>
    );
  }

  const selectedCat = categories.find((c) => c.id === selectedCategory);

  return (
    <div data-testid="leaderboard-categories-page" className="max-w-4xl mx-auto p-4 font-mono">
      <h1 className="text-[var(--terminal-green)] text-2xl mb-6">Category Leaderboards</h1>

      <CategoryStatsBar categories={categories} />

      <div className="mb-6">
        <CategorySelector
          categories={categories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {selectedCat && (
        <div className="mb-6">
          <CategoryLeaderboardCard category={selectedCat} entries={entries} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-[var(--terminal-green)] text-lg mb-4">Platform Leaderboards</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <PlatformLeaderboardCard key={platform.id} platform={platform} />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// useCategoryLeaderboard Hook
// =============================================================================

interface CategoryStats {
  totalEntries: number;
  categoryCount: number;
  largestCategory: string | null;
}

interface UseCategoryLeaderboardReturn {
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  filteredEntries: CategoryEntry[];
  categoryStats: CategoryStats;
}

export function useCategoryLeaderboard(
  categories: LeaderboardCategory[],
  entries: CategoryEntry[]
): UseCategoryLeaderboardReturn {
  const [selectedCategory, setSelectedCategory] = useState('overall');

  const filteredEntries = useMemo(() => {
    // For 'overall', return all entries; for specific categories, would filter
    // In a real implementation, entries would have a category field
    return entries;
  }, [entries, selectedCategory]);

  const categoryStats = useMemo<CategoryStats>(() => {
    const largest = categories.length > 0
      ? categories.reduce((max, c) => (c.entryCount > max.entryCount ? c : max), categories[0]!).name
      : null;

    return {
      totalEntries: entries.length,
      categoryCount: categories.length,
      largestCategory: largest,
    };
  }, [categories, entries]);

  return {
    selectedCategory,
    setSelectedCategory,
    filteredEntries,
    categoryStats,
  };
}

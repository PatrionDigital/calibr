'use client';

import { cn } from '@/lib/utils';
import type { SuperforecasterTier } from './tier-badge';

// =============================================================================
// Types
// =============================================================================

type LeaderboardCategory = 'OVERALL' | 'POLYMARKET' | 'LIMITLESS' | 'CRYPTO' | 'POLITICS' | 'SPORTS';

interface LeaderboardFilterState {
  tier?: SuperforecasterTier;
  category?: LeaderboardCategory;
  minForecasts?: number;
}

interface LeaderboardFiltersProps {
  onFilterChange: (filters: LeaderboardFilterState) => void;
  currentFilters: LeaderboardFilterState;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_OPTIONS: { value: SuperforecasterTier | ''; label: string }[] = [
  { value: '', label: 'All Tiers' },
  { value: 'GRANDMASTER', label: 'Grandmaster' },
  { value: 'MASTER', label: 'Master' },
  { value: 'EXPERT', label: 'Expert' },
  { value: 'JOURNEYMAN', label: 'Journeyman' },
  { value: 'APPRENTICE', label: 'Apprentice' },
];

const CATEGORY_OPTIONS: { value: LeaderboardCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'OVERALL', label: 'Overall' },
  { value: 'POLYMARKET', label: 'Polymarket' },
  { value: 'LIMITLESS', label: 'Limitless' },
  { value: 'CRYPTO', label: 'Crypto' },
  { value: 'POLITICS', label: 'Politics' },
  { value: 'SPORTS', label: 'Sports' },
];

const MIN_FORECASTS_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 10, label: '10+' },
  { value: 50, label: '50+' },
  { value: 100, label: '100+' },
  { value: 500, label: '500+' },
];

// =============================================================================
// Component
// =============================================================================

export function LeaderboardFilters({
  onFilterChange,
  currentFilters,
  className,
}: LeaderboardFiltersProps) {
  const activeFilterCount = Object.values(currentFilters).filter(
    (v) => v !== undefined && v !== '' && v !== 0
  ).length;

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SuperforecasterTier | '';
    onFilterChange({
      ...currentFilters,
      tier: value || undefined,
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as LeaderboardCategory | '';
    onFilterChange({
      ...currentFilters,
      category: value || undefined,
    });
  };

  const handleMinForecastsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    onFilterChange({
      ...currentFilters,
      minForecasts: value || undefined,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({});
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Tier Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-[hsl(var(--muted-foreground))]">TIER:</label>
        <select
          data-testid="tier-filter"
          value={currentFilters.tier || ''}
          onChange={handleTierChange}
          className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-2 py-1 text-sm font-mono focus:border-[hsl(var(--primary))] focus:outline-none"
        >
          {TIER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-[hsl(var(--muted-foreground))]">CATEGORY:</label>
        <select
          data-testid="category-filter"
          value={currentFilters.category || ''}
          onChange={handleCategoryChange}
          className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-2 py-1 text-sm font-mono focus:border-[hsl(var(--primary))] focus:outline-none"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Min Forecasts Filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-[hsl(var(--muted-foreground))]">MIN:</label>
        <select
          data-testid="min-forecasts-filter"
          value={currentFilters.minForecasts || 0}
          onChange={handleMinForecastsChange}
          className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded px-2 py-1 text-sm font-mono focus:border-[hsl(var(--primary))] focus:outline-none"
        >
          {MIN_FORECASTS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Button + Active Count */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span
            data-testid="active-filters-badge"
            className="text-xs px-1.5 py-0.5 bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] rounded font-mono"
          >
            {activeFilterCount}
          </span>
          <button
            onClick={handleClearFilters}
            className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] font-mono"
          >
            [CLEAR]
          </button>
        </div>
      )}
    </div>
  );
}

export type { LeaderboardFilterState, LeaderboardCategory, LeaderboardFiltersProps };

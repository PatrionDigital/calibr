'use client';

import { cn } from '@/lib/utils';
import { LeaderboardRow, type LeaderboardEntry } from './leaderboard-row';

// =============================================================================
// Types
// =============================================================================

type SortKey = 'rank' | 'score' | 'brier' | 'forecasts';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  isLoading?: boolean;
  onSort?: (key: SortKey) => void;
  sortKey?: SortKey;
  sortDirection?: 'asc' | 'desc';
  onRowClick?: (userId: string) => void;
  className?: string;
}

// =============================================================================
// Skeleton Row
// =============================================================================

function SkeletonRow() {
  return (
    <tr data-testid="skeleton-row" className="border-b border-[hsl(var(--border))]">
      <td className="py-3 px-2">
        <div className="h-6 w-10 bg-[hsl(var(--muted))] rounded animate-pulse mx-auto" />
      </td>
      <td className="py-3 px-3">
        <div className="h-5 w-32 bg-[hsl(var(--muted))] rounded animate-pulse" />
      </td>
      <td className="py-3 px-2">
        <div className="h-5 w-20 bg-[hsl(var(--muted))] rounded animate-pulse" />
      </td>
      <td className="py-3 px-2">
        <div className="h-5 w-12 bg-[hsl(var(--muted))] rounded animate-pulse ml-auto" />
      </td>
      <td className="py-3 px-2">
        <div className="h-5 w-10 bg-[hsl(var(--muted))] rounded animate-pulse ml-auto" />
      </td>
      <td className="py-3 px-2">
        <div className="h-5 w-10 bg-[hsl(var(--muted))] rounded animate-pulse ml-auto" />
      </td>
    </tr>
  );
}

// =============================================================================
// Header
// =============================================================================

interface HeaderCellProps {
  label: string;
  sortKey?: SortKey;
  currentSortKey?: SortKey;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: SortKey) => void;
  className?: string;
}

function HeaderCell({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className,
}: HeaderCellProps) {
  const isSorted = sortKey === currentSortKey;
  const canSort = sortKey && onSort;

  const handleClick = () => {
    if (canSort) {
      onSort(sortKey);
    }
  };

  return (
    <th
      className={cn(
        'py-2 px-2 text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider',
        canSort && 'cursor-pointer hover:text-[hsl(var(--primary))]',
        className
      )}
      onClick={handleClick}
    >
      <span className="flex items-center gap-1 justify-center">
        {label}
        {isSorted && (
          <span className="text-[hsl(var(--primary))]">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </span>
    </th>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <tr>
      <td colSpan={6} className="py-12 text-center">
        <div className="ascii-box inline-block p-6">
          <div className="text-[hsl(var(--muted-foreground))]">
            <div className="text-2xl mb-2">∅</div>
            <div className="text-sm">No forecasters found</div>
            <div className="text-xs mt-1">Try adjusting your filters</div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// =============================================================================
// Component
// =============================================================================

export function LeaderboardTable({
  entries,
  currentUserId,
  isLoading = false,
  onSort,
  sortKey,
  sortDirection,
  onRowClick,
  className,
}: LeaderboardTableProps) {
  return (
    <div className={cn('ascii-box overflow-hidden', className)}>
      <table className="w-full">
        <thead className="border-b-2 border-[hsl(var(--border))]">
          <tr>
            <HeaderCell
              label="RANK"
              sortKey="rank"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="w-20"
            />
            <HeaderCell label="FORECASTER" className="text-left" />
            <HeaderCell label="TIER" className="w-24" />
            <HeaderCell
              label="SCORE"
              sortKey="score"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="text-right w-20"
            />
            <HeaderCell
              label="BRIER"
              sortKey="brier"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="text-right w-16"
            />
            <HeaderCell
              label="FORECASTS"
              sortKey="forecasts"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              className="text-right w-20"
            />
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : entries.length === 0 ? (
            <EmptyState />
          ) : (
            entries.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                isHighlighted={entry.userId === currentUserId}
                onClick={onRowClick}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { LeaderboardTableProps, SortKey };

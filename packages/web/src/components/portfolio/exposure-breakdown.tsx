'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ExposureItem {
  name: string;
  value: number;
  percent: number;
}

export interface ExposureBreakdownProps {
  byCategory: ExposureItem[];
  byPlatform: ExposureItem[];
  groupBy: 'category' | 'platform';
  onGroupByChange?: (groupBy: 'category' | 'platform') => void;
  onItemClick?: (name: string, type: 'category' | 'platform') => void;
  className?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function generateProgressBar(percent: number, width: number = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export function ExposureBreakdown({
  byCategory,
  byPlatform,
  groupBy,
  onGroupByChange,
  onItemClick,
  className,
}: ExposureBreakdownProps) {
  const items = groupBy === 'category' ? byCategory : byPlatform;
  const isEmpty = byCategory.length === 0 && byPlatform.length === 0;

  return (
    <div
      data-testid="exposure-breakdown"
      className={cn(
        'border border-[hsl(var(--primary))] bg-[hsl(var(--background))] p-4 font-mono',
        className
      )}
    >
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-[hsl(var(--primary))]">
          ┌─[ EXPOSURE BY {groupBy.toUpperCase()} ]
        </span>
        <div className="flex items-center gap-1">
          <button
            role="button"
            aria-label="Category"
            onClick={() => onGroupByChange?.('category')}
            className={cn(
              'text-xs px-2 py-1 transition-colors',
              groupBy === 'category'
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--background))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Category
          </button>
          <button
            role="button"
            aria-label="Platform"
            onClick={() => onGroupByChange?.('platform')}
            className={cn(
              'text-xs px-2 py-1 transition-colors',
              groupBy === 'platform'
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--background))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            Platform
          </button>
        </div>
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
          No exposure data
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.name}
              data-exposure-row
              onClick={() => onItemClick?.(item.name, groupBy)}
              className={cn(
                'flex items-center gap-2',
                onItemClick && 'cursor-pointer hover:bg-[hsl(var(--primary)/0.05)]'
              )}
            >
              <span className="w-20 text-xs text-[hsl(var(--foreground))] truncate">
                {item.name}
              </span>
              <div
                data-testid="progress-bar"
                style={{ width: `${item.percent}%` }}
                className="flex-1 min-w-0"
              >
                <span className="text-[hsl(var(--primary))] text-xs">
                  {generateProgressBar(item.percent)}
                </span>
              </div>
              <span className="w-10 text-xs text-right text-[hsl(var(--muted-foreground))]">
                {item.percent}%
              </span>
              <span className="w-16 text-xs text-right text-[hsl(var(--foreground))] tabular-nums">
                ({formatCurrency(item.value)})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

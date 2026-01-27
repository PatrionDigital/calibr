'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Position {
  id: string;
  marketQuestion: string;
  outcome: string;
  shares: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  platform: string;
  category?: string;
}

export interface PositionFilter {
  platform?: string;
  category?: string;
  status?: string;
}

export interface PositionTableProps {
  positions: Position[];
  onPositionClick?: (position: Position) => void;
  onClosePosition?: (position: Position) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filter: PositionFilter) => void;
  className?: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PositionTable({
  positions,
  onPositionClick,
  onClosePosition,
  onSort,
  onFilter,
  className,
}: PositionTableProps) {
  const [hoveredRow, setHoveredRow] = React.useState<string | null>(null);
  const [showSortMenu, setShowSortMenu] = React.useState(false);
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);

  const handleSort = (key: string) => {
    onSort?.(key, 'desc');
    setShowSortMenu(false);
  };

  const handleFilter = (filter: PositionFilter) => {
    onFilter?.(filter);
    setShowFilterMenu(false);
  };

  return (
    <div
      data-testid="position-table"
      className={cn(
        'border border-[hsl(var(--primary))] bg-[hsl(var(--background))] font-mono',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(var(--border))]">
        <span className="text-sm font-bold text-[hsl(var(--primary))]">POSITIONS</span>
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="text-xs px-2 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
            >
              Filter▼
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] z-10 min-w-[120px]">
                <button
                  onClick={() => handleFilter({ platform: 'POLYMARKET' })}
                  className="block w-full text-left px-2 py-1 text-xs hover:bg-[hsl(var(--primary)/0.1)]"
                >
                  Polymarket
                </button>
                <button
                  onClick={() => handleFilter({ platform: 'LIMITLESS' })}
                  className="block w-full text-left px-2 py-1 text-xs hover:bg-[hsl(var(--primary)/0.1)]"
                >
                  Limitless
                </button>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="text-xs px-2 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
            >
              Sort▼
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] z-10 min-w-[100px]">
                <button
                  onClick={() => handleSort('value')}
                  className="block w-full text-left px-2 py-1 text-xs hover:bg-[hsl(var(--primary)/0.1)]"
                >
                  Value
                </button>
                <button
                  onClick={() => handleSort('pnl')}
                  className="block w-full text-left px-2 py-1 text-xs hover:bg-[hsl(var(--primary)/0.1)]"
                >
                  P&L
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {positions.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No positions found
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
              <th className="text-left px-4 py-2 font-normal">MARKET</th>
              <th className="text-left px-2 py-2 font-normal">SIDE</th>
              <th className="text-right px-2 py-2 font-normal">SIZE</th>
              <th className="text-right px-2 py-2 font-normal">VALUE</th>
              <th className="text-right px-4 py-2 font-normal">P&L</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const isPositive = position.pnl >= 0;
              const isHovered = hoveredRow === position.id;

              return (
                <tr
                  key={position.id}
                  onClick={() => onPositionClick?.(position)}
                  onMouseEnter={() => setHoveredRow(position.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={cn(
                    'border-b border-[hsl(var(--border))] last:border-0',
                    'cursor-pointer hover:bg-[hsl(var(--primary)/0.05)] transition-colors'
                  )}
                >
                  <td className="px-4 py-2">
                    <div className="max-w-[200px]">
                      <div className="truncate text-[hsl(var(--foreground))]">
                        {position.marketQuestion}
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        {position.platform}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        'font-bold',
                        position.outcome === 'YES'
                          ? 'text-[hsl(var(--success))]'
                          : 'text-[hsl(var(--destructive))]'
                      )}
                    >
                      {position.outcome}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatNumber(position.shares)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatCurrency(position.currentValue)}
                  </td>
                  <td className="px-4 py-2 text-right relative">
                    <div
                      data-testid="pnl-cell"
                      className={cn(
                        'tabular-nums',
                        isPositive
                          ? 'text-[hsl(var(--success))]'
                          : 'text-[hsl(var(--destructive))]'
                      )}
                    >
                      <div>
                        {isPositive ? '+' : ''}
                        {formatCurrency(position.pnl)}
                      </div>
                      <div className="text-xs">
                        ({isPositive ? '+' : ''}
                        {position.pnlPercent}%)
                      </div>
                    </div>
                    {isHovered && onClosePosition && (
                      <button
                        aria-label="Close position"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClosePosition(position);
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-xs px-1 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))] hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

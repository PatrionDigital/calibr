'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export interface ASCIITableProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  sortable?: boolean;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  className?: string;
}

export function ASCIITable<T extends Record<string, unknown>>({
  columns,
  data,
  sortable = false,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  emptyMessage = 'No data',
  className,
}: ASCIITableProps<T>) {
  const handleHeaderClick = (key: string) => {
    if (!sortable || !onSort) return;

    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  };

  const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'right':
        return 'text-right';
      case 'center':
        return 'text-center';
      default:
        return 'text-left';
    }
  };

  return (
    <div
      data-testid="ascii-table"
      className={cn(
        'border border-[hsl(var(--primary))] font-mono text-sm',
        'bg-[hsl(var(--background))]',
        className
      )}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[hsl(var(--primary))]">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleHeaderClick(col.key)}
                style={{ width: col.width }}
                className={cn(
                  'px-2 py-1 font-bold text-[hsl(var(--primary))]',
                  getAlignmentClass(col.align),
                  sortable && 'cursor-pointer hover:bg-[hsl(var(--primary)/0.1)]'
                )}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortable && sortKey === col.key && (
                    <span className="text-xs">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-2 py-4 text-center text-[hsl(var(--muted-foreground))]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(row, rowIndex)}
                className={cn(
                  'border-b border-[hsl(var(--primary)/0.3)] last:border-b-0',
                  'text-[hsl(var(--foreground))]',
                  onRowClick && 'cursor-pointer hover:bg-[hsl(var(--primary)/0.1)]'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-2 py-1', getAlignmentClass(col.align))}
                  >
                    {col.render
                      ? col.render(row[col.key], row, rowIndex)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'blocks' | 'ascii' | 'dots';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showPercent?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const colorMap = {
  primary: 'bg-[hsl(var(--primary))]',
  success: 'bg-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning))]',
  error: 'bg-[hsl(var(--destructive))]',
};

const sizeMap = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'blocks',
  size = 'md',
  color = 'primary',
  showPercent = false,
  label,
  animated = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('font-mono', className)}>
      {label && (
        <div
          data-testid="progress-label"
          className="mb-1 text-sm text-[hsl(var(--foreground))]"
        >
          {label}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          data-variant={variant}
          data-size={size}
          className={cn(
            'relative flex-1 overflow-hidden border border-[hsl(var(--primary))]',
            'bg-[hsl(var(--background))]',
            sizeMap[size]
          )}
        >
          <div
            data-testid="progress-fill"
            style={{ width: `${percentage}%` }}
            className={cn(
              'h-full',
              colorMap[color],
              animated && 'transition-all duration-300 ease-out motion-reduce:transition-none'
            )}
          />
        </div>
        {showPercent && (
          <span className="min-w-[3ch] text-right text-sm text-[hsl(var(--foreground))]">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  );
}

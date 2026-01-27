'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CorrelatedPosition {
  id: string;
  marketQuestion: string;
  outcome: string;
  exposure: number;
}

export interface CorrelationWarningProps {
  correlatedPositions: CorrelatedPosition[];
  totalExposure: number;
  portfolioPercent: number;
  onDismiss: () => void;
  onViewAnalysis: () => void;
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

export function CorrelationWarning({
  correlatedPositions,
  totalExposure,
  portfolioPercent,
  onDismiss,
  onViewAnalysis,
  className,
}: CorrelationWarningProps) {
  if (correlatedPositions.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="correlation-warning"
      className={cn(
        'border border-[hsl(var(--warning))] bg-[hsl(var(--background))] p-4 font-mono',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg text-[hsl(var(--warning))]">⚠</span>
        <span className="text-sm font-bold text-[hsl(var(--warning))]">
          CORRELATION WARNING
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-[hsl(var(--foreground))] mb-4">
        High exposure to correlated markets detected:
      </p>

      {/* Correlated Positions List */}
      <div className="space-y-1 mb-4">
        {correlatedPositions.map((pos) => (
          <div
            key={pos.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-[hsl(var(--muted-foreground))]">•</span>
              <span className="text-[hsl(var(--foreground))]">
                {pos.marketQuestion}
              </span>
              <span className="text-[hsl(var(--muted-foreground))]">
                ({pos.outcome})
              </span>
            </div>
            <span className="text-[hsl(var(--foreground))] tabular-nums">
              {formatCurrency(pos.exposure)}
            </span>
          </div>
        ))}
      </div>

      {/* Combined Exposure */}
      <div className="text-sm text-[hsl(var(--foreground))] mb-4 border-t border-[hsl(var(--border))] pt-2">
        <span className="text-[hsl(var(--muted-foreground))]">Combined exposure:</span>{' '}
        <span className="font-bold text-[hsl(var(--warning))]">
          {formatCurrency(totalExposure)}
        </span>{' '}
        <span className="text-[hsl(var(--muted-foreground))]">
          ({portfolioPercent}% of portfolio)
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={onViewAnalysis}
          className="text-xs px-3 py-1 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--background))] transition-colors"
        >
          📈 View Correlation Analysis
        </button>
        <button
          onClick={onDismiss}
          className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

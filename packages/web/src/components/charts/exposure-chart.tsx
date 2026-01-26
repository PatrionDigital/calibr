'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface Position {
  id: string;
  platform: string;
  category?: string;
  currentValue: number;
  unrealizedPnl?: number;
}

export interface ExposureChartProps {
  positions: Position[];
  groupBy: 'category' | 'platform';
  showPnl?: boolean;
  maxBars?: number;
}

interface ExposureBar {
  label: string;
  value: number;
  pnl: number;
  percentage: number;
  count: number;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  politics: 'hsl(var(--chart-1))',
  crypto: 'hsl(var(--chart-2))',
  sports: 'hsl(var(--chart-3))',
  economics: 'hsl(var(--chart-4))',
  science: 'hsl(var(--chart-5))',
  entertainment: 'hsl(var(--info))',
  other: 'hsl(var(--muted-foreground))',
};

const PLATFORM_COLORS: Record<string, string> = {
  polymarket: 'hsl(280 100% 60%)',
  limitless: 'hsl(210 100% 60%)',
  kalshi: 'hsl(45 100% 50%)',
  predictfun: 'hsl(30 100% 50%)',
  manifold: 'hsl(120 100% 50%)',
};

// =============================================================================
// Helpers
// =============================================================================

function formatValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  }
  return '$' + value.toFixed(0);
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '';
  return sign + formatValue(pnl);
}

function getColor(key: string, groupBy: 'category' | 'platform'): string {
  const colorMap = groupBy === 'category' ? CATEGORY_COLORS : PLATFORM_COLORS;
  return colorMap[key.toLowerCase()] || 'hsl(var(--muted-foreground))';
}

function getRiskLevel(percentage: number): 'low' | 'medium' | 'high' {
  if (percentage >= 40) return 'high';
  if (percentage >= 20) return 'medium';
  return 'low';
}

function getRiskColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return 'hsl(var(--bearish))';
    case 'medium':
      return 'hsl(var(--warning))';
    default:
      return 'hsl(var(--bullish))';
  }
}

// =============================================================================
// Component
// =============================================================================

export function ExposureChart({
  positions,
  groupBy,
  showPnl = true,
  maxBars = 8,
}: ExposureChartProps) {
  const exposureData = useMemo(() => {
    if (positions.length === 0) return [];

    // Group positions
    const groups = new Map<string, { value: number; pnl: number; count: number }>();

    for (const position of positions) {
      const key = groupBy === 'category'
        ? (position.category || 'Other')
        : position.platform;

      const existing = groups.get(key) || { value: 0, pnl: 0, count: 0 };
      groups.set(key, {
        value: existing.value + position.currentValue,
        pnl: existing.pnl + (position.unrealizedPnl || 0),
        count: existing.count + 1,
      });
    }

    // Calculate total and percentages
    const totalValue = Array.from(groups.values()).reduce((s, g) => s + g.value, 0);

    const bars: ExposureBar[] = Array.from(groups.entries())
      .map(([label, data]) => ({
        label,
        value: data.value,
        pnl: data.pnl,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, maxBars);

    return bars;
  }, [positions, groupBy, maxBars]);

  const totalValue = useMemo(
    () => exposureData.reduce((s, b) => s + b.value, 0),
    [exposureData]
  );

  const totalPnl = useMemo(
    () => exposureData.reduce((s, b) => s + b.pnl, 0),
    [exposureData]
  );

  if (exposureData.length === 0) {
    return (
      <div className="ascii-box p-4 text-center text-[hsl(var(--muted-foreground))]">
        [NO POSITION DATA]
      </div>
    );
  }

  const maxPercentage = Math.max(...exposureData.map((d) => d.percentage));

  return (
    <div className="ascii-box overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="border-b border-[hsl(var(--border))] p-2 bg-[hsl(var(--accent))] flex justify-between items-center">
        <span className="text-[hsl(var(--muted-foreground))]">
          EXPOSURE BY {groupBy.toUpperCase()}
        </span>
        <div className="flex gap-4">
          <span className="text-[hsl(var(--foreground))]">
            TOTAL: {formatValue(totalValue)}
          </span>
          {showPnl && (
            <span
              className={
                totalPnl >= 0
                  ? 'text-[hsl(var(--bullish))]'
                  : 'text-[hsl(var(--bearish))]'
              }
            >
              P&L: {formatPnl(totalPnl)}
            </span>
          )}
        </div>
      </div>

      {/* Bars */}
      <div className="p-2 space-y-2">
        {exposureData.map((bar) => {
          const riskLevel = getRiskLevel(bar.percentage);
          const barColor = getColor(bar.label, groupBy);

          return (
            <div key={bar.label} className="space-y-1">
              {/* Label row */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2"
                    style={{ backgroundColor: barColor }}
                  />
                  <span className="text-[hsl(var(--foreground))] uppercase">
                    {bar.label}
                  </span>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    ({bar.count})
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[hsl(var(--foreground))]">
                    {formatValue(bar.value)}
                  </span>
                  {showPnl && (
                    <span
                      className={
                        bar.pnl >= 0
                          ? 'text-[hsl(var(--bullish))]'
                          : 'text-[hsl(var(--bearish))]'
                      }
                    >
                      {formatPnl(bar.pnl)}
                    </span>
                  )}
                  <span
                    className="w-16 text-right"
                    style={{ color: getRiskColor(riskLevel) }}
                  >
                    {bar.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="h-4 bg-[hsl(var(--accent))] relative overflow-hidden">
                {/* Background bar showing max */}
                <div
                  className="absolute inset-y-0 left-0 opacity-20"
                  style={{
                    width: '100%',
                    backgroundColor: barColor,
                  }}
                />
                {/* Actual value bar */}
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-300"
                  style={{
                    width: `${(bar.percentage / maxPercentage) * 100}%`,
                    backgroundColor: barColor,
                  }}
                />
                {/* Risk indicator overlay */}
                {riskLevel === 'high' && (
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-[hsl(var(--bearish))] font-bold animate-pulse">
                      !
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer - Risk summary */}
      <div className="border-t border-[hsl(var(--border))] p-2 flex justify-between text-[hsl(var(--muted-foreground))]">
        <span>
          {groupBy === 'category' ? 'CATEGORIES' : 'PLATFORMS'}: {exposureData.length}
        </span>
        <div className="flex gap-4">
          <span>
            <span className="text-[hsl(var(--bullish))]">●</span> LOW &lt;20%
          </span>
          <span>
            <span className="text-[hsl(var(--warning))]">●</span> MED 20-40%
          </span>
          <span>
            <span className="text-[hsl(var(--bearish))]">●</span> HIGH &gt;40%
          </span>
        </div>
      </div>
    </div>
  );
}

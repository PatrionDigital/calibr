'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type TrendDirection = 'improving' | 'declining' | 'stable';
export type TrendPeriod = '7d' | '30d' | '90d' | '1y';

export interface TrendDataPoint {
  date: string;
  value: number;
  label: string;
}

export interface PerformanceTrend {
  metric: string;
  metricLabel: string;
  direction: TrendDirection;
  changePercent: number;
  changeAbsolute: number;
  startValue: number;
  endValue: number;
  period: TrendPeriod;
  dataPoints: TrendDataPoint[];
  confidence: number;
}

export interface TrendMetric {
  key: string;
  label: string;
  format: 'percent' | 'decimal' | 'number';
  higherIsBetter: boolean;
}

// =============================================================================
// TrendIndicator Component
// =============================================================================

export interface TrendIndicatorProps {
  direction: TrendDirection;
  changePercent?: number;
  variant?: 'default' | 'compact';
  inverse?: boolean;
}

export function TrendIndicator({
  direction,
  changePercent,
  variant = 'default',
  inverse = false,
}: TrendIndicatorProps) {
  // For inverse metrics (like Brier score), declining is good
  const effectiveDirection = inverse
    ? direction === 'improving'
      ? 'declining'
      : direction === 'declining'
      ? 'improving'
      : 'stable'
    : direction;

  const colorClass =
    effectiveDirection === 'improving'
      ? 'text-green-400'
      : effectiveDirection === 'declining'
      ? 'text-red-400'
      : 'text-yellow-400';

  return (
    <div
      data-testid="trend-indicator"
      className={`inline-flex items-center gap-1 font-mono ${colorClass} ${variant}`}
    >
      {direction === 'improving' && (
        <span data-testid="trend-arrow-up" className="text-lg">
          [^]
        </span>
      )}
      {direction === 'declining' && (
        <span data-testid="trend-arrow-down" className="text-lg">
          [v]
        </span>
      )}
      {direction === 'stable' && (
        <span data-testid="trend-stable" className="text-lg">
          [-]
        </span>
      )}
      {changePercent !== undefined && (
        <span className="text-sm">
          {changePercent >= 0 ? '+' : ''}
          {changePercent.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// =============================================================================
// TrendChart Component
// =============================================================================

export interface TrendChartProps {
  trend: PerformanceTrend;
  height?: number;
  showValues?: boolean;
  showPeriod?: boolean;
  showLegend?: boolean;
  showConfidence?: boolean;
}

export function TrendChart({
  trend,
  height = 150,
  showValues = false,
  showPeriod = false,
  showLegend = true,
  showConfidence = false,
}: TrendChartProps) {
  const formatValue = (value: number) => {
    if (trend.metric === 'accuracy' || trend.metric === 'calibration') {
      return `${Math.round(value * 100)}%`;
    }
    return value.toFixed(2);
  };

  // Calculate chart dimensions
  const values = trend.dataPoints.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 0.1;

  return (
    <div
      data-testid="trend-chart"
      className="ascii-box p-4"
      style={{ height: `${height}px` }}
    >
      {showLegend && (
        <div data-testid="chart-legend" className="flex items-center justify-between mb-3">
          <span className="font-mono font-bold text-sm">{trend.metricLabel}</span>
          <TrendIndicator direction={trend.direction} changePercent={trend.changePercent} />
        </div>
      )}

      {/* Chart area */}
      <div className="relative h-16" data-testid="chart-line">
        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={
              trend.direction === 'improving'
                ? '#4ade80'
                : trend.direction === 'declining'
                ? '#f87171'
                : '#facc15'
            }
            strokeWidth="2"
            points={trend.dataPoints
              .map((point, i) => {
                const x = (i / (trend.dataPoints.length - 1)) * 100;
                const y = 40 - ((point.value - minValue) / range) * 35;
                return `${x},${y}`;
              })
              .join(' ')}
          />
        </svg>
      </div>

      {/* Values */}
      {showValues && (
        <div className="flex justify-between text-xs text-zinc-500 font-mono mt-2">
          <span data-testid="start-value">{formatValue(trend.startValue)}</span>
          <span data-testid="end-value">{formatValue(trend.endValue)}</span>
        </div>
      )}

      {/* Period */}
      {showPeriod && (
        <div className="text-xs text-zinc-600 font-mono mt-2">
          Period: {trend.period}
        </div>
      )}

      {/* Confidence */}
      {showConfidence && (
        <div className="text-xs text-zinc-500 font-mono mt-1">
          Confidence: {Math.round(trend.confidence * 100)}%
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TrendSummary Component
// =============================================================================

export interface TrendSummaryProps {
  trends: PerformanceTrend[];
  variant?: 'default' | 'compact';
}

export function TrendSummary({ trends, variant = 'default' }: TrendSummaryProps) {
  const improvingCount = trends.filter((t) => t.direction === 'improving').length;
  const decliningCount = trends.filter((t) => t.direction === 'declining').length;
  const stableCount = trends.filter((t) => t.direction === 'stable').length;

  const overallAssessment =
    improvingCount > decliningCount
      ? 'improving'
      : decliningCount > improvingCount
      ? 'declining'
      : 'stable';

  // Find best and worst performing metrics by change percent
  const sortedByChange = [...trends].sort((a, b) => b.changePercent - a.changePercent);
  const bestMetric = sortedByChange[0];
  const worstMetric = sortedByChange[sortedByChange.length - 1];

  return (
    <div data-testid="trend-summary" className={`ascii-box p-4 ${variant}`}>
      <h3 className="font-mono font-bold text-sm mb-3">[TREND SUMMARY]</h3>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div
            data-testid="improving-count"
            className="text-xl font-mono font-bold text-green-400"
          >
            {improvingCount}
          </div>
          <div className="text-xs text-zinc-500 font-mono">Improving</div>
        </div>
        <div className="text-center">
          <div
            data-testid="stable-count"
            className="text-xl font-mono font-bold text-yellow-400"
          >
            {stableCount}
          </div>
          <div className="text-xs text-zinc-500 font-mono">Stable</div>
        </div>
        <div className="text-center">
          <div
            data-testid="declining-count"
            className="text-xl font-mono font-bold text-red-400"
          >
            {decliningCount}
          </div>
          <div className="text-xs text-zinc-500 font-mono">Declining</div>
        </div>
      </div>

      {/* Overall Assessment */}
      <div data-testid="overall-assessment" className="mb-4 p-3 bg-zinc-800/50 rounded">
        <span className="font-mono text-sm">Overall trend: </span>
        <span
          className={`font-mono font-bold ${
            overallAssessment === 'improving'
              ? 'text-green-400'
              : overallAssessment === 'declining'
              ? 'text-red-400'
              : 'text-yellow-400'
          }`}
        >
          {overallAssessment.toUpperCase()}
        </span>
      </div>

      {/* Best/Worst Metrics */}
      {bestMetric && worstMetric && (
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Best performing:</span>
            <span data-testid="best-metric" className="text-green-400">
              {bestMetric.metricLabel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Needs attention:</span>
            <span data-testid="worst-metric" className="text-red-400">
              {worstMetric.metricLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ForecasterTrendCard Component
// =============================================================================

export interface ForecasterTrendCardProps {
  forecaster: {
    address: string;
    displayName: string;
    totalScore: number;
  };
  trends: PerformanceTrend[];
  period?: TrendPeriod;
  showDetails?: boolean;
}

export function ForecasterTrendCard({
  forecaster,
  trends,
  period = '30d',
  showDetails = false,
}: ForecasterTrendCardProps) {
  const improvingCount = trends.filter((t) => t.direction === 'improving').length;
  const decliningCount = trends.filter((t) => t.direction === 'declining').length;

  const overallDirection: TrendDirection =
    improvingCount > decliningCount
      ? 'improving'
      : decliningCount > improvingCount
      ? 'declining'
      : 'stable';

  const periodLabels: Record<TrendPeriod, string> = {
    '7d': '7 days',
    '30d': '30 days',
    '90d': '90 days',
    '1y': '1 year',
  };

  return (
    <div data-testid="forecaster-trend-card" className="ascii-box p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono font-bold text-blue-400">{forecaster.displayName}</h3>
        <div data-testid="overall-trend">
          <TrendIndicator direction={overallDirection} />
        </div>
      </div>

      {/* Period */}
      <div className="text-xs text-zinc-500 font-mono mb-3">
        Last {periodLabels[period]}
      </div>

      {/* Trend Counts */}
      <div data-testid="trend-counts" className="flex items-center gap-4 text-sm font-mono mb-4">
        <span className="text-green-400">{improvingCount} [^]</span>
        <span className="text-yellow-400">{trends.length - improvingCount - decliningCount} [-]</span>
        <span className="text-red-400">{decliningCount} [v]</span>
      </div>

      {/* Individual Metrics */}
      {showDetails && (
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          {trends.map((trend) => (
            <div
              key={trend.metric}
              className="flex items-center justify-between text-sm font-mono"
            >
              <span className="text-zinc-400">{trend.metricLabel}</span>
              <TrendIndicator
                direction={trend.direction}
                changePercent={trend.changePercent}
                variant="compact"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TrendPeriodSelector Component
// =============================================================================

export interface TrendPeriodSelectorProps {
  periods: TrendPeriod[];
  selected: TrendPeriod;
  onSelect: (period: TrendPeriod) => void;
  showLabels?: boolean;
  variant?: 'default' | 'compact';
}

export function TrendPeriodSelector({
  periods,
  selected,
  onSelect,
  showLabels = false,
  variant = 'default',
}: TrendPeriodSelectorProps) {
  const periodLabels: Record<TrendPeriod, string> = {
    '7d': '7 days',
    '30d': '30 days',
    '90d': '90 days',
    '1y': '1 year',
  };

  return (
    <div
      data-testid="period-selector"
      className={`flex items-center gap-2 ${variant}`}
    >
      {periods.map((period) => (
        <button
          key={period}
          data-testid={`period-${period}`}
          onClick={() => onSelect(period)}
          className={`px-3 py-1.5 rounded font-mono text-sm transition-colors ${
            selected === period
              ? 'selected bg-blue-500/20 text-blue-400 border border-blue-500'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          {showLabels ? periodLabels[period] : period}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// TrendComparison Component
// =============================================================================

export interface TrendComparisonProps {
  metrics: TrendMetric[];
  trends: PerformanceTrend[];
  showChanges?: boolean;
  showSparklines?: boolean;
  sortBy?: 'name' | 'change';
}

export function TrendComparison({
  metrics,
  trends,
  showChanges = false,
  showSparklines = false,
  sortBy = 'name',
}: TrendComparisonProps) {
  // Create a map of trends by metric key
  const trendMap = new Map(trends.map((t) => [t.metric, t]));

  // Get metrics with trends
  const metricsWithTrends = metrics
    .map((m) => ({
      metric: m,
      trend: trendMap.get(m.key),
    }))
    .filter((m) => m.trend);

  // Sort if needed
  const sortedMetrics =
    sortBy === 'change'
      ? [...metricsWithTrends].sort(
          (a, b) => Math.abs(b.trend!.changePercent) - Math.abs(a.trend!.changePercent)
        )
      : metricsWithTrends;

  return (
    <div data-testid="trend-comparison" className="ascii-box p-4">
      <h3 className="font-mono font-bold text-sm mb-4">[METRIC TRENDS]</h3>

      <div className="space-y-3">
        {sortedMetrics.map(({ metric, trend }) => (
          <div
            key={metric.key}
            data-testid="comparison-row"
            className="flex items-center justify-between py-2 border-b border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-zinc-300">{metric.label}</span>
              {showSparklines && trend && (
                <div data-testid={`sparkline-${metric.key}`} className="w-16 h-4">
                  <svg className="w-full h-full" viewBox="0 0 64 16" preserveAspectRatio="none">
                    <polyline
                      fill="none"
                      stroke={
                        trend.direction === 'improving'
                          ? '#4ade80'
                          : trend.direction === 'declining'
                          ? '#f87171'
                          : '#facc15'
                      }
                      strokeWidth="1.5"
                      points={trend.dataPoints
                        .map((point, i) => {
                          const values = trend.dataPoints.map((p) => p.value);
                          const min = Math.min(...values);
                          const max = Math.max(...values);
                          const range = max - min || 0.1;
                          const x = (i / (trend.dataPoints.length - 1)) * 64;
                          const y = 16 - ((point.value - min) / range) * 14;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {showChanges && trend && (
                <span
                  className={`text-xs font-mono ${
                    trend.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {trend.changePercent >= 0 ? '+' : ''}
                  {trend.changePercent.toFixed(1)}%
                </span>
              )}
              {trend && (
                <TrendIndicator
                  direction={trend.direction}
                  variant="compact"
                  inverse={!metric.higherIsBetter}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// useTrendAnalysis Hook
// =============================================================================

export function useTrendAnalysis(address: string, period: TrendPeriod) {
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!address || address === '0xinvalid' || address.length < 10) {
        throw new Error('Invalid address');
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Generate mock trend data
      const mockTrends: PerformanceTrend[] = [
        {
          metric: 'accuracy',
          metricLabel: 'Accuracy',
          direction: 'improving',
          changePercent: 12.5,
          changeAbsolute: 0.08,
          startValue: 0.70,
          endValue: 0.78,
          period,
          dataPoints: [
            { date: '2024-01-01', value: 0.70, label: 'Jan 1' },
            { date: '2024-01-15', value: 0.74, label: 'Jan 15' },
            { date: '2024-01-29', value: 0.78, label: 'Jan 29' },
          ],
          confidence: 0.85,
        },
        {
          metric: 'calibration',
          metricLabel: 'Calibration',
          direction: 'stable',
          changePercent: 2.1,
          changeAbsolute: 0.02,
          startValue: 0.82,
          endValue: 0.84,
          period,
          dataPoints: [
            { date: '2024-01-01', value: 0.82, label: 'Jan 1' },
            { date: '2024-01-15', value: 0.83, label: 'Jan 15' },
            { date: '2024-01-29', value: 0.84, label: 'Jan 29' },
          ],
          confidence: 0.92,
        },
        {
          metric: 'brierScore',
          metricLabel: 'Brier Score',
          direction: 'improving',
          changePercent: -8.3,
          changeAbsolute: -0.015,
          startValue: 0.18,
          endValue: 0.165,
          period,
          dataPoints: [
            { date: '2024-01-01', value: 0.18, label: 'Jan 1' },
            { date: '2024-01-15', value: 0.17, label: 'Jan 15' },
            { date: '2024-01-29', value: 0.165, label: 'Jan 29' },
          ],
          confidence: 0.78,
        },
      ];

      setTrends(mockTrends);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [address, period]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  const overallDirection = useMemo(() => {
    if (trends.length === 0) return null;
    const improvingCount = trends.filter((t) => t.direction === 'improving').length;
    const decliningCount = trends.filter((t) => t.direction === 'declining').length;
    if (improvingCount > decliningCount) return 'improving';
    if (decliningCount > improvingCount) return 'declining';
    return 'stable';
  }, [trends]);

  const improvingCount = trends.filter((t) => t.direction === 'improving').length;
  const decliningCount = trends.filter((t) => t.direction === 'declining').length;

  return {
    trends,
    isLoading,
    error,
    overallDirection,
    improvingCount,
    decliningCount,
    refresh: loadTrends,
  };
}

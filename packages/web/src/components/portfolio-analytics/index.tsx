'use client';

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface AllocationData {
  name: string;
  value: number;
  percent: number;
  color: string;
}

export interface PnlDataPoint {
  date: string;
  value: number;
  cumulativePnl: number;
}

export interface PlatformData {
  platform: string;
  positions: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface CategoryData {
  category: string;
  positions: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface PerformanceData {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestDay: number;
  worstDay: number;
  totalPositions: number;
  activePositions: number;
  closedPositions: number;
}

export type AnalyticsTimeframe = '1W' | '1M' | '3M' | 'YTD' | 'ALL';

// =============================================================================
// Utility Functions
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// =============================================================================
// AllocationChart Component
// =============================================================================

interface AllocationChartProps {
  data: AllocationData[];
}

export function AllocationChart({ data }: AllocationChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div data-testid="allocation-chart" className="font-mono border border-[var(--terminal-dim)] p-4">
        <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Allocation</div>
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No allocation data</div>
      </div>
    );
  }

  return (
    <div data-testid="allocation-chart" className="font-mono border border-[var(--terminal-dim)] p-4">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Allocation</div>

      {/* Bar representation */}
      <div className="h-4 flex rounded overflow-hidden mb-4">
        {data.map((item) => (
          <div
            key={item.name}
            data-testid={`segment-${item.name}`}
            style={{ width: `${item.percent}%`, backgroundColor: item.color }}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseEnter={() => setHoveredSegment(item.name)}
            onMouseLeave={() => setHoveredSegment(null)}
          />
        ))}
      </div>

      {hoveredSegment && (
        <div data-testid="allocation-tooltip" className="text-xs text-[var(--terminal-green)] mb-2">
          {hoveredSegment}: {data.find((d) => d.name === hoveredSegment)?.percent}%
        </div>
      )}

      {/* Legend */}
      <div className="space-y-1">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-[var(--terminal-green)]">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[var(--terminal-dim)]">{item.percent}%</span>
              <span className="text-[var(--terminal-green)]">{formatCurrency(item.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PnlChart Component
// =============================================================================

interface PnlChartProps {
  data: PnlDataPoint[];
}

export function PnlChart({ data }: PnlChartProps) {
  if (data.length === 0) {
    return (
      <div data-testid="pnl-chart" className="font-mono border border-[var(--terminal-dim)] p-4">
        <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">P&L Over Time</div>
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No P&L data</div>
      </div>
    );
  }

  const currentPnl = data[data.length - 1]?.cumulativePnl ?? 0;
  const isPositive = currentPnl >= 0;

  return (
    <div data-testid="pnl-chart" className="font-mono border border-[var(--terminal-dim)] p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-[var(--terminal-green)] font-bold text-sm">P&L Over Time</div>
        <div
          data-testid="current-pnl"
          data-positive={isPositive ? 'true' : 'false'}
          className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}
        >
          {formatPnl(currentPnl)}.00
        </div>
      </div>

      {/* Simplified chart area */}
      <div
        data-testid="pnl-chart-area"
        className="h-32 border border-dashed border-[var(--terminal-dim)] flex items-end justify-around px-2"
      >
        {data.map((point) => {
          const maxAbs = Math.max(...data.map((d) => Math.abs(d.cumulativePnl)), 1);
          const height = (Math.abs(point.cumulativePnl) / maxAbs) * 100;
          const isUp = point.cumulativePnl >= 0;

          return (
            <div
              key={point.date}
              className={`w-8 ${isUp ? 'bg-green-400/50' : 'bg-red-400/50'}`}
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${point.date}: ${formatPnl(point.cumulativePnl)}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// PlatformBreakdown Component
// =============================================================================

interface PlatformBreakdownProps {
  data: PlatformData[];
}

export function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  if (data.length === 0) {
    return (
      <div data-testid="platform-breakdown" className="font-mono border border-[var(--terminal-dim)] p-4">
        <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">By Platform</div>
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No platform data</div>
      </div>
    );
  }

  return (
    <div data-testid="platform-breakdown" className="font-mono border border-[var(--terminal-dim)] p-4">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">By Platform</div>
      <div className="space-y-2">
        {data.map((item) => (
          <div
            key={item.platform}
            className="flex items-center justify-between border border-[var(--terminal-dim)] p-2 text-sm"
          >
            <div>
              <div className="text-[var(--terminal-green)] font-bold">{item.platform}</div>
              <div className="text-[var(--terminal-dim)] text-xs">{item.positions} positions</div>
            </div>
            <div className="text-right">
              <div className="text-[var(--terminal-green)]">{formatCurrency(item.value)}</div>
              <div
                data-testid={`platform-pnl-${item.platform}`}
                className={`text-xs ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {formatPnl(item.pnl)} ({formatPercent(item.pnlPercent)})
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// CategoryBreakdown Component
// =============================================================================

interface CategoryBreakdownProps {
  data: CategoryData[];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return (
      <div data-testid="category-breakdown" className="font-mono border border-[var(--terminal-dim)] p-4">
        <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">By Category</div>
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No category data</div>
      </div>
    );
  }

  // Sort by value descending
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div data-testid="category-breakdown" className="font-mono border border-[var(--terminal-dim)] p-4">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">By Category</div>
      <div className="space-y-2">
        {sortedData.map((item) => (
          <div
            key={item.category}
            data-testid="category-item"
            className="flex items-center justify-between border border-[var(--terminal-dim)] p-2 text-sm"
          >
            <div>
              <div className="text-[var(--terminal-green)] font-bold">{item.category}</div>
              <div className="text-[var(--terminal-dim)] text-xs">{item.positions} positions</div>
            </div>
            <div className="text-right">
              <div className="text-[var(--terminal-green)]">{formatCurrency(item.value)}</div>
              <div className={`text-xs ${item.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(item.pnlPercent)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PerformanceMetrics Component
// =============================================================================

interface PerformanceMetricsProps {
  data: PerformanceData;
}

export function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  return (
    <div data-testid="performance-metrics" className="font-mono border border-[var(--terminal-dim)] p-4">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Performance Metrics</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Total Value</div>
          <div data-testid="metric-total-value" className="text-[var(--terminal-green)] font-bold">
            {formatCurrency(data.totalValue)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Total P&L</div>
          <div
            data-testid="metric-total-pnl"
            className={`font-bold ${data.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatPnl(data.totalPnl)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Win Rate</div>
          <div data-testid="metric-win-rate" className="text-[var(--terminal-green)] font-bold">
            {data.winRate}%
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Avg Win</div>
          <div data-testid="metric-avg-win" className="text-green-400 font-bold">
            {formatCurrency(data.avgWin)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Avg Loss</div>
          <div data-testid="metric-avg-loss" className="text-red-400 font-bold">
            {formatCurrency(Math.abs(data.avgLoss))}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Sharpe Ratio</div>
          <div data-testid="metric-sharpe" className="text-[var(--terminal-green)] font-bold">
            {data.sharpeRatio.toFixed(2)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Max Drawdown</div>
          <div data-testid="metric-max-drawdown" className="text-red-400 font-bold">
            {data.maxDrawdown}%
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Total Positions</div>
          <div data-testid="metric-total-positions" className="text-[var(--terminal-green)] font-bold">
            {data.totalPositions}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-dim)] text-xs">Active</div>
          <div data-testid="metric-active-positions" className="text-[var(--terminal-green)] font-bold">
            {data.activePositions}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TimeframeSelector Component
// =============================================================================

interface TimeframeSelectorProps {
  value: AnalyticsTimeframe;
  onChange: (timeframe: AnalyticsTimeframe) => void;
}

const TIMEFRAMES: AnalyticsTimeframe[] = ['1W', '1M', '3M', 'YTD', 'ALL'];

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <div data-testid="timeframe-selector" className="font-mono flex gap-2">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          data-testid={`timeframe-${tf}`}
          data-selected={value === tf ? 'true' : 'false'}
          onClick={() => onChange(tf)}
          className={`px-3 py-1 text-sm border ${
            value === tf
              ? 'border-[var(--terminal-green)] text-[var(--terminal-green)]'
              : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] hover:border-[var(--terminal-green)]'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// AnalyticsSummary Component
// =============================================================================

interface AnalyticsSummaryProps {
  performance: PerformanceData;
}

export function AnalyticsSummary({ performance }: AnalyticsSummaryProps) {
  const isPositive = performance.totalPnl >= 0;

  return (
    <div data-testid="analytics-summary" className="font-mono border border-[var(--terminal-green)] p-4">
      <div className="text-[var(--terminal-dim)] text-xs mb-1">PORTFOLIO VALUE</div>
      <div data-testid="summary-value" className="text-[var(--terminal-green)] text-3xl font-bold mb-2">
        {formatCurrency(performance.totalValue)}
      </div>
      <div className="flex items-center gap-2">
        <span
          data-testid="summary-pnl"
          className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}
        >
          {formatPnl(performance.totalPnl)}
        </span>
        <span
          data-testid="summary-pnl-percent"
          className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}
        >
          ({formatPercent(performance.totalPnlPercent)})
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// PortfolioAnalytics Component
// =============================================================================

interface PortfolioAnalyticsProps {
  allocations: AllocationData[];
  pnlHistory: PnlDataPoint[];
  platforms: PlatformData[];
  categories: CategoryData[];
  performance: PerformanceData;
  loading?: boolean;
  onTimeframeChange?: (timeframe: AnalyticsTimeframe) => void;
}

export function PortfolioAnalytics({
  allocations,
  pnlHistory,
  platforms,
  categories,
  performance,
  loading = false,
  onTimeframeChange,
}: PortfolioAnalyticsProps) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('1M');

  const handleTimeframeChange = (tf: AnalyticsTimeframe) => {
    setTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  if (loading) {
    return (
      <div data-testid="portfolio-analytics" className="font-mono p-4">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="text-[var(--terminal-green)] animate-pulse">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="portfolio-analytics" className="font-mono p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <AnalyticsSummary performance={performance} />
        <TimeframeSelector value={timeframe} onChange={handleTimeframeChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AllocationChart data={allocations} />
        <PnlChart data={pnlHistory} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlatformBreakdown data={platforms} />
        <CategoryBreakdown data={categories} />
      </div>

      <PerformanceMetrics data={performance} />
    </div>
  );
}

// =============================================================================
// usePortfolioAnalytics Hook
// =============================================================================

interface UsePortfolioAnalyticsReturn {
  allocations: AllocationData[] | null;
  pnlHistory: PnlDataPoint[] | null;
  platforms: PlatformData[] | null;
  categories: CategoryData[] | null;
  performance: PerformanceData | null;
  loading: boolean;
  error: string | null;
  timeframe: AnalyticsTimeframe;
  setTimeframe: (tf: AnalyticsTimeframe) => void;
  refresh: () => void;
}

export function usePortfolioAnalytics(): UsePortfolioAnalyticsReturn {
  const [allocations, setAllocations] = useState<AllocationData[] | null>(null);
  const [pnlHistory, setPnlHistory] = useState<PnlDataPoint[] | null>(null);
  const [platforms, setPlatforms] = useState<PlatformData[] | null>(null);
  const [categories, setCategories] = useState<CategoryData[] | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('1M');

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      // Mock data
      setAllocations([
        { name: 'POLITICS', value: 3500, percent: 35, color: '#00ff00' },
        { name: 'CRYPTO', value: 2500, percent: 25, color: '#00ccff' },
        { name: 'SPORTS', value: 2000, percent: 20, color: '#ffcc00' },
      ]);

      setPnlHistory([
        { date: '2026-01-01', value: 0, cumulativePnl: 0 },
        { date: '2026-01-07', value: 120, cumulativePnl: 120 },
        { date: '2026-01-14', value: -50, cumulativePnl: 70 },
      ]);

      setPlatforms([
        { platform: 'LIMITLESS', positions: 8, value: 5500, pnl: 420, pnlPercent: 8.3 },
        { platform: 'POLYMARKET', positions: 5, value: 4500, pnl: -80, pnlPercent: -1.7 },
      ]);

      setCategories([
        { category: 'POLITICS', positions: 4, value: 3500, pnl: 280, pnlPercent: 8.7 },
        { category: 'CRYPTO', positions: 3, value: 2500, pnl: 150, pnlPercent: 6.4 },
      ]);

      setPerformance({
        totalValue: 10000,
        totalPnl: 340,
        totalPnlPercent: 3.5,
        winRate: 65,
        avgWin: 180,
        avgLoss: -75,
        sharpeRatio: 1.2,
        maxDrawdown: -12.5,
        bestDay: 200,
        worstDay: -120,
        totalPositions: 13,
        activePositions: 10,
        closedPositions: 3,
      });

      setLoading(false);
    }, 50);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, timeframe]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    allocations,
    pnlHistory,
    platforms,
    categories,
    performance,
    loading,
    error,
    timeframe,
    setTimeframe,
    refresh,
  };
}

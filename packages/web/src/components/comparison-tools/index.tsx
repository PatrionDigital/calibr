'use client';

import { useMemo, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ForecasterComparisonData {
  id: string;
  name: string;
  address: string;
  tier: string;
  avatarUrl: string | null;
  stats: {
    totalForecasts: number;
    resolvedForecasts: number;
    brierScore: number;
    accuracy: number;
    calibration: number;
    profitLoss: number;
    winRate: number;
    avgConfidence: number;
    bestStreak: number;
  };
}

export interface ComparisonMetric {
  key: string;
  label: string;
  valueA: number;
  valueB: number;
  format: 'decimal' | 'percentage' | 'number' | 'currency';
  lowerIsBetter: boolean;
}

export interface ComparisonCategory {
  name: string;
  metrics: ComparisonMetric[];
}

interface ComparisonHistoryItem {
  id: string;
  forecasterA: ForecasterComparisonData;
  forecasterB: ForecasterComparisonData;
  comparedAt: string;
  winner: 'forecaster-a' | 'forecaster-b' | 'tie';
}

// =============================================================================
// Helpers
// =============================================================================

function formatMetricValue(value: number, format: ComparisonMetric['format']): string {
  switch (format) {
    case 'percentage':
      return `${Math.round(value * 100)}%`;
    case 'currency':
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    case 'decimal':
      return value.toFixed(3);
    default:
      return value.toLocaleString('en-US');
  }
}

function getWinner(metric: ComparisonMetric): 'a' | 'b' | 'tie' {
  if (metric.valueA === metric.valueB) return 'tie';
  if (metric.lowerIsBetter) {
    return metric.valueA < metric.valueB ? 'a' : 'b';
  }
  return metric.valueA > metric.valueB ? 'a' : 'b';
}

// =============================================================================
// ComparisonMetricRow Component
// =============================================================================

interface ComparisonMetricRowProps {
  metric: ComparisonMetric;
  nameA: string;
  nameB: string;
}

export function ComparisonMetricRow({ metric, nameA: _nameA, nameB: _nameB }: ComparisonMetricRowProps) {
  const winner = getWinner(metric);

  return (
    <div
      data-testid="comparison-metric-row"
      className="flex items-center justify-between font-mono text-sm py-2 border-b border-[var(--terminal-dim)]"
    >
      <span className="text-[var(--terminal-dim)] w-1/3">{metric.label}</span>
      <div className="flex items-center gap-4 w-2/3 justify-end">
        <span
          className={`w-24 text-right ${winner === 'a' ? 'text-[var(--terminal-green)] font-bold winner' : 'text-[var(--terminal-dim)]'}`}
        >
          {formatMetricValue(metric.valueA, metric.format)}
        </span>
        <span className="text-[var(--terminal-dim)]">vs</span>
        <span
          className={`w-24 text-left ${winner === 'b' ? 'text-[var(--terminal-green)] font-bold winner' : 'text-[var(--terminal-dim)]'}`}
        >
          {formatMetricValue(metric.valueB, metric.format)}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// ComparisonCategorySection Component
// =============================================================================

interface ComparisonCategorySectionProps {
  category: ComparisonCategory;
  nameA: string;
  nameB: string;
}

export function ComparisonCategorySection({ category, nameA, nameB }: ComparisonCategorySectionProps) {
  return (
    <div data-testid="comparison-category-section" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">{category.name}</div>
      <div>
        {category.metrics.map((metric) => (
          <ComparisonMetricRow key={metric.key} metric={metric} nameA={nameA} nameB={nameB} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ComparisonRadarChart Component
// =============================================================================

interface ComparisonRadarChartProps {
  forecasterA: ForecasterComparisonData;
  forecasterB: ForecasterComparisonData;
}

export function ComparisonRadarChart({ forecasterA, forecasterB }: ComparisonRadarChartProps) {
  return (
    <div data-testid="comparison-radar-chart" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Skills Radar</div>
      <div className="border border-[var(--terminal-dim)] p-4 text-center">
        <div className="text-[var(--terminal-dim)] text-xs mb-2">
          [ASCII Radar Visualization]
        </div>
        <div className="text-sm">
          <span className="text-blue-400">{forecasterA.name}</span>
          <span className="text-[var(--terminal-dim)]"> vs </span>
          <span className="text-green-400">{forecasterB.name}</span>
        </div>
      </div>
      <div data-testid="radar-legend" className="flex justify-center gap-4 mt-2 text-xs">
        <span className="text-blue-400">● {forecasterA.name}</span>
        <span className="text-green-400">● {forecasterB.name}</span>
      </div>
    </div>
  );
}

// =============================================================================
// ComparisonBarChart Component
// =============================================================================

interface ComparisonBarChartProps {
  metrics: ComparisonMetric[];
  nameA: string;
  nameB: string;
}

export function ComparisonBarChart({ metrics, nameA: _nameA, nameB: _nameB }: ComparisonBarChartProps) {
  return (
    <div data-testid="comparison-bar-chart" className="font-mono space-y-3">
      <div className="text-[var(--terminal-green)] font-bold text-sm">Metric Comparison</div>
      {metrics.map((metric) => {
        const maxVal = Math.max(metric.valueA, metric.valueB) || 1;
        const pctA = (metric.valueA / maxVal) * 100;
        const pctB = (metric.valueB / maxVal) * 100;

        return (
          <div key={metric.key} data-testid="metric-bar-pair" className="space-y-1">
            <div className="text-[var(--terminal-dim)] text-xs">{metric.label}</div>
            <div className="flex items-center gap-2">
              <div className="w-1/2 h-3 border border-[var(--terminal-dim)] overflow-hidden">
                <div className="h-full bg-blue-400" style={{ width: `${pctA}%` }} />
              </div>
              <div className="w-1/2 h-3 border border-[var(--terminal-dim)] overflow-hidden">
                <div className="h-full bg-green-400" style={{ width: `${pctB}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// ForecasterSelector Component
// =============================================================================

interface ForecasterSelectorProps {
  selected: ForecasterComparisonData | null;
  onSelect: (forecaster: ForecasterComparisonData) => void;
  label: string;
}

export function ForecasterSelector({ selected, onSelect: _onSelect, label }: ForecasterSelectorProps) {
  return (
    <div data-testid="forecaster-selector" className="font-mono">
      <div className="text-[var(--terminal-dim)] text-xs mb-1">{label}</div>
      <div className="border border-[var(--terminal-dim)] p-3">
        {selected ? (
          <div className="flex items-center justify-between">
            <span className="text-[var(--terminal-green)]">{selected.name}</span>
            <span className="text-[var(--terminal-dim)] text-xs capitalize">{selected.tier}</span>
          </div>
        ) : (
          <div className="text-[var(--terminal-dim)] text-sm">Choose a forecaster...</div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ComparisonSummary Component
// =============================================================================

interface ComparisonSummaryProps {
  forecasterA: ForecasterComparisonData;
  forecasterB: ForecasterComparisonData;
}

export function ComparisonSummary({ forecasterA, forecasterB }: ComparisonSummaryProps) {
  const { overallWinner, winsA, winsB, insights } = useForecasterComparison(forecasterA, forecasterB);

  const winnerName = overallWinner === 'forecaster-a' ? forecasterA.name : overallWinner === 'forecaster-b' ? forecasterB.name : 'Tie';

  return (
    <div data-testid="comparison-summary" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Summary</div>
      <div className="border border-[var(--terminal-dim)] p-4 space-y-3">
        <div className="text-center">
          <div className="text-[var(--terminal-dim)] text-xs">Overall Winner</div>
          <div className="text-[var(--terminal-green)] font-bold text-lg">{winnerName}</div>
        </div>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-blue-400 font-bold">{winsA}</div>
            <div className="text-[var(--terminal-dim)] text-xs">{forecasterA.name} wins</div>
          </div>
          <div>
            <div className="text-green-400 font-bold">{winsB}</div>
            <div className="text-[var(--terminal-dim)] text-xs">{forecasterB.name} wins</div>
          </div>
        </div>
        <div data-testid="key-insights" className="pt-2 border-t border-[var(--terminal-dim)]">
          <div className="text-[var(--terminal-dim)] text-xs mb-1">Key Insights</div>
          {insights.slice(0, 3).map((insight, i) => (
            <div key={i} className="text-[var(--terminal-green)] text-xs">• {insight}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// HeadToHeadCard Component
// =============================================================================

interface HeadToHeadCardProps {
  forecasterA: ForecasterComparisonData;
  forecasterB: ForecasterComparisonData;
}

export function HeadToHeadCard({ forecasterA, forecasterB }: HeadToHeadCardProps) {
  return (
    <div
      data-testid="head-to-head-card"
      className="border border-[var(--terminal-dim)] font-mono p-4"
    >
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-blue-400 font-bold">{forecasterA.name}</div>
          <div className="text-[var(--terminal-dim)] text-xs capitalize">{forecasterA.tier}</div>
        </div>
        <div className="text-[var(--terminal-green)] font-bold text-lg">VS</div>
        <div className="text-center">
          <div className="text-green-400 font-bold">{forecasterB.name}</div>
          <div className="text-[var(--terminal-dim)] text-xs capitalize">{forecasterB.tier}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ComparisonHistoryList Component
// =============================================================================

interface ComparisonHistoryListProps {
  history: ComparisonHistoryItem[];
}

export function ComparisonHistoryList({ history }: ComparisonHistoryListProps) {
  return (
    <div data-testid="comparison-history-list" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">Recent Comparisons</div>
      {history.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">
          No comparisons yet
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => {
            const date = new Date(item.comparedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const winnerName = item.winner === 'forecaster-a' ? item.forecasterA.name : item.winner === 'forecaster-b' ? item.forecasterB.name : 'Tie';

            return (
              <div
                key={item.id}
                data-testid="comparison-history-item"
                className="border border-[var(--terminal-dim)] p-2 text-sm"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-blue-400">{item.forecasterA.name}</span>
                    <span className="text-[var(--terminal-dim)]"> vs </span>
                    <span className="text-green-400">{item.forecasterB.name}</span>
                  </div>
                  <div className="text-[var(--terminal-dim)] text-xs">{date}</div>
                </div>
                <div className="text-[var(--terminal-green)] text-xs">Winner: {winnerName}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ComparisonToolsPage Component
// =============================================================================

interface ComparisonToolsPageProps {
  initialForecasterA?: ForecasterComparisonData | null;
  initialForecasterB?: ForecasterComparisonData | null;
}

export function ComparisonToolsPage({
  initialForecasterA = null,
  initialForecasterB = null,
}: ComparisonToolsPageProps) {
  const [forecasterA, setForecasterA] = useState<ForecasterComparisonData | null>(initialForecasterA);
  const [forecasterB, setForecasterB] = useState<ForecasterComparisonData | null>(initialForecasterB);
  const [history] = useState<ComparisonHistoryItem[]>([]);

  const isReady = forecasterA !== null && forecasterB !== null;

  return (
    <div data-testid="comparison-tools-page" className="max-w-4xl mx-auto p-4 font-mono space-y-6">
      <h1 className="text-[var(--terminal-green)] text-xl font-bold">Forecaster Comparison</h1>

      <div className="grid grid-cols-2 gap-4">
        <ForecasterSelector
          selected={forecasterA}
          onSelect={setForecasterA}
          label="Forecaster A"
        />
        <ForecasterSelector
          selected={forecasterB}
          onSelect={setForecasterB}
          label="Forecaster B"
        />
      </div>

      <button
        data-testid="compare-button"
        disabled={!isReady}
        className={`w-full py-2 border font-mono text-sm ${
          isReady
            ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black'
            : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
        }`}
      >
        Compare Forecasters
      </button>

      {isReady ? (
        <>
          <HeadToHeadCard forecasterA={forecasterA} forecasterB={forecasterB} />
          <ComparisonSummary forecasterA={forecasterA} forecasterB={forecasterB} />
        </>
      ) : (
        <div
          data-testid="empty-comparison-state"
          className="border border-[var(--terminal-dim)] p-8 text-center"
        >
          <div className="text-[var(--terminal-dim)]">
            Select two forecasters to compare their performance
          </div>
        </div>
      )}

      <ComparisonHistoryList history={history} />
    </div>
  );
}

// =============================================================================
// useForecasterComparison Hook
// =============================================================================

interface UseForecasterComparisonReturn {
  isReady: boolean;
  metrics: ComparisonMetric[];
  categories: ComparisonCategory[];
  overallWinner: 'forecaster-a' | 'forecaster-b' | 'tie' | null;
  winsA: number;
  winsB: number;
  insights: string[];
}

export function useForecasterComparison(
  forecasterA: ForecasterComparisonData | null,
  forecasterB: ForecasterComparisonData | null
): UseForecasterComparisonReturn {
  const isReady = forecasterA !== null && forecasterB !== null;

  const metrics: ComparisonMetric[] = useMemo(() => {
    if (!forecasterA || !forecasterB) return [];

    return [
      {
        key: 'brierScore',
        label: 'Brier Score',
        valueA: forecasterA.stats.brierScore,
        valueB: forecasterB.stats.brierScore,
        format: 'decimal' as const,
        lowerIsBetter: true,
      },
      {
        key: 'accuracy',
        label: 'Accuracy',
        valueA: forecasterA.stats.accuracy,
        valueB: forecasterB.stats.accuracy,
        format: 'percentage' as const,
        lowerIsBetter: false,
      },
      {
        key: 'calibration',
        label: 'Calibration',
        valueA: forecasterA.stats.calibration,
        valueB: forecasterB.stats.calibration,
        format: 'percentage' as const,
        lowerIsBetter: false,
      },
      {
        key: 'totalForecasts',
        label: 'Total Forecasts',
        valueA: forecasterA.stats.totalForecasts,
        valueB: forecasterB.stats.totalForecasts,
        format: 'number' as const,
        lowerIsBetter: false,
      },
      {
        key: 'winRate',
        label: 'Win Rate',
        valueA: forecasterA.stats.winRate,
        valueB: forecasterB.stats.winRate,
        format: 'percentage' as const,
        lowerIsBetter: false,
      },
      {
        key: 'profitLoss',
        label: 'Profit/Loss',
        valueA: forecasterA.stats.profitLoss,
        valueB: forecasterB.stats.profitLoss,
        format: 'currency' as const,
        lowerIsBetter: false,
      },
    ];
  }, [forecasterA, forecasterB]);

  const categories: ComparisonCategory[] = useMemo(() => {
    if (metrics.length === 0) return [];

    return [
      {
        name: 'Performance',
        metrics: metrics.filter((m) => ['brierScore', 'accuracy', 'calibration'].includes(m.key)),
      },
      {
        name: 'Activity',
        metrics: metrics.filter((m) => ['totalForecasts', 'winRate', 'profitLoss'].includes(m.key)),
      },
    ];
  }, [metrics]);

  const { winsA, winsB } = useMemo(() => {
    let a = 0;
    let b = 0;
    metrics.forEach((m) => {
      const winner = getWinner(m);
      if (winner === 'a') a++;
      if (winner === 'b') b++;
    });
    return { winsA: a, winsB: b };
  }, [metrics]);

  const overallWinner = useMemo(() => {
    if (!isReady) return null;
    if (winsA > winsB) return 'forecaster-a';
    if (winsB > winsA) return 'forecaster-b';
    return 'tie';
  }, [isReady, winsA, winsB]);

  const insights = useMemo(() => {
    if (!forecasterA || !forecasterB) return [];

    const result: string[] = [];

    if (forecasterB.stats.brierScore < forecasterA.stats.brierScore) {
      result.push(`${forecasterB.name} has better prediction accuracy (lower Brier score)`);
    } else if (forecasterA.stats.brierScore < forecasterB.stats.brierScore) {
      result.push(`${forecasterA.name} has better prediction accuracy (lower Brier score)`);
    }

    if (forecasterA.stats.totalForecasts > forecasterB.stats.totalForecasts) {
      result.push(`${forecasterA.name} is more active with ${forecasterA.stats.totalForecasts} forecasts`);
    } else {
      result.push(`${forecasterB.name} is more active with ${forecasterB.stats.totalForecasts} forecasts`);
    }

    if (forecasterA.stats.calibration > forecasterB.stats.calibration) {
      result.push(`${forecasterA.name} shows better calibration`);
    } else if (forecasterB.stats.calibration > forecasterA.stats.calibration) {
      result.push(`${forecasterB.name} shows better calibration`);
    }

    return result;
  }, [forecasterA, forecasterB]);

  return {
    isReady,
    metrics,
    categories,
    overallWinner,
    winsA,
    winsB,
    insights,
  };
}

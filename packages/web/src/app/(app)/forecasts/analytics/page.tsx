'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api, type Forecast, type ForecastStats } from '@/lib/api';
import { Tooltip, InfoIcon, KELLY_TOOLTIPS } from '@/components/tooltip';

interface CalibrationBucket {
  minProb: number;
  maxProb: number;
  forecasts: Forecast[];
  actualRate: number;
}

export default function ForecastAnalyticsPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [stats, setStats] = useState<ForecastStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [forecastsRes, statsRes] = await Promise.all([
        api.getForecasts({ limit: 200, includePrivate: true }),
        api.getForecastStats(),
      ]);
      setForecasts(forecastsRes.forecasts);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate calibration metrics from forecasts
  const calibrationData = useMemo(() => {
    const resolvedForecasts = forecasts.filter(f => f.unifiedMarket.resolution);

    if (resolvedForecasts.length === 0) {
      return {
        buckets: [],
        overallBrier: 0,
        accuracy: 0,
        totalResolved: 0,
        correctCount: 0,
      };
    }

    // Create calibration buckets (0-10%, 10-20%, etc.)
    const buckets: CalibrationBucket[] = [];
    for (let i = 0; i < 10; i++) {
      const minProb = i / 10;
      const maxProb = (i + 1) / 10;
      const bucketed = resolvedForecasts.filter(
        f => f.probability >= minProb && f.probability < maxProb
      );

      if (bucketed.length > 0) {
        const actualYes = bucketed.filter(
          f => f.unifiedMarket.resolution?.toUpperCase() === 'YES'
        ).length;

        buckets.push({
          minProb,
          maxProb,
          forecasts: bucketed,
          actualRate: actualYes / bucketed.length,
        });
      }
    }

    // Calculate Brier scores
    let brierSum = 0;
    let correctCount = 0;

    resolvedForecasts.forEach(f => {
      const outcome = f.unifiedMarket.resolution?.toUpperCase() === 'YES' ? 1 : 0;
      brierSum += Math.pow(f.probability - outcome, 2);

      const isCorrect =
        (outcome === 1 && f.probability >= 0.5) ||
        (outcome === 0 && f.probability < 0.5);
      if (isCorrect) correctCount++;
    });

    return {
      buckets,
      overallBrier: brierSum / resolvedForecasts.length,
      accuracy: correctCount / resolvedForecasts.length,
      totalResolved: resolvedForecasts.length,
      correctCount,
    };
  }, [forecasts]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="ascii-box p-8 text-center">
            <div className="terminal-glow cursor-blink">LOADING ANALYTICS</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/forecasts"
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] text-sm"
            >
              &larr; FORECASTS
            </Link>
          </div>
          <h1 className="text-2xl font-bold terminal-glow mb-2">
            FORECAST ANALYTICS
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Calibration, accuracy, and performance metrics
          </p>
        </header>

        {error && (
          <div className="ascii-box p-4 border-[hsl(var(--error))] mb-6">
            <span className="text-[hsl(var(--error))]">[ERROR]</span> {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="TOTAL FORECASTS"
            value={String(stats?.totalForecasts || forecasts.length)}
          />
          <SummaryCard
            label="RESOLVED"
            value={String(calibrationData.totalResolved)}
          />
          <SummaryCard
            label="ACCURACY"
            value={`${(calibrationData.accuracy * 100).toFixed(1)}%`}
            subValue={`${calibrationData.correctCount}/${calibrationData.totalResolved}`}
            variant={calibrationData.accuracy >= 0.5 ? 'bullish' : 'bearish'}
          />
          <SummaryCard
            label="AVG BRIER SCORE"
            value={calibrationData.overallBrier.toFixed(3)}
            variant={calibrationData.overallBrier <= 0.25 ? 'bullish' : 'bearish'}
            tooltip={KELLY_TOOLTIPS.brierScore}
          />
        </div>

        {/* Calibration Chart */}
        <div className="ascii-box p-6 mb-6">
          <h3 className="text-sm font-bold mb-4">
            [CALIBRATION CURVE]
            <Tooltip content={KELLY_TOOLTIPS.calibration}>
              <InfoIcon />
            </Tooltip>
          </h3>

          {calibrationData.buckets.length > 0 ? (
            <div className="space-y-4">
              {/* Chart */}
              <CalibrationChart buckets={calibrationData.buckets} />

              {/* Bucket Details */}
              <div className="grid grid-cols-5 md:grid-cols-10 gap-1 mt-4">
                {calibrationData.buckets.map((bucket, i) => (
                  <div
                    key={i}
                    className="text-center p-2 border border-[hsl(var(--border))]"
                  >
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      {(bucket.minProb * 100).toFixed(0)}-{(bucket.maxProb * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm font-bold">
                      {(bucket.actualRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      n={bucket.forecasts.length}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-[hsl(var(--muted-foreground))] py-8">
              No resolved forecasts yet. Make forecasts and wait for markets to resolve.
            </div>
          )}
        </div>

        {/* Performance Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* By Confidence */}
          <div className="ascii-box p-6">
            <h3 className="text-sm font-bold mb-4">[BY CONFIDENCE LEVEL]</h3>
            <ConfidenceBreakdown forecasts={forecasts} />
          </div>

          {/* Recent Resolved */}
          <div className="ascii-box p-6">
            <h3 className="text-sm font-bold mb-4">[RECENT RESOLUTIONS]</h3>
            <RecentResolutions forecasts={forecasts} />
          </div>
        </div>

        {/* Brier Score Interpretation */}
        <div className="ascii-box p-6">
          <h3 className="text-sm font-bold mb-4">[BRIER SCORE GUIDE]</h3>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="p-3 bg-[hsl(var(--bullish))/0.2] border border-[hsl(var(--bullish))]">
              <div className="font-bold text-[hsl(var(--bullish))]">0.00-0.10</div>
              <div>Excellent</div>
            </div>
            <div className="p-3 bg-[hsl(var(--primary))/0.2] border border-[hsl(var(--primary))]">
              <div className="font-bold text-[hsl(var(--primary))]">0.10-0.20</div>
              <div>Good</div>
            </div>
            <div className="p-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
              <div className="font-bold">0.20-0.25</div>
              <div>Average</div>
              <div className="text-[hsl(var(--muted-foreground))]">(random)</div>
            </div>
            <div className="p-3 bg-[hsl(var(--warning))/0.2] border border-[hsl(var(--warning))]">
              <div className="font-bold text-[hsl(var(--warning))]">0.25-0.40</div>
              <div>Below Avg</div>
            </div>
            <div className="p-3 bg-[hsl(var(--bearish))/0.2] border border-[hsl(var(--bearish))]">
              <div className="font-bold text-[hsl(var(--bearish))]">0.40+</div>
              <div>Poor</div>
            </div>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4 text-center">
            A Brier score of 0.25 is equivalent to random guessing (50/50). Lower is better.
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

interface SummaryCardProps {
  label: string;
  value: string;
  subValue?: string;
  variant?: 'default' | 'bullish' | 'bearish';
  tooltip?: React.ReactNode;
}

function SummaryCard({ label, value, subValue, variant = 'default', tooltip }: SummaryCardProps) {
  const valueColor = {
    default: '',
    bullish: 'text-[hsl(var(--bullish))]',
    bearish: 'text-[hsl(var(--bearish))]',
  }[variant];

  return (
    <div className="ascii-box p-4">
      <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
        {label}
        {tooltip && (
          <Tooltip content={tooltip}>
            <InfoIcon />
          </Tooltip>
        )}
      </div>
      <div className={`text-xl font-bold font-mono ${valueColor}`}>{value}</div>
      {subValue && (
        <div className="text-xs text-[hsl(var(--muted-foreground))]">{subValue}</div>
      )}
    </div>
  );
}

interface CalibrationChartProps {
  buckets: CalibrationBucket[];
}

function CalibrationChart({ buckets }: CalibrationChartProps) {
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 30;

  // Create points for actual calibration line
  const points = buckets.map((bucket) => ({
    x: ((bucket.minProb + bucket.maxProb) / 2) * (chartWidth - 2 * padding) + padding,
    y: chartHeight - padding - bucket.actualRate * (chartHeight - 2 * padding),
    bucket,
  }));

  // Create path for actual calibration
  const linePath = points.length > 0
    ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`
    : '';

  // Perfect calibration line (diagonal)
  const perfectLine = `M ${padding},${chartHeight - padding} L ${chartWidth - padding},${padding}`;

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full max-w-md"
        style={{ height: chartHeight }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((val, i) => (
          <g key={i}>
            {/* Horizontal */}
            <line
              x1={padding}
              y1={chartHeight - padding - val * (chartHeight - 2 * padding)}
              x2={chartWidth - padding}
              y2={chartHeight - padding - val * (chartHeight - 2 * padding)}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            {/* Y-axis label */}
            <text
              x={padding - 5}
              y={chartHeight - padding - val * (chartHeight - 2 * padding)}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-[10px] fill-[hsl(var(--muted-foreground))]"
            >
              {(val * 100).toFixed(0)}%
            </text>
            {/* Vertical */}
            <line
              x1={padding + val * (chartWidth - 2 * padding)}
              y1={padding}
              x2={padding + val * (chartWidth - 2 * padding)}
              y2={chartHeight - padding}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            {/* X-axis label */}
            <text
              x={padding + val * (chartWidth - 2 * padding)}
              y={chartHeight - padding + 15}
              textAnchor="middle"
              className="text-[10px] fill-[hsl(var(--muted-foreground))]"
            >
              {(val * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Perfect calibration line */}
        <path
          d={perfectLine}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="8,4"
          opacity="0.5"
        />

        {/* Actual calibration line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="hsl(var(--bullish))"
            strokeWidth="2"
          />
        )}

        {/* Data points */}
        {points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r={Math.min(8, Math.max(4, point.bucket.forecasts.length))}
              fill="hsl(var(--bullish))"
              stroke="hsl(var(--background))"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* Labels */}
        <text
          x={chartWidth / 2}
          y={chartHeight - 5}
          textAnchor="middle"
          className="text-[10px] fill-[hsl(var(--muted-foreground))]"
        >
          Predicted Probability
        </text>
        <text
          x={10}
          y={chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 10, ${chartHeight / 2})`}
          className="text-[10px] fill-[hsl(var(--muted-foreground))]"
        >
          Actual Rate
        </text>

        {/* Legend */}
        <g transform={`translate(${chartWidth - 100}, ${padding})`}>
          <line x1="0" y1="5" x2="15" y2="5" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4,2" />
          <text x="20" y="8" className="text-[8px] fill-[hsl(var(--muted-foreground))]">Perfect</text>
          <line x1="0" y1="18" x2="15" y2="18" stroke="hsl(var(--bullish))" strokeWidth="2" />
          <text x="20" y="21" className="text-[8px] fill-[hsl(var(--muted-foreground))]">Actual</text>
        </g>
      </svg>
    </div>
  );
}

function ConfidenceBreakdown({ forecasts }: { forecasts: Forecast[] }) {
  const resolved = forecasts.filter(f => f.unifiedMarket.resolution);

  if (resolved.length === 0) {
    return (
      <div className="text-center text-[hsl(var(--muted-foreground))] py-4">
        No resolved forecasts
      </div>
    );
  }

  // Group by confidence level
  const highConf = resolved.filter(f => f.confidence >= 0.8);
  const medConf = resolved.filter(f => f.confidence >= 0.5 && f.confidence < 0.8);
  const lowConf = resolved.filter(f => f.confidence < 0.5);

  const calculateAccuracy = (forecasts: Forecast[]) => {
    if (forecasts.length === 0) return 0;
    const correct = forecasts.filter(f => {
      const outcome = f.unifiedMarket.resolution?.toUpperCase() === 'YES' ? 1 : 0;
      return (outcome === 1 && f.probability >= 0.5) || (outcome === 0 && f.probability < 0.5);
    }).length;
    return correct / forecasts.length;
  };

  const groups = [
    { label: 'High (80%+)', forecasts: highConf },
    { label: 'Medium (50-80%)', forecasts: medConf },
    { label: 'Low (<50%)', forecasts: lowConf },
  ];

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.label} className="flex items-center justify-between">
          <div className="text-sm">{group.label}</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[hsl(var(--muted-foreground))]">n={group.forecasts.length}</span>
            <span className={calculateAccuracy(group.forecasts) >= 0.5 ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}>
              {(calculateAccuracy(group.forecasts) * 100).toFixed(0)}% accurate
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentResolutions({ forecasts }: { forecasts: Forecast[] }) {
  const resolved = forecasts
    .filter(f => f.unifiedMarket.resolution)
    .slice(0, 5);

  if (resolved.length === 0) {
    return (
      <div className="text-center text-[hsl(var(--muted-foreground))] py-4">
        No resolved forecasts
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {resolved.map((f) => {
        const outcome = f.unifiedMarket.resolution?.toUpperCase() === 'YES' ? 1 : 0;
        const isCorrect = (outcome === 1 && f.probability >= 0.5) || (outcome === 0 && f.probability < 0.5);
        const brierScore = Math.pow(f.probability - outcome, 2);

        return (
          <div key={f.id} className="flex items-center gap-2 text-xs">
            <span className={isCorrect ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}>
              {isCorrect ? '✓' : '✗'}
            </span>
            <span className="flex-1 truncate">{f.unifiedMarket.question}</span>
            <span className="text-[hsl(var(--muted-foreground))] font-mono">
              {brierScore.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

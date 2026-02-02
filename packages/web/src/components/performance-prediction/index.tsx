'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type PredictionMetric = 'brierScore' | 'accuracy' | 'calibration' | 'winRate' | 'profitLoss';
export type PredictionTimeframe = '1month' | '3months' | '6months' | '1year';
export type PredictionConfidenceLevel = 'high' | 'medium' | 'low';
export type PredictionTrend = 'improving' | 'stable' | 'declining';

export interface PerformancePrediction {
  metric: PredictionMetric;
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  confidence: PredictionConfidenceLevel;
  timeframe: PredictionTimeframe;
  confidenceInterval: {
    low: number;
    high: number;
  };
  trend: PredictionTrend;
  dataPoints: number;
  historicalTrend: number[];
  projectedTrend: number[];
}

// =============================================================================
// Utility Functions
// =============================================================================

const metricLabels: Record<PredictionMetric, string> = {
  brierScore: 'Brier Score',
  accuracy: 'Accuracy',
  calibration: 'Calibration',
  winRate: 'Win Rate',
  profitLoss: 'Profit/Loss',
};

const metricDescriptions: Record<PredictionMetric, string> = {
  brierScore: 'Measures prediction accuracy (lower is better)',
  accuracy: 'Percentage of correct predictions',
  calibration: 'How well confidence matches outcomes',
  winRate: 'Percentage of profitable forecasts',
  profitLoss: 'Total profit or loss from forecasts',
};

const timeframeLabels: Record<PredictionTimeframe, string> = {
  '1month': '1 Month',
  '3months': '3 Months',
  '6months': '6 Months',
  '1year': '1 Year',
};

const confidenceTooltips: Record<PredictionConfidenceLevel, string> = {
  high: 'This prediction is highly reliable based on consistent historical patterns',
  medium: 'This prediction has moderate reliability with some variance expected',
  low: 'This prediction has low confidence due to limited data or volatile patterns',
};

function formatMetricValue(metric: PredictionMetric, value: number): string {
  if (metric === 'brierScore') {
    return value.toFixed(3);
  }
  if (metric === 'profitLoss') {
    return `$${value.toLocaleString()}`;
  }
  return `${Math.round(value * 100)}%`;
}

// =============================================================================
// PredictionCard Component
// =============================================================================

interface PredictionCardProps {
  prediction: PerformancePrediction;
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const isImproving = prediction.trend === 'improving';
  const isDecreasingGood = prediction.metric === 'brierScore' && prediction.changePercent < 0;
  const isPositive = isImproving || isDecreasingGood;

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="prediction-card">
      <h3 className="text-[var(--terminal-green)] mb-3 border-b border-[var(--terminal-green)] pb-2">
        ┌─ {metricLabels[prediction.metric].toUpperCase()} PREDICTION ─┐
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Current */}
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Current</div>
          <div className="text-[var(--terminal-green)] text-xl">
            {formatMetricValue(prediction.metric, prediction.currentValue)}
          </div>
        </div>

        {/* Predicted */}
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Predicted</div>
          <div className="text-[var(--terminal-green)] text-xl">
            {formatMetricValue(prediction.metric, prediction.predictedValue)}
          </div>
        </div>
      </div>

      {/* Change */}
      <div className="flex items-center gap-3 mb-3">
        <span
          data-testid="trend-indicator"
          className={`text-2xl ${prediction.trend}`}
        >
          {prediction.trend === 'improving' ? '📈' : prediction.trend === 'declining' ? '📉' : '➡️'}
        </span>
        <span className={`text-lg ${isPositive ? 'text-[var(--terminal-green)]' : 'text-red-500'}`}>
          {prediction.changePercent > 0 ? '+' : ''}{prediction.changePercent.toFixed(1)}%
        </span>
      </div>

      {/* Details */}
      <div className="text-xs space-y-1 text-[var(--terminal-dim)]">
        <div className="flex justify-between">
          <span>Confidence:</span>
          <span className="text-[var(--terminal-green)] capitalize">{prediction.confidence} confidence</span>
        </div>
        <div className="flex justify-between">
          <span>Timeframe:</span>
          <span className="text-[var(--terminal-green)]">{timeframeLabels[prediction.timeframe]}</span>
        </div>
        <div className="flex justify-between">
          <span>Range:</span>
          <span className="text-[var(--terminal-green)]">
            {formatMetricValue(prediction.metric, prediction.confidenceInterval.low)} - {formatMetricValue(prediction.metric, prediction.confidenceInterval.high)}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PredictionChart Component
// =============================================================================

interface PredictionChartProps {
  prediction: PerformancePrediction;
  showLegend?: boolean;
}

export function PredictionChart({ prediction, showLegend = false }: PredictionChartProps) {
  const allValues = [...prediction.historicalTrend, ...prediction.projectedTrend];
  const maxValue = Math.max(...allValues, prediction.confidenceInterval.high);
  const minValue = Math.min(...allValues, prediction.confidenceInterval.low);
  const range = maxValue - minValue || 1;

  const normalizeValue = (val: number) => ((val - minValue) / range) * 100;

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="prediction-chart">
      <div className="flex justify-between text-xs text-[var(--terminal-dim)] mb-2">
        <span>Value</span>
        <span>Time</span>
      </div>

      {/* Chart Area */}
      <div className="relative h-48 bg-black border border-[var(--terminal-green)]">
        {/* Confidence Band */}
        <div
          data-testid="confidence-band"
          className="absolute bg-[var(--terminal-green)] opacity-10"
          style={{
            bottom: `${normalizeValue(prediction.confidenceInterval.low)}%`,
            height: `${normalizeValue(prediction.confidenceInterval.high) - normalizeValue(prediction.confidenceInterval.low)}%`,
            left: '50%',
            right: '5%',
          }}
        />

        {/* Historical Line */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <polyline
            data-testid="historical-line"
            fill="none"
            stroke="var(--terminal-green)"
            strokeWidth="2"
            points={prediction.historicalTrend
              .map((val, idx) => {
                const x = (idx / (allValues.length - 1)) * 100;
                const y = 100 - normalizeValue(val);
                return `${x}%,${y}%`;
              })
              .join(' ')}
          />
        </svg>

        {/* Projected Line */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <polyline
            data-testid="projected-line"
            fill="none"
            stroke="var(--terminal-green)"
            strokeWidth="2"
            strokeDasharray="5,5"
            points={prediction.projectedTrend
              .map((val, idx) => {
                const x = ((prediction.historicalTrend.length - 1 + idx) / (allValues.length - 1)) * 100;
                const y = 100 - normalizeValue(val);
                return `${x}%,${y}%`;
              })
              .join(' ')}
          />
        </svg>

        {/* Current Marker */}
        <div
          data-testid="current-marker"
          className="absolute w-3 h-3 bg-[var(--terminal-green)] rounded-full"
          style={{
            left: `${((prediction.historicalTrend.length - 1) / (allValues.length - 1)) * 100}%`,
            bottom: `${normalizeValue(prediction.currentValue)}%`,
            transform: 'translate(-50%, 50%)',
          }}
        />

        {/* Predicted Marker */}
        <div
          data-testid="predicted-marker"
          className="absolute w-3 h-3 border-2 border-[var(--terminal-green)] rounded-full"
          style={{
            right: '5%',
            bottom: `${normalizeValue(prediction.predictedValue)}%`,
            transform: 'translate(50%, 50%)',
          }}
        />
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-[var(--terminal-green)]" />
            <span className="text-[var(--terminal-dim)]">Historical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-[var(--terminal-green)]" style={{ borderBottom: '2px dashed var(--terminal-green)' }} />
            <span className="text-[var(--terminal-dim)]">Projected</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PredictionConfidenceIndicator Component
// =============================================================================

interface PredictionConfidenceIndicatorProps {
  level: PredictionConfidenceLevel;
  showLabel?: boolean;
  percentage?: number;
  showTooltip?: boolean;
}

export function PredictionConfidenceIndicator({
  level,
  showLabel = false,
  percentage,
  showTooltip = false,
}: PredictionConfidenceIndicatorProps) {
  const [showTip, setShowTip] = useState(false);

  const colors: Record<PredictionConfidenceLevel, string> = {
    high: 'bg-[var(--terminal-green)]',
    medium: 'bg-yellow-500',
    low: 'bg-red-500',
  };

  return (
    <div
      className="relative inline-flex items-center gap-2"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div
        data-testid="confidence-indicator"
        className={`w-3 h-3 rounded-full ${colors[level]} ${level}`}
      />
      {showLabel && <span className="text-xs text-[var(--terminal-dim)] capitalize">{level}</span>}
      {percentage !== undefined && <span className="text-xs text-[var(--terminal-green)]">{percentage}%</span>}

      {showTooltip && showTip && (
        <div className="absolute z-10 bottom-full left-0 mb-2 p-2 bg-black border border-[var(--terminal-green)] text-xs text-[var(--terminal-green)] w-48">
          {confidenceTooltips[level]}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PredictionTimeframeSelector Component
// =============================================================================

interface PredictionTimeframeSelectorProps {
  value: PredictionTimeframe;
  onChange: (timeframe: PredictionTimeframe) => void;
  timeframes?: PredictionTimeframe[];
}

export function PredictionTimeframeSelector({
  value,
  onChange,
  timeframes = ['1month', '3months', '6months'],
}: PredictionTimeframeSelectorProps) {
  return (
    <div className="font-mono" data-testid="timeframe-selector">
      <div className="text-[var(--terminal-dim)] text-xs mb-2">Timeframe</div>
      <div className="flex gap-2 flex-wrap">
        {timeframes.map((tf) => (
          <button
            key={tf}
            data-testid={`timeframe-${tf}`}
            onClick={() => onChange(tf)}
            className={`px-3 py-1 border border-[var(--terminal-green)] text-xs transition-colors ${
              value === tf
                ? 'bg-[var(--terminal-green)] text-black selected'
                : 'text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
            }`}
          >
            {timeframeLabels[tf]}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PredictionMetricSelector Component
// =============================================================================

interface PredictionMetricSelectorProps {
  value: PredictionMetric;
  onChange: (metric: PredictionMetric) => void;
  metrics?: PredictionMetric[];
  showDescriptions?: boolean;
}

export function PredictionMetricSelector({
  value,
  onChange,
  metrics = ['brierScore', 'accuracy', 'calibration'],
  showDescriptions = false,
}: PredictionMetricSelectorProps) {
  return (
    <div className="font-mono" data-testid="metric-selector">
      <div className="text-[var(--terminal-dim)] text-xs mb-2">Metric</div>
      <div className="flex gap-2 flex-wrap">
        {metrics.map((metric) => (
          <button
            key={metric}
            data-testid={`metric-${metric}`}
            onClick={() => onChange(metric)}
            className={`px-3 py-1 border border-[var(--terminal-green)] text-xs transition-colors ${
              value === metric
                ? 'bg-[var(--terminal-green)] text-black selected'
                : 'text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20'
            }`}
          >
            {metricLabels[metric]}
          </button>
        ))}
      </div>
      {showDescriptions && (
        <div className="text-[var(--terminal-dim)] text-xs mt-2">
          {metricDescriptions[value]}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PredictionSummary Component
// =============================================================================

interface PredictionSummaryProps {
  predictions: PerformancePrediction[];
  timeframe?: PredictionTimeframe;
}

export function PredictionSummary({ predictions, timeframe = '3months' }: PredictionSummaryProps) {
  const improvingCount = predictions.filter((p) => p.trend === 'improving').length;
  const decliningCount = predictions.filter((p) => p.trend === 'declining').length;

  const avgConfidence = useMemo(() => {
    const confidenceScores: Record<PredictionConfidenceLevel, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };
    const total = predictions.reduce((sum, p) => sum + confidenceScores[p.confidence], 0);
    const avg = total / predictions.length;
    if (avg >= 2.5) return 'high';
    if (avg >= 1.5) return 'medium';
    return 'low';
  }, [predictions]);

  const mostImpactful = useMemo(() => {
    return predictions.reduce((max, p) =>
      Math.abs(p.changePercent) > Math.abs(max.changePercent) ? p : max
    );
  }, [predictions]);

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="prediction-summary">
      <h3 className="text-[var(--terminal-green)] mb-3 border-b border-[var(--terminal-green)] pb-2">
        ┌─ {timeframeLabels[timeframe].toUpperCase()} PROJECTION ─┐
      </h3>

      <div className="text-sm mb-3">
        <span className="text-[var(--terminal-dim)]">Overall Outlook: </span>
        <span className="text-[var(--terminal-green)]">
          {improvingCount > decliningCount ? 'Positive' : improvingCount < decliningCount ? 'Negative' : 'Neutral'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
        <div>
          <div className="text-[var(--terminal-dim)]">Improving</div>
          <div className="text-[var(--terminal-green)]">{improvingCount} improving</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Declining</div>
          <div className="text-red-500">{decliningCount} declining</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)]">Confidence</div>
          <div className="text-[var(--terminal-green)] capitalize">{avgConfidence}</div>
        </div>
      </div>

      <div className="space-y-2">
        {predictions.map((p) => (
          <div
            key={p.metric}
            data-testid="prediction-summary-item"
            className="flex items-center justify-between text-xs"
          >
            <span className="text-[var(--terminal-dim)]">{metricLabels[p.metric]}</span>
            <span className={p.trend === 'improving' ? 'text-[var(--terminal-green)]' : p.trend === 'declining' ? 'text-red-500' : 'text-yellow-500'}>
              {p.changePercent > 0 ? '+' : ''}{p.changePercent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {mostImpactful && (
        <div data-testid="most-impactful" className="mt-3 pt-3 border-t border-[var(--terminal-green)] border-opacity-30 text-xs">
          <span className="text-[var(--terminal-dim)]">Most impactful: </span>
          <span className="text-[var(--terminal-green)]">{metricLabels[mostImpactful.metric]}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PredictionInsights Component
// =============================================================================

interface PredictionInsightsProps {
  prediction: PerformancePrediction;
}

export function PredictionInsights({ prediction }: PredictionInsightsProps) {
  const getInsight = () => {
    const metric = metricLabels[prediction.metric].toLowerCase();
    const direction = prediction.trend === 'improving' ? 'increase' : prediction.trend === 'declining' ? 'decline' : 'remain stable';

    if (prediction.metric === 'brierScore') {
      return prediction.trend === 'improving'
        ? `Your prediction accuracy is expected to improve with a lower Brier score.`
        : `Your prediction accuracy may decline with a higher Brier score.`;
    }

    return `Your ${metric} is projected to ${direction} by ${Math.abs(prediction.changePercent).toFixed(1)}%.`;
  };

  const getRecommendation = () => {
    if (prediction.trend === 'declining') {
      if (prediction.metric === 'calibration') {
        return 'Consider reviewing your confidence levels to better match actual outcomes.';
      }
      if (prediction.metric === 'accuracy') {
        return 'Focus on high-confidence forecasts in areas where you have expertise.';
      }
    }
    return 'Keep up your current forecasting strategy.';
  };

  return (
    <div className="border border-[var(--terminal-green)] p-4 font-mono" data-testid="prediction-insights">
      <h3 className="text-[var(--terminal-green)] mb-3 border-b border-[var(--terminal-green)] pb-2">
        ┌─ INSIGHTS ─┐
      </h3>

      <p className="text-sm text-[var(--terminal-green)] mb-3">{getInsight()}</p>

      <div data-testid="recommendation" className="text-xs text-[var(--terminal-dim)] mb-3">
        <strong>Recommendation:</strong> {getRecommendation()}
      </div>

      {prediction.confidence === 'low' && (
        <div className="text-xs text-yellow-500 mb-3">
          ⚠️ This prediction has low confidence due to data variability.
        </div>
      )}

      <div className="text-xs text-[var(--terminal-dim)]">
        Based on {prediction.dataPoints} data points
      </div>
    </div>
  );
}

// =============================================================================
// PerformancePredictionPanel Component
// =============================================================================

interface PerformancePredictionPanelProps {
  predictions: PerformancePrediction[];
  isLoading?: boolean;
  showSummary?: boolean;
}

export function PerformancePredictionPanel({
  predictions,
  isLoading = false,
  showSummary = false,
}: PerformancePredictionPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<PredictionMetric>('brierScore');
  const [selectedTimeframe, setSelectedTimeframe] = useState<PredictionTimeframe>('3months');

  const currentPrediction = useMemo(() => {
    return predictions.find((p) => p.metric === selectedMetric && p.timeframe === selectedTimeframe);
  }, [predictions, selectedMetric, selectedTimeframe]);

  if (isLoading) {
    return (
      <div data-testid="prediction-loading" className="border border-[var(--terminal-green)] p-8 font-mono text-center">
        <div className="text-[var(--terminal-green)] animate-pulse">Loading predictions...</div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div data-testid="prediction-panel" className="border border-[var(--terminal-green)] p-8 font-mono text-center">
        <div className="text-[var(--terminal-dim)]">No predictions available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono" data-testid="prediction-panel">
      {/* Selectors */}
      <div className="flex gap-4 flex-wrap">
        <PredictionMetricSelector
          value={selectedMetric}
          onChange={setSelectedMetric}
          showDescriptions={true}
        />
        <PredictionTimeframeSelector
          value={selectedTimeframe}
          onChange={setSelectedTimeframe}
        />
      </div>

      {/* Main Content */}
      {currentPrediction ? (
        <>
          <PredictionCard prediction={currentPrediction} />
          <PredictionChart prediction={currentPrediction} showLegend={true} />
          <PredictionInsights prediction={currentPrediction} />
        </>
      ) : (
        <div className="text-[var(--terminal-dim)] text-center py-8">
          No prediction available for selected options
        </div>
      )}

      {/* Summary */}
      {showSummary && predictions.length > 0 && (
        <PredictionSummary predictions={predictions} timeframe={selectedTimeframe} />
      )}
    </div>
  );
}

// =============================================================================
// usePrediction Hook
// =============================================================================

interface UsePredictionReturn {
  predictions: PerformancePrediction[];
  selectedMetric: PredictionMetric;
  setSelectedMetric: (metric: PredictionMetric) => void;
  selectedTimeframe: PredictionTimeframe;
  setSelectedTimeframe: (timeframe: PredictionTimeframe) => void;
  currentPrediction: PerformancePrediction | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePrediction(forecasterId: string): UsePredictionReturn {
  const [predictions, setPredictions] = useState<PerformancePrediction[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<PredictionMetric>('brierScore');
  const [selectedTimeframe, setSelectedTimeframe] = useState<PredictionTimeframe>('3months');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPredictions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (forecasterId === 'invalid') {
        throw new Error('Failed to load predictions');
      }

      // Mock predictions
      const mockPredictions: PerformancePrediction[] = [
        {
          metric: 'brierScore',
          currentValue: 0.185,
          predictedValue: 0.165,
          changePercent: -10.8,
          confidence: 'high',
          timeframe: '3months',
          confidenceInterval: { low: 0.145, high: 0.185 },
          trend: 'improving',
          dataPoints: 45,
          historicalTrend: [0.22, 0.21, 0.20, 0.19, 0.185],
          projectedTrend: [0.185, 0.178, 0.171, 0.165],
        },
        {
          metric: 'accuracy',
          currentValue: 0.78,
          predictedValue: 0.82,
          changePercent: 5.1,
          confidence: 'medium',
          timeframe: '3months',
          confidenceInterval: { low: 0.79, high: 0.85 },
          trend: 'improving',
          dataPoints: 45,
          historicalTrend: [0.72, 0.74, 0.76, 0.77, 0.78],
          projectedTrend: [0.78, 0.79, 0.81, 0.82],
        },
        {
          metric: 'calibration',
          currentValue: 0.82,
          predictedValue: 0.80,
          changePercent: -2.4,
          confidence: 'low',
          timeframe: '3months',
          confidenceInterval: { low: 0.75, high: 0.86 },
          trend: 'declining',
          dataPoints: 45,
          historicalTrend: [0.85, 0.84, 0.83, 0.82, 0.82],
          projectedTrend: [0.82, 0.81, 0.81, 0.80],
        },
      ];

      setPredictions(mockPredictions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load predictions');
    } finally {
      setIsLoading(false);
    }
  }, [forecasterId]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  const currentPrediction = useMemo(() => {
    return predictions.find((p) => p.metric === selectedMetric && p.timeframe === selectedTimeframe) || null;
  }, [predictions, selectedMetric, selectedTimeframe]);

  return {
    predictions,
    selectedMetric,
    setSelectedMetric,
    selectedTimeframe,
    setSelectedTimeframe,
    currentPrediction,
    isLoading,
    error,
    refresh: loadPredictions,
  };
}

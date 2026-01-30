/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  PerformanceTrend,
  TrendPeriod,
  TrendMetric,
  TrendDataPoint,
} from '../../src/components/trend-analysis';
import {
  TrendIndicator,
  TrendChart,
  TrendSummary,
  ForecasterTrendCard,
  TrendPeriodSelector,
  TrendComparison,
  useTrendAnalysis,
} from '../../src/components/trend-analysis';

// =============================================================================
// Test Data
// =============================================================================

const mockTrendDataPoints: TrendDataPoint[] = [
  { date: '2024-01-01', value: 0.65, label: 'Jan 1' },
  { date: '2024-01-08', value: 0.68, label: 'Jan 8' },
  { date: '2024-01-15', value: 0.72, label: 'Jan 15' },
  { date: '2024-01-22', value: 0.70, label: 'Jan 22' },
  { date: '2024-01-29', value: 0.75, label: 'Jan 29' },
  { date: '2024-02-05', value: 0.78, label: 'Feb 5' },
];

const mockImprovingTrend: PerformanceTrend = {
  metric: 'accuracy',
  metricLabel: 'Accuracy',
  direction: 'improving',
  changePercent: 15.2,
  changeAbsolute: 0.13,
  startValue: 0.65,
  endValue: 0.78,
  period: '30d',
  dataPoints: mockTrendDataPoints,
  confidence: 0.85,
};

const mockDecliningTrend: PerformanceTrend = {
  metric: 'calibration',
  metricLabel: 'Calibration',
  direction: 'declining',
  changePercent: -8.5,
  changeAbsolute: -0.07,
  startValue: 0.82,
  endValue: 0.75,
  period: '30d',
  dataPoints: [
    { date: '2024-01-01', value: 0.82, label: 'Jan 1' },
    { date: '2024-01-15', value: 0.79, label: 'Jan 15' },
    { date: '2024-01-29', value: 0.75, label: 'Jan 29' },
  ],
  confidence: 0.78,
};

const mockStableTrend: PerformanceTrend = {
  metric: 'brierScore',
  metricLabel: 'Brier Score',
  direction: 'stable',
  changePercent: 1.2,
  changeAbsolute: 0.002,
  startValue: 0.18,
  endValue: 0.182,
  period: '30d',
  dataPoints: [
    { date: '2024-01-01', value: 0.18, label: 'Jan 1' },
    { date: '2024-01-15', value: 0.181, label: 'Jan 15' },
    { date: '2024-01-29', value: 0.182, label: 'Jan 29' },
  ],
  confidence: 0.92,
};

const mockTrendMetrics: TrendMetric[] = [
  { key: 'accuracy', label: 'Accuracy', format: 'percent', higherIsBetter: true },
  { key: 'calibration', label: 'Calibration', format: 'percent', higherIsBetter: true },
  { key: 'brierScore', label: 'Brier Score', format: 'decimal', higherIsBetter: false },
  { key: 'totalScore', label: 'Total Score', format: 'number', higherIsBetter: true },
];

// =============================================================================
// TrendIndicator Tests
// =============================================================================

describe('TrendIndicator', () => {
  it('renders indicator container', () => {
    render(<TrendIndicator direction="improving" />);
    expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
  });

  it('shows up arrow for improving trends', () => {
    render(<TrendIndicator direction="improving" />);
    expect(screen.getByTestId('trend-arrow-up')).toBeInTheDocument();
  });

  it('shows down arrow for declining trends', () => {
    render(<TrendIndicator direction="declining" />);
    expect(screen.getByTestId('trend-arrow-down')).toBeInTheDocument();
  });

  it('shows stable indicator for stable trends', () => {
    render(<TrendIndicator direction="stable" />);
    expect(screen.getByTestId('trend-stable')).toBeInTheDocument();
  });

  it('applies green color for improving', () => {
    render(<TrendIndicator direction="improving" />);
    expect(screen.getByTestId('trend-indicator')).toHaveClass('text-green-400');
  });

  it('applies red color for declining', () => {
    render(<TrendIndicator direction="declining" />);
    expect(screen.getByTestId('trend-indicator')).toHaveClass('text-red-400');
  });

  it('applies yellow color for stable', () => {
    render(<TrendIndicator direction="stable" />);
    expect(screen.getByTestId('trend-indicator')).toHaveClass('text-yellow-400');
  });

  it('displays change percentage when provided', () => {
    render(<TrendIndicator direction="improving" changePercent={15.2} />);
    expect(screen.getByText(/15\.2%/)).toBeInTheDocument();
  });

  it('applies compact variant', () => {
    render(<TrendIndicator direction="improving" variant="compact" />);
    expect(screen.getByTestId('trend-indicator')).toHaveClass('compact');
  });

  it('handles inverse metrics (lower is better)', () => {
    render(<TrendIndicator direction="declining" changePercent={-5} inverse />);
    // For inverse metrics, declining is good (green)
    expect(screen.getByTestId('trend-indicator')).toHaveClass('text-green-400');
  });
});

// =============================================================================
// TrendChart Tests
// =============================================================================

describe('TrendChart', () => {
  it('renders chart container', () => {
    render(<TrendChart trend={mockImprovingTrend} />);
    expect(screen.getByTestId('trend-chart')).toBeInTheDocument();
  });

  it('displays metric label', () => {
    render(<TrendChart trend={mockImprovingTrend} />);
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
  });

  it('shows data points on chart', () => {
    render(<TrendChart trend={mockImprovingTrend} />);
    expect(screen.getByTestId('chart-line')).toBeInTheDocument();
  });

  it('displays trend direction indicator', () => {
    render(<TrendChart trend={mockImprovingTrend} />);
    expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
  });

  it('shows start and end values', () => {
    render(<TrendChart trend={mockImprovingTrend} showValues />);
    expect(screen.getByTestId('start-value')).toHaveTextContent('65%');
    expect(screen.getByTestId('end-value')).toHaveTextContent('78%');
  });

  it('applies custom height', () => {
    render(<TrendChart trend={mockImprovingTrend} height={200} />);
    expect(screen.getByTestId('trend-chart')).toHaveStyle({ height: '200px' });
  });

  it('displays period label', () => {
    render(<TrendChart trend={mockImprovingTrend} showPeriod />);
    expect(screen.getByText(/30d/i)).toBeInTheDocument();
  });

  it('can hide the legend', () => {
    render(<TrendChart trend={mockImprovingTrend} showLegend={false} />);
    expect(screen.queryByTestId('chart-legend')).not.toBeInTheDocument();
  });

  it('shows confidence indicator when available', () => {
    render(<TrendChart trend={mockImprovingTrend} showConfidence />);
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });
});

// =============================================================================
// TrendSummary Tests
// =============================================================================

describe('TrendSummary', () => {
  it('renders summary container', () => {
    render(<TrendSummary trends={[mockImprovingTrend, mockDecliningTrend]} />);
    expect(screen.getByTestId('trend-summary')).toBeInTheDocument();
  });

  it('shows count of improving metrics', () => {
    render(<TrendSummary trends={[mockImprovingTrend, mockStableTrend]} />);
    expect(screen.getByTestId('improving-count')).toHaveTextContent('1');
  });

  it('shows count of declining metrics', () => {
    render(<TrendSummary trends={[mockImprovingTrend, mockDecliningTrend]} />);
    expect(screen.getByTestId('declining-count')).toHaveTextContent('1');
  });

  it('shows count of stable metrics', () => {
    render(<TrendSummary trends={[mockStableTrend]} />);
    expect(screen.getByTestId('stable-count')).toHaveTextContent('1');
  });

  it('displays overall assessment', () => {
    render(<TrendSummary trends={[mockImprovingTrend, mockImprovingTrend]} />);
    expect(screen.getByTestId('overall-assessment')).toHaveTextContent(/improving/i);
  });

  it('shows declining assessment when more metrics decline', () => {
    render(<TrendSummary trends={[mockDecliningTrend, mockDecliningTrend, mockStableTrend]} />);
    expect(screen.getByTestId('overall-assessment')).toHaveTextContent(/declining/i);
  });

  it('highlights best performing metric', () => {
    render(<TrendSummary trends={[mockImprovingTrend, mockDecliningTrend]} />);
    expect(screen.getByTestId('best-metric')).toHaveTextContent(/accuracy/i);
  });

  it('highlights worst performing metric', () => {
    render(<TrendSummary trends={[mockImprovingTrend, mockDecliningTrend]} />);
    expect(screen.getByTestId('worst-metric')).toHaveTextContent(/calibration/i);
  });

  it('applies compact variant', () => {
    render(<TrendSummary trends={[mockImprovingTrend]} variant="compact" />);
    expect(screen.getByTestId('trend-summary')).toHaveClass('compact');
  });
});

// =============================================================================
// ForecasterTrendCard Tests
// =============================================================================

describe('ForecasterTrendCard', () => {
  const mockForecaster = {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
    displayName: 'Forecaster Alpha',
    totalScore: 1715,
  };

  it('renders card container', () => {
    render(
      <ForecasterTrendCard
        forecaster={mockForecaster}
        trends={[mockImprovingTrend]}
      />
    );
    expect(screen.getByTestId('forecaster-trend-card')).toBeInTheDocument();
  });

  it('displays forecaster name', () => {
    render(
      <ForecasterTrendCard
        forecaster={mockForecaster}
        trends={[mockImprovingTrend]}
      />
    );
    expect(screen.getByText(/forecaster alpha/i)).toBeInTheDocument();
  });

  it('shows overall trend indicator', () => {
    render(
      <ForecasterTrendCard
        forecaster={mockForecaster}
        trends={[mockImprovingTrend, mockImprovingTrend]}
      />
    );
    expect(screen.getByTestId('overall-trend')).toBeInTheDocument();
  });

  it('displays trend count summary', () => {
    render(
      <ForecasterTrendCard
        forecaster={mockForecaster}
        trends={[mockImprovingTrend, mockDecliningTrend]}
      />
    );
    expect(screen.getByTestId('trend-counts')).toBeInTheDocument();
  });

  it('shows individual metric trends', () => {
    render(
      <ForecasterTrendCard
        forecaster={mockForecaster}
        trends={[mockImprovingTrend, mockDecliningTrend]}
        showDetails
      />
    );
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/calibration/i)).toBeInTheDocument();
  });

  it('applies terminal styling', () => {
    render(
      <ForecasterTrendCard
        forecaster={mockForecaster}
        trends={[mockImprovingTrend]}
      />
    );
    expect(screen.getByTestId('forecaster-trend-card')).toHaveClass('ascii-box');
  });

  it('displays period label', () => {
    render(
      <ForecasterTrendCard
        forecaster={mockForecaster}
        trends={[mockImprovingTrend]}
        period="30d"
      />
    );
    expect(screen.getByText(/30 days/i)).toBeInTheDocument();
  });
});

// =============================================================================
// TrendPeriodSelector Tests
// =============================================================================

describe('TrendPeriodSelector', () => {
  const periods: TrendPeriod[] = ['7d', '30d', '90d', '1y'];

  it('renders selector container', () => {
    render(<TrendPeriodSelector periods={periods} selected="30d" onSelect={() => {}} />);
    expect(screen.getByTestId('period-selector')).toBeInTheDocument();
  });

  it('displays all period options', () => {
    render(<TrendPeriodSelector periods={periods} selected="30d" onSelect={() => {}} />);
    expect(screen.getByText(/7d/)).toBeInTheDocument();
    expect(screen.getByText(/30d/)).toBeInTheDocument();
    expect(screen.getByText(/90d/)).toBeInTheDocument();
    expect(screen.getByText(/1y/)).toBeInTheDocument();
  });

  it('highlights selected period', () => {
    render(<TrendPeriodSelector periods={periods} selected="30d" onSelect={() => {}} />);
    expect(screen.getByTestId('period-30d')).toHaveClass('selected');
  });

  it('calls onSelect when period is clicked', () => {
    let selectedPeriod: TrendPeriod = '30d';
    const onSelect = (period: TrendPeriod) => { selectedPeriod = period; };

    render(<TrendPeriodSelector periods={periods} selected="30d" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('period-7d'));

    expect(selectedPeriod).toBe('7d');
  });

  it('displays human-readable labels', () => {
    render(<TrendPeriodSelector periods={periods} selected="30d" onSelect={() => {}} showLabels />);
    expect(screen.getByText(/7 days/i)).toBeInTheDocument();
    expect(screen.getByText(/30 days/i)).toBeInTheDocument();
  });

  it('applies compact variant', () => {
    render(<TrendPeriodSelector periods={periods} selected="30d" onSelect={() => {}} variant="compact" />);
    expect(screen.getByTestId('period-selector')).toHaveClass('compact');
  });
});

// =============================================================================
// TrendComparison Tests
// =============================================================================

describe('TrendComparison', () => {
  it('renders comparison container', () => {
    render(
      <TrendComparison
        metrics={mockTrendMetrics}
        trends={[mockImprovingTrend, mockDecliningTrend, mockStableTrend]}
      />
    );
    expect(screen.getByTestId('trend-comparison')).toBeInTheDocument();
  });

  it('displays all metrics', () => {
    render(
      <TrendComparison
        metrics={mockTrendMetrics}
        trends={[mockImprovingTrend, mockDecliningTrend]}
      />
    );
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/calibration/i)).toBeInTheDocument();
  });

  it('shows trend indicator for each metric', () => {
    render(
      <TrendComparison
        metrics={mockTrendMetrics}
        trends={[mockImprovingTrend, mockDecliningTrend]}
      />
    );
    expect(screen.getAllByTestId('trend-indicator').length).toBeGreaterThan(0);
  });

  it('displays change percentages', () => {
    render(
      <TrendComparison
        metrics={mockTrendMetrics}
        trends={[mockImprovingTrend]}
        showChanges
      />
    );
    expect(screen.getByText(/15\.2%/)).toBeInTheDocument();
  });

  it('applies terminal styling', () => {
    render(
      <TrendComparison
        metrics={mockTrendMetrics}
        trends={[mockImprovingTrend]}
      />
    );
    expect(screen.getByTestId('trend-comparison')).toHaveClass('ascii-box');
  });

  it('sorts metrics by change magnitude', () => {
    render(
      <TrendComparison
        metrics={mockTrendMetrics}
        trends={[mockImprovingTrend, mockDecliningTrend, mockStableTrend]}
        sortBy="change"
      />
    );
    // First metric should have highest absolute change
    const firstMetric = screen.getAllByTestId('comparison-row')[0];
    expect(firstMetric).toHaveTextContent(/accuracy/i);
  });

  it('shows sparklines when enabled', () => {
    render(
      <TrendComparison
        metrics={mockTrendMetrics}
        trends={[mockImprovingTrend]}
        showSparklines
      />
    );
    expect(screen.getByTestId('sparkline-accuracy')).toBeInTheDocument();
  });
});

// =============================================================================
// useTrendAnalysis Hook Tests
// =============================================================================

describe('useTrendAnalysis', () => {
  function TestComponent({ address, period }: { address: string; period: TrendPeriod }) {
    const {
      trends,
      isLoading,
      error,
      overallDirection,
      improvingCount,
      decliningCount,
    } = useTrendAnalysis(address, period);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="error">{error || 'none'}</div>
        <div data-testid="trends-count">{trends.length}</div>
        <div data-testid="overall-direction">{overallDirection || 'none'}</div>
        <div data-testid="improving-count">{improvingCount}</div>
        <div data-testid="declining-count">{decliningCount}</div>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" period="30d" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads trend data on mount', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" period="30d" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('trends-count')).not.toHaveTextContent('0');
  });

  it('handles invalid address', async () => {
    render(<TestComponent address="0xinvalid" period="30d" />);
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('none');
    }, { timeout: 2000 });
  });

  it('provides overall direction assessment', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" period="30d" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('overall-direction')).not.toHaveTextContent('none');
  });

  it('counts improving and declining metrics', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" period="30d" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    // Check that counts are rendered (values depend on mock data)
    expect(screen.getByTestId('improving-count')).toBeInTheDocument();
    expect(screen.getByTestId('declining-count')).toBeInTheDocument();
  });
});

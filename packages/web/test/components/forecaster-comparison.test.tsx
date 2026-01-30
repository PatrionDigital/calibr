/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type {
  ForecasterProfile,
  ComparisonMetric,
  ComparisonResult,
} from '../../src/components/forecaster-comparison';
import {
  ForecasterComparisonCard,
  MetricComparisonRow,
  ComparisonChart,
  ComparisonSummary,
  useForecasterComparison,
} from '../../src/components/forecaster-comparison';

// =============================================================================
// Test Data
// =============================================================================

const mockForecasterA: ForecasterProfile = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
  ensName: 'forecaster.eth',
  displayName: 'Forecaster Alpha',
  totalScore: 1715,
  percentile: 92,
  level: 'Expert',
  totalForecasts: 245,
  accuracy: 0.78,
  calibration: 0.85,
  brierScore: 0.18,
  avgConfidence: 0.72,
  streakDays: 45,
  badges: ['Century Forecaster', 'Calibration Master'],
  categories: {
    politics: { forecasts: 80, accuracy: 0.82 },
    crypto: { forecasts: 65, accuracy: 0.75 },
    tech: { forecasts: 50, accuracy: 0.80 },
    sports: { forecasts: 50, accuracy: 0.72 },
  },
};

const mockForecasterB: ForecasterProfile = {
  address: '0x1234567890123456789012345678901234567890',
  ensName: 'oracle.eth',
  displayName: 'Oracle Beta',
  totalScore: 1580,
  percentile: 85,
  level: 'Advanced',
  totalForecasts: 312,
  accuracy: 0.72,
  calibration: 0.78,
  brierScore: 0.22,
  avgConfidence: 0.68,
  streakDays: 28,
  badges: ['Volume Trader', 'Quick Draw'],
  categories: {
    politics: { forecasts: 120, accuracy: 0.70 },
    crypto: { forecasts: 100, accuracy: 0.74 },
    tech: { forecasts: 42, accuracy: 0.76 },
    sports: { forecasts: 50, accuracy: 0.70 },
  },
};

const mockComparisonMetrics: ComparisonMetric[] = [
  {
    name: 'Total Score',
    key: 'totalScore',
    valueA: 1715,
    valueB: 1580,
    diff: 135,
    diffPercent: 8.5,
    winner: 'A',
    format: 'number',
  },
  {
    name: 'Accuracy',
    key: 'accuracy',
    valueA: 0.78,
    valueB: 0.72,
    diff: 0.06,
    diffPercent: 8.3,
    winner: 'A',
    format: 'percent',
  },
  {
    name: 'Calibration',
    key: 'calibration',
    valueA: 0.85,
    valueB: 0.78,
    diff: 0.07,
    diffPercent: 9.0,
    winner: 'A',
    format: 'percent',
  },
  {
    name: 'Total Forecasts',
    key: 'totalForecasts',
    valueA: 245,
    valueB: 312,
    diff: -67,
    diffPercent: -21.5,
    winner: 'B',
    format: 'number',
  },
  {
    name: 'Brier Score',
    key: 'brierScore',
    valueA: 0.18,
    valueB: 0.22,
    diff: -0.04,
    diffPercent: -18.2,
    winner: 'A', // Lower is better
    format: 'decimal',
    lowerIsBetter: true,
  },
];

const mockComparisonResult: ComparisonResult = {
  forecasterA: mockForecasterA,
  forecasterB: mockForecasterB,
  metrics: mockComparisonMetrics,
  overallWinner: 'A',
  winsByA: 4,
  winsByB: 1,
  ties: 0,
  generatedAt: Date.now(),
};

// Note: ForecasterSearchSelect and ComparisonDashboard tests are in separate integration tests
// due to async timing issues with their useEffect hooks

// =============================================================================
// ForecasterComparisonCard Tests
// =============================================================================

describe('ForecasterComparisonCard', () => {
  it('renders comparison card', () => {
    render(
      <ForecasterComparisonCard
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
      />
    );
    expect(screen.getByTestId('comparison-card')).toBeInTheDocument();
  });

  it('displays both forecaster names', () => {
    render(
      <ForecasterComparisonCard
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
      />
    );
    expect(screen.getByText(/forecaster alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/oracle beta/i)).toBeInTheDocument();
  });

  it('shows ENS names when available', () => {
    render(
      <ForecasterComparisonCard
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
      />
    );
    expect(screen.getByText(/forecaster\.eth/i)).toBeInTheDocument();
    expect(screen.getByText(/oracle\.eth/i)).toBeInTheDocument();
  });

  it('displays total scores', () => {
    render(
      <ForecasterComparisonCard
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
      />
    );
    expect(screen.getByText(/1715/)).toBeInTheDocument();
    expect(screen.getByText(/1580/)).toBeInTheDocument();
  });

  it('highlights winner', () => {
    render(
      <ForecasterComparisonCard
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        winner="A"
      />
    );
    expect(screen.getByTestId('winner-badge')).toBeInTheDocument();
  });

  it('shows percentile badges', () => {
    render(
      <ForecasterComparisonCard
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
      />
    );
    // Component shows "Top X%" where X = 100 - percentile
    expect(screen.getByText(/Top 8%/)).toBeInTheDocument();
    expect(screen.getByText(/Top 15%/)).toBeInTheDocument();
  });

  it('displays level badges', () => {
    render(
      <ForecasterComparisonCard
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
      />
    );
    expect(screen.getByText(/expert/i)).toBeInTheDocument();
    expect(screen.getByText(/advanced/i)).toBeInTheDocument();
  });

  it('applies compact variant', () => {
    render(
      <ForecasterComparisonCard
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        variant="compact"
      />
    );
    expect(screen.getByTestId('comparison-card')).toHaveClass('compact');
  });
});

// =============================================================================
// MetricComparisonRow Tests
// =============================================================================

describe('MetricComparisonRow', () => {
  const metric = mockComparisonMetrics[0]!;

  it('renders metric row', () => {
    render(<MetricComparisonRow metric={metric} />);
    expect(screen.getByTestId('metric-row')).toBeInTheDocument();
  });

  it('displays metric name', () => {
    render(<MetricComparisonRow metric={metric} />);
    expect(screen.getByText(/total score/i)).toBeInTheDocument();
  });

  it('shows both values', () => {
    render(<MetricComparisonRow metric={metric} />);
    expect(screen.getByTestId('value-a')).toHaveTextContent('1715');
    expect(screen.getByTestId('value-b')).toHaveTextContent('1580');
  });

  it('displays difference', () => {
    render(<MetricComparisonRow metric={metric} showDiff />);
    expect(screen.getByTestId('diff-value')).toHaveTextContent('+135');
  });

  it('displays percentage difference', () => {
    render(<MetricComparisonRow metric={metric} showDiff />);
    expect(screen.getByText(/8\.5%/)).toBeInTheDocument();
  });

  it('highlights winner value', () => {
    render(<MetricComparisonRow metric={metric} highlightWinner />);
    expect(screen.getByTestId('value-a')).toHaveClass('winner');
  });

  it('formats percent values correctly', () => {
    const percentMetric = mockComparisonMetrics[1]!;
    render(<MetricComparisonRow metric={percentMetric} />);
    expect(screen.getByTestId('value-a')).toHaveTextContent('78%');
    expect(screen.getByTestId('value-b')).toHaveTextContent('72%');
  });

  it('formats decimal values correctly', () => {
    const decimalMetric = mockComparisonMetrics[4]!;
    render(<MetricComparisonRow metric={decimalMetric} />);
    expect(screen.getByTestId('value-a')).toHaveTextContent('0.18');
    expect(screen.getByTestId('value-b')).toHaveTextContent('0.22');
  });

  it('handles lower is better metrics', () => {
    const brierMetric = mockComparisonMetrics[4]!;
    render(<MetricComparisonRow metric={brierMetric} highlightWinner />);
    // A has lower Brier score, so A should be winner
    expect(screen.getByTestId('value-a')).toHaveClass('winner');
  });

  it('shows visual comparison bar', () => {
    render(<MetricComparisonRow metric={metric} showBar />);
    expect(screen.getByTestId('comparison-bar')).toBeInTheDocument();
  });
});

// =============================================================================
// ComparisonChart Tests
// =============================================================================

describe('ComparisonChart', () => {
  it('renders chart container', () => {
    render(
      <ComparisonChart
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        metrics={mockComparisonMetrics}
      />
    );
    expect(screen.getByTestId('comparison-chart')).toBeInTheDocument();
  });

  it('displays chart title', () => {
    render(
      <ComparisonChart
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        metrics={mockComparisonMetrics}
        title="Performance Comparison"
      />
    );
    expect(screen.getByText(/performance comparison/i)).toBeInTheDocument();
  });

  it('shows legend with both names', () => {
    render(
      <ComparisonChart
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        metrics={mockComparisonMetrics}
      />
    );
    expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
    expect(screen.getByText(/forecaster alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/oracle beta/i)).toBeInTheDocument();
  });

  it('renders bar chart by default', () => {
    render(
      <ComparisonChart
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        metrics={mockComparisonMetrics}
      />
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('can render radar chart', () => {
    render(
      <ComparisonChart
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        metrics={mockComparisonMetrics}
        chartType="radar"
      />
    );
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('displays all metrics on chart', () => {
    render(
      <ComparisonChart
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        metrics={mockComparisonMetrics}
      />
    );
    // Check that metric labels appear
    expect(screen.getByText(/total score/i)).toBeInTheDocument();
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
  });

  it('applies custom height', () => {
    render(
      <ComparisonChart
        forecasterA={mockForecasterA}
        forecasterB={mockForecasterB}
        metrics={mockComparisonMetrics}
        height={400}
      />
    );
    expect(screen.getByTestId('comparison-chart')).toHaveStyle({ height: '400px' });
  });
});


// =============================================================================
// ComparisonSummary Tests
// =============================================================================

describe('ComparisonSummary', () => {
  it('renders summary panel', () => {
    render(<ComparisonSummary result={mockComparisonResult} />);
    expect(screen.getByTestId('comparison-summary')).toBeInTheDocument();
  });

  it('displays overall winner', () => {
    render(<ComparisonSummary result={mockComparisonResult} />);
    // Winner name appears in multiple places, use getAllByText
    expect(screen.getAllByText(/forecaster alpha/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('overall-winner')).toBeInTheDocument();
  });

  it('shows win counts', () => {
    render(<ComparisonSummary result={mockComparisonResult} />);
    expect(screen.getByTestId('wins-a')).toHaveTextContent('4');
    expect(screen.getByTestId('wins-b')).toHaveTextContent('1');
  });

  it('displays key advantages for winner', () => {
    render(<ComparisonSummary result={mockComparisonResult} />);
    expect(screen.getByText(/calibration/i)).toBeInTheDocument();
  });

  it('shows comparison verdict', () => {
    render(<ComparisonSummary result={mockComparisonResult} />);
    expect(screen.getByTestId('verdict')).toBeInTheDocument();
  });

  it('handles tie result', () => {
    const tieResult: ComparisonResult = {
      ...mockComparisonResult,
      overallWinner: null,
      winsByA: 2,
      winsByB: 2,
      ties: 1,
    };
    render(<ComparisonSummary result={tieResult} />);
    // "Tie" appears in multiple places - use getAllByText
    expect(screen.getAllByText(/tie/i).length).toBeGreaterThan(0);
  });

  it('displays timestamp', () => {
    render(<ComparisonSummary result={mockComparisonResult} />);
    expect(screen.getByTestId('comparison-timestamp')).toBeInTheDocument();
  });

  it('applies compact variant', () => {
    render(<ComparisonSummary result={mockComparisonResult} variant="compact" />);
    expect(screen.getByTestId('comparison-summary')).toHaveClass('compact');
  });
});


// =============================================================================
// useForecasterComparison Hook Tests
// =============================================================================

describe('useForecasterComparison', () => {
  function TestComponent({ userAddress }: { userAddress: string }) {
    const {
      userProfile,
      comparedProfile,
      comparisonResult,
      isLoading,
      error,
      clearComparison,
    } = useForecasterComparison(userAddress);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="error">{error || 'none'}</div>
        <div data-testid="user-profile">{userProfile?.displayName || 'none'}</div>
        <div data-testid="compared-profile">{comparedProfile?.displayName || 'none'}</div>
        <div data-testid="comparison-result">{comparisonResult ? 'exists' : 'none'}</div>
        <button onClick={clearComparison}>Clear</button>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent userAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads user profile on mount', async () => {
    render(<TestComponent userAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('user-profile')).not.toHaveTextContent('none');
  });

  it('handles invalid address', async () => {
    render(<TestComponent userAddress="0xinvalid" />);
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('none');
    }, { timeout: 2000 });
  });

  it('updates when address changes', async () => {
    const { rerender } = render(<TestComponent userAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    rerender(<TestComponent userAddress="0x1234567890123456789012345678901234567890" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });
});

/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  ForecasterComparisonData,
  ComparisonMetric,
  ComparisonCategory,
} from '../../src/components/comparison-tools';
import {
  ComparisonMetricRow,
  ComparisonCategorySection,
  ComparisonRadarChart,
  ComparisonBarChart,
  ForecasterSelector,
  ComparisonSummary,
  HeadToHeadCard,
  ComparisonHistoryList,
  ComparisonToolsPage,
  useForecasterComparison,
} from '../../src/components/comparison-tools';

// =============================================================================
// Test Data
// =============================================================================

const mockForecasterA: ForecasterComparisonData = {
  id: 'forecaster-a',
  name: 'Alice',
  address: '0xaaa111222333',
  tier: 'expert',
  avatarUrl: null,
  stats: {
    totalForecasts: 245,
    resolvedForecasts: 198,
    brierScore: 0.185,
    accuracy: 0.78,
    calibration: 0.82,
    profitLoss: 1250.75,
    winRate: 0.68,
    avgConfidence: 0.72,
    bestStreak: 15,
  },
};

const mockForecasterB: ForecasterComparisonData = {
  id: 'forecaster-b',
  name: 'Bob',
  address: '0xbbb444555666',
  tier: 'superforecaster',
  avatarUrl: null,
  stats: {
    totalForecasts: 312,
    resolvedForecasts: 289,
    brierScore: 0.145,
    accuracy: 0.84,
    calibration: 0.89,
    profitLoss: 2890.50,
    winRate: 0.75,
    avgConfidence: 0.68,
    bestStreak: 22,
  },
};

const mockMetrics: ComparisonMetric[] = [
  {
    key: 'brierScore',
    label: 'Brier Score',
    valueA: 0.185,
    valueB: 0.145,
    format: 'decimal',
    lowerIsBetter: true,
  },
  {
    key: 'accuracy',
    label: 'Accuracy',
    valueA: 0.78,
    valueB: 0.84,
    format: 'percentage',
    lowerIsBetter: false,
  },
  {
    key: 'calibration',
    label: 'Calibration',
    valueA: 0.82,
    valueB: 0.89,
    format: 'percentage',
    lowerIsBetter: false,
  },
];

const mockCategories: ComparisonCategory[] = [
  {
    name: 'Performance',
    metrics: mockMetrics,
  },
  {
    name: 'Activity',
    metrics: [
      {
        key: 'totalForecasts',
        label: 'Total Forecasts',
        valueA: 245,
        valueB: 312,
        format: 'number',
        lowerIsBetter: false,
      },
      {
        key: 'winRate',
        label: 'Win Rate',
        valueA: 0.68,
        valueB: 0.75,
        format: 'percentage',
        lowerIsBetter: false,
      },
    ],
  },
];

const mockComparisonHistory = [
  {
    id: 'cmp-1',
    forecasterA: mockForecasterA,
    forecasterB: mockForecasterB,
    comparedAt: '2025-01-15T10:00:00Z',
    winner: 'forecaster-b' as const,
  },
  {
    id: 'cmp-2',
    forecasterA: { ...mockForecasterA, name: 'Charlie', id: 'forecaster-c' },
    forecasterB: mockForecasterA,
    comparedAt: '2025-01-10T14:30:00Z',
    winner: 'forecaster-a' as const,
  },
];

// =============================================================================
// ComparisonMetricRow Tests
// =============================================================================

describe('ComparisonMetricRow', () => {
  it('renders row', () => {
    render(<ComparisonMetricRow metric={mockMetrics[0]!} nameA="Alice" nameB="Bob" />);
    expect(screen.getByTestId('comparison-metric-row')).toBeInTheDocument();
  });

  it('shows metric label', () => {
    render(<ComparisonMetricRow metric={mockMetrics[0]!} nameA="Alice" nameB="Bob" />);
    expect(screen.getByText('Brier Score')).toBeInTheDocument();
  });

  it('shows both values', () => {
    render(<ComparisonMetricRow metric={mockMetrics[0]!} nameA="Alice" nameB="Bob" />);
    const row = screen.getByTestId('comparison-metric-row');
    expect(row).toHaveTextContent('0.185');
    expect(row).toHaveTextContent('0.145');
  });

  it('highlights winner', () => {
    render(<ComparisonMetricRow metric={mockMetrics[0]!} nameA="Alice" nameB="Bob" />);
    const row = screen.getByTestId('comparison-metric-row');
    expect(row.querySelector('.winner')).toBeInTheDocument();
  });

  it('formats percentage values', () => {
    render(<ComparisonMetricRow metric={mockMetrics[1]!} nameA="Alice" nameB="Bob" />);
    const row = screen.getByTestId('comparison-metric-row');
    expect(row).toHaveTextContent('78%');
    expect(row).toHaveTextContent('84%');
  });
});

// =============================================================================
// ComparisonCategorySection Tests
// =============================================================================

describe('ComparisonCategorySection', () => {
  it('renders section', () => {
    render(<ComparisonCategorySection category={mockCategories[0]!} nameA="Alice" nameB="Bob" />);
    expect(screen.getByTestId('comparison-category-section')).toBeInTheDocument();
  });

  it('shows category name', () => {
    render(<ComparisonCategorySection category={mockCategories[0]!} nameA="Alice" nameB="Bob" />);
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('shows all metrics', () => {
    render(<ComparisonCategorySection category={mockCategories[0]!} nameA="Alice" nameB="Bob" />);
    const rows = screen.getAllByTestId('comparison-metric-row');
    expect(rows.length).toBe(3);
  });
});

// =============================================================================
// ComparisonRadarChart Tests
// =============================================================================

describe('ComparisonRadarChart', () => {
  it('renders chart', () => {
    render(<ComparisonRadarChart forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    expect(screen.getByTestId('comparison-radar-chart')).toBeInTheDocument();
  });

  it('shows forecaster names', () => {
    render(<ComparisonRadarChart forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const chart = screen.getByTestId('comparison-radar-chart');
    expect(chart).toHaveTextContent('Alice');
    expect(chart).toHaveTextContent('Bob');
  });

  it('shows legend', () => {
    render(<ComparisonRadarChart forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    expect(screen.getByTestId('radar-legend')).toBeInTheDocument();
  });
});

// =============================================================================
// ComparisonBarChart Tests
// =============================================================================

describe('ComparisonBarChart', () => {
  it('renders chart', () => {
    render(<ComparisonBarChart metrics={mockMetrics} nameA="Alice" nameB="Bob" />);
    expect(screen.getByTestId('comparison-bar-chart')).toBeInTheDocument();
  });

  it('shows all metric bars', () => {
    render(<ComparisonBarChart metrics={mockMetrics} nameA="Alice" nameB="Bob" />);
    const bars = screen.getAllByTestId('metric-bar-pair');
    expect(bars.length).toBe(3);
  });

  it('shows metric labels', () => {
    render(<ComparisonBarChart metrics={mockMetrics} nameA="Alice" nameB="Bob" />);
    expect(screen.getByText('Brier Score')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
  });
});

// =============================================================================
// ForecasterSelector Tests
// =============================================================================

describe('ForecasterSelector', () => {
  it('renders selector', () => {
    render(<ForecasterSelector selected={mockForecasterA} onSelect={() => {}} label="Select A" />);
    expect(screen.getByTestId('forecaster-selector')).toBeInTheDocument();
  });

  it('shows selected forecaster', () => {
    render(<ForecasterSelector selected={mockForecasterA} onSelect={() => {}} label="Select A" />);
    const selector = screen.getByTestId('forecaster-selector');
    expect(selector).toHaveTextContent('Alice');
  });

  it('shows label', () => {
    render(<ForecasterSelector selected={mockForecasterA} onSelect={() => {}} label="Select A" />);
    expect(screen.getByText('Select A')).toBeInTheDocument();
  });

  it('shows tier badge', () => {
    render(<ForecasterSelector selected={mockForecasterA} onSelect={() => {}} label="Select A" />);
    const selector = screen.getByTestId('forecaster-selector');
    expect(selector).toHaveTextContent(/expert/i);
  });

  it('shows placeholder when no selection', () => {
    render(<ForecasterSelector selected={null} onSelect={() => {}} label="Select A" />);
    expect(screen.getByText(/choose a forecaster/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ComparisonSummary Tests
// =============================================================================

describe('ComparisonSummary', () => {
  it('renders summary', () => {
    render(<ComparisonSummary forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    expect(screen.getByTestId('comparison-summary')).toBeInTheDocument();
  });

  it('shows overall winner', () => {
    render(<ComparisonSummary forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const summary = screen.getByTestId('comparison-summary');
    expect(summary).toHaveTextContent(/bob|winner/i);
  });

  it('shows wins breakdown', () => {
    render(<ComparisonSummary forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const summary = screen.getByTestId('comparison-summary');
    expect(summary).toHaveTextContent(/wins/i);
  });

  it('shows key insights', () => {
    render(<ComparisonSummary forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    expect(screen.getByTestId('key-insights')).toBeInTheDocument();
  });
});

// =============================================================================
// HeadToHeadCard Tests
// =============================================================================

describe('HeadToHeadCard', () => {
  it('renders card', () => {
    render(<HeadToHeadCard forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    expect(screen.getByTestId('head-to-head-card')).toBeInTheDocument();
  });

  it('shows both forecaster names', () => {
    render(<HeadToHeadCard forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const card = screen.getByTestId('head-to-head-card');
    expect(card).toHaveTextContent('Alice');
    expect(card).toHaveTextContent('Bob');
  });

  it('shows vs indicator', () => {
    render(<HeadToHeadCard forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const card = screen.getByTestId('head-to-head-card');
    expect(card).toHaveTextContent(/vs/i);
  });

  it('shows tier badges', () => {
    render(<HeadToHeadCard forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const card = screen.getByTestId('head-to-head-card');
    expect(card).toHaveTextContent(/expert/i);
    expect(card).toHaveTextContent(/superforecaster/i);
  });
});

// =============================================================================
// ComparisonHistoryList Tests
// =============================================================================

describe('ComparisonHistoryList', () => {
  it('renders list', () => {
    render(<ComparisonHistoryList history={mockComparisonHistory} />);
    expect(screen.getByTestId('comparison-history-list')).toBeInTheDocument();
  });

  it('shows all history items', () => {
    render(<ComparisonHistoryList history={mockComparisonHistory} />);
    const items = screen.getAllByTestId('comparison-history-item');
    expect(items.length).toBe(2);
  });

  it('shows empty state', () => {
    render(<ComparisonHistoryList history={[]} />);
    expect(screen.getByText(/no comparisons|empty/i)).toBeInTheDocument();
  });

  it('shows comparison date', () => {
    render(<ComparisonHistoryList history={mockComparisonHistory} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });

  it('shows winner indicator', () => {
    render(<ComparisonHistoryList history={mockComparisonHistory} />);
    const list = screen.getByTestId('comparison-history-list');
    expect(list).toHaveTextContent(/winner/i);
  });
});

// =============================================================================
// ComparisonToolsPage Tests
// =============================================================================

describe('ComparisonToolsPage', () => {
  it('renders page', () => {
    render(<ComparisonToolsPage />);
    expect(screen.getByTestId('comparison-tools-page')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<ComparisonToolsPage />);
    expect(screen.getAllByText(/comparison|compare/i).length).toBeGreaterThan(0);
  });

  it('shows forecaster selectors', () => {
    render(<ComparisonToolsPage />);
    const selectors = screen.getAllByTestId('forecaster-selector');
    expect(selectors.length).toBe(2);
  });

  it('shows compare button', () => {
    render(<ComparisonToolsPage />);
    expect(screen.getByTestId('compare-button')).toBeInTheDocument();
  });

  it('shows empty state initially', () => {
    render(<ComparisonToolsPage />);
    expect(screen.getByTestId('empty-comparison-state')).toBeInTheDocument();
  });

  it('shows comparison result after selection', () => {
    render(
      <ComparisonToolsPage
        initialForecasterA={mockForecasterA}
        initialForecasterB={mockForecasterB}
      />
    );
    expect(screen.getByTestId('comparison-summary')).toBeInTheDocument();
  });

  it('shows history section', () => {
    render(<ComparisonToolsPage />);
    expect(screen.getByTestId('comparison-history-list')).toBeInTheDocument();
  });
});

// =============================================================================
// useForecasterComparison Hook Tests
// =============================================================================

describe('useForecasterComparison', () => {
  function TestComponent({
    forecasterA,
    forecasterB,
  }: {
    forecasterA: ForecasterComparisonData | null;
    forecasterB: ForecasterComparisonData | null;
  }) {
    const {
      isReady,
      metrics,
      categories,
      overallWinner,
      winsA,
      winsB,
      insights,
    } = useForecasterComparison(forecasterA, forecasterB);

    return (
      <div>
        <span data-testid="is-ready">{isReady ? 'yes' : 'no'}</span>
        <span data-testid="metric-count">{metrics.length}</span>
        <span data-testid="category-count">{categories.length}</span>
        <span data-testid="overall-winner">{overallWinner ?? 'none'}</span>
        <span data-testid="wins-a">{winsA}</span>
        <span data-testid="wins-b">{winsB}</span>
        <span data-testid="insight-count">{insights.length}</span>
      </div>
    );
  }

  it('shows ready when both forecasters selected', () => {
    render(<TestComponent forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    expect(screen.getByTestId('is-ready')).toHaveTextContent('yes');
  });

  it('shows not ready when missing forecaster', () => {
    render(<TestComponent forecasterA={mockForecasterA} forecasterB={null} />);
    expect(screen.getByTestId('is-ready')).toHaveTextContent('no');
  });

  it('calculates metrics', () => {
    render(<TestComponent forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const count = parseInt(screen.getByTestId('metric-count').textContent!);
    expect(count).toBeGreaterThan(0);
  });

  it('calculates categories', () => {
    render(<TestComponent forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const count = parseInt(screen.getByTestId('category-count').textContent!);
    expect(count).toBeGreaterThan(0);
  });

  it('determines overall winner', () => {
    render(<TestComponent forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const winner = screen.getByTestId('overall-winner').textContent;
    expect(['forecaster-a', 'forecaster-b', 'tie']).toContain(winner);
  });

  it('counts wins for each forecaster', () => {
    render(<TestComponent forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const winsA = parseInt(screen.getByTestId('wins-a').textContent!);
    const winsB = parseInt(screen.getByTestId('wins-b').textContent!);
    expect(winsA + winsB).toBeGreaterThan(0);
  });

  it('generates insights', () => {
    render(<TestComponent forecasterA={mockForecasterA} forecasterB={mockForecasterB} />);
    const count = parseInt(screen.getByTestId('insight-count').textContent!);
    expect(count).toBeGreaterThan(0);
  });

  it('handles null forecasters', () => {
    render(<TestComponent forecasterA={null} forecasterB={null} />);
    expect(screen.getByTestId('metric-count')).toHaveTextContent('0');
    expect(screen.getByTestId('overall-winner')).toHaveTextContent('none');
  });
});

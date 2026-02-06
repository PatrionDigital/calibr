/**
 * Portfolio Analytics Tests
 * TDD tests for portfolio analytics dashboard components
 * Task 4.1.8: Add portfolio analytics - Charts, allocation breakdown
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  PortfolioAnalytics,
  AllocationChart,
  PnlChart,
  PlatformBreakdown,
  CategoryBreakdown,
  PerformanceMetrics,
  TimeframeSelector,
  AnalyticsSummary,
  usePortfolioAnalytics,
} from '@/components/portfolio-analytics';
import type {
  AllocationData,
  PnlDataPoint,
  PlatformData,
  CategoryData,
  PerformanceData,
  AnalyticsTimeframe,
} from '@/components/portfolio-analytics';

// =============================================================================
// Test Data
// =============================================================================

const mockAllocations: AllocationData[] = [
  { name: 'POLITICS', value: 3500, percent: 35, color: '#00ff00' },
  { name: 'CRYPTO', value: 2500, percent: 25, color: '#00ccff' },
  { name: 'SPORTS', value: 2000, percent: 20, color: '#ffcc00' },
  { name: 'TECH', value: 1500, percent: 15, color: '#ff00ff' },
  { name: 'OTHER', value: 500, percent: 5, color: '#888888' },
];

const mockPnlData: PnlDataPoint[] = [
  { date: '2026-01-01', value: 0, cumulativePnl: 0 },
  { date: '2026-01-07', value: 120, cumulativePnl: 120 },
  { date: '2026-01-14', value: -50, cumulativePnl: 70 },
  { date: '2026-01-21', value: 200, cumulativePnl: 270 },
  { date: '2026-01-28', value: 80, cumulativePnl: 350 },
  { date: '2026-02-04', value: -30, cumulativePnl: 320 },
];

const mockPlatformData: PlatformData[] = [
  { platform: 'LIMITLESS', positions: 8, value: 5500, pnl: 420, pnlPercent: 8.3 },
  { platform: 'POLYMARKET', positions: 5, value: 4500, pnl: -80, pnlPercent: -1.7 },
];

const mockCategoryData: CategoryData[] = [
  { category: 'POLITICS', positions: 4, value: 3500, pnl: 280, pnlPercent: 8.7 },
  { category: 'CRYPTO', positions: 3, value: 2500, pnl: 150, pnlPercent: 6.4 },
  { category: 'SPORTS', positions: 3, value: 2000, pnl: -40, pnlPercent: -2.0 },
  { category: 'TECH', positions: 2, value: 1500, pnl: 50, pnlPercent: 3.4 },
  { category: 'OTHER', positions: 1, value: 500, pnl: -100, pnlPercent: -16.7 },
];

const mockPerformanceData: PerformanceData = {
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
};

// =============================================================================
// AllocationChart Tests
// =============================================================================

describe('AllocationChart', () => {
  it('should render allocation chart', () => {
    render(<AllocationChart data={mockAllocations} />);
    expect(screen.getByTestId('allocation-chart')).toBeInTheDocument();
  });

  it('should display chart title', () => {
    render(<AllocationChart data={mockAllocations} />);
    expect(screen.getByText('Allocation')).toBeInTheDocument();
  });

  it('should display all allocation segments', () => {
    render(<AllocationChart data={mockAllocations} />);
    expect(screen.getByText('POLITICS')).toBeInTheDocument();
    expect(screen.getByText('CRYPTO')).toBeInTheDocument();
    expect(screen.getByText('SPORTS')).toBeInTheDocument();
  });

  it('should display percentages', () => {
    render(<AllocationChart data={mockAllocations} />);
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('should display values', () => {
    render(<AllocationChart data={mockAllocations} />);
    expect(screen.getByText('$3,500')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<AllocationChart data={[]} />);
    expect(screen.getByText('No allocation data')).toBeInTheDocument();
  });

  it('should highlight segment on hover', () => {
    render(<AllocationChart data={mockAllocations} />);
    const segment = screen.getByTestId('segment-POLITICS');
    fireEvent.mouseEnter(segment);
    expect(screen.getByTestId('allocation-tooltip')).toBeInTheDocument();
  });
});

// =============================================================================
// PnlChart Tests
// =============================================================================

describe('PnlChart', () => {
  it('should render P&L chart', () => {
    render(<PnlChart data={mockPnlData} />);
    expect(screen.getByTestId('pnl-chart')).toBeInTheDocument();
  });

  it('should display chart title', () => {
    render(<PnlChart data={mockPnlData} />);
    expect(screen.getByText('P&L Over Time')).toBeInTheDocument();
  });

  it('should show current cumulative P&L', () => {
    render(<PnlChart data={mockPnlData} />);
    expect(screen.getByTestId('current-pnl')).toHaveTextContent('+$320.00');
  });

  it('should display chart area', () => {
    render(<PnlChart data={mockPnlData} />);
    expect(screen.getByTestId('pnl-chart-area')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<PnlChart data={[]} />);
    expect(screen.getByText('No P&L data')).toBeInTheDocument();
  });

  it('should show positive styling for positive P&L', () => {
    render(<PnlChart data={mockPnlData} />);
    const pnl = screen.getByTestId('current-pnl');
    expect(pnl).toHaveAttribute('data-positive', 'true');
  });

  it('should show negative styling for negative P&L', () => {
    const negativeData = [
      { date: '2026-01-01', value: 0, cumulativePnl: 0 },
      { date: '2026-01-07', value: -100, cumulativePnl: -100 },
    ];
    render(<PnlChart data={negativeData} />);
    const pnl = screen.getByTestId('current-pnl');
    expect(pnl).toHaveAttribute('data-positive', 'false');
  });
});

// =============================================================================
// PlatformBreakdown Tests
// =============================================================================

describe('PlatformBreakdown', () => {
  it('should render platform breakdown', () => {
    render(<PlatformBreakdown data={mockPlatformData} />);
    expect(screen.getByTestId('platform-breakdown')).toBeInTheDocument();
  });

  it('should display section title', () => {
    render(<PlatformBreakdown data={mockPlatformData} />);
    expect(screen.getByText('By Platform')).toBeInTheDocument();
  });

  it('should display all platforms', () => {
    render(<PlatformBreakdown data={mockPlatformData} />);
    expect(screen.getByText('LIMITLESS')).toBeInTheDocument();
    expect(screen.getByText('POLYMARKET')).toBeInTheDocument();
  });

  it('should display position counts', () => {
    render(<PlatformBreakdown data={mockPlatformData} />);
    expect(screen.getByText('8 positions')).toBeInTheDocument();
    expect(screen.getByText('5 positions')).toBeInTheDocument();
  });

  it('should display platform values', () => {
    render(<PlatformBreakdown data={mockPlatformData} />);
    expect(screen.getByText('$5,500')).toBeInTheDocument();
  });

  it('should display P&L with correct styling', () => {
    render(<PlatformBreakdown data={mockPlatformData} />);
    const positivePnl = screen.getByTestId('platform-pnl-LIMITLESS');
    const negativePnl = screen.getByTestId('platform-pnl-POLYMARKET');
    expect(positivePnl).toHaveTextContent('+$420');
    expect(negativePnl).toHaveTextContent('-$80');
  });

  it('should show empty state when no data', () => {
    render(<PlatformBreakdown data={[]} />);
    expect(screen.getByText('No platform data')).toBeInTheDocument();
  });
});

// =============================================================================
// CategoryBreakdown Tests
// =============================================================================

describe('CategoryBreakdown', () => {
  it('should render category breakdown', () => {
    render(<CategoryBreakdown data={mockCategoryData} />);
    expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
  });

  it('should display section title', () => {
    render(<CategoryBreakdown data={mockCategoryData} />);
    expect(screen.getByText('By Category')).toBeInTheDocument();
  });

  it('should display all categories', () => {
    render(<CategoryBreakdown data={mockCategoryData} />);
    expect(screen.getByText('POLITICS')).toBeInTheDocument();
    expect(screen.getByText('CRYPTO')).toBeInTheDocument();
    expect(screen.getByText('SPORTS')).toBeInTheDocument();
  });

  it('should display category values', () => {
    render(<CategoryBreakdown data={mockCategoryData} />);
    expect(screen.getByText('$3,500')).toBeInTheDocument();
  });

  it('should display P&L percentages', () => {
    render(<CategoryBreakdown data={mockCategoryData} />);
    expect(screen.getByText('+8.7%')).toBeInTheDocument();
    expect(screen.getByText('-2.0%')).toBeInTheDocument();
  });

  it('should sort by value descending by default', () => {
    render(<CategoryBreakdown data={mockCategoryData} />);
    const items = screen.getAllByTestId('category-item');
    expect(items[0]).toHaveTextContent('POLITICS');
  });

  it('should show empty state when no data', () => {
    render(<CategoryBreakdown data={[]} />);
    expect(screen.getByText('No category data')).toBeInTheDocument();
  });
});

// =============================================================================
// PerformanceMetrics Tests
// =============================================================================

describe('PerformanceMetrics', () => {
  it('should render performance metrics', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
  });

  it('should display total value', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('metric-total-value')).toHaveTextContent('$10,000');
  });

  it('should display total P&L', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('metric-total-pnl')).toHaveTextContent('+$340');
  });

  it('should display win rate', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('metric-win-rate')).toHaveTextContent('65%');
  });

  it('should display average win', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('metric-avg-win')).toHaveTextContent('$180');
  });

  it('should display average loss', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('metric-avg-loss')).toHaveTextContent('$75');
  });

  it('should display Sharpe ratio', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('metric-sharpe')).toHaveTextContent('1.20');
  });

  it('should display max drawdown', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('metric-max-drawdown')).toHaveTextContent('-12.5%');
  });

  it('should display position counts', () => {
    render(<PerformanceMetrics data={mockPerformanceData} />);
    expect(screen.getByTestId('metric-total-positions')).toHaveTextContent('13');
    expect(screen.getByTestId('metric-active-positions')).toHaveTextContent('10');
  });
});

// =============================================================================
// TimeframeSelector Tests
// =============================================================================

describe('TimeframeSelector', () => {
  it('should render timeframe selector', () => {
    render(<TimeframeSelector value="1M" onChange={() => {}} />);
    expect(screen.getByTestId('timeframe-selector')).toBeInTheDocument();
  });

  it('should display all timeframe options', () => {
    render(<TimeframeSelector value="1M" onChange={() => {}} />);
    expect(screen.getByText('1W')).toBeInTheDocument();
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('3M')).toBeInTheDocument();
    expect(screen.getByText('YTD')).toBeInTheDocument();
    expect(screen.getByText('ALL')).toBeInTheDocument();
  });

  it('should highlight selected timeframe', () => {
    render(<TimeframeSelector value="1M" onChange={() => {}} />);
    const selected = screen.getByTestId('timeframe-1M');
    expect(selected).toHaveAttribute('data-selected', 'true');
  });

  it('should call onChange when timeframe clicked', () => {
    const onChange = vi.fn();
    render(<TimeframeSelector value="1M" onChange={onChange} />);
    fireEvent.click(screen.getByText('3M'));
    expect(onChange).toHaveBeenCalledWith('3M');
  });
});

// =============================================================================
// AnalyticsSummary Tests
// =============================================================================

describe('AnalyticsSummary', () => {
  it('should render analytics summary', () => {
    render(<AnalyticsSummary performance={mockPerformanceData} />);
    expect(screen.getByTestId('analytics-summary')).toBeInTheDocument();
  });

  it('should display portfolio value prominently', () => {
    render(<AnalyticsSummary performance={mockPerformanceData} />);
    expect(screen.getByTestId('summary-value')).toHaveTextContent('$10,000');
  });

  it('should display P&L with change indicator', () => {
    render(<AnalyticsSummary performance={mockPerformanceData} />);
    expect(screen.getByTestId('summary-pnl')).toHaveTextContent('+$340');
    expect(screen.getByTestId('summary-pnl-percent')).toHaveTextContent('+3.5%');
  });

  it('should show positive styling for positive performance', () => {
    render(<AnalyticsSummary performance={mockPerformanceData} />);
    const pnl = screen.getByTestId('summary-pnl');
    expect(pnl).toHaveClass('text-green-400');
  });

  it('should show negative styling for negative performance', () => {
    const negativePerformance = {
      ...mockPerformanceData,
      totalPnl: -150,
      totalPnlPercent: -1.5,
    };
    render(<AnalyticsSummary performance={negativePerformance} />);
    const pnl = screen.getByTestId('summary-pnl');
    expect(pnl).toHaveClass('text-red-400');
  });
});

// =============================================================================
// PortfolioAnalytics Tests
// =============================================================================

describe('PortfolioAnalytics', () => {
  it('should render portfolio analytics dashboard', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
      />
    );
    expect(screen.getByTestId('portfolio-analytics')).toBeInTheDocument();
  });

  it('should display analytics summary', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
      />
    );
    expect(screen.getByTestId('analytics-summary')).toBeInTheDocument();
  });

  it('should display timeframe selector', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
      />
    );
    expect(screen.getByTestId('timeframe-selector')).toBeInTheDocument();
  });

  it('should display allocation chart', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
      />
    );
    expect(screen.getByTestId('allocation-chart')).toBeInTheDocument();
  });

  it('should display P&L chart', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
      />
    );
    expect(screen.getByTestId('pnl-chart')).toBeInTheDocument();
  });

  it('should display platform breakdown', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
      />
    );
    expect(screen.getByTestId('platform-breakdown')).toBeInTheDocument();
  });

  it('should display category breakdown', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
      />
    );
    expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
  });

  it('should display performance metrics', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
      />
    );
    expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
  });

  it('should call onTimeframeChange when timeframe selected', () => {
    const onTimeframeChange = vi.fn();
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
        onTimeframeChange={onTimeframeChange}
      />
    );
    fireEvent.click(screen.getByText('3M'));
    expect(onTimeframeChange).toHaveBeenCalledWith('3M');
  });

  it('should show loading state', () => {
    render(
      <PortfolioAnalytics
        allocations={mockAllocations}
        pnlHistory={mockPnlData}
        platforms={mockPlatformData}
        categories={mockCategoryData}
        performance={mockPerformanceData}
        loading
      />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// usePortfolioAnalytics Hook Tests
// =============================================================================

describe('usePortfolioAnalytics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestComponent() {
    const {
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
    } = usePortfolioAnalytics();

    return (
      <div>
        <div data-testid="loading">{loading ? 'true' : 'false'}</div>
        <div data-testid="error">{error || 'none'}</div>
        <div data-testid="timeframe">{timeframe}</div>
        <div data-testid="allocation-count">{allocations?.length ?? 0}</div>
        <div data-testid="pnl-count">{pnlHistory?.length ?? 0}</div>
        <div data-testid="total-value">{performance?.totalValue ?? 0}</div>
        <button onClick={() => setTimeframe('3M')}>Set 3M</button>
        <button onClick={refresh}>Refresh</button>
      </div>
    );
  }

  it('should start in loading state', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('should load analytics data', async () => {
    render(<TestComponent />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(Number(screen.getByTestId('allocation-count').textContent)).toBeGreaterThan(0);
  });

  it('should have default timeframe of 1M', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('timeframe')).toHaveTextContent('1M');
  });

  it('should update timeframe', async () => {
    render(<TestComponent />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    fireEvent.click(screen.getByText('Set 3M'));

    expect(screen.getByTestId('timeframe')).toHaveTextContent('3M');
  });

  it('should refresh data', async () => {
    render(<TestComponent />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    fireEvent.click(screen.getByText('Refresh'));

    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('should load performance data', async () => {
    render(<TestComponent />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(Number(screen.getByTestId('total-value').textContent)).toBeGreaterThan(0);
  });
});

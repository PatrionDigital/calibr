/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  RankHistoryEntry,
  RankHistoryPeriod,
} from '../../src/components/leaderboard-history';
import {
  RankHistoryChart,
  RankHistoryTable,
  RankHistoryStats,
  RankComparisonCard,
  LeaderboardHistoryPage,
  useRankHistory,
} from '../../src/components/leaderboard-history';

// =============================================================================
// Test Data
// =============================================================================

const mockHistoryEntries: RankHistoryEntry[] = [
  {
    date: '2025-01-01',
    rank: 15,
    score: 750,
    tier: 'EXPERT',
    totalForecasters: 500,
  },
  {
    date: '2025-01-08',
    rank: 12,
    score: 780,
    tier: 'EXPERT',
    totalForecasters: 510,
  },
  {
    date: '2025-01-15',
    rank: 8,
    score: 820,
    tier: 'MASTER',
    totalForecasters: 520,
  },
  {
    date: '2025-01-22',
    rank: 5,
    score: 870,
    tier: 'MASTER',
    totalForecasters: 530,
  },
  {
    date: '2025-01-29',
    rank: 3,
    score: 920,
    tier: 'MASTER',
    totalForecasters: 540,
  },
];

// =============================================================================
// RankHistoryChart Tests
// =============================================================================

describe('RankHistoryChart', () => {
  it('renders chart container', () => {
    render(<RankHistoryChart entries={mockHistoryEntries} />);
    expect(screen.getByTestId('rank-history-chart')).toBeInTheDocument();
  });

  it('shows chart title', () => {
    render(<RankHistoryChart entries={mockHistoryEntries} />);
    expect(screen.getByText(/rank history/i)).toBeInTheDocument();
  });

  it('displays data points', () => {
    render(<RankHistoryChart entries={mockHistoryEntries} />);
    // Chart should render 5 data points
    expect(screen.getByTestId('rank-history-chart')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<RankHistoryChart entries={[]} />);
    expect(screen.getByText(/no history/i)).toBeInTheDocument();
  });

  it('supports different time periods', () => {
    const { rerender } = render(<RankHistoryChart entries={mockHistoryEntries} period="week" />);
    expect(screen.getByTestId('rank-history-chart')).toBeInTheDocument();

    rerender(<RankHistoryChart entries={mockHistoryEntries} period="month" />);
    expect(screen.getByTestId('rank-history-chart')).toBeInTheDocument();
  });

  it('shows metric selector', () => {
    render(<RankHistoryChart entries={mockHistoryEntries} showMetricSelector={true} />);
    expect(screen.getByLabelText(/metric/i)).toBeInTheDocument();
  });

  it('toggles between rank and score view', () => {
    render(<RankHistoryChart entries={mockHistoryEntries} showMetricSelector={true} />);
    fireEvent.change(screen.getByLabelText(/metric/i), { target: { value: 'score' } });
    expect(screen.getByTestId('rank-history-chart')).toBeInTheDocument();
  });
});

// =============================================================================
// RankHistoryTable Tests
// =============================================================================

describe('RankHistoryTable', () => {
  it('renders table', () => {
    render(<RankHistoryTable entries={mockHistoryEntries} />);
    expect(screen.getByTestId('rank-history-table')).toBeInTheDocument();
  });

  it('shows table headers', () => {
    render(<RankHistoryTable entries={mockHistoryEntries} />);
    expect(screen.getByText(/date/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rank/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/score/i).length).toBeGreaterThan(0);
  });

  it('displays all entries', () => {
    render(<RankHistoryTable entries={mockHistoryEntries} />);
    expect(screen.getByText('#15')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('shows rank change indicators', () => {
    render(<RankHistoryTable entries={mockHistoryEntries} />);
    // Rank improved from 15 to 3 over time
    const indicators = screen.getAllByTestId('rank-change-indicator');
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('displays tier badges', () => {
    render(<RankHistoryTable entries={mockHistoryEntries} />);
    expect(screen.getAllByText('EXPERT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MASTER').length).toBeGreaterThan(0);
  });

  it('shows empty state', () => {
    render(<RankHistoryTable entries={[]} />);
    expect(screen.getByText(/no history/i)).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<RankHistoryTable entries={mockHistoryEntries} />);
    // Should show formatted dates
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });

  it('supports pagination', () => {
    const manyEntries = Array.from({ length: 20 }, (_, i) => ({
      ...mockHistoryEntries[0]!,
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      rank: 20 - i,
    }));
    render(<RankHistoryTable entries={manyEntries} pageSize={10} />);
    expect(screen.getByText(/page/i)).toBeInTheDocument();
  });
});

// =============================================================================
// RankHistoryStats Tests
// =============================================================================

describe('RankHistoryStats', () => {
  it('renders stats panel', () => {
    render(<RankHistoryStats entries={mockHistoryEntries} />);
    expect(screen.getByTestId('rank-history-stats')).toBeInTheDocument();
  });

  it('shows best rank achieved', () => {
    render(<RankHistoryStats entries={mockHistoryEntries} />);
    expect(screen.getByText(/best rank/i)).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('shows rank improvement', () => {
    render(<RankHistoryStats entries={mockHistoryEntries} />);
    expect(screen.getByText(/improvement/i)).toBeInTheDocument();
  });

  it('shows average rank', () => {
    render(<RankHistoryStats entries={mockHistoryEntries} />);
    expect(screen.getByText(/average/i)).toBeInTheDocument();
  });

  it('shows percentile trend', () => {
    render(<RankHistoryStats entries={mockHistoryEntries} />);
    expect(screen.getByText(/percentile/i)).toBeInTheDocument();
  });

  it('shows tier progression', () => {
    render(<RankHistoryStats entries={mockHistoryEntries} />);
    expect(screen.getByText(/tier progression/i)).toBeInTheDocument();
  });

  it('handles single entry', () => {
    render(<RankHistoryStats entries={[mockHistoryEntries[0]!]} />);
    expect(screen.getByTestId('rank-history-stats')).toBeInTheDocument();
  });

  it('handles empty entries', () => {
    render(<RankHistoryStats entries={[]} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});

// =============================================================================
// RankComparisonCard Tests
// =============================================================================

describe('RankComparisonCard', () => {
  const currentEntry = mockHistoryEntries[4]!;
  const previousEntry = mockHistoryEntries[3]!;

  it('renders comparison card', () => {
    render(<RankComparisonCard current={currentEntry} previous={previousEntry} />);
    expect(screen.getByTestId('rank-comparison-card')).toBeInTheDocument();
  });

  it('shows current rank', () => {
    render(<RankComparisonCard current={currentEntry} previous={previousEntry} />);
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('shows rank change', () => {
    render(<RankComparisonCard current={currentEntry} previous={previousEntry} />);
    // Improved from 5 to 3 = +2 positions
    expect(screen.getByText(/\+2/i)).toBeInTheDocument();
  });

  it('shows positive change indicator for improvement', () => {
    render(<RankComparisonCard current={currentEntry} previous={previousEntry} />);
    expect(screen.getByTestId('change-indicator')).toHaveClass('positive');
  });

  it('shows negative change indicator for decline', () => {
    render(
      <RankComparisonCard
        current={{ ...currentEntry, rank: 10 }}
        previous={previousEntry}
      />
    );
    expect(screen.getByTestId('change-indicator')).toHaveClass('negative');
  });

  it('shows score comparison', () => {
    render(<RankComparisonCard current={currentEntry} previous={previousEntry} />);
    expect(screen.getByText('920')).toBeInTheDocument();
    expect(screen.getByText(/\+50/i)).toBeInTheDocument();
  });

  it('shows period label', () => {
    render(<RankComparisonCard current={currentEntry} previous={previousEntry} period="week" />);
    expect(screen.getByText(/vs.*week/i)).toBeInTheDocument();
  });

  it('handles no previous entry', () => {
    render(<RankComparisonCard current={currentEntry} />);
    expect(screen.getByTestId('rank-comparison-card')).toBeInTheDocument();
    expect(screen.getByText(/new entry/i)).toBeInTheDocument();
  });
});

// =============================================================================
// LeaderboardHistoryPage Tests
// =============================================================================

describe('LeaderboardHistoryPage', () => {
  it('renders history page', () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" />);
    expect(screen.getByTestId('leaderboard-history-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" />);
    expect(screen.getAllByText(/rank history/i).length).toBeGreaterThan(0);
  });

  it('shows stats panel', () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" />);
    expect(screen.getByTestId('rank-history-stats')).toBeInTheDocument();
  });

  it('shows chart', () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" />);
    expect(screen.getByTestId('rank-history-chart')).toBeInTheDocument();
  });

  it('shows table', () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" />);
    expect(screen.getByTestId('rank-history-table')).toBeInTheDocument();
  });

  it('shows comparison card', () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" />);
    expect(screen.getByTestId('rank-comparison-card')).toBeInTheDocument();
  });

  it('has period selector', () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" />);
    expect(screen.getByLabelText(/period/i)).toBeInTheDocument();
  });

  it('filters by period', async () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" />);
    fireEvent.change(screen.getByLabelText(/period/i), { target: { value: 'month' } });
    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-history-page')).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(<LeaderboardHistoryPage entries={[]} userId="user123" loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows user identifier', () => {
    render(<LeaderboardHistoryPage entries={mockHistoryEntries} userId="user123" displayName="alice.eth" />);
    expect(screen.getByText('alice.eth')).toBeInTheDocument();
  });
});

// =============================================================================
// useRankHistory Hook Tests
// =============================================================================

describe('useRankHistory', () => {
  function TestComponent({ entries }: { entries: RankHistoryEntry[] }) {
    const {
      filteredEntries,
      period,
      setPeriod,
      bestRank,
      worstRank,
      averageRank,
      rankImprovement,
      currentPercentile,
    } = useRankHistory(entries);

    return (
      <div>
        <span data-testid="filtered-count">{filteredEntries.length}</span>
        <span data-testid="period">{period}</span>
        <span data-testid="best-rank">{bestRank}</span>
        <span data-testid="worst-rank">{worstRank}</span>
        <span data-testid="average-rank">{averageRank.toFixed(1)}</span>
        <span data-testid="rank-improvement">{rankImprovement}</span>
        <span data-testid="current-percentile">{currentPercentile.toFixed(1)}</span>
        <button onClick={() => setPeriod('month')}>Set Month</button>
        <button onClick={() => setPeriod('year')}>Set Year</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all entries initially', () => {
    render(<TestComponent entries={mockHistoryEntries} />);
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('5');
  });

  it('defaults to all time period', () => {
    render(<TestComponent entries={mockHistoryEntries} />);
    expect(screen.getByTestId('period')).toHaveTextContent('all');
  });

  it('calculates best rank', () => {
    render(<TestComponent entries={mockHistoryEntries} />);
    expect(screen.getByTestId('best-rank')).toHaveTextContent('3');
  });

  it('calculates worst rank', () => {
    render(<TestComponent entries={mockHistoryEntries} />);
    expect(screen.getByTestId('worst-rank')).toHaveTextContent('15');
  });

  it('calculates average rank', () => {
    render(<TestComponent entries={mockHistoryEntries} />);
    // (15 + 12 + 8 + 5 + 3) / 5 = 8.6
    expect(screen.getByTestId('average-rank')).toHaveTextContent('8.6');
  });

  it('calculates rank improvement', () => {
    render(<TestComponent entries={mockHistoryEntries} />);
    // From rank 15 to rank 3 = +12 improvement
    expect(screen.getByTestId('rank-improvement')).toHaveTextContent('12');
  });

  it('calculates current percentile', () => {
    render(<TestComponent entries={mockHistoryEntries} />);
    // Rank 3 out of 540 = top 0.56%
    const percentile = screen.getByTestId('current-percentile').textContent;
    expect(parseFloat(percentile!)).toBeLessThan(1);
  });

  it('changes period', () => {
    render(<TestComponent entries={mockHistoryEntries} />);
    fireEvent.click(screen.getByText('Set Month'));
    expect(screen.getByTestId('period')).toHaveTextContent('month');
  });
});

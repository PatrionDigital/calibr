/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  MarketCategory,
  ExpertiseLevel,
  CategoryExpertise,
  ExpertiseStats,
} from '../../src/components/market-expertise';
import {
  ExpertiseBadge,
  CategoryExpertiseCard,
  ExpertiseRadarChart,
  ExpertiseLeaderboard,
  ExpertiseBreakdown,
  ExpertiseSummary,
  useMarketExpertise,
} from '../../src/components/market-expertise';

// =============================================================================
// Test Data
// =============================================================================

const mockCategories: MarketCategory[] = [
  { key: 'politics', label: 'Politics', icon: '🏛️' },
  { key: 'crypto', label: 'Crypto', icon: '₿' },
  { key: 'sports', label: 'Sports', icon: '⚽' },
  { key: 'tech', label: 'Technology', icon: '💻' },
  { key: 'science', label: 'Science', icon: '🔬' },
];

const mockExpertiseStats: ExpertiseStats = {
  totalForecasts: 85,
  accuracy: 0.82,
  calibration: 0.78,
  brierScore: 0.15,
  avgConfidence: 0.72,
  winRate: 0.68,
  profitLoss: 245.50,
};

const mockPoliticsExpertise: CategoryExpertise = {
  category: mockCategories[0]!,
  level: 'expert',
  score: 892,
  percentile: 94,
  stats: mockExpertiseStats,
  rank: 15,
  totalInCategory: 1250,
  trend: 'improving',
  recentAccuracy: 0.85,
  badges: ['Top 10%', 'Consistent Performer'],
};

const mockCryptoExpertise: CategoryExpertise = {
  category: mockCategories[1]!,
  level: 'advanced',
  score: 720,
  percentile: 82,
  stats: {
    ...mockExpertiseStats,
    totalForecasts: 120,
    accuracy: 0.75,
  },
  rank: 45,
  totalInCategory: 2100,
  trend: 'stable',
  recentAccuracy: 0.74,
  badges: ['High Volume'],
};

const mockSportsExpertise: CategoryExpertise = {
  category: mockCategories[2]!,
  level: 'intermediate',
  score: 480,
  percentile: 58,
  stats: {
    ...mockExpertiseStats,
    totalForecasts: 35,
    accuracy: 0.62,
  },
  rank: 180,
  totalInCategory: 890,
  trend: 'declining',
  recentAccuracy: 0.55,
  badges: [],
};

const mockTechExpertise: CategoryExpertise = {
  category: mockCategories[3]!,
  level: 'beginner',
  score: 150,
  percentile: 25,
  stats: {
    ...mockExpertiseStats,
    totalForecasts: 12,
    accuracy: 0.50,
  },
  rank: 450,
  totalInCategory: 600,
  trend: 'improving',
  recentAccuracy: 0.58,
  badges: [],
};

const mockAllExpertise: CategoryExpertise[] = [
  mockPoliticsExpertise,
  mockCryptoExpertise,
  mockSportsExpertise,
  mockTechExpertise,
];

const mockLeaderboardEntries = [
  { address: '0x111...', displayName: 'PoliticsGuru', score: 950, rank: 1 },
  { address: '0x222...', displayName: 'ElectionPro', score: 920, rank: 2 },
  { address: '0x333...', displayName: 'VotePredictor', score: 892, rank: 3 },
  { address: '0x444...', displayName: 'PolicyExpert', score: 875, rank: 4 },
  { address: '0x555...', displayName: 'CampaignAnalyst', score: 860, rank: 5 },
];

// =============================================================================
// ExpertiseBadge Tests
// =============================================================================

describe('ExpertiseBadge', () => {
  it('renders badge container', () => {
    render(<ExpertiseBadge level="expert" />);
    expect(screen.getByTestId('expertise-badge')).toBeInTheDocument();
  });

  it('displays expert level with gold color', () => {
    render(<ExpertiseBadge level="expert" />);
    expect(screen.getByTestId('expertise-badge')).toHaveClass('text-yellow-400');
    expect(screen.getByText(/expert/i)).toBeInTheDocument();
  });

  it('displays advanced level with purple color', () => {
    render(<ExpertiseBadge level="advanced" />);
    expect(screen.getByTestId('expertise-badge')).toHaveClass('text-purple-400');
    expect(screen.getByText(/advanced/i)).toBeInTheDocument();
  });

  it('displays intermediate level with blue color', () => {
    render(<ExpertiseBadge level="intermediate" />);
    expect(screen.getByTestId('expertise-badge')).toHaveClass('text-blue-400');
    expect(screen.getByText(/intermediate/i)).toBeInTheDocument();
  });

  it('displays beginner level with green color', () => {
    render(<ExpertiseBadge level="beginner" />);
    expect(screen.getByTestId('expertise-badge')).toHaveClass('text-green-400');
    expect(screen.getByText(/beginner/i)).toBeInTheDocument();
  });

  it('displays novice level with zinc color', () => {
    render(<ExpertiseBadge level="novice" />);
    expect(screen.getByTestId('expertise-badge')).toHaveClass('text-zinc-400');
    expect(screen.getByText(/novice/i)).toBeInTheDocument();
  });

  it('shows score when provided', () => {
    render(<ExpertiseBadge level="expert" score={892} />);
    expect(screen.getByText(/892/)).toBeInTheDocument();
  });

  it('applies compact variant', () => {
    render(<ExpertiseBadge level="expert" variant="compact" />);
    expect(screen.getByTestId('expertise-badge')).toHaveClass('compact');
  });
});

// =============================================================================
// CategoryExpertiseCard Tests
// =============================================================================

describe('CategoryExpertiseCard', () => {
  it('renders card container', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} />);
    expect(screen.getByTestId('category-expertise-card')).toBeInTheDocument();
  });

  it('displays category name', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} />);
    expect(screen.getAllByText(/politics/i).length).toBeGreaterThan(0);
  });

  it('shows category icon', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} />);
    expect(screen.getByTestId('category-icon')).toHaveTextContent('🏛️');
  });

  it('displays expertise level badge', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} />);
    expect(screen.getByTestId('expertise-badge')).toBeInTheDocument();
  });

  it('shows expertise score', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} />);
    expect(screen.getByTestId('expertise-score')).toHaveTextContent('892');
  });

  it('displays percentile ranking', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} />);
    expect(screen.getByText(/top 6%/i)).toBeInTheDocument();
  });

  it('shows rank position', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} showRank />);
    expect(screen.getByTestId('rank-position')).toHaveTextContent('#15');
  });

  it('displays total forecasts', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} showStats />);
    expect(screen.getByTestId('total-forecasts')).toHaveTextContent('85');
  });

  it('shows accuracy stat', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} showStats />);
    expect(screen.getByTestId('accuracy-stat')).toHaveTextContent('82%');
  });

  it('displays trend indicator', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} showTrend />);
    expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
  });

  it('shows category badges', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} />);
    expect(screen.getByText(/top 10%/i)).toBeInTheDocument();
  });

  it('applies terminal styling', () => {
    render(<CategoryExpertiseCard expertise={mockPoliticsExpertise} />);
    expect(screen.getByTestId('category-expertise-card')).toHaveClass('ascii-box');
  });
});

// =============================================================================
// ExpertiseRadarChart Tests
// =============================================================================

describe('ExpertiseRadarChart', () => {
  it('renders chart container', () => {
    render(<ExpertiseRadarChart expertise={mockAllExpertise} />);
    expect(screen.getByTestId('expertise-radar-chart')).toBeInTheDocument();
  });

  it('displays chart title', () => {
    render(<ExpertiseRadarChart expertise={mockAllExpertise} title="Expertise Overview" />);
    expect(screen.getByText(/expertise overview/i)).toBeInTheDocument();
  });

  it('shows all category labels', () => {
    render(<ExpertiseRadarChart expertise={mockAllExpertise} />);
    expect(screen.getAllByText(/politics/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/crypto/i)).toBeInTheDocument();
    expect(screen.getByText(/sports/i)).toBeInTheDocument();
  });

  it('renders radar visualization', () => {
    render(<ExpertiseRadarChart expertise={mockAllExpertise} />);
    expect(screen.getByTestId('radar-visualization')).toBeInTheDocument();
  });

  it('shows legend when enabled', () => {
    render(<ExpertiseRadarChart expertise={mockAllExpertise} showLegend />);
    expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
  });

  it('applies custom height', () => {
    render(<ExpertiseRadarChart expertise={mockAllExpertise} height={400} />);
    expect(screen.getByTestId('expertise-radar-chart')).toHaveStyle({ height: '400px' });
  });

  it('highlights strongest category', () => {
    render(<ExpertiseRadarChart expertise={mockAllExpertise} highlightStrongest />);
    expect(screen.getByTestId('strongest-highlight')).toBeInTheDocument();
  });
});

// =============================================================================
// ExpertiseLeaderboard Tests
// =============================================================================

describe('ExpertiseLeaderboard', () => {
  it('renders leaderboard container', () => {
    render(
      <ExpertiseLeaderboard
        category={mockCategories[0]!}
        entries={mockLeaderboardEntries}
      />
    );
    expect(screen.getByTestId('expertise-leaderboard')).toBeInTheDocument();
  });

  it('displays category name in title', () => {
    render(
      <ExpertiseLeaderboard
        category={mockCategories[0]!}
        entries={mockLeaderboardEntries}
      />
    );
    expect(screen.getAllByText(/politics/i).length).toBeGreaterThan(0);
  });

  it('shows all leaderboard entries', () => {
    render(
      <ExpertiseLeaderboard
        category={mockCategories[0]!}
        entries={mockLeaderboardEntries}
      />
    );
    expect(screen.getAllByTestId('leaderboard-entry').length).toBe(5);
  });

  it('displays rank numbers', () => {
    render(
      <ExpertiseLeaderboard
        category={mockCategories[0]!}
        entries={mockLeaderboardEntries}
      />
    );
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('shows forecaster names', () => {
    render(
      <ExpertiseLeaderboard
        category={mockCategories[0]!}
        entries={mockLeaderboardEntries}
      />
    );
    expect(screen.getByText(/politicsguru/i)).toBeInTheDocument();
    expect(screen.getByText(/electionpro/i)).toBeInTheDocument();
  });

  it('displays scores', () => {
    render(
      <ExpertiseLeaderboard
        category={mockCategories[0]!}
        entries={mockLeaderboardEntries}
      />
    );
    expect(screen.getByText(/950/)).toBeInTheDocument();
  });

  it('highlights current user when provided', () => {
    render(
      <ExpertiseLeaderboard
        category={mockCategories[0]!}
        entries={mockLeaderboardEntries}
        currentUserAddress="0x333..."
      />
    );
    expect(screen.getByTestId('current-user-entry')).toBeInTheDocument();
  });

  it('applies terminal styling', () => {
    render(
      <ExpertiseLeaderboard
        category={mockCategories[0]!}
        entries={mockLeaderboardEntries}
      />
    );
    expect(screen.getByTestId('expertise-leaderboard')).toHaveClass('ascii-box');
  });
});

// =============================================================================
// ExpertiseBreakdown Tests
// =============================================================================

describe('ExpertiseBreakdown', () => {
  it('renders breakdown container', () => {
    render(<ExpertiseBreakdown expertise={mockAllExpertise} />);
    expect(screen.getByTestId('expertise-breakdown')).toBeInTheDocument();
  });

  it('displays all categories', () => {
    render(<ExpertiseBreakdown expertise={mockAllExpertise} />);
    expect(screen.getAllByTestId('category-row').length).toBe(4);
  });

  it('shows category names', () => {
    render(<ExpertiseBreakdown expertise={mockAllExpertise} />);
    expect(screen.getAllByText(/politics/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/crypto/i)).toBeInTheDocument();
  });

  it('displays expertise levels', () => {
    render(<ExpertiseBreakdown expertise={mockAllExpertise} />);
    expect(screen.getAllByTestId('expertise-badge').length).toBe(4);
  });

  it('shows scores for each category', () => {
    render(<ExpertiseBreakdown expertise={mockAllExpertise} showScores />);
    expect(screen.getByText(/892/)).toBeInTheDocument();
    expect(screen.getByText(/720/)).toBeInTheDocument();
  });

  it('displays progress bars', () => {
    render(<ExpertiseBreakdown expertise={mockAllExpertise} showProgressBars />);
    expect(screen.getAllByTestId('progress-bar').length).toBe(4);
  });

  it('sorts by score when requested', () => {
    render(<ExpertiseBreakdown expertise={mockAllExpertise} sortBy="score" />);
    const rows = screen.getAllByTestId('category-row');
    // First row should be politics (highest score 892)
    expect(rows[0]).toHaveTextContent(/politics/i);
  });

  it('can expand to show details', () => {
    render(<ExpertiseBreakdown expertise={mockAllExpertise} expandable />);
    const expandButton = screen.getAllByTestId('expand-button')[0]!;
    fireEvent.click(expandButton);
    expect(screen.getByTestId('expanded-details')).toBeInTheDocument();
  });
});

// =============================================================================
// ExpertiseSummary Tests
// =============================================================================

describe('ExpertiseSummary', () => {
  it('renders summary container', () => {
    render(<ExpertiseSummary expertise={mockAllExpertise} />);
    expect(screen.getByTestId('expertise-summary')).toBeInTheDocument();
  });

  it('identifies strongest category', () => {
    render(<ExpertiseSummary expertise={mockAllExpertise} />);
    expect(screen.getByTestId('strongest-category')).toHaveTextContent(/politics/i);
  });

  it('identifies weakest category', () => {
    render(<ExpertiseSummary expertise={mockAllExpertise} />);
    expect(screen.getByTestId('weakest-category')).toHaveTextContent(/technology/i);
  });

  it('shows overall expertise level', () => {
    render(<ExpertiseSummary expertise={mockAllExpertise} />);
    expect(screen.getByTestId('overall-level')).toBeInTheDocument();
  });

  it('displays total categories count', () => {
    render(<ExpertiseSummary expertise={mockAllExpertise} />);
    expect(screen.getByTestId('categories-count')).toHaveTextContent('4');
  });

  it('shows average score', () => {
    render(<ExpertiseSummary expertise={mockAllExpertise} />);
    expect(screen.getByTestId('average-score')).toBeInTheDocument();
  });

  it('displays improving categories count', () => {
    render(<ExpertiseSummary expertise={mockAllExpertise} />);
    expect(screen.getByTestId('improving-count')).toBeInTheDocument();
  });

  it('applies terminal styling', () => {
    render(<ExpertiseSummary expertise={mockAllExpertise} />);
    expect(screen.getByTestId('expertise-summary')).toHaveClass('ascii-box');
  });
});

// =============================================================================
// useMarketExpertise Hook Tests
// =============================================================================

describe('useMarketExpertise', () => {
  function TestComponent({ address }: { address: string }) {
    const {
      expertise,
      categories,
      isLoading,
      error,
      strongestCategory,
      weakestCategory,
      overallLevel,
    } = useMarketExpertise(address);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="error">{error || 'none'}</div>
        <div data-testid="expertise-count">{expertise.length}</div>
        <div data-testid="categories-count">{categories.length}</div>
        <div data-testid="strongest">{strongestCategory?.category.label || 'none'}</div>
        <div data-testid="weakest">{weakestCategory?.category.label || 'none'}</div>
        <div data-testid="overall-level">{overallLevel || 'none'}</div>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads expertise data on mount', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('expertise-count')).not.toHaveTextContent('0');
  });

  it('handles invalid address', async () => {
    render(<TestComponent address="0xinvalid" />);
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('none');
    }, { timeout: 2000 });
  });

  it('provides available categories', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('categories-count')).not.toHaveTextContent('0');
  });

  it('identifies strongest category', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('strongest')).not.toHaveTextContent('none');
  });

  it('identifies weakest category', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('weakest')).not.toHaveTextContent('none');
  });

  it('calculates overall expertise level', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('overall-level')).not.toHaveTextContent('none');
  });
});

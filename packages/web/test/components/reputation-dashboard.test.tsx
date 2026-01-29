/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type {
  PlatformReputation,
  ReputationSummary,
  ReputationTrend,
  ConnectionStatus,
} from '../../src/components/reputation-dashboard';
import {
  ReputationScoreCard,
  ReputationPlatformList,
  ReputationTrendChart,
  ReputationComparisonCard,
  ReputationConnectionPanel,
  ReputationSummaryCard,
  ReputationDashboard,
  useReputationDashboard,
} from '../../src/components/reputation-dashboard';

// =============================================================================
// Test Data
// =============================================================================

const mockPlatformReputations: PlatformReputation[] = [
  {
    platform: 'optimism',
    name: 'Optimism Collective',
    icon: '🔴',
    connected: true,
    score: 850,
    maxScore: 1000,
    level: 'Contributor',
    badges: ['RetroPGF Participant', 'Delegate'],
    lastUpdated: new Date('2024-01-15T10:00:00').getTime(),
    details: {
      retroPGFRounds: 3,
      delegatedVotes: '15000',
      proposalsVoted: 42,
    },
  },
  {
    platform: 'coinbase',
    name: 'Coinbase',
    icon: '🔵',
    connected: true,
    score: 720,
    maxScore: 1000,
    level: 'Verified',
    badges: ['KYC Verified', 'Country Verified'],
    lastUpdated: new Date('2024-01-14T15:00:00').getTime(),
    details: {
      attestations: 5,
      verifiedSince: new Date('2023-06-01').getTime(),
    },
  },
  {
    platform: 'gitcoin',
    name: 'Gitcoin Passport',
    icon: '🟢',
    connected: true,
    score: 45,
    maxScore: 100,
    level: 'Human',
    badges: ['Humanity Verified', 'Web3 Citizen'],
    lastUpdated: new Date('2024-01-13T08:00:00').getTime(),
    details: {
      stamps: 18,
      uniqueHumanityScore: 45,
    },
  },
  {
    platform: 'ens',
    name: 'ENS',
    icon: '📛',
    connected: true,
    score: 100,
    maxScore: 100,
    level: 'Domain Owner',
    badges: ['ENS Holder', '10+ Year Registration'],
    lastUpdated: new Date('2024-01-12T12:00:00').getTime(),
    details: {
      domains: 3,
      primaryName: 'forecaster.eth',
      expiresAt: new Date('2034-01-01').getTime(),
    },
  },
];

const mockDisconnectedPlatform: PlatformReputation = {
  platform: 'ens',
  name: 'ENS',
  icon: '📛',
  connected: false,
  score: 0,
  maxScore: 100,
  level: null,
  badges: [],
  lastUpdated: null,
  details: null,
};

const mockReputationSummary: ReputationSummary = {
  totalScore: 1715,
  maxPossibleScore: 2200,
  percentile: 92,
  connectedPlatforms: 4,
  totalPlatforms: 4,
  totalBadges: 8,
  lastUpdated: new Date('2024-01-15T10:00:00').getTime(),
  overallLevel: 'Expert Forecaster',
};

const mockReputationTrends: ReputationTrend[] = [
  { date: new Date('2024-01-01').getTime(), score: 1500 },
  { date: new Date('2024-01-05').getTime(), score: 1550 },
  { date: new Date('2024-01-10').getTime(), score: 1650 },
  { date: new Date('2024-01-15').getTime(), score: 1715 },
];

// =============================================================================
// ReputationScoreCard Tests
// =============================================================================

describe('ReputationScoreCard', () => {
  it('renders score card', () => {
    render(<ReputationScoreCard score={850} maxScore={1000} label="Optimism" />);
    expect(screen.getByTestId('reputation-score-card')).toBeInTheDocument();
  });

  it('displays score value', () => {
    render(<ReputationScoreCard score={850} maxScore={1000} label="Optimism" />);
    expect(screen.getByText('850')).toBeInTheDocument();
  });

  it('displays max score', () => {
    render(<ReputationScoreCard score={850} maxScore={1000} label="Optimism" />);
    expect(screen.getByText(/1000/)).toBeInTheDocument();
  });

  it('displays label', () => {
    render(<ReputationScoreCard score={850} maxScore={1000} label="Optimism" />);
    expect(screen.getByText(/optimism/i)).toBeInTheDocument();
  });

  it('shows percentage', () => {
    render(<ReputationScoreCard score={850} maxScore={1000} label="Optimism" showPercentage />);
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('displays icon when provided', () => {
    render(<ReputationScoreCard score={850} maxScore={1000} label="Optimism" icon="🔴" />);
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<ReputationScoreCard score={850} maxScore={1000} label="Optimism" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('applies correct progress width', () => {
    render(<ReputationScoreCard score={750} maxScore={1000} label="Test" />);
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('renders compact variant', () => {
    render(<ReputationScoreCard score={850} maxScore={1000} label="Optimism" compact />);
    const card = screen.getByTestId('reputation-score-card');
    expect(card).toHaveClass('p-2');
  });

  it('handles zero max score gracefully', () => {
    render(<ReputationScoreCard score={0} maxScore={0} label="Empty" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationPlatformList Tests
// =============================================================================

describe('ReputationPlatformList', () => {
  it('renders platform list', () => {
    render(<ReputationPlatformList platforms={mockPlatformReputations} />);
    expect(screen.getByTestId('reputation-platform-list')).toBeInTheDocument();
  });

  it('displays all platforms', () => {
    render(<ReputationPlatformList platforms={mockPlatformReputations} />);
    expect(screen.getAllByTestId('platform-item').length).toBe(4);
  });

  it('shows platform names', () => {
    render(<ReputationPlatformList platforms={mockPlatformReputations} />);
    expect(screen.getByText(/optimism collective/i)).toBeInTheDocument();
    expect(screen.getByText(/coinbase/i)).toBeInTheDocument();
    expect(screen.getByText(/gitcoin passport/i)).toBeInTheDocument();
    expect(screen.getByText(/ens/i)).toBeInTheDocument();
  });

  it('shows platform icons', () => {
    render(<ReputationPlatformList platforms={mockPlatformReputations} />);
    expect(screen.getByText('🔴')).toBeInTheDocument();
    expect(screen.getByText('🔵')).toBeInTheDocument();
    expect(screen.getByText('🟢')).toBeInTheDocument();
    expect(screen.getByText('📛')).toBeInTheDocument();
  });

  it('displays platform scores', () => {
    render(<ReputationPlatformList platforms={mockPlatformReputations} />);
    expect(screen.getByText('850')).toBeInTheDocument();
    expect(screen.getByText('720')).toBeInTheDocument();
  });

  it('shows connected status', () => {
    render(<ReputationPlatformList platforms={mockPlatformReputations} />);
    const connectedIndicators = screen.getAllByTestId('connected-indicator');
    expect(connectedIndicators.length).toBe(4);
  });

  it('shows disconnected status for unconnected platforms', () => {
    render(<ReputationPlatformList platforms={[mockDisconnectedPlatform]} />);
    expect(screen.getByTestId('disconnected-indicator')).toBeInTheDocument();
  });

  it('displays badges count', () => {
    render(<ReputationPlatformList platforms={mockPlatformReputations} />);
    const badgeCounts = screen.getAllByTestId('badge-count');
    expect(badgeCounts.length).toBeGreaterThan(0);
  });

  it('shows last updated time', () => {
    render(<ReputationPlatformList platforms={mockPlatformReputations} />);
    const timestamps = screen.getAllByTestId('last-updated');
    expect(timestamps.length).toBe(4);
  });

  it('calls onPlatformClick when platform is clicked', () => {
    const onPlatformClick = vi.fn();
    render(
      <ReputationPlatformList
        platforms={mockPlatformReputations}
        onPlatformClick={onPlatformClick}
      />
    );
    fireEvent.click(screen.getAllByTestId('platform-item')[0]!);
    expect(onPlatformClick).toHaveBeenCalledWith('optimism');
  });

  it('renders empty state when no platforms', () => {
    render(<ReputationPlatformList platforms={[]} />);
    expect(screen.getByText(/no platforms/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationTrendChart Tests
// =============================================================================

describe('ReputationTrendChart', () => {
  it('renders trend chart', () => {
    render(<ReputationTrendChart trends={mockReputationTrends} />);
    expect(screen.getByTestId('reputation-trend-chart')).toBeInTheDocument();
  });

  it('displays chart title', () => {
    render(<ReputationTrendChart trends={mockReputationTrends} title="Score History" />);
    expect(screen.getByText(/score history/i)).toBeInTheDocument();
  });

  it('shows current score', () => {
    render(<ReputationTrendChart trends={mockReputationTrends} />);
    expect(screen.getByText('1715')).toBeInTheDocument();
  });

  it('displays score change indicator', () => {
    render(<ReputationTrendChart trends={mockReputationTrends} />);
    expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
  });

  it('shows positive trend', () => {
    render(<ReputationTrendChart trends={mockReputationTrends} />);
    expect(screen.getByTestId('positive-trend')).toBeInTheDocument();
  });

  it('shows negative trend when score decreases', () => {
    const decreasingTrends: ReputationTrend[] = [
      { date: new Date('2024-01-01').getTime(), score: 1800 },
      { date: new Date('2024-01-15').getTime(), score: 1500 },
    ];
    render(<ReputationTrendChart trends={decreasingTrends} />);
    expect(screen.getByTestId('negative-trend')).toBeInTheDocument();
  });

  it('displays chart area', () => {
    render(<ReputationTrendChart trends={mockReputationTrends} />);
    expect(screen.getByTestId('chart-area')).toBeInTheDocument();
  });

  it('shows time period selector when enabled', () => {
    render(<ReputationTrendChart trends={mockReputationTrends} showPeriodSelector />);
    expect(screen.getByTestId('period-selector')).toBeInTheDocument();
  });

  it('renders empty state when no trends', () => {
    render(<ReputationTrendChart trends={[]} />);
    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });

  it('handles single data point', () => {
    const singleTrend: ReputationTrend[] = [
      { date: new Date('2024-01-15').getTime(), score: 1715 },
    ];
    render(<ReputationTrendChart trends={singleTrend} />);
    expect(screen.getByText('1715')).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationComparisonCard Tests
// =============================================================================

describe('ReputationComparisonCard', () => {
  it('renders comparison card', () => {
    render(<ReputationComparisonCard platforms={mockPlatformReputations} />);
    expect(screen.getByTestId('reputation-comparison-card')).toBeInTheDocument();
  });

  it('displays comparison title', () => {
    render(<ReputationComparisonCard platforms={mockPlatformReputations} />);
    expect(screen.getByText(/platform comparison/i)).toBeInTheDocument();
  });

  it('shows all platforms in comparison', () => {
    render(<ReputationComparisonCard platforms={mockPlatformReputations} />);
    expect(screen.getAllByTestId('comparison-bar').length).toBe(4);
  });

  it('displays platform scores as bars', () => {
    render(<ReputationComparisonCard platforms={mockPlatformReputations} />);
    const bars = screen.getAllByTestId('comparison-bar');
    expect(bars.length).toBe(4);
  });

  it('shows percentage labels', () => {
    render(<ReputationComparisonCard platforms={mockPlatformReputations} />);
    expect(screen.getByText(/85%/)).toBeInTheDocument(); // 850/1000
    expect(screen.getByText(/72%/)).toBeInTheDocument(); // 720/1000
  });

  it('highlights strongest platform', () => {
    render(<ReputationComparisonCard platforms={mockPlatformReputations} />);
    expect(screen.getByTestId('strongest-platform')).toBeInTheDocument();
  });

  it('shows improvement suggestions when enabled', () => {
    render(<ReputationComparisonCard platforms={mockPlatformReputations} showSuggestions />);
    expect(screen.getByTestId('improvement-suggestions')).toBeInTheDocument();
  });

  it('renders empty state when no platforms', () => {
    render(<ReputationComparisonCard platforms={[]} />);
    expect(screen.getByText(/no platforms to compare/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationConnectionPanel Tests
// =============================================================================

describe('ReputationConnectionPanel', () => {
  it('renders connection panel', () => {
    render(
      <ReputationConnectionPanel
        platforms={mockPlatformReputations}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByTestId('reputation-connection-panel')).toBeInTheDocument();
  });

  it('displays panel title', () => {
    render(
      <ReputationConnectionPanel
        platforms={mockPlatformReputations}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText(/connected platforms/i)).toBeInTheDocument();
  });

  it('shows all platforms', () => {
    render(
      <ReputationConnectionPanel
        platforms={mockPlatformReputations}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getAllByTestId('connection-item').length).toBe(4);
  });

  it('shows connect button for disconnected platforms', () => {
    render(
      <ReputationConnectionPanel
        platforms={[mockDisconnectedPlatform]}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('shows disconnect button for connected platforms', () => {
    render(
      <ReputationConnectionPanel
        platforms={mockPlatformReputations}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    const disconnectButtons = screen.getAllByRole('button', { name: /disconnect/i });
    expect(disconnectButtons.length).toBe(4);
  });

  it('calls onConnect when connect button is clicked', () => {
    const onConnect = vi.fn();
    render(
      <ReputationConnectionPanel
        platforms={[mockDisconnectedPlatform]}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(onConnect).toHaveBeenCalledWith('ens');
  });

  it('calls onDisconnect when disconnect button is clicked', () => {
    const onDisconnect = vi.fn();
    render(
      <ReputationConnectionPanel
        platforms={mockPlatformReputations}
        onConnect={vi.fn()}
        onDisconnect={onDisconnect}
      />
    );
    fireEvent.click(screen.getAllByRole('button', { name: /disconnect/i })[0]!);
    expect(onDisconnect).toHaveBeenCalledWith('optimism');
  });

  it('displays connection status', () => {
    render(
      <ReputationConnectionPanel
        platforms={mockPlatformReputations}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    const connectedLabels = screen.getAllByText(/connected/i);
    expect(connectedLabels.length).toBeGreaterThan(0);
  });

  it('shows loading state when connecting', () => {
    render(
      <ReputationConnectionPanel
        platforms={mockPlatformReputations}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
        connectingPlatform="optimism"
      />
    );
    expect(screen.getByTestId('connecting-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationSummaryCard Tests
// =============================================================================

describe('ReputationSummaryCard', () => {
  it('renders summary card', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByTestId('reputation-summary-card')).toBeInTheDocument();
  });

  it('displays total score', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByText('1715')).toBeInTheDocument();
  });

  it('shows max possible score', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByText(/2200/)).toBeInTheDocument();
  });

  it('displays percentile', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByText(/92/)).toBeInTheDocument();
  });

  it('shows connected platforms count', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByTestId('connected-count')).toHaveTextContent('4');
  });

  it('displays total badges', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByTestId('total-badges')).toHaveTextContent('8');
  });

  it('shows overall level', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByText(/expert forecaster/i)).toBeInTheDocument();
  });

  it('displays last updated time', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByTestId('summary-last-updated')).toBeInTheDocument();
  });

  it('shows progress towards max score', () => {
    render(<ReputationSummaryCard summary={mockReputationSummary} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationDashboard Tests
// =============================================================================

describe('ReputationDashboard', () => {
  const defaultProps = {
    platforms: mockPlatformReputations,
    summary: mockReputationSummary,
    trends: mockReputationTrends,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onRefresh: vi.fn(),
  };

  it('renders dashboard', () => {
    render(<ReputationDashboard {...defaultProps} />);
    expect(screen.getByTestId('reputation-dashboard')).toBeInTheDocument();
  });

  it('displays dashboard title', () => {
    render(<ReputationDashboard {...defaultProps} />);
    expect(screen.getByText(/reputation dashboard/i)).toBeInTheDocument();
  });

  it('shows summary card', () => {
    render(<ReputationDashboard {...defaultProps} />);
    expect(screen.getByTestId('reputation-summary-card')).toBeInTheDocument();
  });

  it('displays platform list', () => {
    render(<ReputationDashboard {...defaultProps} />);
    expect(screen.getByTestId('reputation-platform-list')).toBeInTheDocument();
  });

  it('shows trend chart', () => {
    render(<ReputationDashboard {...defaultProps} />);
    expect(screen.getByTestId('reputation-trend-chart')).toBeInTheDocument();
  });

  it('displays comparison card', () => {
    render(<ReputationDashboard {...defaultProps} />);
    expect(screen.getByTestId('reputation-comparison-card')).toBeInTheDocument();
  });

  it('shows connection panel', () => {
    render(<ReputationDashboard {...defaultProps} />);
    expect(screen.getByTestId('reputation-connection-panel')).toBeInTheDocument();
  });

  it('displays refresh button', () => {
    render(<ReputationDashboard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(<ReputationDashboard {...defaultProps} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<ReputationDashboard {...defaultProps} isLoading />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('displays error state', () => {
    render(<ReputationDashboard {...defaultProps} error="Failed to load reputation" />);
    expect(screen.getByText(/failed to load reputation/i)).toBeInTheDocument();
  });

  it('shows address in header', () => {
    render(<ReputationDashboard {...defaultProps} address="0x742d...2bD51" />);
    expect(screen.getByText(/0x742d/)).toBeInTheDocument();
  });

  it('displays ENS name when available', () => {
    render(<ReputationDashboard {...defaultProps} ensName="forecaster.eth" />);
    expect(screen.getByText(/forecaster\.eth/i)).toBeInTheDocument();
  });
});

// =============================================================================
// useReputationDashboard Hook Tests
// =============================================================================

describe('useReputationDashboard', () => {
  function TestComponent({ address }: { address: string }) {
    const {
      platforms,
      summary,
      trends,
      isLoading,
      error,
      connectionStatus,
      refresh,
      connect,
      disconnect,
    } = useReputationDashboard(address);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="error">{error ?? 'none'}</div>
        <div data-testid="platforms-count">{platforms.length}</div>
        <div data-testid="summary-score">{summary?.totalScore ?? 0}</div>
        <div data-testid="trends-count">{trends.length}</div>
        <div data-testid="connection-status">{connectionStatus}</div>
        <button onClick={() => refresh()}>Refresh</button>
        <button onClick={() => connect('optimism')}>Connect Optimism</button>
        <button onClick={() => disconnect('optimism')}>Disconnect Optimism</button>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent address="0x123" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads dashboard data', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('platforms-count')).toHaveTextContent('4');
  });

  it('provides summary data', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('summary-score')).not.toHaveTextContent('0');
    }, { timeout: 2000 });
  });

  it('provides trends data', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('trends-count')).not.toHaveTextContent('0');
    }, { timeout: 2000 });
  });

  it('refreshes data when refresh is called', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Refresh'));
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('connects platform', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Connect Optimism'));
    expect(screen.getByTestId('connection-status')).toHaveTextContent('connecting');
  });

  it('disconnects platform', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Disconnect Optimism'));
    // Should trigger update
    await waitFor(() => {
      expect(screen.getByTestId('platforms-count')).toHaveTextContent('4');
    });
  });

  it('handles different addresses', async () => {
    const { rerender } = render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    rerender(<TestComponent address="0x456" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });
});

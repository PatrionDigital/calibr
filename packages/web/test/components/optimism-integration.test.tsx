/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  RetroFundingRound,
  OptimismProfile,
} from '../../src/components/optimism-integration';
import {
  OpBadge,
  RetroFundingCard,
  RetroFundingRoundList,
  OptimismConnectionStatus,
  OptimismReputationScore,
  OptimismContributionSummary,
  OptimismProfileLink,
  OptimismIntegrationHub,
  useOptimismReputation,
} from '../../src/components/optimism-integration';

// =============================================================================
// Test Data
// =============================================================================

const mockRounds: RetroFundingRound[] = [
  {
    id: 'rpgf3',
    name: 'RetroPGF Round 3',
    roundNumber: 3,
    receivedOp: 50000,
    projectName: 'Calibr.xyz',
    category: 'developer-tools',
    votedAt: '2023-11-15T00:00:00Z',
  },
  {
    id: 'rpgf4',
    name: 'RetroPGF Round 4',
    roundNumber: 4,
    receivedOp: 75000,
    projectName: 'Calibr.xyz',
    category: 'analytics',
    votedAt: '2024-06-01T00:00:00Z',
  },
];

const mockProfile: OptimismProfile = {
  address: '0x1234abcd5678ef90',
  citizenStatus: 'citizen',
  totalOpReceived: 125000,
  roundsParticipated: 2,
  rounds: mockRounds,
  attestationCount: 5,
  delegateStatus: 'active',
  votingPower: 15000,
  connectedAt: '2024-01-10T00:00:00Z',
};

// =============================================================================
// OpBadge Tests
// =============================================================================

describe('OpBadge', () => {
  it('renders badge', () => {
    render(<OpBadge status="citizen" />);
    expect(screen.getByTestId('op-badge')).toBeInTheDocument();
  });

  it('shows citizen status', () => {
    render(<OpBadge status="citizen" />);
    const badge = screen.getByTestId('op-badge');
    expect(badge).toHaveTextContent(/citizen/i);
  });

  it('shows delegate status', () => {
    render(<OpBadge status="delegate" />);
    const badge = screen.getByTestId('op-badge');
    expect(badge).toHaveTextContent(/delegate/i);
  });

  it('shows contributor status', () => {
    render(<OpBadge status="contributor" />);
    const badge = screen.getByTestId('op-badge');
    expect(badge).toHaveTextContent(/contributor/i);
  });

  it('shows none status', () => {
    render(<OpBadge status="none" />);
    const badge = screen.getByTestId('op-badge');
    expect(badge).toHaveTextContent(/not connected/i);
  });
});

// =============================================================================
// RetroFundingCard Tests
// =============================================================================

describe('RetroFundingCard', () => {
  it('renders card', () => {
    render(<RetroFundingCard round={mockRounds[0]!} />);
    expect(screen.getByTestId('retro-funding-card')).toBeInTheDocument();
  });

  it('shows round name', () => {
    render(<RetroFundingCard round={mockRounds[0]!} />);
    expect(screen.getByText('RetroPGF Round 3')).toBeInTheDocument();
  });

  it('shows OP received', () => {
    render(<RetroFundingCard round={mockRounds[0]!} />);
    const card = screen.getByTestId('retro-funding-card');
    expect(card).toHaveTextContent('50,000');
  });

  it('shows project name', () => {
    render(<RetroFundingCard round={mockRounds[0]!} />);
    expect(screen.getByText('Calibr.xyz')).toBeInTheDocument();
  });

  it('shows category', () => {
    render(<RetroFundingCard round={mockRounds[0]!} />);
    const card = screen.getByTestId('retro-funding-card');
    expect(card).toHaveTextContent(/developer/i);
  });
});

// =============================================================================
// RetroFundingRoundList Tests
// =============================================================================

describe('RetroFundingRoundList', () => {
  it('renders list', () => {
    render(<RetroFundingRoundList rounds={mockRounds} />);
    expect(screen.getByTestId('retro-funding-list')).toBeInTheDocument();
  });

  it('shows all rounds', () => {
    render(<RetroFundingRoundList rounds={mockRounds} />);
    const cards = screen.getAllByTestId('retro-funding-card');
    expect(cards.length).toBe(2);
  });

  it('shows empty state', () => {
    render(<RetroFundingRoundList rounds={[]} />);
    expect(screen.getByText(/no retro/i)).toBeInTheDocument();
  });

  it('shows total OP received', () => {
    render(<RetroFundingRoundList rounds={mockRounds} />);
    const list = screen.getByTestId('retro-funding-list');
    expect(list).toHaveTextContent('125,000');
  });
});

// =============================================================================
// OptimismConnectionStatus Tests
// =============================================================================

describe('OptimismConnectionStatus', () => {
  it('renders status', () => {
    render(<OptimismConnectionStatus status="connected" />);
    expect(screen.getByTestId('op-connection-status')).toBeInTheDocument();
  });

  it('shows connected state', () => {
    render(<OptimismConnectionStatus status="connected" />);
    expect(screen.getAllByText(/connected/i).length).toBeGreaterThan(0);
  });

  it('shows disconnected state', () => {
    render(<OptimismConnectionStatus status="disconnected" />);
    expect(screen.getAllByText(/not connected|disconnected/i).length).toBeGreaterThan(0);
  });

  it('shows syncing state', () => {
    render(<OptimismConnectionStatus status="syncing" />);
    expect(screen.getAllByText(/syncing/i).length).toBeGreaterThan(0);
  });

  it('shows error state', () => {
    render(<OptimismConnectionStatus status="error" error="Failed to fetch" />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });
});

// =============================================================================
// OptimismReputationScore Tests
// =============================================================================

describe('OptimismReputationScore', () => {
  it('renders score', () => {
    render(<OptimismReputationScore profile={mockProfile} />);
    expect(screen.getByTestId('op-reputation-score')).toBeInTheDocument();
  });

  it('shows total OP received', () => {
    render(<OptimismReputationScore profile={mockProfile} />);
    const score = screen.getByTestId('op-reputation-score');
    expect(score).toHaveTextContent('125,000');
  });

  it('shows rounds participated', () => {
    render(<OptimismReputationScore profile={mockProfile} />);
    const score = screen.getByTestId('op-reputation-score');
    expect(score).toHaveTextContent('2');
  });

  it('shows attestation count', () => {
    render(<OptimismReputationScore profile={mockProfile} />);
    const score = screen.getByTestId('op-reputation-score');
    expect(score).toHaveTextContent('5');
  });

  it('shows voting power', () => {
    render(<OptimismReputationScore profile={mockProfile} />);
    const score = screen.getByTestId('op-reputation-score');
    expect(score).toHaveTextContent('15,000');
  });
});

// =============================================================================
// OptimismContributionSummary Tests
// =============================================================================

describe('OptimismContributionSummary', () => {
  it('renders summary', () => {
    render(<OptimismContributionSummary profile={mockProfile} />);
    expect(screen.getByTestId('op-contribution-summary')).toBeInTheDocument();
  });

  it('shows citizen badge', () => {
    render(<OptimismContributionSummary profile={mockProfile} />);
    expect(screen.getByTestId('op-badge')).toBeInTheDocument();
  });

  it('shows delegate status', () => {
    render(<OptimismContributionSummary profile={mockProfile} />);
    const summary = screen.getByTestId('op-contribution-summary');
    expect(summary).toHaveTextContent(/active/i);
  });

  it('shows connection date', () => {
    render(<OptimismContributionSummary profile={mockProfile} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// OptimismProfileLink Tests
// =============================================================================

describe('OptimismProfileLink', () => {
  it('renders link', () => {
    render(<OptimismProfileLink address="0x1234abcd5678ef90" />);
    expect(screen.getByTestId('op-profile-link')).toBeInTheDocument();
  });

  it('shows address snippet', () => {
    render(<OptimismProfileLink address="0x1234abcd5678ef90" />);
    const link = screen.getByTestId('op-profile-link');
    expect(link).toHaveTextContent(/0x1234/);
  });

  it('shows Optimism branding', () => {
    render(<OptimismProfileLink address="0x1234abcd5678ef90" />);
    const link = screen.getByTestId('op-profile-link');
    expect(link).toHaveTextContent(/optimism/i);
  });
});

// =============================================================================
// OptimismIntegrationHub Tests
// =============================================================================

describe('OptimismIntegrationHub', () => {
  it('renders hub', () => {
    render(<OptimismIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('op-integration-hub')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<OptimismIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getAllByText(/optimism/i).length).toBeGreaterThan(0);
  });

  it('shows connection status', () => {
    render(<OptimismIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('op-connection-status')).toBeInTheDocument();
  });

  it('shows reputation score', () => {
    render(<OptimismIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('op-reputation-score')).toBeInTheDocument();
  });

  it('shows retro funding list', () => {
    render(<OptimismIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('retro-funding-list')).toBeInTheDocument();
  });

  it('shows contribution summary', () => {
    render(<OptimismIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('op-contribution-summary')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<OptimismIntegrationHub profile={null} status="syncing" loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows connect prompt when disconnected', () => {
    render(<OptimismIntegrationHub profile={null} status="disconnected" />);
    expect(screen.getByTestId('connect-prompt')).toBeInTheDocument();
  });

  it('calls onConnect when connect clicked', () => {
    const onConnect = vi.fn();
    render(<OptimismIntegrationHub profile={null} status="disconnected" onConnect={onConnect} />);
    fireEvent.click(screen.getByTestId('connect-button'));
    expect(onConnect).toHaveBeenCalled();
  });
});

// =============================================================================
// useOptimismReputation Hook Tests
// =============================================================================

describe('useOptimismReputation', () => {
  function TestComponent({ profile }: { profile: OptimismProfile | null }) {
    const {
      isConnected,
      totalOp,
      roundCount,
      citizenStatus,
      reputationTier,
    } = useOptimismReputation(profile);

    return (
      <div>
        <span data-testid="is-connected">{isConnected ? 'yes' : 'no'}</span>
        <span data-testid="total-op">{totalOp}</span>
        <span data-testid="round-count">{roundCount}</span>
        <span data-testid="citizen-status">{citizenStatus}</span>
        <span data-testid="reputation-tier">{reputationTier}</span>
      </div>
    );
  }

  it('shows connected when profile exists', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('is-connected')).toHaveTextContent('yes');
  });

  it('shows disconnected when no profile', () => {
    render(<TestComponent profile={null} />);
    expect(screen.getByTestId('is-connected')).toHaveTextContent('no');
  });

  it('calculates total OP', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('total-op')).toHaveTextContent('125000');
  });

  it('counts rounds', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('round-count')).toHaveTextContent('2');
  });

  it('shows citizen status', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('citizen-status')).toHaveTextContent('citizen');
  });

  it('calculates reputation tier', () => {
    render(<TestComponent profile={mockProfile} />);
    const tier = screen.getByTestId('reputation-tier').textContent;
    expect(['bronze', 'silver', 'gold', 'platinum']).toContain(tier);
  });

  it('handles null profile', () => {
    render(<TestComponent profile={null} />);
    expect(screen.getByTestId('total-op')).toHaveTextContent('0');
    expect(screen.getByTestId('round-count')).toHaveTextContent('0');
  });
});

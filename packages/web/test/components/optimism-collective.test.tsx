'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  OptimismBadge,
  RetroFundingCard,
  OptimismReputationScore,
  OptimismConnectionStatus,
  RetroFundingHistory,
  OptimismProfileLink,
  CitizenBadge,
  OptimismIntegrationHub,
  useOptimismReputation,
  type RetroFundingRound,
  type OptimismProfile,
  type CitizenStatus,
} from '@/components/optimism-collective';

// =============================================================================
// Test Data
// =============================================================================

const mockRetroFundingRounds: RetroFundingRound[] = [
  {
    id: 'rf1',
    roundNumber: 1,
    name: 'RetroPGF 1',
    participatedAs: 'voter',
    votingPower: 100,
    projectsVoted: 15,
    fundingAllocated: 0,
    completedAt: new Date('2022-10-01').getTime(),
  },
  {
    id: 'rf2',
    roundNumber: 2,
    name: 'RetroPGF 2',
    participatedAs: 'badgeholder',
    votingPower: 250,
    projectsVoted: 45,
    fundingAllocated: 0,
    completedAt: new Date('2023-03-15').getTime(),
  },
  {
    id: 'rf3',
    roundNumber: 3,
    name: 'RetroPGF 3',
    participatedAs: 'recipient',
    votingPower: 0,
    projectsVoted: 0,
    fundingAllocated: 50000,
    completedAt: new Date('2023-11-01').getTime(),
  },
];

const mockOptimismProfile: OptimismProfile = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
  ensName: 'forecaster.eth',
  isCitizen: true,
  citizenSince: new Date('2023-01-15').getTime(),
  badgeholderRounds: [2, 3],
  retroFundingParticipation: mockRetroFundingRounds,
  totalVotingPower: 350,
  reputationScore: 85,
  attestations: ['0xattestation1', '0xattestation2'],
};

const mockCitizenStatus: CitizenStatus = {
  isCitizen: true,
  since: new Date('2023-01-15').getTime(),
  votingPower: 350,
  badgeholderStatus: true,
  attestationUid: '0xcitizenattestation',
};

// =============================================================================
// OptimismBadge Tests
// =============================================================================

describe('OptimismBadge', () => {
  it('should render badge', () => {
    render(<OptimismBadge type="citizen" />);
    expect(screen.getByTestId('optimism-badge')).toBeInTheDocument();
  });

  it('should display citizen badge', () => {
    render(<OptimismBadge type="citizen" />);
    expect(screen.getByText(/citizen/i)).toBeInTheDocument();
  });

  it('should display badgeholder badge', () => {
    render(<OptimismBadge type="badgeholder" />);
    expect(screen.getByText(/badgeholder/i)).toBeInTheDocument();
  });

  it('should display voter badge', () => {
    render(<OptimismBadge type="voter" />);
    expect(screen.getByText(/voter/i)).toBeInTheDocument();
  });

  it('should display recipient badge', () => {
    render(<OptimismBadge type="recipient" />);
    expect(screen.getByText(/recipient/i)).toBeInTheDocument();
  });

  it('should show Optimism red color', () => {
    render(<OptimismBadge type="citizen" />);
    const badge = screen.getByTestId('optimism-badge');
    expect(badge).toHaveClass('text-red-400');
  });

  it('should show verified icon when verified', () => {
    render(<OptimismBadge type="badgeholder" verified />);
    expect(screen.getByTestId('verified-icon')).toBeInTheDocument();
  });

  it('should show round number for badgeholder', () => {
    render(<OptimismBadge type="badgeholder" roundNumber={3} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('should apply compact styling', () => {
    render(<OptimismBadge type="citizen" size="sm" />);
    const badge = screen.getByTestId('optimism-badge');
    expect(badge).toHaveClass('text-xs');
  });
});

// =============================================================================
// RetroFundingCard Tests
// =============================================================================

describe('RetroFundingCard', () => {
  it('should render card', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[0]!} />);
    expect(screen.getByTestId('retro-funding-card')).toBeInTheDocument();
  });

  it('should display round name', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[0]!} />);
    expect(screen.getByText('RetroPGF 1')).toBeInTheDocument();
  });

  it('should display participation type', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[1]!} />);
    expect(screen.getByText(/badgeholder/i)).toBeInTheDocument();
  });

  it('should display voting power for voters', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[1]!} />);
    expect(screen.getByText(/250/)).toBeInTheDocument();
  });

  it('should display projects voted count', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[1]!} />);
    expect(screen.getByTestId('projects-voted')).toHaveTextContent('45');
  });

  it('should display funding allocated for recipients', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[2]!} />);
    expect(screen.getByText(/50,000/)).toBeInTheDocument();
  });

  it('should show completion date', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[0]!} />);
    expect(screen.getByTestId('completion-date')).toBeInTheDocument();
  });

  it('should apply recipient styling for recipients', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[2]!} />);
    const card = screen.getByTestId('retro-funding-card');
    expect(card).toHaveClass('border-green-400/30');
  });

  it('should apply badgeholder styling', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[1]!} />);
    const card = screen.getByTestId('retro-funding-card');
    expect(card).toHaveClass('border-red-400/30');
  });
});

// =============================================================================
// OptimismReputationScore Tests
// =============================================================================

describe('OptimismReputationScore', () => {
  it('should render score', () => {
    render(<OptimismReputationScore score={85} />);
    expect(screen.getByTestId('optimism-reputation-score')).toBeInTheDocument();
  });

  it('should display score value', () => {
    render(<OptimismReputationScore score={85} />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should show label', () => {
    render(<OptimismReputationScore score={85} />);
    expect(screen.getByText(/optimism/i)).toBeInTheDocument();
  });

  it('should show high score styling for 80+', () => {
    render(<OptimismReputationScore score={85} />);
    const score = screen.getByTestId('score-value');
    expect(score).toHaveClass('text-green-400');
  });

  it('should show medium score styling for 50-79', () => {
    render(<OptimismReputationScore score={65} />);
    const score = screen.getByTestId('score-value');
    expect(score).toHaveClass('text-yellow-400');
  });

  it('should show low score styling for below 50', () => {
    render(<OptimismReputationScore score={30} />);
    const score = screen.getByTestId('score-value');
    expect(score).toHaveClass('text-red-400');
  });

  it('should display max score', () => {
    render(<OptimismReputationScore score={85} maxScore={100} />);
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('should show voting power if provided', () => {
    render(<OptimismReputationScore score={85} votingPower={350} />);
    expect(screen.getByText(/350/)).toBeInTheDocument();
  });
});

// =============================================================================
// OptimismConnectionStatus Tests
// =============================================================================

describe('OptimismConnectionStatus', () => {
  it('should render status', () => {
    render(<OptimismConnectionStatus status="connected" />);
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('should show connected state', () => {
    render(<OptimismConnectionStatus status="connected" />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('should show disconnected state', () => {
    render(<OptimismConnectionStatus status="disconnected" />);
    expect(screen.getByText(/not connected/i)).toBeInTheDocument();
  });

  it('should show connecting state', () => {
    render(<OptimismConnectionStatus status="connecting" />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<OptimismConnectionStatus status="error" error="Failed to fetch" />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<OptimismConnectionStatus status="error" error="Failed to fetch" />);
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });

  it('should show connect button when disconnected', () => {
    render(<OptimismConnectionStatus status="disconnected" onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('should call onConnect when button clicked', () => {
    const onConnect = vi.fn();
    render(<OptimismConnectionStatus status="disconnected" onConnect={onConnect} />);
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it('should show spinner when connecting', () => {
    render(<OptimismConnectionStatus status="connecting" />);
    expect(screen.getByTestId('connecting-spinner')).toBeInTheDocument();
  });

  it('should show last synced time when connected', () => {
    const lastSynced = Date.now() - 3600000;
    render(<OptimismConnectionStatus status="connected" lastSynced={lastSynced} />);
    expect(screen.getByTestId('last-synced')).toBeInTheDocument();
  });
});

// =============================================================================
// RetroFundingHistory Tests
// =============================================================================

describe('RetroFundingHistory', () => {
  it('should render history', () => {
    render(<RetroFundingHistory rounds={mockRetroFundingRounds} />);
    expect(screen.getByTestId('retro-funding-history')).toBeInTheDocument();
  });

  it('should show header', () => {
    render(<RetroFundingHistory rounds={mockRetroFundingRounds} />);
    expect(screen.getByText(/retropgf history/i)).toBeInTheDocument();
  });

  it('should display all rounds', () => {
    render(<RetroFundingHistory rounds={mockRetroFundingRounds} />);
    expect(screen.getByText('RetroPGF 1')).toBeInTheDocument();
    expect(screen.getByText('RetroPGF 2')).toBeInTheDocument();
    expect(screen.getByText('RetroPGF 3')).toBeInTheDocument();
  });

  it('should show round count', () => {
    render(<RetroFundingHistory rounds={mockRetroFundingRounds} />);
    expect(screen.getByTestId('round-count')).toHaveTextContent('3');
  });

  it('should show empty state when no rounds', () => {
    render(<RetroFundingHistory rounds={[]} />);
    expect(screen.getByText(/no participation/i)).toBeInTheDocument();
  });

  it('should calculate total voting power', () => {
    render(<RetroFundingHistory rounds={mockRetroFundingRounds} />);
    expect(screen.getByTestId('total-voting-power')).toHaveTextContent('350');
  });

  it('should show total funding received', () => {
    render(<RetroFundingHistory rounds={mockRetroFundingRounds} />);
    expect(screen.getByTestId('total-funding')).toHaveTextContent('50,000');
  });
});

// =============================================================================
// OptimismProfileLink Tests
// =============================================================================

describe('OptimismProfileLink', () => {
  it('should render link', () => {
    render(<OptimismProfileLink address={mockOptimismProfile.address} />);
    expect(screen.getByTestId('optimism-profile-link')).toBeInTheDocument();
  });

  it('should link to Optimism profile', () => {
    render(<OptimismProfileLink address={mockOptimismProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', expect.stringContaining('optimism'));
  });

  it('should display ENS name if available', () => {
    render(<OptimismProfileLink address={mockOptimismProfile.address} ensName="forecaster.eth" />);
    expect(screen.getByText('forecaster.eth')).toBeInTheDocument();
  });

  it('should display truncated address if no ENS', () => {
    render(<OptimismProfileLink address={mockOptimismProfile.address} />);
    expect(screen.getByText(/0x742d/)).toBeInTheDocument();
  });

  it('should open in new tab', () => {
    render(<OptimismProfileLink address={mockOptimismProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should show citizen indicator if citizen', () => {
    render(<OptimismProfileLink address={mockOptimismProfile.address} isCitizen />);
    expect(screen.getByTestId('citizen-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// CitizenBadge Tests
// =============================================================================

describe('CitizenBadge', () => {
  it('should render badge', () => {
    render(<CitizenBadge status={mockCitizenStatus} />);
    expect(screen.getByTestId('citizen-badge')).toBeInTheDocument();
  });

  it('should display citizen text', () => {
    render(<CitizenBadge status={mockCitizenStatus} />);
    expect(screen.getByText(/optimism citizen/i)).toBeInTheDocument();
  });

  it('should show citizen since date', () => {
    render(<CitizenBadge status={mockCitizenStatus} />);
    expect(screen.getByTestId('citizen-since')).toBeInTheDocument();
  });

  it('should show voting power', () => {
    render(<CitizenBadge status={mockCitizenStatus} />);
    expect(screen.getByText(/350/)).toBeInTheDocument();
  });

  it('should show badgeholder indicator', () => {
    render(<CitizenBadge status={mockCitizenStatus} />);
    expect(screen.getByTestId('badgeholder-indicator')).toBeInTheDocument();
  });

  it('should not show badge for non-citizens', () => {
    const nonCitizen: CitizenStatus = { ...mockCitizenStatus, isCitizen: false };
    render(<CitizenBadge status={nonCitizen} />);
    expect(screen.queryByTestId('citizen-badge')).not.toBeInTheDocument();
  });

  it('should show verification link', () => {
    render(<CitizenBadge status={mockCitizenStatus} />);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});

// =============================================================================
// OptimismIntegrationHub Tests
// =============================================================================

describe('OptimismIntegrationHub', () => {
  it('should render hub', () => {
    render(<OptimismIntegrationHub profile={mockOptimismProfile} />);
    expect(screen.getByTestId('optimism-integration-hub')).toBeInTheDocument();
  });

  it('should show hub title', () => {
    render(<OptimismIntegrationHub profile={mockOptimismProfile} />);
    expect(screen.getByText(/optimism collective/i)).toBeInTheDocument();
  });

  it('should display reputation score', () => {
    render(<OptimismIntegrationHub profile={mockOptimismProfile} />);
    expect(screen.getByTestId('optimism-reputation-score')).toBeInTheDocument();
  });

  it('should show retro funding history', () => {
    render(<OptimismIntegrationHub profile={mockOptimismProfile} />);
    expect(screen.getByTestId('retro-funding-history')).toBeInTheDocument();
  });

  it('should display citizen badge when citizen', () => {
    render(<OptimismIntegrationHub profile={mockOptimismProfile} />);
    expect(screen.getByTestId('citizen-badge')).toBeInTheDocument();
  });

  it('should show connection status', () => {
    render(<OptimismIntegrationHub profile={mockOptimismProfile} connectionStatus="connected" />);
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('should show profile link', () => {
    render(<OptimismIntegrationHub profile={mockOptimismProfile} />);
    expect(screen.getByTestId('optimism-profile-link')).toBeInTheDocument();
  });

  it('should display badgeholder rounds', () => {
    render(<OptimismIntegrationHub profile={mockOptimismProfile} />);
    expect(screen.getByText('RetroPGF 2')).toBeInTheDocument();
    expect(screen.getByText('RetroPGF 3')).toBeInTheDocument();
  });

  it('should call onRefresh when refresh clicked', () => {
    const onRefresh = vi.fn();
    render(<OptimismIntegrationHub profile={mockOptimismProfile} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should show empty state when no profile', () => {
    render(<OptimismIntegrationHub profile={null} />);
    expect(screen.getByText(/connect.*optimism/i)).toBeInTheDocument();
  });
});

// =============================================================================
// useOptimismReputation Hook Tests
// =============================================================================

function TestHookComponent({ address }: { address: string }) {
  const {
    profile,
    isLoading,
    error,
    connectionStatus,
    totalVotingPower,
    isCitizen,
    refresh,
  } = useOptimismReputation(address);

  return (
    <div>
      <span data-testid="is-loading">{isLoading ? 'yes' : 'no'}</span>
      <span data-testid="has-profile">{profile ? 'yes' : 'no'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="connection-status">{connectionStatus}</span>
      <span data-testid="total-voting-power">{totalVotingPower}</span>
      <span data-testid="is-citizen">{isCitizen ? 'yes' : 'no'}</span>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

describe('useOptimismReputation', () => {
  it('should return loading state initially', () => {
    render(<TestHookComponent address={mockOptimismProfile.address} />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('yes');
  });

  it('should return connection status', () => {
    render(<TestHookComponent address={mockOptimismProfile.address} />);
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('should calculate total voting power', () => {
    render(<TestHookComponent address={mockOptimismProfile.address} />);
    expect(screen.getByTestId('total-voting-power')).toBeInTheDocument();
  });

  it('should return citizen status', () => {
    render(<TestHookComponent address={mockOptimismProfile.address} />);
    expect(screen.getByTestId('is-citizen')).toBeInTheDocument();
  });

  it('should have refresh function', () => {
    render(<TestHookComponent address={mockOptimismProfile.address} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

// =============================================================================
// Badge Type Styling Tests
// =============================================================================

describe('Badge Type Styling', () => {
  const badgeTypes: Array<'citizen' | 'badgeholder' | 'voter' | 'recipient'> = [
    'citizen',
    'badgeholder',
    'voter',
    'recipient',
  ];

  it.each(badgeTypes)('should render %s badge with appropriate styling', (type) => {
    render(<OptimismBadge type={type} />);
    expect(screen.getByTestId('optimism-badge')).toBeInTheDocument();
  });
});

// =============================================================================
// Participation Type Tests
// =============================================================================

describe('Participation Type Styling', () => {
  it('should show voter icon for voter participation', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[0]!} />);
    expect(screen.getByTestId('participation-icon')).toBeInTheDocument();
  });

  it('should show badge icon for badgeholder participation', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[1]!} />);
    expect(screen.getByTestId('participation-icon')).toBeInTheDocument();
  });

  it('should show recipient icon for recipient participation', () => {
    render(<RetroFundingCard round={mockRetroFundingRounds[2]!} />);
    expect(screen.getByTestId('participation-icon')).toBeInTheDocument();
  });
});

// =============================================================================
// Empty State Tests
// =============================================================================

describe('Empty States', () => {
  it('RetroFundingHistory should show message when no rounds', () => {
    render(<RetroFundingHistory rounds={[]} />);
    expect(screen.getByText(/no participation/i)).toBeInTheDocument();
  });

  it('OptimismIntegrationHub should show connect prompt when no profile', () => {
    render(<OptimismIntegrationHub profile={null} />);
    expect(screen.getByText(/connect/i)).toBeInTheDocument();
  });

  it('CitizenBadge should not render for non-citizens', () => {
    const nonCitizen: CitizenStatus = { ...mockCitizenStatus, isCitizen: false };
    render(<CitizenBadge status={nonCitizen} />);
    expect(screen.queryByTestId('citizen-badge')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe('Accessibility', () => {
  it('OptimismBadge should have proper role', () => {
    render(<OptimismBadge type="citizen" />);
    expect(screen.getByTestId('optimism-badge')).toHaveAttribute('role', 'status');
  });

  it('OptimismConnectionStatus should indicate status to screen readers', () => {
    render(<OptimismConnectionStatus status="connected" />);
    expect(screen.getByTestId('connection-status')).toHaveAttribute('role', 'status');
  });

  it('OptimismProfileLink should have security attributes', () => {
    render(<OptimismProfileLink address={mockOptimismProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('connect button should have accessible label', () => {
    render(<OptimismConnectionStatus status="disconnected" onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });
});

/**
 * Gitcoin Passport Integration Tests (TDD)
 * Task 6.4.3: Gitcoin Passport integration
 *
 * Components:
 * - PassportBadge: Shows passport verification status
 * - PassportStampCard: Displays individual stamp details
 * - PassportScore: Shows humanity/unique score
 * - PassportConnectionStatus: Connection state management
 * - PassportStampList: List of user's stamps
 * - PassportStampGrid: Grid view of stamps by category
 * - PassportProfileLink: Link to Gitcoin Passport
 * - PassportIntegrationHub: Main hub component
 * - useGitcoinPassport: Hook for data management
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  PassportBadge,
  PassportStampCard,
  PassportScore,
  PassportConnectionStatus,
  PassportStampList,
  PassportStampGrid,
  PassportProfileLink,
  PassportIntegrationHub,
  useGitcoinPassport,
  type PassportStamp,
  type PassportProfile,
  type StampProvider,
} from '@/components/gitcoin-passport';

// =============================================================================
// Test Data
// =============================================================================

const mockStamps: PassportStamp[] = [
  {
    id: 'stamp1',
    provider: 'Twitter',
    category: 'social',
    hash: '0xtwitter_stamp_hash',
    issuedAt: new Date('2023-05-01').getTime(),
    expiresAt: new Date('2024-05-01').getTime(),
    weight: 1.5,
    verified: true,
  },
  {
    id: 'stamp2',
    provider: 'GitHub',
    category: 'developer',
    hash: '0xgithub_stamp_hash',
    issuedAt: new Date('2023-05-15').getTime(),
    expiresAt: new Date('2024-05-15').getTime(),
    weight: 2.0,
    verified: true,
  },
  {
    id: 'stamp3',
    provider: 'Google',
    category: 'social',
    hash: '0xgoogle_stamp_hash',
    issuedAt: new Date('2023-06-01').getTime(),
    expiresAt: new Date('2024-06-01').getTime(),
    weight: 1.0,
    verified: true,
  },
  {
    id: 'stamp4',
    provider: 'ENS',
    category: 'web3',
    hash: '0xens_stamp_hash',
    issuedAt: new Date('2023-07-01').getTime(),
    expiresAt: new Date('2024-07-01').getTime(),
    weight: 2.5,
    verified: true,
  },
  {
    id: 'stamp5',
    provider: 'GitPOAP',
    category: 'developer',
    hash: '0xgitpoap_stamp_hash',
    issuedAt: new Date('2023-08-01').getTime(),
    expiresAt: new Date('2024-08-01').getTime(),
    weight: 1.8,
    verified: true,
  },
];

const mockPassportProfile: PassportProfile = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
  score: 28.5,
  threshold: 20,
  stamps: mockStamps,
  lastUpdated: new Date('2023-08-15').getTime(),
  isHuman: true,
  expiresAt: new Date('2024-08-15').getTime(),
};

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// =============================================================================
// PassportBadge Tests
// =============================================================================

describe('PassportBadge', () => {
  it('should render badge', () => {
    render(<PassportBadge isHuman score={28.5} />);
    expect(screen.getByTestId('passport-badge')).toBeInTheDocument();
  });

  it('should show verified human status', () => {
    render(<PassportBadge isHuman score={28.5} />);
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it('should show unverified status when not human', () => {
    render(<PassportBadge isHuman={false} score={15} />);
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  });

  it('should display score', () => {
    render(<PassportBadge isHuman score={28.5} />);
    expect(screen.getByTestId('passport-score-value')).toHaveTextContent('28.5');
  });

  it('should display passport icon', () => {
    render(<PassportBadge isHuman score={28.5} />);
    expect(screen.getByTestId('passport-icon')).toBeInTheDocument();
  });

  it('should apply verified styling when human', () => {
    render(<PassportBadge isHuman score={28.5} />);
    const badge = screen.getByTestId('passport-badge');
    expect(badge).toHaveClass('text-green-400');
  });

  it('should apply unverified styling when not human', () => {
    render(<PassportBadge isHuman={false} score={15} />);
    const badge = screen.getByTestId('passport-badge');
    expect(badge).toHaveClass('text-zinc-400');
  });

  it('should show compact variant', () => {
    render(<PassportBadge isHuman score={28.5} compact />);
    expect(screen.getByTestId('passport-badge')).toHaveClass('px-1.5');
  });

  it('should have proper role', () => {
    render(<PassportBadge isHuman score={28.5} />);
    expect(screen.getByTestId('passport-badge')).toHaveAttribute('role', 'status');
  });
});

// =============================================================================
// PassportStampCard Tests
// =============================================================================

describe('PassportStampCard', () => {
  const mockStamp = mockStamps[0]!;

  it('should render card', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    expect(screen.getByTestId('passport-stamp-card')).toBeInTheDocument();
  });

  it('should display provider name', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    expect(screen.getByText('Twitter')).toBeInTheDocument();
  });

  it('should show stamp category', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    expect(screen.getByTestId('stamp-category')).toHaveTextContent('social');
  });

  it('should display weight', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    expect(screen.getByTestId('stamp-weight')).toHaveTextContent('1.5');
  });

  it('should show verified status', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    expect(screen.getByTestId('stamp-verified')).toBeInTheDocument();
  });

  it('should show issued date', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    expect(screen.getByTestId('stamp-issued')).toBeInTheDocument();
  });

  it('should show expiry date', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    expect(screen.getByTestId('stamp-expiry')).toBeInTheDocument();
  });

  it('should display provider icon', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    expect(screen.getByTestId('provider-icon')).toBeInTheDocument();
  });

  it('should show expired status for expired stamps', () => {
    const expiredStamp: PassportStamp = {
      ...mockStamp,
      expiresAt: Date.now() - 86400000,
      verified: false,
    };
    render(<PassportStampCard stamp={expiredStamp} />);
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });

  it('should apply category-specific styling', () => {
    render(<PassportStampCard stamp={mockStamp} />);
    const card = screen.getByTestId('passport-stamp-card');
    expect(card).toHaveClass('border');
  });
});

// =============================================================================
// PassportScore Tests
// =============================================================================

describe('PassportScore', () => {
  it('should render score display', () => {
    render(<PassportScore score={28.5} threshold={20} />);
    expect(screen.getByTestId('passport-score')).toBeInTheDocument();
  });

  it('should display current score', () => {
    render(<PassportScore score={28.5} threshold={20} />);
    expect(screen.getByTestId('score-current')).toHaveTextContent('28.5');
  });

  it('should show threshold', () => {
    render(<PassportScore score={28.5} threshold={20} />);
    expect(screen.getByTestId('score-threshold')).toHaveTextContent('20');
  });

  it('should indicate passing threshold', () => {
    render(<PassportScore score={28.5} threshold={20} />);
    expect(screen.getByTestId('threshold-status')).toHaveTextContent(/passing/i);
  });

  it('should indicate failing threshold', () => {
    render(<PassportScore score={15} threshold={20} />);
    expect(screen.getByTestId('threshold-status')).toHaveTextContent(/below/i);
  });

  it('should show progress bar', () => {
    render(<PassportScore score={28.5} threshold={20} showProgress />);
    expect(screen.getByTestId('score-progress')).toBeInTheDocument();
  });

  it('should apply passing styling', () => {
    render(<PassportScore score={28.5} threshold={20} />);
    const score = screen.getByTestId('passport-score');
    expect(score).toHaveClass('border-green-400/30');
  });

  it('should apply failing styling', () => {
    render(<PassportScore score={15} threshold={20} />);
    const score = screen.getByTestId('passport-score');
    expect(score).toHaveClass('border-yellow-400/30');
  });

  it('should show stamp count', () => {
    render(<PassportScore score={28.5} threshold={20} stampCount={5} />);
    expect(screen.getByTestId('stamp-count')).toHaveTextContent('5');
  });
});

// =============================================================================
// PassportConnectionStatus Tests
// =============================================================================

describe('PassportConnectionStatus', () => {
  it('should render status', () => {
    render(<PassportConnectionStatus status="connected" />);
    expect(screen.getByTestId('passport-connection-status')).toBeInTheDocument();
  });

  it('should show connected state', () => {
    render(<PassportConnectionStatus status="connected" />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('should show disconnected state', () => {
    render(<PassportConnectionStatus status="disconnected" />);
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it('should show connecting state', () => {
    render(<PassportConnectionStatus status="connecting" />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<PassportConnectionStatus status="error" error="Failed to fetch" />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<PassportConnectionStatus status="error" error="Failed to fetch" />);
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });

  it('should show connect button when disconnected', () => {
    render(<PassportConnectionStatus status="disconnected" onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('should call onConnect when button clicked', () => {
    const onConnect = vi.fn();
    render(<PassportConnectionStatus status="disconnected" onConnect={onConnect} />);
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it('should show spinner when connecting', () => {
    render(<PassportConnectionStatus status="connecting" />);
    expect(screen.getByTestId('connecting-spinner')).toBeInTheDocument();
  });

  it('should show last synced time when connected', () => {
    const lastSynced = Date.now() - 3600000;
    render(<PassportConnectionStatus status="connected" lastSynced={lastSynced} />);
    expect(screen.getByTestId('last-synced')).toBeInTheDocument();
  });

  it('should have status role', () => {
    render(<PassportConnectionStatus status="connected" />);
    expect(screen.getByTestId('passport-connection-status')).toHaveAttribute('role', 'status');
  });
});

// =============================================================================
// PassportStampList Tests
// =============================================================================

describe('PassportStampList', () => {
  it('should render list', () => {
    render(<PassportStampList stamps={mockStamps} />);
    expect(screen.getByTestId('passport-stamp-list')).toBeInTheDocument();
  });

  it('should show list header', () => {
    render(<PassportStampList stamps={mockStamps} />);
    expect(screen.getByText(/stamps/i)).toBeInTheDocument();
  });

  it('should display all stamps', () => {
    render(<PassportStampList stamps={mockStamps} />);
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('should show stamp count', () => {
    render(<PassportStampList stamps={mockStamps} />);
    expect(screen.getByTestId('list-count')).toHaveTextContent('5');
  });

  it('should show empty state when no stamps', () => {
    render(<PassportStampList stamps={[]} />);
    expect(screen.getByText(/no stamps/i)).toBeInTheDocument();
  });

  it('should filter by category', () => {
    render(<PassportStampList stamps={mockStamps} filterCategory="social" />);
    const cards = screen.getAllByTestId('passport-stamp-card');
    expect(cards).toHaveLength(2); // Twitter and Google
  });

  it('should sort by weight', () => {
    render(<PassportStampList stamps={mockStamps} sortBy="weight" />);
    const cards = screen.getAllByTestId('passport-stamp-card');
    expect(cards).toHaveLength(5);
  });

  it('should calculate total weight', () => {
    render(<PassportStampList stamps={mockStamps} showTotalWeight />);
    expect(screen.getByTestId('total-weight')).toBeInTheDocument();
  });
});

// =============================================================================
// PassportStampGrid Tests
// =============================================================================

describe('PassportStampGrid', () => {
  it('should render grid', () => {
    render(<PassportStampGrid stamps={mockStamps} />);
    expect(screen.getByTestId('passport-stamp-grid')).toBeInTheDocument();
  });

  it('should group stamps by category', () => {
    render(<PassportStampGrid stamps={mockStamps} />);
    expect(screen.getAllByText(/social/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/developer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/web3/i).length).toBeGreaterThan(0);
  });

  it('should show category counts', () => {
    render(<PassportStampGrid stamps={mockStamps} />);
    expect(screen.getAllByTestId('category-count').length).toBeGreaterThan(0);
  });

  it('should display stamps in each category', () => {
    render(<PassportStampGrid stamps={mockStamps} />);
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('should show category weight totals', () => {
    render(<PassportStampGrid stamps={mockStamps} showCategoryWeights />);
    expect(screen.getAllByTestId('category-weight').length).toBeGreaterThan(0);
  });
});

// =============================================================================
// PassportProfileLink Tests
// =============================================================================

describe('PassportProfileLink', () => {
  it('should render link', () => {
    render(<PassportProfileLink address={mockPassportProfile.address} />);
    expect(screen.getByTestId('passport-profile-link')).toBeInTheDocument();
  });

  it('should link to Gitcoin Passport', () => {
    render(<PassportProfileLink address={mockPassportProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', expect.stringContaining('passport'));
  });

  it('should display truncated address', () => {
    render(<PassportProfileLink address={mockPassportProfile.address} />);
    expect(screen.getByText(/0x742d/)).toBeInTheDocument();
  });

  it('should show full address when requested', () => {
    render(<PassportProfileLink address={mockPassportProfile.address} showFull />);
    expect(screen.getByText(mockPassportProfile.address)).toBeInTheDocument();
  });

  it('should open in new tab', () => {
    render(<PassportProfileLink address={mockPassportProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should have security attributes', () => {
    render(<PassportProfileLink address={mockPassportProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('should show human indicator if verified', () => {
    render(<PassportProfileLink address={mockPassportProfile.address} isHuman />);
    expect(screen.getByTestId('human-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// PassportIntegrationHub Tests
// =============================================================================

describe('PassportIntegrationHub', () => {
  it('should render hub', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} />);
    expect(screen.getByTestId('passport-integration-hub')).toBeInTheDocument();
  });

  it('should show hub title', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} />);
    expect(screen.getByText(/gitcoin passport/i)).toBeInTheDocument();
  });

  it('should display passport score', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} />);
    expect(screen.getByTestId('passport-score')).toBeInTheDocument();
  });

  it('should show stamp list', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} />);
    expect(screen.getByTestId('passport-stamp-list')).toBeInTheDocument();
  });

  it('should display connection status', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} connectionStatus="connected" />);
    expect(screen.getByTestId('passport-connection-status')).toBeInTheDocument();
  });

  it('should show profile link', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} />);
    expect(screen.getByTestId('passport-profile-link')).toBeInTheDocument();
  });

  it('should display last updated time', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} />);
    expect(screen.getByTestId('last-updated')).toBeInTheDocument();
  });

  it('should call onRefresh when refresh clicked', () => {
    const onRefresh = vi.fn();
    render(<PassportIntegrationHub profile={mockPassportProfile} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should show empty state when no profile', () => {
    render(<PassportIntegrationHub profile={null} />);
    expect(screen.getByText(/connect.*passport/i)).toBeInTheDocument();
  });

  it('should show human badge when verified', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} />);
    expect(screen.getByTestId('passport-badge')).toBeInTheDocument();
  });
});

// =============================================================================
// useGitcoinPassport Hook Tests
// =============================================================================

function TestHookComponent({ address }: { address: string }) {
  const {
    profile,
    isLoading,
    error,
    connectionStatus,
    stamps,
    score,
    isHuman,
    refresh,
  } = useGitcoinPassport(address);

  return (
    <div>
      <span data-testid="is-loading">{isLoading ? 'yes' : 'no'}</span>
      <span data-testid="has-profile">{profile ? 'yes' : 'no'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="connection-status">{connectionStatus}</span>
      <span data-testid="stamp-count">{stamps.length}</span>
      <span data-testid="score">{score}</span>
      <span data-testid="is-human">{isHuman ? 'yes' : 'no'}</span>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

describe('useGitcoinPassport', () => {
  it('should return loading state initially', () => {
    render(<TestHookComponent address={mockPassportProfile.address} />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('yes');
  });

  it('should return connection status', () => {
    render(<TestHookComponent address={mockPassportProfile.address} />);
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('should return stamps array', () => {
    render(<TestHookComponent address={mockPassportProfile.address} />);
    expect(screen.getByTestId('stamp-count')).toBeInTheDocument();
  });

  it('should return score', () => {
    render(<TestHookComponent address={mockPassportProfile.address} />);
    expect(screen.getByTestId('score')).toBeInTheDocument();
  });

  it('should return human status', () => {
    render(<TestHookComponent address={mockPassportProfile.address} />);
    expect(screen.getByTestId('is-human')).toBeInTheDocument();
  });

  it('should have refresh function', () => {
    render(<TestHookComponent address={mockPassportProfile.address} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

// =============================================================================
// Provider Icon Tests
// =============================================================================

describe('Provider Icons', () => {
  const providers: StampProvider[] = ['Twitter', 'GitHub', 'Google', 'ENS', 'GitPOAP'];

  it.each(providers)('should render %s stamp with appropriate icon', (provider) => {
    const stamp: PassportStamp = {
      id: 'test',
      provider,
      category: 'social',
      hash: '0xtest',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      weight: 1.0,
      verified: true,
    };
    render(<PassportStampCard stamp={stamp} />);
    expect(screen.getByTestId('provider-icon')).toBeInTheDocument();
  });
});

// =============================================================================
// Category Styling Tests
// =============================================================================

describe('Category Styling', () => {
  const categories = ['social', 'developer', 'web3', 'government', 'defi'] as const;

  it.each(categories)('should apply correct styling for %s category', (category) => {
    const stamp: PassportStamp = {
      id: 'test',
      provider: 'Test',
      category,
      hash: '0xtest',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      weight: 1.0,
      verified: true,
    };
    render(<PassportStampCard stamp={stamp} />);
    expect(screen.getByTestId('passport-stamp-card')).toBeInTheDocument();
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle zero score gracefully', () => {
    render(<PassportScore score={0} threshold={20} />);
    expect(screen.getByTestId('score-current')).toHaveTextContent('0');
  });

  it('should handle exactly threshold score', () => {
    render(<PassportScore score={20} threshold={20} />);
    expect(screen.getByTestId('threshold-status')).toHaveTextContent(/passing/i);
  });

  it('should handle expired stamps in list', () => {
    const expiredStamps: PassportStamp[] = [
      {
        ...mockStamps[0]!,
        expiresAt: Date.now() - 86400000,
        verified: false,
      },
    ];
    render(<PassportStampList stamps={expiredStamps} />);
    expect(screen.getByTestId('passport-stamp-list')).toBeInTheDocument();
  });

  it('should handle disconnection gracefully', () => {
    const disconnectedProfile = { ...mockPassportProfile };
    render(<PassportIntegrationHub profile={disconnectedProfile} connectionStatus="disconnected" />);
    expect(screen.getByTestId('passport-integration-hub')).toBeInTheDocument();
  });

  it('should handle very high scores', () => {
    render(<PassportScore score={100} threshold={20} />);
    expect(screen.getByTestId('score-current')).toHaveTextContent('100');
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe('Accessibility', () => {
  it('PassportBadge should have proper role', () => {
    render(<PassportBadge isHuman score={28.5} />);
    expect(screen.getByTestId('passport-badge')).toHaveAttribute('role', 'status');
  });

  it('PassportConnectionStatus should indicate status to screen readers', () => {
    render(<PassportConnectionStatus status="connected" />);
    expect(screen.getByTestId('passport-connection-status')).toHaveAttribute('role', 'status');
  });

  it('PassportProfileLink should have security attributes', () => {
    render(<PassportProfileLink address={mockPassportProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('connect button should have accessible label', () => {
    render(<PassportConnectionStatus status="disconnected" onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('refresh button should have accessible label', () => {
    render(<PassportIntegrationHub profile={mockPassportProfile} onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });
});

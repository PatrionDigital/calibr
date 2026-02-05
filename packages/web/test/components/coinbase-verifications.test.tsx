/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  CoinbaseVerification,
  CoinbaseProfile,
} from '../../src/components/coinbase-verifications';
import {
  VerificationBadge,
  VerificationCard,
  VerificationList,
  CoinbaseConnectionStatus,
  CoinbaseVerificationLevel,
  CoinbaseProfileSummary,
  CoinbaseProfileLink,
  CoinbaseIntegrationHub,
  useCoinbaseVerification,
} from '../../src/components/coinbase-verifications';

// =============================================================================
// Test Data
// =============================================================================

const mockVerifications: CoinbaseVerification[] = [
  {
    id: 'v1',
    type: 'identity',
    label: 'Identity Verified',
    verifiedAt: '2024-03-01T00:00:00Z',
    level: 2,
    active: true,
  },
  {
    id: 'v2',
    type: 'country',
    label: 'Country Verified',
    verifiedAt: '2024-03-01T00:00:00Z',
    level: 1,
    active: true,
  },
  {
    id: 'v3',
    type: 'account-age',
    label: 'Account Age 1Y+',
    verifiedAt: '2024-01-15T00:00:00Z',
    level: 1,
    active: true,
  },
  {
    id: 'v4',
    type: 'trading-volume',
    label: 'Trading Volume Tier 2',
    verifiedAt: '2024-06-01T00:00:00Z',
    level: 2,
    active: false,
  },
];

const mockProfile: CoinbaseProfile = {
  address: '0xabcdef1234567890',
  verifications: mockVerifications,
  overallLevel: 3,
  totalVerifications: 4,
  activeVerifications: 3,
  connectedAt: '2024-01-10T00:00:00Z',
  onchainId: 'cb_id_12345',
};

// =============================================================================
// VerificationBadge Tests
// =============================================================================

describe('VerificationBadge', () => {
  it('renders badge', () => {
    render(<VerificationBadge type="identity" active={true} />);
    expect(screen.getByTestId('verification-badge')).toBeInTheDocument();
  });

  it('shows verified state', () => {
    render(<VerificationBadge type="identity" active={true} />);
    const badge = screen.getByTestId('verification-badge');
    expect(badge.className).toContain('verified');
  });

  it('shows unverified state', () => {
    render(<VerificationBadge type="identity" active={false} />);
    const badge = screen.getByTestId('verification-badge');
    expect(badge.className).toContain('unverified');
  });

  it('shows type label', () => {
    render(<VerificationBadge type="identity" active={true} />);
    const badge = screen.getByTestId('verification-badge');
    expect(badge).toHaveTextContent(/identity/i);
  });
});

// =============================================================================
// VerificationCard Tests
// =============================================================================

describe('VerificationCard', () => {
  it('renders card', () => {
    render(<VerificationCard verification={mockVerifications[0]!} />);
    expect(screen.getByTestId('verification-card')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<VerificationCard verification={mockVerifications[0]!} />);
    expect(screen.getByText('Identity Verified')).toBeInTheDocument();
  });

  it('shows level', () => {
    render(<VerificationCard verification={mockVerifications[0]!} />);
    const card = screen.getByTestId('verification-card');
    expect(card).toHaveTextContent(/level 2/i);
  });

  it('shows active status', () => {
    render(<VerificationCard verification={mockVerifications[0]!} />);
    const card = screen.getByTestId('verification-card');
    expect(card).toHaveTextContent(/active/i);
  });

  it('shows inactive status', () => {
    render(<VerificationCard verification={mockVerifications[3]!} />);
    const card = screen.getByTestId('verification-card');
    expect(card).toHaveTextContent(/inactive|expired/i);
  });

  it('shows verified date', () => {
    render(<VerificationCard verification={mockVerifications[0]!} />);
    expect(screen.getAllByText(/mar/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// VerificationList Tests
// =============================================================================

describe('VerificationList', () => {
  it('renders list', () => {
    render(<VerificationList verifications={mockVerifications} />);
    expect(screen.getByTestId('verification-list')).toBeInTheDocument();
  });

  it('shows all verifications', () => {
    render(<VerificationList verifications={mockVerifications} />);
    const cards = screen.getAllByTestId('verification-card');
    expect(cards.length).toBe(4);
  });

  it('shows empty state', () => {
    render(<VerificationList verifications={[]} />);
    expect(screen.getByText(/no verifications/i)).toBeInTheDocument();
  });

  it('shows active count', () => {
    render(<VerificationList verifications={mockVerifications} />);
    const list = screen.getByTestId('verification-list');
    expect(list).toHaveTextContent('3');
  });
});

// =============================================================================
// CoinbaseConnectionStatus Tests
// =============================================================================

describe('CoinbaseConnectionStatus', () => {
  it('renders status', () => {
    render(<CoinbaseConnectionStatus status="connected" />);
    expect(screen.getByTestId('cb-connection-status')).toBeInTheDocument();
  });

  it('shows connected state', () => {
    render(<CoinbaseConnectionStatus status="connected" />);
    expect(screen.getAllByText(/connected/i).length).toBeGreaterThan(0);
  });

  it('shows disconnected state', () => {
    render(<CoinbaseConnectionStatus status="disconnected" />);
    expect(screen.getAllByText(/not connected|disconnected/i).length).toBeGreaterThan(0);
  });

  it('shows error state', () => {
    render(<CoinbaseConnectionStatus status="error" error="Auth failed" />);
    expect(screen.getByText(/auth failed/i)).toBeInTheDocument();
  });
});

// =============================================================================
// CoinbaseVerificationLevel Tests
// =============================================================================

describe('CoinbaseVerificationLevel', () => {
  it('renders level', () => {
    render(<CoinbaseVerificationLevel level={3} maxLevel={5} />);
    expect(screen.getByTestId('cb-verification-level')).toBeInTheDocument();
  });

  it('shows current level', () => {
    render(<CoinbaseVerificationLevel level={3} maxLevel={5} />);
    const el = screen.getByTestId('cb-verification-level');
    expect(el).toHaveTextContent('3');
  });

  it('shows max level', () => {
    render(<CoinbaseVerificationLevel level={3} maxLevel={5} />);
    const el = screen.getByTestId('cb-verification-level');
    expect(el).toHaveTextContent('5');
  });

  it('shows progress bar', () => {
    render(<CoinbaseVerificationLevel level={3} maxLevel={5} />);
    expect(screen.getByTestId('level-progress')).toBeInTheDocument();
  });
});

// =============================================================================
// CoinbaseProfileSummary Tests
// =============================================================================

describe('CoinbaseProfileSummary', () => {
  it('renders summary', () => {
    render(<CoinbaseProfileSummary profile={mockProfile} />);
    expect(screen.getByTestId('cb-profile-summary')).toBeInTheDocument();
  });

  it('shows overall level', () => {
    render(<CoinbaseProfileSummary profile={mockProfile} />);
    const summary = screen.getByTestId('cb-profile-summary');
    expect(summary).toHaveTextContent('3');
  });

  it('shows active verifications count', () => {
    render(<CoinbaseProfileSummary profile={mockProfile} />);
    const summary = screen.getByTestId('cb-profile-summary');
    expect(summary).toHaveTextContent('3');
  });

  it('shows onchain ID', () => {
    render(<CoinbaseProfileSummary profile={mockProfile} />);
    const summary = screen.getByTestId('cb-profile-summary');
    expect(summary).toHaveTextContent(/cb_id/);
  });
});

// =============================================================================
// CoinbaseProfileLink Tests
// =============================================================================

describe('CoinbaseProfileLink', () => {
  it('renders link', () => {
    render(<CoinbaseProfileLink address="0xabcdef1234567890" />);
    expect(screen.getByTestId('cb-profile-link')).toBeInTheDocument();
  });

  it('shows truncated address', () => {
    render(<CoinbaseProfileLink address="0xabcdef1234567890" />);
    const link = screen.getByTestId('cb-profile-link');
    expect(link).toHaveTextContent(/0xabcd/);
  });

  it('shows Coinbase branding', () => {
    render(<CoinbaseProfileLink address="0xabcdef1234567890" />);
    const link = screen.getByTestId('cb-profile-link');
    expect(link).toHaveTextContent(/coinbase/i);
  });
});

// =============================================================================
// CoinbaseIntegrationHub Tests
// =============================================================================

describe('CoinbaseIntegrationHub', () => {
  it('renders hub', () => {
    render(<CoinbaseIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('cb-integration-hub')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<CoinbaseIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getAllByText(/coinbase/i).length).toBeGreaterThan(0);
  });

  it('shows connection status', () => {
    render(<CoinbaseIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('cb-connection-status')).toBeInTheDocument();
  });

  it('shows verification list', () => {
    render(<CoinbaseIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('verification-list')).toBeInTheDocument();
  });

  it('shows profile summary', () => {
    render(<CoinbaseIntegrationHub profile={mockProfile} status="connected" />);
    expect(screen.getByTestId('cb-profile-summary')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<CoinbaseIntegrationHub profile={null} status="connected" loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows connect prompt when disconnected', () => {
    render(<CoinbaseIntegrationHub profile={null} status="disconnected" />);
    expect(screen.getByTestId('connect-prompt')).toBeInTheDocument();
  });

  it('calls onConnect when connect clicked', () => {
    const onConnect = vi.fn();
    render(<CoinbaseIntegrationHub profile={null} status="disconnected" onConnect={onConnect} />);
    fireEvent.click(screen.getByTestId('connect-button'));
    expect(onConnect).toHaveBeenCalled();
  });
});

// =============================================================================
// useCoinbaseVerification Hook Tests
// =============================================================================

describe('useCoinbaseVerification', () => {
  function TestComponent({ profile }: { profile: CoinbaseProfile | null }) {
    const {
      isConnected,
      overallLevel,
      activeCount,
      verificationTypes,
      trustScore,
    } = useCoinbaseVerification(profile);

    return (
      <div>
        <span data-testid="is-connected">{isConnected ? 'yes' : 'no'}</span>
        <span data-testid="overall-level">{overallLevel}</span>
        <span data-testid="active-count">{activeCount}</span>
        <span data-testid="type-count">{verificationTypes.length}</span>
        <span data-testid="trust-score">{trustScore}</span>
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

  it('returns overall level', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('overall-level')).toHaveTextContent('3');
  });

  it('counts active verifications', () => {
    render(<TestComponent profile={mockProfile} />);
    expect(screen.getByTestId('active-count')).toHaveTextContent('3');
  });

  it('lists verification types', () => {
    render(<TestComponent profile={mockProfile} />);
    const count = parseInt(screen.getByTestId('type-count').textContent!);
    expect(count).toBe(4);
  });

  it('calculates trust score', () => {
    render(<TestComponent profile={mockProfile} />);
    const score = parseInt(screen.getByTestId('trust-score').textContent!);
    expect(score).toBeGreaterThan(0);
  });

  it('handles null profile', () => {
    render(<TestComponent profile={null} />);
    expect(screen.getByTestId('overall-level')).toHaveTextContent('0');
    expect(screen.getByTestId('active-count')).toHaveTextContent('0');
  });
});

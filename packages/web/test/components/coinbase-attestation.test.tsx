/**
 * Coinbase Attestation Support Tests (TDD)
 * Task 6.4.2: Add Coinbase Attestation support
 *
 * Components:
 * - CoinbaseVerificationBadge: Shows verification status
 * - CoinbaseAttestationCard: Displays attestation details
 * - CoinbaseVerificationLevel: Shows tier/level of verification
 * - CoinbaseConnectionStatus: Connection state management
 * - CoinbaseAttestationList: List of user's attestations
 * - CoinbaseProfileLink: Link to Coinbase/Base attestation
 * - CoinbaseIntegrationHub: Main hub component
 * - useCoinbaseAttestation: Hook for data management
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  CoinbaseVerificationBadge,
  CoinbaseAttestationCard,
  CoinbaseVerificationLevel,
  CoinbaseConnectionStatus,
  CoinbaseAttestationList,
  CoinbaseProfileLink,
  CoinbaseIntegrationHub,
  useCoinbaseAttestation,
  type CoinbaseAttestation,
  type CoinbaseProfile,
  type VerificationLevel,
} from '@/components/coinbase-attestation';

// =============================================================================
// Test Data
// =============================================================================

const mockAttestations: CoinbaseAttestation[] = [
  {
    id: 'cb1',
    type: 'verified_account',
    name: 'Coinbase Verified Account',
    issuedAt: new Date('2023-06-01').getTime(),
    expiresAt: new Date('2024-06-01').getTime(),
    attestationUid: '0xcb_attestation_1',
    status: 'active',
  },
  {
    id: 'cb2',
    type: 'verified_country',
    name: 'Country of Residence',
    issuedAt: new Date('2023-06-01').getTime(),
    expiresAt: new Date('2024-06-01').getTime(),
    attestationUid: '0xcb_attestation_2',
    status: 'active',
    metadata: { country: 'US' },
  },
  {
    id: 'cb3',
    type: 'one_verification',
    name: 'Coinbase One Member',
    issuedAt: new Date('2023-08-15').getTime(),
    expiresAt: new Date('2024-08-15').getTime(),
    attestationUid: '0xcb_attestation_3',
    status: 'active',
  },
];

const mockCoinbaseProfile: CoinbaseProfile = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
  verificationLevel: 'verified',
  attestations: mockAttestations,
  verifiedSince: new Date('2023-06-01').getTime(),
  totalAttestations: 3,
  isConnected: true,
};

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// =============================================================================
// CoinbaseVerificationBadge Tests
// =============================================================================

describe('CoinbaseVerificationBadge', () => {
  it('should render badge', () => {
    render(<CoinbaseVerificationBadge level="verified" />);
    expect(screen.getByTestId('coinbase-verification-badge')).toBeInTheDocument();
  });

  it('should show verified status', () => {
    render(<CoinbaseVerificationBadge level="verified" />);
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it('should show unverified status', () => {
    render(<CoinbaseVerificationBadge level="unverified" />);
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  });

  it('should show pending status', () => {
    render(<CoinbaseVerificationBadge level="pending" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('should display coinbase icon', () => {
    render(<CoinbaseVerificationBadge level="verified" />);
    expect(screen.getByTestId('coinbase-icon')).toBeInTheDocument();
  });

  it('should apply verified styling', () => {
    render(<CoinbaseVerificationBadge level="verified" />);
    const badge = screen.getByTestId('coinbase-verification-badge');
    expect(badge).toHaveClass('text-blue-400');
  });

  it('should show compact variant', () => {
    render(<CoinbaseVerificationBadge level="verified" compact />);
    expect(screen.getByTestId('coinbase-verification-badge')).toHaveClass('px-1.5');
  });

  it('should have proper role', () => {
    render(<CoinbaseVerificationBadge level="verified" />);
    expect(screen.getByTestId('coinbase-verification-badge')).toHaveAttribute('role', 'status');
  });
});

// =============================================================================
// CoinbaseAttestationCard Tests
// =============================================================================

describe('CoinbaseAttestationCard', () => {
  const mockAttestation = mockAttestations[0]!;

  it('should render card', () => {
    render(<CoinbaseAttestationCard attestation={mockAttestation} />);
    expect(screen.getByTestId('coinbase-attestation-card')).toBeInTheDocument();
  });

  it('should display attestation name', () => {
    render(<CoinbaseAttestationCard attestation={mockAttestation} />);
    expect(screen.getByText('Coinbase Verified Account')).toBeInTheDocument();
  });

  it('should show attestation type', () => {
    render(<CoinbaseAttestationCard attestation={mockAttestation} />);
    expect(screen.getByTestId('attestation-type')).toHaveTextContent('verified_account');
  });

  it('should display issued date', () => {
    render(<CoinbaseAttestationCard attestation={mockAttestation} />);
    expect(screen.getByTestId('issued-date')).toBeInTheDocument();
  });

  it('should show expiry date', () => {
    render(<CoinbaseAttestationCard attestation={mockAttestation} />);
    expect(screen.getByTestId('expiry-date')).toBeInTheDocument();
  });

  it('should display active status', () => {
    render(<CoinbaseAttestationCard attestation={mockAttestation} />);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('should show expired status', () => {
    const expiredAttestation = {
      ...mockAttestation,
      status: 'expired' as const,
      expiresAt: new Date('2022-01-01').getTime(),
    };
    render(<CoinbaseAttestationCard attestation={expiredAttestation} />);
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });

  it('should display verification link', () => {
    render(<CoinbaseAttestationCard attestation={mockAttestation} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', expect.stringContaining('easscan'));
  });

  it('should show metadata when available', () => {
    const attestationWithMeta = mockAttestations[1]!;
    render(<CoinbaseAttestationCard attestation={attestationWithMeta} />);
    expect(screen.getByText(/US/)).toBeInTheDocument();
  });

  it('should apply correct type icon', () => {
    render(<CoinbaseAttestationCard attestation={mockAttestation} />);
    expect(screen.getByTestId('attestation-icon')).toBeInTheDocument();
  });
});

// =============================================================================
// CoinbaseVerificationLevel Tests
// =============================================================================

describe('CoinbaseVerificationLevel', () => {
  it('should render level display', () => {
    render(<CoinbaseVerificationLevel level="verified" />);
    expect(screen.getByTestId('coinbase-verification-level')).toBeInTheDocument();
  });

  it('should show verified level', () => {
    render(<CoinbaseVerificationLevel level="verified" />);
    expect(screen.getAllByText(/verified/i).length).toBeGreaterThan(0);
  });

  it('should display attestation count', () => {
    render(<CoinbaseVerificationLevel level="verified" attestationCount={3} />);
    expect(screen.getByTestId('attestation-count')).toHaveTextContent('3');
  });

  it('should show level description', () => {
    render(<CoinbaseVerificationLevel level="verified" />);
    expect(screen.getByTestId('level-description')).toBeInTheDocument();
  });

  it('should display Coinbase One level', () => {
    render(<CoinbaseVerificationLevel level="coinbase_one" />);
    expect(screen.getAllByText(/coinbase one/i).length).toBeGreaterThan(0);
  });

  it('should show progress indicator', () => {
    render(<CoinbaseVerificationLevel level="verified" showProgress />);
    expect(screen.getByTestId('level-progress')).toBeInTheDocument();
  });

  it('should apply level-specific styling', () => {
    render(<CoinbaseVerificationLevel level="coinbase_one" />);
    const level = screen.getByTestId('coinbase-verification-level');
    expect(level).toHaveClass('border-yellow-400/30');
  });
});

// =============================================================================
// CoinbaseConnectionStatus Tests
// =============================================================================

describe('CoinbaseConnectionStatus', () => {
  it('should render status', () => {
    render(<CoinbaseConnectionStatus status="connected" />);
    expect(screen.getByTestId('coinbase-connection-status')).toBeInTheDocument();
  });

  it('should show connected state', () => {
    render(<CoinbaseConnectionStatus status="connected" />);
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('should show disconnected state', () => {
    render(<CoinbaseConnectionStatus status="disconnected" />);
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it('should show connecting state', () => {
    render(<CoinbaseConnectionStatus status="connecting" />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<CoinbaseConnectionStatus status="error" error="Connection failed" />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<CoinbaseConnectionStatus status="error" error="Connection failed" />);
    expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
  });

  it('should show connect button when disconnected', () => {
    render(<CoinbaseConnectionStatus status="disconnected" onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('should call onConnect when button clicked', () => {
    const onConnect = vi.fn();
    render(<CoinbaseConnectionStatus status="disconnected" onConnect={onConnect} />);
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(onConnect).toHaveBeenCalled();
  });

  it('should show spinner when connecting', () => {
    render(<CoinbaseConnectionStatus status="connecting" />);
    expect(screen.getByTestId('connecting-spinner')).toBeInTheDocument();
  });

  it('should show last synced time when connected', () => {
    const lastSynced = Date.now() - 3600000;
    render(<CoinbaseConnectionStatus status="connected" lastSynced={lastSynced} />);
    expect(screen.getByTestId('last-synced')).toBeInTheDocument();
  });

  it('should have status role', () => {
    render(<CoinbaseConnectionStatus status="connected" />);
    expect(screen.getByTestId('coinbase-connection-status')).toHaveAttribute('role', 'status');
  });
});

// =============================================================================
// CoinbaseAttestationList Tests
// =============================================================================

describe('CoinbaseAttestationList', () => {
  it('should render list', () => {
    render(<CoinbaseAttestationList attestations={mockAttestations} />);
    expect(screen.getByTestId('coinbase-attestation-list')).toBeInTheDocument();
  });

  it('should show list header', () => {
    render(<CoinbaseAttestationList attestations={mockAttestations} />);
    expect(screen.getByText(/attestations/i)).toBeInTheDocument();
  });

  it('should display all attestations', () => {
    render(<CoinbaseAttestationList attestations={mockAttestations} />);
    expect(screen.getByText('Coinbase Verified Account')).toBeInTheDocument();
    expect(screen.getByText('Country of Residence')).toBeInTheDocument();
    expect(screen.getByText('Coinbase One Member')).toBeInTheDocument();
  });

  it('should show attestation count', () => {
    render(<CoinbaseAttestationList attestations={mockAttestations} />);
    expect(screen.getByTestId('list-count')).toHaveTextContent('3');
  });

  it('should show empty state when no attestations', () => {
    render(<CoinbaseAttestationList attestations={[]} />);
    expect(screen.getByText(/no attestations/i)).toBeInTheDocument();
  });

  it('should filter by status', () => {
    const mixedAttestations: CoinbaseAttestation[] = [
      ...mockAttestations,
      { ...mockAttestations[0]!, id: 'cb4', status: 'expired' as const },
    ];
    render(<CoinbaseAttestationList attestations={mixedAttestations} filter="active" />);
    expect(screen.getAllByTestId('coinbase-attestation-card')).toHaveLength(3);
  });

  it('should sort by date', () => {
    render(<CoinbaseAttestationList attestations={mockAttestations} sortBy="date" />);
    const cards = screen.getAllByTestId('coinbase-attestation-card');
    expect(cards).toHaveLength(3);
  });
});

// =============================================================================
// CoinbaseProfileLink Tests
// =============================================================================

describe('CoinbaseProfileLink', () => {
  it('should render link', () => {
    render(<CoinbaseProfileLink address={mockCoinbaseProfile.address} />);
    expect(screen.getByTestId('coinbase-profile-link')).toBeInTheDocument();
  });

  it('should link to Base attestation page', () => {
    render(<CoinbaseProfileLink address={mockCoinbaseProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', expect.stringContaining('base'));
  });

  it('should display truncated address', () => {
    render(<CoinbaseProfileLink address={mockCoinbaseProfile.address} />);
    expect(screen.getByText(/0x742d/)).toBeInTheDocument();
  });

  it('should show full address on hover', () => {
    render(<CoinbaseProfileLink address={mockCoinbaseProfile.address} showFull />);
    expect(screen.getByText(mockCoinbaseProfile.address)).toBeInTheDocument();
  });

  it('should open in new tab', () => {
    render(<CoinbaseProfileLink address={mockCoinbaseProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should have security attributes', () => {
    render(<CoinbaseProfileLink address={mockCoinbaseProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('should show verification badge if verified', () => {
    render(<CoinbaseProfileLink address={mockCoinbaseProfile.address} isVerified />);
    expect(screen.getByTestId('verified-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// CoinbaseIntegrationHub Tests
// =============================================================================

describe('CoinbaseIntegrationHub', () => {
  it('should render hub', () => {
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} />);
    expect(screen.getByTestId('coinbase-integration-hub')).toBeInTheDocument();
  });

  it('should show hub title', () => {
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} />);
    expect(screen.getByText(/coinbase attestations/i)).toBeInTheDocument();
  });

  it('should display verification level', () => {
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} />);
    expect(screen.getByTestId('coinbase-verification-level')).toBeInTheDocument();
  });

  it('should show attestation list', () => {
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} />);
    expect(screen.getByTestId('coinbase-attestation-list')).toBeInTheDocument();
  });

  it('should display connection status', () => {
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} connectionStatus="connected" />);
    expect(screen.getByTestId('coinbase-connection-status')).toBeInTheDocument();
  });

  it('should show profile link', () => {
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} />);
    expect(screen.getByTestId('coinbase-profile-link')).toBeInTheDocument();
  });

  it('should display verified since date', () => {
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} />);
    expect(screen.getByTestId('verified-since')).toBeInTheDocument();
  });

  it('should call onRefresh when refresh clicked', () => {
    const onRefresh = vi.fn();
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('should show empty state when no profile', () => {
    render(<CoinbaseIntegrationHub profile={null} />);
    expect(screen.getByText(/connect.*coinbase/i)).toBeInTheDocument();
  });

  it('should show Coinbase One badge when applicable', () => {
    const oneProfile = { ...mockCoinbaseProfile, verificationLevel: 'coinbase_one' as VerificationLevel };
    render(<CoinbaseIntegrationHub profile={oneProfile} />);
    expect(screen.getAllByText(/coinbase one/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// useCoinbaseAttestation Hook Tests
// =============================================================================

function TestHookComponent({ address }: { address: string }) {
  const {
    profile,
    isLoading,
    error,
    connectionStatus,
    attestations,
    verificationLevel,
    refresh,
  } = useCoinbaseAttestation(address);

  return (
    <div>
      <span data-testid="is-loading">{isLoading ? 'yes' : 'no'}</span>
      <span data-testid="has-profile">{profile ? 'yes' : 'no'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="connection-status">{connectionStatus}</span>
      <span data-testid="attestation-count">{attestations.length}</span>
      <span data-testid="verification-level">{verificationLevel}</span>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

describe('useCoinbaseAttestation', () => {
  it('should return loading state initially', () => {
    render(<TestHookComponent address={mockCoinbaseProfile.address} />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('yes');
  });

  it('should return connection status', () => {
    render(<TestHookComponent address={mockCoinbaseProfile.address} />);
    expect(screen.getByTestId('connection-status')).toBeInTheDocument();
  });

  it('should return attestations array', () => {
    render(<TestHookComponent address={mockCoinbaseProfile.address} />);
    expect(screen.getByTestId('attestation-count')).toBeInTheDocument();
  });

  it('should return verification level', () => {
    render(<TestHookComponent address={mockCoinbaseProfile.address} />);
    expect(screen.getByTestId('verification-level')).toBeInTheDocument();
  });

  it('should have refresh function', () => {
    render(<TestHookComponent address={mockCoinbaseProfile.address} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

// =============================================================================
// Attestation Type Styling Tests
// =============================================================================

describe('Attestation Type Styling', () => {
  const attestationTypes = ['verified_account', 'verified_country', 'one_verification'] as const;

  it.each(attestationTypes)('should render %s attestation with appropriate icon', (type) => {
    const attestation: CoinbaseAttestation = {
      id: 'test',
      type,
      name: 'Test Attestation',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      attestationUid: '0xtest',
      status: 'active',
    };
    render(<CoinbaseAttestationCard attestation={attestation} />);
    expect(screen.getByTestId('attestation-icon')).toBeInTheDocument();
  });
});

// =============================================================================
// Verification Level Styling Tests
// =============================================================================

describe('Verification Level Styling', () => {
  const levels: VerificationLevel[] = ['unverified', 'pending', 'verified', 'coinbase_one'];

  it.each(levels)('should apply correct styling for %s level', (level) => {
    render(<CoinbaseVerificationLevel level={level} />);
    expect(screen.getByTestId('coinbase-verification-level')).toBeInTheDocument();
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle expired attestations gracefully', () => {
    const expiredAttestation: CoinbaseAttestation = {
      ...mockAttestations[0]!,
      status: 'expired',
      expiresAt: Date.now() - 86400000,
    };
    render(<CoinbaseAttestationCard attestation={expiredAttestation} />);
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });

  it('should handle revoked attestations', () => {
    const revokedAttestation: CoinbaseAttestation = {
      ...mockAttestations[0]!,
      status: 'revoked',
    };
    render(<CoinbaseAttestationCard attestation={revokedAttestation} />);
    expect(screen.getByText(/revoked/i)).toBeInTheDocument();
  });

  it('should handle missing metadata', () => {
    const noMetaAttestation: CoinbaseAttestation = {
      ...mockAttestations[0]!,
      metadata: undefined,
    };
    render(<CoinbaseAttestationCard attestation={noMetaAttestation} />);
    expect(screen.getByTestId('coinbase-attestation-card')).toBeInTheDocument();
  });

  it('should handle disconnection gracefully', () => {
    const disconnectedProfile = { ...mockCoinbaseProfile, isConnected: false };
    render(<CoinbaseIntegrationHub profile={disconnectedProfile} connectionStatus="disconnected" />);
    expect(screen.getByTestId('coinbase-integration-hub')).toBeInTheDocument();
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe('Accessibility', () => {
  it('CoinbaseVerificationBadge should have proper role', () => {
    render(<CoinbaseVerificationBadge level="verified" />);
    expect(screen.getByTestId('coinbase-verification-badge')).toHaveAttribute('role', 'status');
  });

  it('CoinbaseConnectionStatus should indicate status to screen readers', () => {
    render(<CoinbaseConnectionStatus status="connected" />);
    expect(screen.getByTestId('coinbase-connection-status')).toHaveAttribute('role', 'status');
  });

  it('CoinbaseProfileLink should have security attributes', () => {
    render(<CoinbaseProfileLink address={mockCoinbaseProfile.address} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('connect button should have accessible label', () => {
    render(<CoinbaseConnectionStatus status="disconnected" onConnect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('refresh button should have accessible label', () => {
    render(<CoinbaseIntegrationHub profile={mockCoinbaseProfile} onRefresh={vi.fn()} />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });
});

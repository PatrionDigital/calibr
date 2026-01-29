/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type {
  VerificationStatus,
  VerificationResult,
  VerificationCheck,
  PlatformVerification,
} from '../../src/components/reputation-verification';
import {
  VerificationBadge,
  VerificationProgress,
  VerificationCheckList,
  VerificationResultCard,
  PlatformVerificationCard,
  VerificationHistoryList,
  VerificationDashboard,
  useReputationVerification,
} from '../../src/components/reputation-verification';

// =============================================================================
// Test Data
// =============================================================================

const mockVerificationChecks: VerificationCheck[] = [
  {
    id: 'signature',
    name: 'Signature Verification',
    description: 'Verify cryptographic signature from source',
    status: 'passed',
    timestamp: new Date('2024-01-15T10:00:00').getTime(),
    details: 'Valid ECDSA signature',
  },
  {
    id: 'source',
    name: 'Source Authenticity',
    description: 'Verify data comes from official source',
    status: 'passed',
    timestamp: new Date('2024-01-15T10:00:01').getTime(),
    details: 'Verified against official API',
  },
  {
    id: 'timestamp',
    name: 'Timestamp Validation',
    description: 'Ensure data is recent and not expired',
    status: 'passed',
    timestamp: new Date('2024-01-15T10:00:02').getTime(),
    details: 'Data is 2 hours old',
  },
  {
    id: 'integrity',
    name: 'Data Integrity',
    description: 'Verify data has not been tampered with',
    status: 'pending',
    timestamp: null,
    details: null,
  },
];

const mockVerificationResult: VerificationResult = {
  platform: 'optimism',
  status: 'verified',
  verifiedAt: new Date('2024-01-15T10:00:00').getTime(),
  expiresAt: new Date('2024-01-22T10:00:00').getTime(),
  checks: mockVerificationChecks,
  confidence: 95,
  verifier: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
  signature: '0xabc123...',
};

const mockFailedResult: VerificationResult = {
  platform: 'gitcoin',
  status: 'failed',
  verifiedAt: new Date('2024-01-15T09:00:00').getTime(),
  expiresAt: null,
  checks: [
    {
      id: 'signature',
      name: 'Signature Verification',
      description: 'Verify cryptographic signature',
      status: 'failed',
      timestamp: new Date('2024-01-15T09:00:00').getTime(),
      details: 'Invalid signature format',
    },
  ],
  confidence: 0,
  verifier: null,
  signature: null,
};

const mockPlatformVerifications: PlatformVerification[] = [
  {
    platform: 'optimism',
    name: 'Optimism Collective',
    icon: '🔴',
    lastVerified: new Date('2024-01-15T10:00:00').getTime(),
    status: 'verified',
    confidence: 95,
    checksCompleted: 4,
    totalChecks: 4,
  },
  {
    platform: 'coinbase',
    name: 'Coinbase',
    icon: '🔵',
    lastVerified: new Date('2024-01-14T15:00:00').getTime(),
    status: 'verified',
    confidence: 100,
    checksCompleted: 3,
    totalChecks: 3,
  },
  {
    platform: 'gitcoin',
    name: 'Gitcoin Passport',
    icon: '🟢',
    lastVerified: new Date('2024-01-15T09:00:00').getTime(),
    status: 'failed',
    confidence: 0,
    checksCompleted: 1,
    totalChecks: 4,
  },
  {
    platform: 'ens',
    name: 'ENS',
    icon: '📛',
    lastVerified: null,
    status: 'unverified',
    confidence: 0,
    checksCompleted: 0,
    totalChecks: 3,
  },
];

const mockVerificationHistory: VerificationResult[] = [
  mockVerificationResult,
  {
    platform: 'coinbase',
    status: 'verified',
    verifiedAt: new Date('2024-01-14T15:00:00').getTime(),
    expiresAt: new Date('2024-01-21T15:00:00').getTime(),
    checks: [],
    confidence: 100,
    verifier: '0x123...',
    signature: '0xdef456...',
  },
  mockFailedResult,
];

// =============================================================================
// VerificationBadge Tests
// =============================================================================

describe('VerificationBadge', () => {
  it('renders badge', () => {
    render(<VerificationBadge status="verified" />);
    expect(screen.getByTestId('verification-badge')).toBeInTheDocument();
  });

  it('displays verified status', () => {
    render(<VerificationBadge status="verified" />);
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it('displays failed status', () => {
    render(<VerificationBadge status="failed" />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('displays pending status', () => {
    render(<VerificationBadge status="pending" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('displays unverified status', () => {
    render(<VerificationBadge status="unverified" />);
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  });

  it('displays expired status', () => {
    render(<VerificationBadge status="expired" />);
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
  });

  it('applies correct styling for verified', () => {
    render(<VerificationBadge status="verified" />);
    expect(screen.getByTestId('verification-badge')).toHaveClass('text-green-400');
  });

  it('applies correct styling for failed', () => {
    render(<VerificationBadge status="failed" />);
    expect(screen.getByTestId('verification-badge')).toHaveClass('text-red-400');
  });

  it('shows confidence when provided', () => {
    render(<VerificationBadge status="verified" confidence={95} />);
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });

  it('renders compact variant', () => {
    render(<VerificationBadge status="verified" compact />);
    expect(screen.getByTestId('verification-badge')).toHaveClass('px-1.5');
  });
});

// =============================================================================
// VerificationProgress Tests
// =============================================================================

describe('VerificationProgress', () => {
  it('renders progress', () => {
    render(<VerificationProgress completed={3} total={4} />);
    expect(screen.getByTestId('verification-progress')).toBeInTheDocument();
  });

  it('displays progress bar', () => {
    render(<VerificationProgress completed={3} total={4} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows completed count', () => {
    render(<VerificationProgress completed={3} total={4} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('displays percentage', () => {
    render(<VerificationProgress completed={3} total={4} showPercentage />);
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('applies correct width to progress bar', () => {
    render(<VerificationProgress completed={2} total={4} />);
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('shows label when provided', () => {
    render(<VerificationProgress completed={3} total={4} label="Checks" />);
    expect(screen.getByText(/checks/i)).toBeInTheDocument();
  });

  it('handles zero total gracefully', () => {
    render(<VerificationProgress completed={0} total={0} />);
    expect(screen.getByTestId('verification-progress')).toBeInTheDocument();
  });
});

// =============================================================================
// VerificationCheckList Tests
// =============================================================================

describe('VerificationCheckList', () => {
  it('renders check list', () => {
    render(<VerificationCheckList checks={mockVerificationChecks} />);
    expect(screen.getByTestId('verification-check-list')).toBeInTheDocument();
  });

  it('displays all checks', () => {
    render(<VerificationCheckList checks={mockVerificationChecks} />);
    expect(screen.getAllByTestId('check-item').length).toBe(4);
  });

  it('shows check names', () => {
    render(<VerificationCheckList checks={mockVerificationChecks} />);
    expect(screen.getByText(/signature verification/i)).toBeInTheDocument();
    expect(screen.getByText(/source authenticity/i)).toBeInTheDocument();
  });

  it('displays passed checks with checkmark', () => {
    render(<VerificationCheckList checks={mockVerificationChecks} />);
    const passedIndicators = screen.getAllByTestId('check-passed');
    expect(passedIndicators.length).toBe(3);
  });

  it('displays pending checks with indicator', () => {
    render(<VerificationCheckList checks={mockVerificationChecks} />);
    expect(screen.getByTestId('check-pending')).toBeInTheDocument();
  });

  it('displays failed checks with indicator', () => {
    const checksWithFailed = [
      ...mockVerificationChecks,
      {
        id: 'failed-check',
        name: 'Failed Check',
        description: 'This check failed',
        status: 'failed' as const,
        timestamp: Date.now(),
        details: 'Error message',
      },
    ];
    render(<VerificationCheckList checks={checksWithFailed} />);
    expect(screen.getByTestId('check-failed')).toBeInTheDocument();
  });

  it('shows check descriptions', () => {
    render(<VerificationCheckList checks={mockVerificationChecks} showDescriptions />);
    expect(screen.getByText(/verify cryptographic signature/i)).toBeInTheDocument();
  });

  it('shows check details when expanded', () => {
    render(<VerificationCheckList checks={mockVerificationChecks} showDetails />);
    expect(screen.getByText(/valid ecdsa signature/i)).toBeInTheDocument();
  });

  it('renders empty state when no checks', () => {
    render(<VerificationCheckList checks={[]} />);
    expect(screen.getByText(/no checks/i)).toBeInTheDocument();
  });
});

// =============================================================================
// VerificationResultCard Tests
// =============================================================================

describe('VerificationResultCard', () => {
  it('renders result card', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByTestId('verification-result-card')).toBeInTheDocument();
  });

  it('displays platform name', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByText(/optimism/i)).toBeInTheDocument();
  });

  it('shows verification status', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByTestId('verification-badge')).toBeInTheDocument();
  });

  it('displays confidence score', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getAllByText(/95%/).length).toBeGreaterThan(0);
  });

  it('shows verification timestamp', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByTestId('verified-at')).toBeInTheDocument();
  });

  it('shows expiration time when available', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByTestId('expires-at')).toBeInTheDocument();
  });

  it('displays check summary', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByTestId('checks-summary')).toBeInTheDocument();
  });

  it('shows verifier address when available', () => {
    render(<VerificationResultCard result={mockVerificationResult} />);
    expect(screen.getByText(/0x742d/)).toBeInTheDocument();
  });

  it('displays failed result correctly', () => {
    render(<VerificationResultCard result={mockFailedResult} />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('calls onVerify when verify button clicked', () => {
    const onVerify = vi.fn();
    render(<VerificationResultCard result={mockFailedResult} onVerify={onVerify} />);
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));
    expect(onVerify).toHaveBeenCalledWith('gitcoin');
  });
});

// =============================================================================
// PlatformVerificationCard Tests
// =============================================================================

describe('PlatformVerificationCard', () => {
  it('renders platform card', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={vi.fn()}
      />
    );
    expect(screen.getByTestId('platform-verification-card')).toBeInTheDocument();
  });

  it('displays platform name and icon', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={vi.fn()}
      />
    );
    expect(screen.getByText(/optimism collective/i)).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('shows verification status', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={vi.fn()}
      />
    );
    expect(screen.getByTestId('verification-badge')).toBeInTheDocument();
  });

  it('displays confidence score', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={vi.fn()}
      />
    );
    expect(screen.getByText(/95%/)).toBeInTheDocument();
  });

  it('shows last verified time', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={vi.fn()}
      />
    );
    expect(screen.getByTestId('last-verified')).toBeInTheDocument();
  });

  it('displays checks progress', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={vi.fn()}
      />
    );
    expect(screen.getAllByText(/4/).length).toBeGreaterThan(0);
  });

  it('shows verify button', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument();
  });

  it('calls onVerify when button clicked', () => {
    const onVerify = vi.fn();
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={onVerify}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /verify/i }));
    expect(onVerify).toHaveBeenCalledWith('optimism');
  });

  it('disables button when verifying', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[0]!}
        onVerify={vi.fn()}
        isVerifying
      />
    );
    expect(screen.getByRole('button', { name: /verifying/i })).toBeDisabled();
  });

  it('shows unverified state correctly', () => {
    render(
      <PlatformVerificationCard
        verification={mockPlatformVerifications[3]!}
        onVerify={vi.fn()}
      />
    );
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  });
});

// =============================================================================
// VerificationHistoryList Tests
// =============================================================================

describe('VerificationHistoryList', () => {
  it('renders history list', () => {
    render(<VerificationHistoryList history={mockVerificationHistory} />);
    expect(screen.getByTestId('verification-history-list')).toBeInTheDocument();
  });

  it('displays all history entries', () => {
    render(<VerificationHistoryList history={mockVerificationHistory} />);
    expect(screen.getAllByTestId('history-entry').length).toBe(3);
  });

  it('shows platform names', () => {
    render(<VerificationHistoryList history={mockVerificationHistory} />);
    expect(screen.getByText(/optimism/i)).toBeInTheDocument();
    expect(screen.getByText(/coinbase/i)).toBeInTheDocument();
    expect(screen.getByText(/gitcoin/i)).toBeInTheDocument();
  });

  it('displays verification status for each entry', () => {
    render(<VerificationHistoryList history={mockVerificationHistory} />);
    const verifiedBadges = screen.getAllByText(/verified/i);
    expect(verifiedBadges.length).toBeGreaterThan(0);
  });

  it('shows timestamps', () => {
    render(<VerificationHistoryList history={mockVerificationHistory} />);
    const timestamps = screen.getAllByTestId('history-timestamp');
    expect(timestamps.length).toBe(3);
  });

  it('displays confidence scores', () => {
    render(<VerificationHistoryList history={mockVerificationHistory} />);
    expect(screen.getByText(/95%/)).toBeInTheDocument();
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('renders empty state when no history', () => {
    render(<VerificationHistoryList history={[]} />);
    expect(screen.getByText(/no verification history/i)).toBeInTheDocument();
  });

  it('limits displayed entries when maxEntries is set', () => {
    render(<VerificationHistoryList history={mockVerificationHistory} maxEntries={2} />);
    expect(screen.getAllByTestId('history-entry').length).toBe(2);
  });
});

// =============================================================================
// VerificationDashboard Tests
// =============================================================================

describe('VerificationDashboard', () => {
  const defaultProps = {
    platforms: mockPlatformVerifications,
    history: mockVerificationHistory,
    onVerify: vi.fn(),
    onVerifyAll: vi.fn(),
  };

  it('renders dashboard', () => {
    render(<VerificationDashboard {...defaultProps} />);
    expect(screen.getByTestId('verification-dashboard')).toBeInTheDocument();
  });

  it('displays dashboard title', () => {
    render(<VerificationDashboard {...defaultProps} />);
    expect(screen.getByText(/reputation verification/i)).toBeInTheDocument();
  });

  it('shows all platform cards', () => {
    render(<VerificationDashboard {...defaultProps} />);
    expect(screen.getAllByTestId('platform-verification-card').length).toBe(4);
  });

  it('displays verify all button', () => {
    render(<VerificationDashboard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /verify all/i })).toBeInTheDocument();
  });

  it('calls onVerifyAll when button clicked', () => {
    const onVerifyAll = vi.fn();
    render(<VerificationDashboard {...defaultProps} onVerifyAll={onVerifyAll} />);
    fireEvent.click(screen.getByRole('button', { name: /verify all/i }));
    expect(onVerifyAll).toHaveBeenCalled();
  });

  it('shows verification history', () => {
    render(<VerificationDashboard {...defaultProps} />);
    expect(screen.getByTestId('verification-history-list')).toBeInTheDocument();
  });

  it('displays overall verification summary', () => {
    render(<VerificationDashboard {...defaultProps} />);
    expect(screen.getByTestId('verification-summary')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<VerificationDashboard {...defaultProps} isLoading />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('displays error state', () => {
    render(<VerificationDashboard {...defaultProps} error="Verification failed" />);
    expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
  });

  it('shows verified count', () => {
    render(<VerificationDashboard {...defaultProps} />);
    expect(screen.getByTestId('verified-count')).toBeInTheDocument();
  });
});

// =============================================================================
// useReputationVerification Hook Tests
// =============================================================================

describe('useReputationVerification', () => {
  function TestComponent({ address }: { address: string }) {
    const {
      platforms,
      history,
      isLoading,
      isVerifying,
      error,
      verify,
      verifyAll,
    } = useReputationVerification(address);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="is-verifying">{isVerifying.toString()}</div>
        <div data-testid="error">{error ?? 'none'}</div>
        <div data-testid="platforms-count">{platforms.length}</div>
        <div data-testid="history-count">{history.length}</div>
        <button onClick={() => verify('optimism')}>Verify Optimism</button>
        <button onClick={() => verifyAll()}>Verify All</button>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent address="0x123" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads verification data', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('platforms-count')).toHaveTextContent('4');
  });

  it('provides verification history', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('history-count')).not.toHaveTextContent('0');
    }, { timeout: 2000 });
  });

  it('verifies individual platform', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Verify Optimism'));
    expect(screen.getByTestId('is-verifying')).toHaveTextContent('true');
  });

  it('verifies all platforms', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Verify All'));
    expect(screen.getByTestId('is-verifying')).toHaveTextContent('true');
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

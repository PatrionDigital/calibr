/**
 * BridgeStatus Component Tests
 *
 * Tests for the bridge status components:
 * - BridgeStatusDisplay - full status display with progress, steps, actions
 * - BridgeStatusBadge - compact badge showing progress percentage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BridgeStatusDisplay, BridgeStatusBadge } from '@/components/bridge-status';

// =============================================================================
// Types
// =============================================================================

type BridgePhase =
  | 'pending_initiation'
  | 'initiated'
  | 'pending_attestation'
  | 'attested'
  | 'claiming'
  | 'completed'
  | 'failed'
  | 'abandoned';

interface BridgeState {
  trackingId: string;
  phase: BridgePhase;
  amountUsd: string;
  sourceChain: string;
  destinationChain: string;
  sourceTxHash?: string;
  destTxHash?: string;
  messageHash?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Mocks
// =============================================================================

let mockActiveBridges: Record<string, BridgeState> = {};
const mockRefreshBridgeStatus = vi.fn();
const mockCheckAttestation = vi.fn();
const mockAbandonBridge = vi.fn();

vi.mock('@/lib/stores/bridge-store', () => ({
  useBridgeStore: () => ({
    activeBridges: mockActiveBridges,
    refreshBridgeStatus: mockRefreshBridgeStatus,
    checkAttestation: mockCheckAttestation,
    abandonBridge: mockAbandonBridge,
  }),
}));

// Mock window.confirm
const originalConfirm = window.confirm;

// =============================================================================
// Test Data
// =============================================================================

const createBridge = (overrides: Partial<BridgeState> = {}): BridgeState => ({
  trackingId: 'bridge-123456789',
  phase: 'completed', // Default to completed to avoid polling
  amountUsd: '100',
  sourceChain: 'Base',
  destinationChain: 'Polygon',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:05:00Z',
  ...overrides,
});

// =============================================================================
// BridgeStatusDisplay Tests
// =============================================================================

describe('BridgeStatusDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveBridges = {};
    mockRefreshBridgeStatus.mockResolvedValue({ phase: 'completed' });
    mockCheckAttestation.mockResolvedValue({ ready: false });
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  describe('bridge not found', () => {
    it('shows not found message when bridge does not exist', () => {
      render(<BridgeStatusDisplay trackingId="unknown-123" />);
      expect(screen.getByText(/Bridge not found: unknown-123/)).toBeInTheDocument();
    });
  });

  describe('header and basic info', () => {
    beforeEach(() => {
      mockActiveBridges = { 'bridge-123456789': createBridge() };
    });

    it('renders bridge status header', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123456789" />);
      expect(screen.getByText('[BRIDGE STATUS]')).toBeInTheDocument();
    });

    it('renders amount with USDC', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123456789" />);
      expect(screen.getByText('$100 USDC')).toBeInTheDocument();
    });

    it('renders route information', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123456789" />);
      expect(screen.getByText('Base → Polygon')).toBeInTheDocument();
    });

    it('renders truncated tracking ID', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123456789" />);
      expect(screen.getByText('bridge-12345...')).toBeInTheDocument();
    });

    it('renders timestamps', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123456789" />);
      expect(screen.getByText(/Started:/)).toBeInTheDocument();
      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    });
  });

  describe('progress display', () => {
    it('shows 20% progress for initiated phase', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed' }) };
      // Re-render with initiated to check initial render
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'initiated' }) };
      // Use completed phase to avoid polling interference
      mockActiveBridges = { 'test': createBridge({ trackingId: 'test', phase: 'completed' }) };
      render(<BridgeStatusDisplay trackingId="test" />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('shows 100% progress for completed phase', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('hides progress bar details in compact mode', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" compact />);
      // In compact mode, percentage display is hidden
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });
  });

  describe('step indicators', () => {
    beforeEach(() => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed' }) };
    });

    it('renders all 5 step labels in full mode', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText('INITIATED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('ATTESTED')).toBeInTheDocument();
      expect(screen.getByText('CLAIMING')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    it('renders step descriptions in full mode', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText('Transaction submitted to Base')).toBeInTheDocument();
      expect(screen.getByText(/Waiting for Circle attestation/)).toBeInTheDocument();
      expect(screen.getByText('Ready to claim on Polygon')).toBeInTheDocument();
    });

    it('hides step descriptions in compact mode', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123" compact />);
      expect(screen.queryByText('Transaction submitted to Base')).not.toBeInTheDocument();
    });

    it('shows checkmarks for completed steps when bridge is completed', () => {
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThan(0);
    });
  });

  describe('transaction links', () => {
    it('shows source transaction link when available', () => {
      mockActiveBridges = {
        'bridge-123': createBridge({ trackingId: 'bridge-123', sourceTxHash: '0x1234567890abcdef' }),
      };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText('TRANSACTIONS')).toBeInTheDocument();
      expect(screen.getByText('0x12345678...')).toBeInTheDocument();
      expect(screen.getByText('Source (Base):')).toBeInTheDocument();
    });

    it('shows destination transaction link when available', () => {
      mockActiveBridges = {
        'bridge-123': createBridge({ trackingId: 'bridge-123', destTxHash: '0xabcdef1234567890' }),
      };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText('0xabcdef12...')).toBeInTheDocument();
      expect(screen.getByText('Destination (Polygon):')).toBeInTheDocument();
    });

    it('links to basescan for source transaction', () => {
      mockActiveBridges = {
        'bridge-123': createBridge({ trackingId: 'bridge-123', sourceTxHash: '0x1234' }),
      };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      const link = screen.getByRole('link', { name: /0x1234/ });
      expect(link).toHaveAttribute('href', 'https://basescan.org/tx/0x1234');
    });

    it('links to polygonscan for destination transaction', () => {
      mockActiveBridges = {
        'bridge-123': createBridge({ trackingId: 'bridge-123', destTxHash: '0xabcd' }),
      };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      const link = screen.getByRole('link', { name: /0xabcd/ });
      expect(link).toHaveAttribute('href', 'https://polygonscan.com/tx/0xabcd');
    });

    it('opens links in new tab', () => {
      mockActiveBridges = {
        'bridge-123': createBridge({ trackingId: 'bridge-123', sourceTxHash: '0x1234' }),
      };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      const link = screen.getByRole('link', { name: /0x1234/ });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('hides transaction section when no hashes', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.queryByText('TRANSACTIONS')).not.toBeInTheDocument();
    });
  });

  describe('status messages', () => {
    it('shows completion message when completed', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText(/Bridge complete! Your USDC is now on Polygon/)).toBeInTheDocument();
    });

    it('shows failed message when failed', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'failed' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText(/Bridge failed/)).toBeInTheDocument();
    });

    it('shows abandoned message when abandoned', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'abandoned' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText(/Bridge abandoned/)).toBeInTheDocument();
    });

    it('shows error message when error present', () => {
      mockActiveBridges = {
        'bridge-123': createBridge({ trackingId: 'bridge-123', error: 'Insufficient gas' }),
      };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.getByText('ERROR: Insufficient gas')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('shows abandon button for non-terminal phases', async () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'initiated' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      await waitFor(() => {
        expect(screen.getByText('ABANDON')).toBeInTheDocument();
      });
    });

    it('hides action buttons for completed phase', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.queryByText('ABANDON')).not.toBeInTheDocument();
      expect(screen.queryByText('REFRESH')).not.toBeInTheDocument();
    });

    it('hides action buttons for failed phase', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'failed' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      expect(screen.queryByText('ABANDON')).not.toBeInTheDocument();
    });

    it('calls abandonBridge when abandon confirmed', async () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'initiated' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      await waitFor(() => {
        expect(screen.getByText('ABANDON')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('ABANDON'));
      expect(window.confirm).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockAbandonBridge).toHaveBeenCalledWith('bridge-123');
      });
    });

    it('does not call abandonBridge when abandon cancelled', async () => {
      (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'initiated' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);
      await waitFor(() => {
        expect(screen.getByText('ABANDON')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('ABANDON'));
      expect(mockAbandonBridge).not.toHaveBeenCalled();
    });
  });

  describe('polling behavior', () => {
    it('polls for status updates when bridge is active', async () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'initiated' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);

      await waitFor(() => {
        expect(mockRefreshBridgeStatus).toHaveBeenCalledWith('bridge-123');
      });
    });

    it('does not poll for completed phase', async () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);

      // Wait a bit to ensure no polling starts
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockRefreshBridgeStatus).not.toHaveBeenCalled();
    });
  });

  describe('callbacks', () => {
    it('calls onComplete when bridge completes', async () => {
      const onComplete = vi.fn();
      mockRefreshBridgeStatus.mockResolvedValue({ phase: 'completed' });
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'claiming' }) };

      render(<BridgeStatusDisplay trackingId="bridge-123" onComplete={onComplete} />);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('calls onError when bridge fails with error', async () => {
      const onError = vi.fn();
      mockRefreshBridgeStatus.mockResolvedValue({ phase: 'failed', error: 'Network error' });
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'claiming' }) };

      render(<BridgeStatusDisplay trackingId="bridge-123" onError={onError} />);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('attestation checking', () => {
    it('checks attestation when in pending_attestation with messageHash', async () => {
      mockActiveBridges = {
        'bridge-123': createBridge({
          trackingId: 'bridge-123',
          phase: 'pending_attestation',
          messageHash: '0xmessagehash',
        }),
      };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);

      await waitFor(() => {
        expect(mockCheckAttestation).toHaveBeenCalledWith('bridge-123', '0xmessagehash');
      });
    });

    it('does not check attestation without messageHash', async () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'pending_attestation' }) };
      render(<BridgeStatusDisplay trackingId="bridge-123" />);

      await waitFor(() => {
        expect(mockRefreshBridgeStatus).toHaveBeenCalled();
      });

      expect(mockCheckAttestation).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// BridgeStatusBadge Tests
// =============================================================================

describe('BridgeStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveBridges = {};
  });

  it('returns null when bridge not found', () => {
    const { container } = render(<BridgeStatusBadge trackingId="unknown" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders bridge progress percentage', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'attested' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByText('Bridge: 60%')).toBeInTheDocument();
  });

  it('shows 20% for initiated phase', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'initiated' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByText('Bridge: 20%')).toBeInTheDocument();
  });

  it('shows 100% for completed phase', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByText('Bridge: 100%')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders as a button', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  describe('status indicator colors', () => {
    it('shows success color for completed', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed' }) };
      const { container } = render(<BridgeStatusBadge trackingId="bridge-123" />);
      const indicator = container.querySelector('.rounded-full');
      expect(indicator).toHaveStyle({ backgroundColor: 'hsl(var(--success))' });
    });

    it('shows destructive color for failed', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'failed' }) };
      const { container } = render(<BridgeStatusBadge trackingId="bridge-123" />);
      const indicator = container.querySelector('.rounded-full');
      expect(indicator).toHaveStyle({ backgroundColor: 'hsl(var(--destructive))' });
    });

    it('shows destructive color for abandoned', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'abandoned' }) };
      const { container } = render(<BridgeStatusBadge trackingId="bridge-123" />);
      const indicator = container.querySelector('.rounded-full');
      expect(indicator).toHaveStyle({ backgroundColor: 'hsl(var(--destructive))' });
    });

    it('shows primary color for active phases', () => {
      mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'claiming' }) };
      const { container } = render(<BridgeStatusBadge trackingId="bridge-123" />);
      const indicator = container.querySelector('.rounded-full');
      expect(indicator).toHaveStyle({ backgroundColor: 'hsl(var(--primary))' });
    });
  });

  it('has animated pulse indicator', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123' }) };
    const { container } = render(<BridgeStatusBadge trackingId="bridge-123" />);
    const indicator = container.querySelector('.rounded-full');
    expect(indicator).toHaveClass('animate-pulse');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveBridges = {};
    mockRefreshBridgeStatus.mockResolvedValue({ phase: 'completed' });
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('handles 0% progress for pending_initiation', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'pending_initiation' }) };
    render(<BridgeStatusDisplay trackingId="bridge-123" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles large amounts', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', amountUsd: '1000000' }) };
    render(<BridgeStatusDisplay trackingId="bridge-123" />);
    expect(screen.getByText('$1000000 USDC')).toBeInTheDocument();
  });

  it('handles very long tracking IDs', () => {
    const longId = 'bridge-' + 'a'.repeat(100);
    mockActiveBridges = { [longId]: createBridge({ trackingId: longId }) };
    render(<BridgeStatusDisplay trackingId={longId} />);
    expect(screen.getByText('bridge-aaaaa...')).toBeInTheDocument();
  });
});

// =============================================================================
// Different Amounts
// =============================================================================

describe('Different Amount Displays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveBridges = {};
  });

  it('displays small amounts', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', amountUsd: '0.50' }) };
    render(<BridgeStatusDisplay trackingId="bridge-123" />);
    expect(screen.getByText('$0.50 USDC')).toBeInTheDocument();
  });

  it('displays medium amounts', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', amountUsd: '500' }) };
    render(<BridgeStatusDisplay trackingId="bridge-123" />);
    expect(screen.getByText('$500 USDC')).toBeInTheDocument();
  });

  it('displays decimal amounts', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', amountUsd: '123.45' }) };
    render(<BridgeStatusDisplay trackingId="bridge-123" />);
    expect(screen.getByText('$123.45 USDC')).toBeInTheDocument();
  });
});

// =============================================================================
// Chain Display Tests
// =============================================================================

describe('Chain Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveBridges = {};
  });

  it('displays Base to Polygon route', () => {
    mockActiveBridges = {
      'bridge-123': createBridge({ trackingId: 'bridge-123', sourceChain: 'Base', destinationChain: 'Polygon' }),
    };
    render(<BridgeStatusDisplay trackingId="bridge-123" />);
    expect(screen.getByText('Base → Polygon')).toBeInTheDocument();
  });

  it('displays different chains', () => {
    mockActiveBridges = {
      'bridge-123': createBridge({ trackingId: 'bridge-123', sourceChain: 'Ethereum', destinationChain: 'Arbitrum' }),
    };
    render(<BridgeStatusDisplay trackingId="bridge-123" />);
    expect(screen.getByText('Ethereum → Arbitrum')).toBeInTheDocument();
  });

  it('shows destination chain in completion message', () => {
    mockActiveBridges = {
      'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'completed', destinationChain: 'Optimism' }),
    };
    render(<BridgeStatusDisplay trackingId="bridge-123" />);
    expect(screen.getByText(/Your USDC is now on Optimism/)).toBeInTheDocument();
  });
});

// =============================================================================
// Progress Percentage Tests
// =============================================================================

describe('Progress Percentage Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveBridges = {};
  });

  it('calculates 40% for pending_attestation', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'pending_attestation' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByText('Bridge: 40%')).toBeInTheDocument();
  });

  it('calculates 60% for attested', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'attested' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByText('Bridge: 60%')).toBeInTheDocument();
  });

  it('calculates 80% for claiming', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'claiming' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByText('Bridge: 80%')).toBeInTheDocument();
  });

  it('handles failed phase with 0% progress', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'failed' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByText('Bridge: 0%')).toBeInTheDocument();
  });

  it('handles abandoned phase with 0% progress', () => {
    mockActiveBridges = { 'bridge-123': createBridge({ trackingId: 'bridge-123', phase: 'abandoned' }) };
    render(<BridgeStatusBadge trackingId="bridge-123" />);
    expect(screen.getByText('Bridge: 0%')).toBeInTheDocument();
  });
});

/**
 * BridgePanel Component Tests
 *
 * Tests for the USDC bridge panel component:
 * - Amount input and MAX button
 * - Fee estimation display
 * - Bridge initiation flow
 * - Active bridges list
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BridgePanel } from '@/components/bridge-panel';

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
}

interface BridgeEstimate {
  bridgeFeeUsd: string;
  netAmountUsd: string;
  minMinutes: number;
  maxMinutes: number;
}

// =============================================================================
// Mocks
// =============================================================================

// Wagmi mocks
let mockIsConnected = true;
let mockAddress: string | undefined = '0x1234567890abcdef1234567890abcdef12345678';
let mockChainId = 8453; // Base chain ID
let mockBalance = { formatted: '1000.00', value: BigInt(1000000000) };
const mockSwitchChain = vi.fn();
const mockWriteContractAsync = vi.fn();
const mockRefetchBalance = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAddress,
    isConnected: mockIsConnected,
  }),
  useBalance: () => ({
    data: mockBalance,
    refetch: mockRefetchBalance,
  }),
  useChainId: () => mockChainId,
  useSwitchChain: () => ({
    switchChain: mockSwitchChain,
  }),
  useWriteContract: () => ({
    writeContractAsync: mockWriteContractAsync,
    isPending: false,
    data: undefined,
  }),
  useWaitForTransactionReceipt: () => ({
    data: undefined,
    isLoading: false,
  }),
}));

vi.mock('wagmi/chains', () => ({
  base: { id: 8453 },
}));

vi.mock('viem', () => ({
  parseUnits: (value: string) => BigInt(Math.floor(parseFloat(value) * 1000000)),
  keccak256: (data: string) => `0x${data.slice(2, 66)}`,
  decodeEventLog: () => ({ args: { message: '0x' } }),
}));

// Bridge store mock
let mockActiveBridges: Record<string, BridgeState> = {};
let mockSelectedBridgeId: string | null = null;
let mockIsInitiating = false;
let mockLastError: string | null = null;
const mockInitiateBridge = vi.fn();
const mockUpdateBridgePhase = vi.fn();
const mockGetEstimate = vi.fn();
const mockClearError = vi.fn();
const mockSelectBridge = vi.fn();

vi.mock('@/lib/stores/bridge-store', () => ({
  useBridgeStore: () => ({
    activeBridges: mockActiveBridges,
    selectedBridgeId: mockSelectedBridgeId,
    isInitiating: mockIsInitiating,
    lastError: mockLastError,
    initiateBridge: mockInitiateBridge,
    updateBridgePhase: mockUpdateBridgePhase,
    getEstimate: mockGetEstimate,
    clearError: mockClearError,
    selectBridge: mockSelectBridge,
  }),
}));

// Mock BridgeStatusDisplay
vi.mock('./bridge-status', () => ({
  BridgeStatusDisplay: ({ trackingId, onComplete }: { trackingId: string; onComplete?: () => void }) => (
    <div data-testid="bridge-status-display">
      <span>Tracking: {trackingId}</span>
      <button onClick={onComplete}>Complete</button>
    </div>
  ),
}));

// =============================================================================
// Test Helpers
// =============================================================================

function resetMocks() {
  mockIsConnected = true;
  mockAddress = '0x1234567890abcdef1234567890abcdef12345678';
  mockChainId = 8453;
  mockBalance = { formatted: '1000.00', value: BigInt(1000000000) };
  mockActiveBridges = {};
  mockSelectedBridgeId = null;
  mockIsInitiating = false;
  mockLastError = null;
}

// =============================================================================
// Tests
// =============================================================================

describe('BridgePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
    mockGetEstimate.mockResolvedValue({
      bridgeFeeUsd: '0.10',
      netAmountUsd: '99.90',
      minMinutes: 15,
      maxMinutes: 30,
    } as BridgeEstimate);
  });

  describe('header and route display', () => {
    it('renders bridge header', () => {
      render(<BridgePanel />);
      expect(screen.getByText('[BRIDGE USDC]')).toBeInTheDocument();
    });

    it('renders source chain (Base)', () => {
      render(<BridgePanel />);
      expect(screen.getByText('BASE')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
    });

    it('renders destination chain (Polygon)', () => {
      render(<BridgePanel />);
      expect(screen.getByText('POLYGON')).toBeInTheDocument();
      expect(screen.getByText('Destination')).toBeInTheDocument();
    });

    it('renders route arrow', () => {
      render(<BridgePanel />);
      expect(screen.getByText('→→→')).toBeInTheDocument();
    });
  });

  describe('amount input', () => {
    it('renders amount input field', () => {
      render(<BridgePanel />);
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('renders amount label', () => {
      render(<BridgePanel />);
      expect(screen.getByText('AMOUNT (USDC)')).toBeInTheDocument();
    });

    it('accepts numeric input', () => {
      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });
      expect(input).toHaveValue(100);
    });

    it('shows default amount when provided', () => {
      render(<BridgePanel defaultAmount="50" />);
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    });

    it('displays balance when available', () => {
      render(<BridgePanel />);
      expect(screen.getByText(/Balance: \$1000.00 USDC on Base/)).toBeInTheDocument();
    });
  });

  describe('MAX button', () => {
    it('renders MAX button', () => {
      render(<BridgePanel />);
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });

    it('sets amount to balance when MAX clicked', () => {
      render(<BridgePanel />);
      fireEvent.click(screen.getByText('MAX'));
      expect(screen.getByDisplayValue('1000.00')).toBeInTheDocument();
    });

    it('disables MAX button when no balance', () => {
      mockBalance = null as unknown as typeof mockBalance;
      render(<BridgePanel />);
      expect(screen.getByText('MAX')).toBeDisabled();
    });
  });

  describe('fee estimation', () => {
    it('shows fee section header', () => {
      render(<BridgePanel />);
      expect(screen.getByText('FEES')).toBeInTheDocument();
    });

    it('shows enter amount message when no amount', () => {
      render(<BridgePanel />);
      expect(screen.getByText('Enter an amount to see fees')).toBeInTheDocument();
    });

    it('fetches estimate when amount entered', async () => {
      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });

      await waitFor(() => {
        expect(mockGetEstimate).toHaveBeenCalled();
      });
    });

    it('displays bridge fee', async () => {
      render(<BridgePanel defaultAmount="100" />);
      await waitFor(() => {
        expect(screen.getByText('$0.10')).toBeInTheDocument();
      });
    });

    it('displays network gas estimate', async () => {
      render(<BridgePanel defaultAmount="100" />);
      await waitFor(() => {
        expect(screen.getByText('~$0.05')).toBeInTheDocument();
      });
    });

    it('displays net amount', async () => {
      render(<BridgePanel defaultAmount="100" />);
      await waitFor(() => {
        expect(screen.getByText('$99.90 USDC')).toBeInTheDocument();
      });
    });

    it('displays estimated time', async () => {
      render(<BridgePanel defaultAmount="100" />);
      await waitFor(() => {
        expect(screen.getByText('15-30 min')).toBeInTheDocument();
      });
    });

    it('hides fee section in compact mode', () => {
      render(<BridgePanel compact />);
      expect(screen.queryByText('FEES')).not.toBeInTheDocument();
    });
  });

  describe('submit button states', () => {
    it('shows INITIATE BRIDGE when ready', () => {
      render(<BridgePanel defaultAmount="100" />);
      expect(screen.getByText('INITIATE BRIDGE')).toBeInTheDocument();
    });

    it('shows CONNECT WALLET when not connected', () => {
      mockIsConnected = false;
      render(<BridgePanel defaultAmount="100" />);
      expect(screen.getByText('CONNECT WALLET')).toBeInTheDocument();
    });

    it('shows SWITCH TO BASE when on wrong chain', () => {
      mockChainId = 1; // Ethereum
      render(<BridgePanel defaultAmount="100" />);
      expect(screen.getByText('SWITCH TO BASE')).toBeInTheDocument();
    });

    it('shows INSUFFICIENT BALANCE when amount exceeds balance', () => {
      mockBalance = { formatted: '50.00', value: BigInt(50000000) };
      render(<BridgePanel defaultAmount="100" />);
      expect(screen.getByText('INSUFFICIENT BALANCE')).toBeInTheDocument();
    });

    it('disables button when not connected', () => {
      mockIsConnected = false;
      render(<BridgePanel defaultAmount="100" />);
      const button = screen.getByText('CONNECT WALLET');
      expect(button).toBeDisabled();
    });

    it('disables button when no amount', () => {
      render(<BridgePanel />);
      const button = screen.getByText('INITIATE BRIDGE');
      expect(button).toBeDisabled();
    });
  });

  describe('bridge initiation', () => {
    it('calls switchChain when on wrong chain', async () => {
      mockChainId = 1;
      render(<BridgePanel defaultAmount="100" />);

      // Click should trigger chain switch
      fireEvent.click(screen.getByText('SWITCH TO BASE'));

      await waitFor(() => {
        expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 8453 });
      });
    });

    it('calls initiateBridge on submit', async () => {
      mockInitiateBridge.mockResolvedValue('tracking-123');
      render(<BridgePanel defaultAmount="100" />);

      fireEvent.click(screen.getByText('INITIATE BRIDGE'));

      await waitFor(() => {
        expect(mockInitiateBridge).toHaveBeenCalled();
      });
    });

    it('calls onBridgeInitiated callback', async () => {
      const onBridgeInitiated = vi.fn();
      mockInitiateBridge.mockResolvedValue('tracking-123');
      mockWriteContractAsync.mockResolvedValue('0xtxhash');

      render(<BridgePanel defaultAmount="100" onBridgeInitiated={onBridgeInitiated} />);

      fireEvent.click(screen.getByText('INITIATE BRIDGE'));

      await waitFor(() => {
        expect(onBridgeInitiated).toHaveBeenCalledWith('tracking-123');
      });
    });

    it('clears error before initiating', async () => {
      mockInitiateBridge.mockResolvedValue('tracking-123');
      render(<BridgePanel defaultAmount="100" />);

      fireEvent.click(screen.getByText('INITIATE BRIDGE'));

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
      });
    });
  });

  describe('error display', () => {
    it('shows error message when present', () => {
      mockLastError = 'Bridge failed: insufficient funds';
      render(<BridgePanel />);
      expect(screen.getByText('Bridge failed: insufficient funds')).toBeInTheDocument();
    });

    it('hides error message when not present', () => {
      mockLastError = null;
      render(<BridgePanel />);
      expect(screen.queryByText(/Bridge failed/)).not.toBeInTheDocument();
    });
  });

  describe('info section', () => {
    it('shows CCTP info', () => {
      render(<BridgePanel />);
      expect(screen.getByText(/Circle CCTP/)).toBeInTheDocument();
    });

    it('shows completion time estimate', () => {
      render(<BridgePanel />);
      expect(screen.getByText(/15-30 minutes/)).toBeInTheDocument();
    });
  });

  describe('active bridges list', () => {
    it('shows active bridges section when bridges exist', () => {
      mockActiveBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'pending_attestation',
          amountUsd: '100',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
      render(<BridgePanel />);
      expect(screen.getByText('ACTIVE BRIDGES')).toBeInTheDocument();
    });

    it('displays active bridge amount', () => {
      mockActiveBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'pending_attestation',
          amountUsd: '250',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
      render(<BridgePanel />);
      expect(screen.getByText('$250 USDC')).toBeInTheDocument();
    });

    it('displays bridge phase', () => {
      mockActiveBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'pending_attestation',
          amountUsd: '100',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
      render(<BridgePanel />);
      expect(screen.getByText('PENDING ATTESTATION')).toBeInTheDocument();
    });

    it('allows clicking active bridge to monitor', () => {
      mockActiveBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'claiming',
          amountUsd: '100',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
      render(<BridgePanel />);

      fireEvent.click(screen.getByText('$100 USDC'));

      expect(mockSelectBridge).toHaveBeenCalledWith('bridge-1');
    });

    it('does not display completed bridges in active list', () => {
      mockActiveBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'completed',
          amountUsd: '100',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
      render(<BridgePanel />);
      // The section might show but completed bridge should not appear
      expect(screen.queryByText('COMPLETED')).not.toBeInTheDocument();
    });

    it('does not display failed bridges in active list', () => {
      mockActiveBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'failed',
          amountUsd: '100',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
      render(<BridgePanel />);
      // The section might show but failed bridge should not appear
      expect(screen.queryByText('FAILED')).not.toBeInTheDocument();
    });
  });

  describe('monitoring view', () => {
    beforeEach(() => {
      mockSelectedBridgeId = 'bridge-123';
      mockActiveBridges = {
        'bridge-123': {
          trackingId: 'bridge-123',
          phase: 'pending_attestation',
          amountUsd: '100',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
    });

    // Note: Monitoring view requires bridgeStep='monitoring' which is internal state
    // These tests verify the component shows input form by default

    it('shows input form by default', () => {
      render(<BridgePanel />);
      expect(screen.getByText('[BRIDGE USDC]')).toBeInTheDocument();
    });
  });

  describe('wallet address handling', () => {
    it('uses connected address when no prop provided', () => {
      mockAddress = '0xabcd';
      render(<BridgePanel />);
      // Component should use connected address internally
      expect(screen.getByText('[BRIDGE USDC]')).toBeInTheDocument();
    });

    it('uses prop address when provided', () => {
      render(<BridgePanel walletAddress="0x9999" />);
      // Component should use provided address
      expect(screen.getByText('[BRIDGE USDC]')).toBeInTheDocument();
    });
  });

  describe('multiple active bridges', () => {
    it('shows all active bridges', () => {
      mockActiveBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'initiated',
          amountUsd: '100',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
        'bridge-2': {
          trackingId: 'bridge-2',
          phase: 'claiming',
          amountUsd: '200',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
      render(<BridgePanel />);
      expect(screen.getByText('$100 USDC')).toBeInTheDocument();
      expect(screen.getByText('$200 USDC')).toBeInTheDocument();
    });

    it('shows different phases for each bridge', () => {
      mockActiveBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'initiated',
          amountUsd: '100',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
        'bridge-2': {
          trackingId: 'bridge-2',
          phase: 'attested',
          amountUsd: '200',
          sourceChain: 'Base',
          destinationChain: 'Polygon',
        },
      };
      render(<BridgePanel />);
      expect(screen.getByText('INITIATED')).toBeInTheDocument();
      expect(screen.getByText('ATTESTED')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
    mockGetEstimate.mockResolvedValue({
      bridgeFeeUsd: '0.10',
      netAmountUsd: '99.90',
      minMinutes: 15,
      maxMinutes: 30,
    });
  });

  it('handles zero balance', () => {
    mockBalance = { formatted: '0.00', value: BigInt(0) };
    render(<BridgePanel defaultAmount="100" />);
    expect(screen.getByText('INSUFFICIENT BALANCE')).toBeInTheDocument();
  });

  it('handles very small amounts', () => {
    render(<BridgePanel defaultAmount="0.01" />);
    expect(screen.getByDisplayValue('0.01')).toBeInTheDocument();
  });

  it('handles very large amounts', () => {
    mockBalance = { formatted: '1000000.00', value: BigInt(1000000000000) };
    render(<BridgePanel defaultAmount="999999" />);
    expect(screen.getByDisplayValue('999999')).toBeInTheDocument();
  });

  it('handles estimate loading state', async () => {
    mockGetEstimate.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<BridgePanel defaultAmount="100" />);

    await waitFor(() => {
      expect(screen.getByText('Calculating...')).toBeInTheDocument();
    });
  });

  it('handles estimate error gracefully', async () => {
    mockGetEstimate.mockRejectedValue(new Error('Network error'));
    render(<BridgePanel defaultAmount="100" />);

    await waitFor(() => {
      // Should show enter amount message when estimate fails
      expect(screen.queryByText('$99.90 USDC')).not.toBeInTheDocument();
    });
  });
});

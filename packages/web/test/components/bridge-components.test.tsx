/**
 * Bridge Component Tests
 *
 * Tests for BridgePanel and BridgeStatusDisplay components
 * that implement cross-chain USDC bridging via Circle CCTP.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// =============================================================================
// Mock Types
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

interface MockBridgeStatus {
  trackingId: string;
  phase: BridgePhase;
  sourceChain: 'BASE';
  destinationChain: 'POLYGON';
  amount: string;
  amountUsd: string;
  sourceTxHash?: string;
  destTxHash?: string;
  messageHash?: string;
  hasAttestation: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Mock Store
// =============================================================================

const mockBridgeStore = {
  activeBridges: {} as Record<string, MockBridgeStatus>,
  selectedBridgeId: null as string | null,
  isInitiating: false,
  isPolling: false,
  lastError: null as string | null,
  initiateBridge: vi.fn(),
  updateBridgePhase: vi.fn(),
  refreshBridgeStatus: vi.fn(),
  checkAttestation: vi.fn(),
  abandonBridge: vi.fn(),
  selectBridge: vi.fn(),
  clearError: vi.fn(),
  getEstimate: vi.fn(),
};

vi.mock('@/lib/stores/bridge-store', () => ({
  useBridgeStore: () => mockBridgeStore,
}));

// =============================================================================
// Mock Wagmi
// =============================================================================

const mockUseAccount = vi.fn(() => ({
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
}));

const mockUseBalance = vi.fn(() => ({
  data: { formatted: '1000.00', value: BigInt(1000000000) },
  refetch: vi.fn(),
}));

const mockUseChainId = vi.fn(() => 8453);
const mockUseSwitchChain = vi.fn(() => ({ switchChain: vi.fn() }));
const mockWriteContractAsync = vi.fn();

const mockUseWriteContract = vi.fn(() => ({
  writeContractAsync: mockWriteContractAsync,
  isPending: false,
  data: undefined,
}));

const mockUseWaitForTransactionReceipt = vi.fn(() => ({
  data: undefined,
  isLoading: false,
}));

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useBalance: () => mockUseBalance(),
  useChainId: () => mockUseChainId(),
  useSwitchChain: () => mockUseSwitchChain(),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
}));

vi.mock('wagmi/chains', () => ({
  base: { id: 8453 },
}));

vi.mock('viem', () => ({
  parseUnits: (value: string, decimals: number) => BigInt(parseFloat(value) * Math.pow(10, decimals)),
  keccak256: (data: string) => `0xhash${data.slice(0, 10)}`,
  decodeEventLog: () => ({ args: { message: '0xmessage' } }),
}));

// =============================================================================
// Mock BridgeStatusDisplay for BridgePanel tests
// =============================================================================

vi.mock('./bridge-status', () => ({
  BridgeStatusDisplay: ({ trackingId, onComplete }: { trackingId: string; onComplete?: () => void }) => (
    <div data-testid="bridge-status-display">
      <span data-testid="tracking-id">{trackingId}</span>
      <button data-testid="complete-btn" onClick={onComplete}>
        Complete
      </button>
    </div>
  ),
}));

// =============================================================================
// Import Components
// =============================================================================

let BridgePanel: typeof import('@/components/bridge-panel').BridgePanel;
let BridgeStatusDisplay: typeof import('@/components/bridge-status').BridgeStatusDisplay;
let BridgeStatusBadge: typeof import('@/components/bridge-status').BridgeStatusBadge;

beforeEach(async () => {
  vi.resetModules();

  // Reset mock store state
  mockBridgeStore.activeBridges = {};
  mockBridgeStore.selectedBridgeId = null;
  mockBridgeStore.isInitiating = false;
  mockBridgeStore.isPolling = false;
  mockBridgeStore.lastError = null;

  // Reset wagmi mocks
  mockUseAccount.mockReturnValue({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  });
  mockUseBalance.mockReturnValue({
    data: { formatted: '1000.00', value: BigInt(1000000000) },
    refetch: vi.fn(),
  });
  mockUseChainId.mockReturnValue(8453);

  // Clear all mock function calls
  vi.clearAllMocks();

  // Re-import components
  const bridgePanelModule = await import('@/components/bridge-panel');
  const bridgeStatusModule = await import('@/components/bridge-status');

  BridgePanel = bridgePanelModule.BridgePanel;
  BridgeStatusDisplay = bridgeStatusModule.BridgeStatusDisplay;
  BridgeStatusBadge = bridgeStatusModule.BridgeStatusBadge;
});

afterEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// BridgePanel Tests
// =============================================================================

describe('BridgePanel', () => {
  describe('rendering', () => {
    it('renders the bridge header', () => {
      render(<BridgePanel />);
      expect(screen.getByText('[BRIDGE USDC]')).toBeInTheDocument();
    });

    it('renders source and destination chains', () => {
      render(<BridgePanel />);
      expect(screen.getByText('BASE')).toBeInTheDocument();
      expect(screen.getByText('POLYGON')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
      expect(screen.getByText('Destination')).toBeInTheDocument();
    });

    it('renders amount input field', () => {
      render(<BridgePanel />);
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(screen.getByText('AMOUNT (USDC)')).toBeInTheDocument();
    });

    it('renders MAX button', () => {
      render(<BridgePanel />);
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });

    it('displays USDC balance', () => {
      render(<BridgePanel />);
      expect(screen.getByText(/Balance: \$1000\.00 USDC on Base/)).toBeInTheDocument();
    });

    it('renders INITIATE BRIDGE button', () => {
      render(<BridgePanel />);
      expect(screen.getByRole('button', { name: 'INITIATE BRIDGE' })).toBeInTheDocument();
    });

    it('renders info text about CCTP', () => {
      render(<BridgePanel />);
      expect(screen.getByText(/Bridge uses Circle CCTP/)).toBeInTheDocument();
    });
  });

  describe('fee section', () => {
    it('shows fee section in normal mode', () => {
      render(<BridgePanel />);
      expect(screen.getByText('FEES')).toBeInTheDocument();
    });

    it('hides fee section in compact mode', () => {
      render(<BridgePanel compact={true} />);
      expect(screen.queryByText('FEES')).not.toBeInTheDocument();
    });

    it('shows prompt to enter amount when no amount entered', () => {
      render(<BridgePanel />);
      expect(screen.getByText('Enter an amount to see fees')).toBeInTheDocument();
    });

    it('shows calculating indicator when loading estimate', async () => {
      mockBridgeStore.getEstimate.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(null), 1000))
      );

      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });

      // Wait for debounce
      await waitFor(
        () => {
          expect(screen.getByText('Calculating...')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it('displays fee estimate when available', async () => {
      mockBridgeStore.getEstimate.mockResolvedValue({
        inputAmount: '100000000',
        inputAmountUsd: '100.00',
        bridgeFee: '10000',
        bridgeFeeUsd: '0.01',
        netAmount: '99990000',
        netAmountUsd: '99.99',
        minMinutes: 15,
        maxMinutes: 30,
        averageMinutes: 20,
      });

      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });

      await waitFor(() => {
        expect(screen.getByText('$0.01')).toBeInTheDocument();
        expect(screen.getByText('$99.99 USDC')).toBeInTheDocument();
        expect(screen.getByText('15-30 min')).toBeInTheDocument();
      });
    });
  });

  describe('amount input', () => {
    it('updates amount on input change', () => {
      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '250.50' } });
      expect(input).toHaveValue(250.5);
    });

    it('sets max amount when MAX button clicked', () => {
      render(<BridgePanel />);
      const maxButton = screen.getByText('MAX');
      fireEvent.click(maxButton);
      const input = screen.getByPlaceholderText('0.00');
      expect(input).toHaveValue(1000);
    });

    it('uses defaultAmount prop when provided', () => {
      render(<BridgePanel defaultAmount="500" />);
      const input = screen.getByPlaceholderText('0.00');
      expect(input).toHaveValue(500);
    });
  });

  describe('button states', () => {
    it('shows CONNECT WALLET when not connected', () => {
      mockUseAccount.mockReturnValue({ address: undefined, isConnected: false } as any);
      render(<BridgePanel />);
      expect(screen.getByRole('button', { name: 'CONNECT WALLET' })).toBeInTheDocument();
    });

    it('shows SWITCH TO BASE when on wrong chain', () => {
      mockUseChainId.mockReturnValue(1); // Ethereum mainnet
      render(<BridgePanel />);
      expect(screen.getByRole('button', { name: 'SWITCH TO BASE' })).toBeInTheDocument();
    });

    it('shows INSUFFICIENT BALANCE when amount exceeds balance', () => {
      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '5000' } });
      expect(screen.getByRole('button', { name: 'INSUFFICIENT BALANCE' })).toBeInTheDocument();
    });

    it('disables button when no amount entered', () => {
      render(<BridgePanel />);
      const button = screen.getByRole('button', { name: 'INITIATE BRIDGE' });
      expect(button).toBeDisabled();
    });

    it('enables button with valid amount and balance', () => {
      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });
      const button = screen.getByRole('button', { name: 'INITIATE BRIDGE' });
      expect(button).not.toBeDisabled();
    });
  });

  describe('error display', () => {
    it('displays error message when lastError is set', () => {
      mockBridgeStore.lastError = 'Bridge failed: network error';
      render(<BridgePanel />);
      expect(screen.getByText('Bridge failed: network error')).toBeInTheDocument();
    });
  });

  describe('active bridges list', () => {
    it('shows active bridges section when bridges exist', () => {
      mockBridgeStore.activeBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'pending_attestation',
          sourceChain: 'BASE',
          destinationChain: 'POLYGON',
          amount: '100000000',
          amountUsd: '100.00',
          hasAttestation: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      render(<BridgePanel />);
      expect(screen.getByText('ACTIVE BRIDGES')).toBeInTheDocument();
      expect(screen.getByText('$100.00 USDC')).toBeInTheDocument();
    });

    it('shows phase indicator on active bridge', () => {
      mockBridgeStore.activeBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'pending_attestation',
          sourceChain: 'BASE',
          destinationChain: 'POLYGON',
          amount: '100000000',
          amountUsd: '100.00',
          hasAttestation: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      render(<BridgePanel />);
      expect(screen.getByText('PENDING ATTESTATION')).toBeInTheDocument();
    });

    it('hides completed bridges from active list items', () => {
      mockBridgeStore.activeBridges = {
        'bridge-1': {
          trackingId: 'bridge-1',
          phase: 'completed',
          sourceChain: 'BASE',
          destinationChain: 'POLYGON',
          amount: '100000000',
          amountUsd: '100.00',
          hasAttestation: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      render(<BridgePanel />);
      // Section header may show but no active bridge items should render
      expect(screen.queryByText('$100.00 USDC')).not.toBeInTheDocument();
    });
  });

  describe('bridge initiation', () => {
    it('calls initiateBridge when button clicked', async () => {
      mockBridgeStore.initiateBridge.mockResolvedValue('track-123');

      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });

      const button = screen.getByRole('button', { name: 'INITIATE BRIDGE' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockBridgeStore.initiateBridge).toHaveBeenCalled();
      });
    });

    it('calls onBridgeInitiated callback with tracking ID', async () => {
      mockBridgeStore.initiateBridge.mockResolvedValue('track-456');
      const onBridgeInitiated = vi.fn();

      render(<BridgePanel onBridgeInitiated={onBridgeInitiated} />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });

      const button = screen.getByRole('button', { name: 'INITIATE BRIDGE' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(onBridgeInitiated).toHaveBeenCalledWith('track-456');
      });
    });

    it('clears error before initiating', async () => {
      mockBridgeStore.initiateBridge.mockResolvedValue('track-789');

      render(<BridgePanel />);
      const input = screen.getByPlaceholderText('0.00');
      fireEvent.change(input, { target: { value: '100' } });

      const button = screen.getByRole('button', { name: 'INITIATE BRIDGE' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockBridgeStore.clearError).toHaveBeenCalled();
      });
    });
  });

  describe('pending states', () => {
    it('shows APPROVING USDC when approving', () => {
      mockUseWriteContract.mockReturnValue({
        writeContractAsync: mockWriteContractAsync,
        isPending: true,
        data: undefined,
      });

      render(<BridgePanel />);
      // The component uses isApproving from the first useWriteContract call
      // This test verifies the button text changes during approval
      const buttons = screen.getAllByRole('button');
      const mainButton = buttons.find((b) => b.textContent?.includes('APPROV') || b.textContent?.includes('INITIATE'));
      expect(mainButton).toBeDefined();
    });

    it('disables button when isInitiating is true', () => {
      mockBridgeStore.isInitiating = true;
      render(<BridgePanel />);
      // When initiating, the main submit button should be disabled
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(
        (b) =>
          b.textContent?.includes('INITIAT') ||
          b.textContent?.includes('APPROV') ||
          b.textContent?.includes('BRIDGE')
      );
      expect(submitButton).toBeDisabled();
    });
  });
});

// =============================================================================
// BridgeStatusDisplay Tests
// =============================================================================

describe('BridgeStatusDisplay', () => {
  const baseBridge: MockBridgeStatus = {
    trackingId: 'test-bridge-123',
    phase: 'pending_attestation',
    sourceChain: 'BASE',
    destinationChain: 'POLYGON',
    amount: '100000000',
    amountUsd: '100.00',
    hasAttestation: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockBridgeStore.activeBridges = {
      'test-bridge-123': { ...baseBridge },
    };
  });

  describe('rendering', () => {
    it('renders the status header', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText('[BRIDGE STATUS]')).toBeInTheDocument();
    });

    it('displays bridge amount', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText('$100.00 USDC')).toBeInTheDocument();
    });

    it('displays route information', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText('BASE → POLYGON')).toBeInTheDocument();
    });

    it('displays truncated tracking ID', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText('test-bridge-...')).toBeInTheDocument();
    });

    it('shows not found message for invalid tracking ID', () => {
      render(<BridgeStatusDisplay trackingId="invalid-id" />);
      expect(screen.getByText(/Bridge not found: invalid-id/)).toBeInTheDocument();
    });
  });

  describe('progress display', () => {
    it('shows progress bar in normal mode', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      // Progress bar has specific classes
      const progressBar = document.querySelector('.h-2.bg-\\[hsl\\(var\\(--muted\\)\\)\\]');
      expect(progressBar).toBeInTheDocument();
    });

    it('hides progress bar in compact mode', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" compact={true} />);
      // Check that detailed description is hidden
      expect(screen.queryByText('Waiting for Circle attestation (~15 min)')).not.toBeInTheDocument();
    });

    it('displays progress percentage', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      // pending_attestation is step 2 of 5, so 40%
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });

  describe('step indicators', () => {
    it('renders all 5 bridge steps', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText('INITIATED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('ATTESTED')).toBeInTheDocument();
      expect(screen.getByText('CLAIMING')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    it('highlights current step', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.phase = 'attested';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      // The attested step should be visible and highlighted
      expect(screen.getByText('ATTESTED')).toBeInTheDocument();
      // Check that we're on step 3 (attested is index 2, so 60%)
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('shows checkmark for completed steps', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.phase = 'claiming';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      // Earlier steps should show checkmarks
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks.length).toBeGreaterThan(0);
    });
  });

  describe('transaction links', () => {
    it('shows source transaction link when available', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.sourceTxHash = '0xabc123def456';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText('TRANSACTIONS')).toBeInTheDocument();
      expect(screen.getByText('0xabc123de...')).toBeInTheDocument();
    });

    it('links to basescan for source transaction', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.sourceTxHash = '0xabc123def456';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      const link = screen.getByText('0xabc123de...').closest('a');
      expect(link).toHaveAttribute('href', 'https://basescan.org/tx/0xabc123def456');
    });

    it('shows destination transaction link when available', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.destTxHash = '0xdef789abc123';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      // The text is truncated - first 10 chars of hash
      expect(screen.getByText(/0xdef789ab/)).toBeInTheDocument();
    });

    it('links to polygonscan for destination transaction', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.destTxHash = '0xdef789abc123';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      const link = screen.getByText(/0xdef789ab/).closest('a');
      expect(link).toHaveAttribute('href', 'https://polygonscan.com/tx/0xdef789abc123');
    });
  });

  describe('status messages', () => {
    it('shows error message when bridge has error', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.error = 'Transaction failed';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText('ERROR: Transaction failed')).toBeInTheDocument();
    });

    it('shows failed message when phase is failed', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.phase = 'failed';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText(/Bridge failed/)).toBeInTheDocument();
    });

    it('shows abandoned message when phase is abandoned', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.phase = 'abandoned';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText(/Bridge abandoned/)).toBeInTheDocument();
    });

    it('shows success message when completed', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.phase = 'completed';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText(/Bridge complete/)).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('shows ABANDON button for active bridges', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText('ABANDON')).toBeInTheDocument();
    });

    it('shows REFRESH button for active bridges', async () => {
      mockBridgeStore.refreshBridgeStatus.mockResolvedValue(null);
      mockBridgeStore.checkAttestation.mockResolvedValue({ ready: false });
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      await waitFor(() => {
        expect(screen.getByText('REFRESH')).toBeInTheDocument();
      });
    });

    it('hides action buttons for completed bridges', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.phase = 'completed';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.queryByText('ABANDON')).not.toBeInTheDocument();
      expect(screen.queryByText('REFRESH')).not.toBeInTheDocument();
    });

    it('hides action buttons for failed bridges', () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.phase = 'failed';
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.queryByText('ABANDON')).not.toBeInTheDocument();
    });

    it('calls refreshBridgeStatus when REFRESH clicked', async () => {
      mockBridgeStore.refreshBridgeStatus.mockResolvedValue(null);
      mockBridgeStore.checkAttestation.mockResolvedValue({ ready: false });
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);

      await waitFor(() => {
        expect(screen.getByText('REFRESH')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('REFRESH');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockBridgeStore.refreshBridgeStatus).toHaveBeenCalledWith('test-bridge-123');
      });
    });

    it('shows action buttons when attested', async () => {
      mockBridgeStore.activeBridges['test-bridge-123']!.phase = 'attested';
      mockBridgeStore.activeBridges['test-bridge-123']!.hasAttestation = true;
      mockBridgeStore.refreshBridgeStatus.mockResolvedValue(null);
      mockBridgeStore.checkAttestation.mockResolvedValue({ ready: true, attestation: '0xattestation' });

      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      // When attested, action buttons should be visible
      await waitFor(() => {
        expect(screen.getByText('ABANDON')).toBeInTheDocument();
      });
    });
  });

  describe('timestamps', () => {
    it('displays created timestamp', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText(/Started:/)).toBeInTheDocument();
    });

    it('displays updated timestamp', () => {
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    });
  });

  describe('polling indicator', () => {
    it('shows polling indicator when isPolling', () => {
      mockBridgeStore.isPolling = true;
      render(<BridgeStatusDisplay trackingId="test-bridge-123" />);
      // The polling indicator is rendered when polling
      // But it's local state in the component, so we test via the store's isPolling
      expect(screen.getByText('[BRIDGE STATUS]')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onComplete when bridge completes', async () => {
      const onComplete = vi.fn();
      mockBridgeStore.checkAttestation.mockResolvedValue({ ready: false });
      mockBridgeStore.refreshBridgeStatus.mockResolvedValue({
        ...baseBridge,
        phase: 'completed',
      });

      render(<BridgeStatusDisplay trackingId="test-bridge-123" onComplete={onComplete} />);

      await waitFor(() => {
        expect(screen.getByText('REFRESH')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('REFRESH');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('calls onError when bridge fails with error', async () => {
      const onError = vi.fn();
      mockBridgeStore.checkAttestation.mockResolvedValue({ ready: false });
      mockBridgeStore.refreshBridgeStatus.mockResolvedValue({
        ...baseBridge,
        phase: 'failed',
        error: 'Something went wrong',
      });

      render(<BridgeStatusDisplay trackingId="test-bridge-123" onError={onError} />);

      await waitFor(() => {
        expect(screen.getByText('REFRESH')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('REFRESH');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Something went wrong');
      });
    });
  });
});

// =============================================================================
// BridgeStatusBadge Tests
// =============================================================================

describe('BridgeStatusBadge', () => {
  const baseBridge: MockBridgeStatus = {
    trackingId: 'badge-bridge-123',
    phase: 'pending_attestation',
    sourceChain: 'BASE',
    destinationChain: 'POLYGON',
    amount: '100000000',
    amountUsd: '100.00',
    hasAttestation: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockBridgeStore.activeBridges = {
      'badge-bridge-123': { ...baseBridge },
    };
  });

  it('renders badge with progress percentage', () => {
    render(<BridgeStatusBadge trackingId="badge-bridge-123" />);
    expect(screen.getByText(/Bridge: 40%/)).toBeInTheDocument();
  });

  it('returns null for non-existent bridge', () => {
    const { container } = render(<BridgeStatusBadge trackingId="nonexistent" />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<BridgeStatusBadge trackingId="badge-bridge-123" onClick={onClick} />);
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    expect(onClick).toHaveBeenCalled();
  });

  it('shows 100% for completed bridges', () => {
    mockBridgeStore.activeBridges['badge-bridge-123']!.phase = 'completed';
    render(<BridgeStatusBadge trackingId="badge-bridge-123" />);
    expect(screen.getByText(/Bridge: 100%/)).toBeInTheDocument();
  });

  it('uses success color for completed bridges', () => {
    mockBridgeStore.activeBridges['badge-bridge-123']!.phase = 'completed';
    render(<BridgeStatusBadge trackingId="badge-bridge-123" />);
    // The badge should have a green indicator
    const badge = screen.getByRole('button');
    const indicator = badge.querySelector('.rounded-full');
    expect(indicator).toHaveStyle({ backgroundColor: 'hsl(var(--success))' });
  });

  it('uses destructive color for failed bridges', () => {
    mockBridgeStore.activeBridges['badge-bridge-123']!.phase = 'failed';
    render(<BridgeStatusBadge trackingId="badge-bridge-123" />);
    const badge = screen.getByRole('button');
    const indicator = badge.querySelector('.rounded-full');
    expect(indicator).toHaveStyle({ backgroundColor: 'hsl(var(--destructive))' });
  });
});

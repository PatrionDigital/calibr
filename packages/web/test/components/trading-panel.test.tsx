/**
 * TradingPanel Component Tests
 *
 * Tests for the trading panel component that handles:
 * - Limitless AMM trading on Base
 * - Polymarket trading via CCTP bridge
 * - Multi-outcome market support
 * - Order calculations and submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TradingPanel } from '@/components/trading-panel';

// =============================================================================
// Mocks
// =============================================================================

// Store mock return values
let mockAccountReturn = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
};
let mockWalletClientReturn = { data: { signTypedData: vi.fn() } };
let mockChainIdReturn = 8453; // Base
let mockSwitchChainReturn = { switchChain: vi.fn() };
let mockWriteContractReturn = {
  writeContractAsync: vi.fn(),
  isPending: false,
  data: undefined,
};
let mockWaitForReceiptReturn = { isLoading: false, isSuccess: false };
let mockReadContractReturn = { data: BigInt(0), refetch: vi.fn() };
let mockBalanceReturn = { data: { formatted: '100.00', value: BigInt(100000000) } };

// Mock wagmi with functions that return the stored values
vi.mock('wagmi', () => ({
  useAccount: () => mockAccountReturn,
  useWalletClient: () => mockWalletClientReturn,
  useChainId: () => mockChainIdReturn,
  useSwitchChain: () => mockSwitchChainReturn,
  useWriteContract: () => mockWriteContractReturn,
  useWaitForTransactionReceipt: () => mockWaitForReceiptReturn,
  useReadContract: () => mockReadContractReturn,
  useBalance: () => mockBalanceReturn,
}));

vi.mock('wagmi/chains', () => ({
  base: { id: 8453 },
  polygon: { id: 137 },
}));

// Mock bridge store
let mockBridgeStoreReturn = {
  hasPendingBridges: () => false,
  selectedBridgeId: null as string | null,
  activeBridges: {} as Record<string, { phase: string; amountUsd: string }>,
  refreshAllBridges: vi.fn(),
};

vi.mock('@/lib/stores/bridge-store', () => ({
  useBridgeStore: () => mockBridgeStoreReturn,
}));

// Mock BridgePanel and BridgeStatusBadge
vi.mock('@/components/bridge-panel', () => ({
  BridgePanel: ({ walletAddress, defaultAmount }: { walletAddress?: string; defaultAmount?: string }) => (
    <div data-testid="bridge-panel" data-wallet={walletAddress} data-amount={defaultAmount}>
      Bridge Panel Mock
    </div>
  ),
}));

vi.mock('@/components/bridge-status', () => ({
  BridgeStatusBadge: ({ trackingId, onClick }: { trackingId: string; onClick: () => void }) => (
    <button data-testid="bridge-status-badge" onClick={onClick}>
      Bridge: {trackingId}
    </button>
  ),
}));

// =============================================================================
// Test Setup
// =============================================================================

const defaultProps = {
  marketId: 'test-market-123',
  marketSlug: 'test-market-slug',
  marketQuestion: 'Will this test pass?',
  platform: 'LIMITLESS',
  yesPrice: 0.65,
  noPrice: 0.35,
};

const multiOutcomeProps = {
  ...defaultProps,
  outcomes: [
    { index: 0, label: 'Option A', price: 0.4 },
    { index: 1, label: 'Option B', price: 0.35 },
    { index: 2, label: 'Option C', price: 0.25 },
  ],
};

const polymarketProps = {
  ...defaultProps,
  platform: 'POLYMARKET',
};

function resetMocks() {
  mockAccountReturn = {
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  };
  mockWalletClientReturn = { data: { signTypedData: vi.fn() } };
  mockChainIdReturn = 8453;
  mockSwitchChainReturn = { switchChain: vi.fn() };
  mockWriteContractReturn = {
    writeContractAsync: vi.fn(),
    isPending: false,
    data: undefined,
  };
  mockWaitForReceiptReturn = { isLoading: false, isSuccess: false };
  mockReadContractReturn = { data: BigInt(0), refetch: vi.fn() };
  mockBalanceReturn = { data: { formatted: '100.00', value: BigInt(100000000) } };
  mockBridgeStoreReturn = {
    hasPendingBridges: () => false,
    selectedBridgeId: null,
    activeBridges: {},
    refreshAllBridges: vi.fn(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('TradingPanel', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('rendering', () => {
    it('renders the trading panel header', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText('[TRADE ON LIMITLESS]')).toBeInTheDocument();
    });

    it('renders Polymarket header for Polymarket markets', () => {
      render(<TradingPanel {...polymarketProps} />);
      expect(screen.getByText('[TRADE ON POLYMARKET]')).toBeInTheDocument();
    });

    it('shows unsupported message for unknown platforms', () => {
      render(<TradingPanel {...defaultProps} platform="UNKNOWN" />);
      expect(screen.getByText(/Trading not yet available/)).toBeInTheDocument();
    });

    it('renders outcome selection for binary markets', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText(/YES @ 65\.0%/)).toBeInTheDocument();
      expect(screen.getByText(/NO @ 35\.0%/)).toBeInTheDocument();
    });

    it('renders all outcomes for multi-outcome markets', () => {
      render(<TradingPanel {...multiOutcomeProps} />);
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
      expect(screen.getByText('Option C')).toBeInTheDocument();
    });

    it('renders BUY and SELL buttons', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'BUY' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SELL' })).toBeInTheDocument();
    });

    it('renders size input', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText('SIZE (SHARES)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('10')).toBeInTheDocument();
    });

    it('renders price input', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText(/LIMIT PRICE/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('50.0')).toBeInTheDocument();
    });

    it('renders order summary section', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText(/Order:/)).toBeInTheDocument();
      expect(screen.getByText(/Est\. Cost:/)).toBeInTheDocument();
    });

    it('shows connected wallet address', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText(/Connected: 0x1234\.\.\.7890/)).toBeInTheDocument();
    });
  });

  describe('outcome selection', () => {
    it('selects YES outcome by default for binary markets', () => {
      render(<TradingPanel {...defaultProps} />);
      const yesButton = screen.getByText(/YES @ 65\.0%/);
      expect(yesButton.closest('button')).toHaveClass('bg-[hsl(var(--bullish))]');
    });

    it('allows selecting NO outcome', () => {
      render(<TradingPanel {...defaultProps} />);
      const noButton = screen.getByText(/NO @ 35\.0%/);
      fireEvent.click(noButton);
      expect(noButton.closest('button')).toHaveClass('bg-[hsl(var(--bearish))]');
    });

    it('selects highest-priced outcome by default for multi-outcome', () => {
      render(<TradingPanel {...multiOutcomeProps} />);
      // Option A has highest price (0.4), should be selected
      const optionA = screen.getByText('Option A').closest('button');
      expect(optionA).toHaveClass('bg-[hsl(var(--primary))]');
    });

    it('allows selecting different outcomes in multi-outcome markets', () => {
      render(<TradingPanel {...multiOutcomeProps} />);
      const optionB = screen.getByText('Option B').closest('button');
      fireEvent.click(optionB!);
      expect(optionB).toHaveClass('bg-[hsl(var(--primary))]');
    });

    it('updates price input when outcome changes', () => {
      render(<TradingPanel {...defaultProps} />);
      const priceInput = screen.getByPlaceholderText('50.0') as HTMLInputElement;
      expect(priceInput.value).toBe('65.0');

      const noButton = screen.getByText(/NO @ 35\.0%/);
      fireEvent.click(noButton);
      expect(priceInput.value).toBe('35.0');
    });
  });

  describe('side selection', () => {
    it('selects BUY by default', () => {
      render(<TradingPanel {...defaultProps} />);
      const buyButton = screen.getByRole('button', { name: 'BUY' });
      expect(buyButton).toHaveClass('bg-[hsl(var(--primary))]');
    });

    it('allows selecting SELL', () => {
      render(<TradingPanel {...defaultProps} />);
      const sellButton = screen.getByRole('button', { name: 'SELL' });
      fireEvent.click(sellButton);
      expect(sellButton).toHaveClass('bg-[hsl(var(--warning))]');
    });

    it('updates order summary label when side changes', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText(/Est\. Cost:/)).toBeInTheDocument();

      const sellButton = screen.getByRole('button', { name: 'SELL' });
      fireEvent.click(sellButton);
      expect(screen.getByText(/Est\. Receive:/)).toBeInTheDocument();
    });
  });

  describe('size and price inputs', () => {
    it('has default size of 10', () => {
      render(<TradingPanel {...defaultProps} />);
      const sizeInput = screen.getByPlaceholderText('10') as HTMLInputElement;
      expect(sizeInput.value).toBe('10');
    });

    it('allows changing size', () => {
      render(<TradingPanel {...defaultProps} />);
      const sizeInput = screen.getByPlaceholderText('10');
      fireEvent.change(sizeInput, { target: { value: '25' } });
      expect(sizeInput).toHaveValue(25);
    });

    it('allows changing price', () => {
      render(<TradingPanel {...defaultProps} />);
      const priceInput = screen.getByPlaceholderText('50.0');
      fireEvent.change(priceInput, { target: { value: '75.5' } });
      expect(priceInput).toHaveValue(75.5);
    });
  });

  describe('order calculations', () => {
    it('calculates estimated cost for BUY orders', () => {
      render(<TradingPanel {...defaultProps} />);
      // Default: 10 shares @ 65% = $6.50
      expect(screen.getByText('$6.50 USDC')).toBeInTheDocument();
    });

    it('updates cost when size changes', () => {
      render(<TradingPanel {...defaultProps} />);
      const sizeInput = screen.getByPlaceholderText('10');
      fireEvent.change(sizeInput, { target: { value: '20' } });
      // 20 shares @ 65% = $13.00
      expect(screen.getByText('$13.00 USDC')).toBeInTheDocument();
    });

    it('updates cost when price changes', () => {
      render(<TradingPanel {...defaultProps} />);
      const priceInput = screen.getByPlaceholderText('50.0');
      fireEvent.change(priceInput, { target: { value: '50' } });
      // 10 shares @ 50% = $5.00
      expect(screen.getByText('$5.00 USDC')).toBeInTheDocument();
    });

    it('shows max payout for BUY orders', () => {
      render(<TradingPanel {...defaultProps} />);
      // Max payout = size = $10.00
      expect(screen.getByText('$10.00')).toBeInTheDocument();
    });

    it('shows shares sold for SELL orders', () => {
      render(<TradingPanel {...defaultProps} />);
      const sellButton = screen.getByRole('button', { name: 'SELL' });
      fireEvent.click(sellButton);
      expect(screen.getByText('10 shares')).toBeInTheDocument();
    });
  });

  describe('button states', () => {
    it('shows CONNECT WALLET when not connected', () => {
      mockAccountReturn = { address: undefined as unknown as string, isConnected: false };
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'CONNECT WALLET TO TRADE' })).toBeInTheDocument();
    });

    it('shows SWITCH TO BASE when on wrong chain', () => {
      mockChainIdReturn = 1; // Ethereum mainnet
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'SWITCH TO BASE' })).toBeInTheDocument();
    });

    it('shows BUY outcome label when ready to trade', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'BUY "Yes"' })).toBeInTheDocument();
    });

    it('shows SELL outcome label for sell orders', () => {
      render(<TradingPanel {...defaultProps} />);
      const sellButton = screen.getByRole('button', { name: 'SELL' });
      fireEvent.click(sellButton);
      expect(screen.getByRole('button', { name: 'SELL "Yes"' })).toBeInTheDocument();
    });

    it('disables button when size is 0', () => {
      render(<TradingPanel {...defaultProps} />);
      const sizeInput = screen.getByPlaceholderText('10');
      fireEvent.change(sizeInput, { target: { value: '0' } });
      const submitButton = screen.getByRole('button', { name: 'BUY "Yes"' });
      expect(submitButton).toBeDisabled();
    });

    it('shows CONFIRMING TX when waiting for receipt', () => {
      mockWaitForReceiptReturn = { isLoading: true, isSuccess: false };
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'CONFIRMING TX...' })).toBeInTheDocument();
    });
  });

  describe('market type display', () => {
    it('shows AMM market type for AMM markets', () => {
      render(
        <TradingPanel
          {...defaultProps}
          platformData={{ tradeType: 'amm', address: '0xabc' }}
        />
      );
      expect(screen.getByText('AMM (Instant Fill)')).toBeInTheDocument();
    });

    it('shows CLOB market type for CLOB markets', () => {
      render(
        <TradingPanel
          {...defaultProps}
          platformData={{ exchangeAddress: '0xdef' }}
        />
      );
      expect(screen.getByText('CLOB (Opens Limitless)')).toBeInTheDocument();
    });

    it('shows Unknown for unknown market types', () => {
      render(<TradingPanel {...defaultProps} platformData={{}} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('error and success messages', () => {
    it('shows error message when wallet not connected', async () => {
      mockAccountReturn = { address: undefined as unknown as string, isConnected: false };
      render(<TradingPanel {...defaultProps} />);

      const form = screen.getByRole('button', { name: 'CONNECT WALLET TO TRADE' }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Please connect your wallet to trade.')).toBeInTheDocument();
      });
    });

    it('shows switching network message when on wrong chain', async () => {
      mockChainIdReturn = 1;
      render(<TradingPanel {...defaultProps} />);

      const form = screen.getByRole('button', { name: 'SWITCH TO BASE' }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Switching to Base network...')).toBeInTheDocument();
      });
    });
  });

  describe('Polymarket integration', () => {
    it('shows trade calculator for Polymarket', () => {
      render(<TradingPanel {...polymarketProps} />);
      expect(screen.getByText('TRADE CALCULATOR')).toBeInTheDocument();
    });

    it('shows USDC balances section', () => {
      render(<TradingPanel {...polymarketProps} />);
      expect(screen.getByText('USDC BALANCES')).toBeInTheDocument();
      expect(screen.getByText('Base:')).toBeInTheDocument();
      expect(screen.getByText('Polygon:')).toBeInTheDocument();
    });

    it('shows bridge button', () => {
      render(<TradingPanel {...polymarketProps} />);
      expect(screen.getByText('BRIDGE USDC (BASE → POLYGON)')).toBeInTheDocument();
    });

    it('shows sufficient balance message when Polygon has enough', () => {
      render(<TradingPanel {...polymarketProps} />);
      expect(screen.getByText('✓ Sufficient balance on Polygon for this trade')).toBeInTheDocument();
    });

    it('shows TRADE ON POLYMARKET link when sufficient balance', () => {
      render(<TradingPanel {...polymarketProps} />);
      const link = screen.getByRole('link', { name: 'TRADE ON POLYMARKET' });
      expect(link).toHaveAttribute('href', 'https://polymarket.com/event/test-market-123');
    });

    it('opens bridge panel when clicking bridge button', () => {
      render(<TradingPanel {...polymarketProps} />);
      const bridgeButton = screen.getByText('BRIDGE USDC (BASE → POLYGON)');
      fireEvent.click(bridgeButton);

      expect(screen.getByTestId('bridge-panel')).toBeInTheDocument();
    });
  });

  describe('bridge status integration', () => {
    it('shows bridge status badge when bridge is pending', () => {
      mockBridgeStoreReturn = {
        hasPendingBridges: () => true,
        selectedBridgeId: 'test-bridge-123',
        activeBridges: {},
        refreshAllBridges: vi.fn(),
      };

      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByTestId('bridge-status-badge')).toBeInTheDocument();
    });

    it('opens bridge panel when clicking status badge', () => {
      mockBridgeStoreReturn = {
        hasPendingBridges: () => true,
        selectedBridgeId: 'test-bridge-123',
        activeBridges: {},
        refreshAllBridges: vi.fn(),
      };

      render(<TradingPanel {...defaultProps} />);
      const badge = screen.getByTestId('bridge-status-badge');
      fireEvent.click(badge);

      expect(screen.getByTestId('bridge-panel')).toBeInTheDocument();
    });

    it('shows BRIDGE IN PROGRESS indicator for Polymarket', () => {
      mockBridgeStoreReturn = {
        hasPendingBridges: () => true,
        selectedBridgeId: 'test-bridge-123',
        activeBridges: {},
        refreshAllBridges: vi.fn(),
      };

      render(<TradingPanel {...polymarketProps} />);
      expect(screen.getByText('BRIDGE IN PROGRESS')).toBeInTheDocument();
    });

    it('shows VIEW button in bridge progress indicator', () => {
      mockBridgeStoreReturn = {
        hasPendingBridges: () => true,
        selectedBridgeId: 'test-bridge-123',
        activeBridges: {},
        refreshAllBridges: vi.fn(),
      };

      render(<TradingPanel {...polymarketProps} />);
      expect(screen.getByRole('button', { name: 'VIEW' })).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls onTradeSuccess callback after successful trade', async () => {
      const onTradeSuccess = vi.fn();
      mockWaitForReceiptReturn = { isLoading: false, isSuccess: true };

      render(<TradingPanel {...defaultProps} onTradeSuccess={onTradeSuccess} />);

      await waitFor(() => {
        expect(onTradeSuccess).toHaveBeenCalled();
      });
    });

    it('shows success message after trade confirmation', async () => {
      mockWaitForReceiptReturn = { isLoading: false, isSuccess: true };

      render(<TradingPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Transaction confirmed!/)).toBeInTheDocument();
      });
    });
  });

  describe('price normalization', () => {
    it('handles prices in 0-1 range (probability)', () => {
      render(<TradingPanel {...defaultProps} yesPrice={0.75} noPrice={0.25} />);
      expect(screen.getByText(/YES @ 75\.0%/)).toBeInTheDocument();
    });

    it('handles prices in 0-100 range (percentage)', () => {
      render(<TradingPanel {...defaultProps} yesPrice={75} noPrice={25} />);
      expect(screen.getByText(/YES @ 75\.0%/)).toBeInTheDocument();
    });

    it('handles null prices with default', () => {
      render(<TradingPanel {...defaultProps} yesPrice={null} noPrice={null} />);
      expect(screen.getByText(/YES @ 50\.0%/)).toBeInTheDocument();
    });
  });

  describe('wallet display', () => {
    it('shows connect message when disconnected', () => {
      mockAccountReturn = { address: undefined as unknown as string, isConnected: false };
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText('Connect wallet above to trade')).toBeInTheDocument();
    });

    it('shows truncated address when connected', () => {
      render(<TradingPanel {...defaultProps} />);
      expect(screen.getByText(/Connected: 0x1234\.\.\.7890/)).toBeInTheDocument();
    });
  });

  describe('close bridge panel', () => {
    it('closes bridge panel when clicking close button', () => {
      render(<TradingPanel {...polymarketProps} />);

      // Open bridge panel
      const bridgeButton = screen.getByText('BRIDGE USDC (BASE → POLYGON)');
      fireEvent.click(bridgeButton);
      expect(screen.getByTestId('bridge-panel')).toBeInTheDocument();

      // Close it
      const closeButton = screen.getByText('[CLOSE]');
      fireEvent.click(closeButton);
      expect(screen.queryByTestId('bridge-panel')).not.toBeInTheDocument();
    });
  });

  describe('multi-outcome ordering', () => {
    it('sorts outcomes by price descending', () => {
      render(<TradingPanel {...multiOutcomeProps} />);

      // Get all outcome buttons - filter by those that have outcome text
      const buttons = screen.getAllByRole('button').filter(
        btn => btn.textContent?.includes('Option')
      );

      // First should be Option A (highest price 0.4)
      expect(buttons[0]).toHaveTextContent('Option A');
      expect(buttons[0]).toHaveTextContent('40.0%');
    });

    it('shows outcome count indicator for multi-outcome', () => {
      render(<TradingPanel {...multiOutcomeProps} />);
      expect(screen.getByText(/OUTCOME \(3 choices\)/)).toBeInTheDocument();
    });
  });
});

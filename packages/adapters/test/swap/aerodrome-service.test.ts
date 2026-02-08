/**
 * AerodromeSwapService Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AerodromeSwapService, createSwapService } from '../../src/swap/aerodrome-service';
import type {
  SwapConfig,
  SwapQuoteRequest,
  SwapQuote,
  AerodromeRoute,
} from '../../src/swap/types';
import { DEFAULT_SWAP_CONFIG, BASE_TOKENS, AERODROME_ADDRESSES } from '../../src/swap/types';

// =============================================================================
// Mocks
// =============================================================================

const mockReadContract = vi.fn();
const mockSimulateContract = vi.fn();
const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: mockReadContract,
      simulateContract: mockSimulateContract,
      waitForTransactionReceipt: mockWaitForTransactionReceipt,
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: mockWriteContract,
    })),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn((key: string) => ({
    address: '0x1234567890123456789012345678901234567890' as const,
    privateKey: key,
  })),
}));

// =============================================================================
// Test Data
// =============================================================================

const TEST_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const;
const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const TEST_TOKEN_IN = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const TEST_TOKEN_OUT = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const TEST_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab' as const;
const TEST_POOL_ADDRESS = '0xcccccccccccccccccccccccccccccccccccccccc' as const;

function createValidQuoteRequest(overrides: Partial<SwapQuoteRequest> = {}): SwapQuoteRequest {
  return {
    tokenIn: TEST_TOKEN_IN,
    tokenOut: TEST_TOKEN_OUT,
    amountIn: 1000000000000000000n, // 1 token
    ...overrides,
  };
}

function createValidQuote(overrides: Partial<SwapQuote> = {}): SwapQuote {
  const now = new Date();
  return {
    tokenIn: TEST_TOKEN_IN,
    tokenOut: TEST_TOKEN_OUT,
    amountIn: 1000000000000000000n,
    amountOut: 950000000000000000n,
    amountOutMin: 940000000000000000n,
    slippage: 0.005,
    routes: [
      {
        from: TEST_TOKEN_IN,
        to: TEST_TOKEN_OUT,
        stable: false,
        factory: AERODROME_ADDRESSES.FACTORY,
      },
    ],
    priceImpact: 0.001,
    timestamp: now,
    validUntil: new Date(now.getTime() + 60000),
    ...overrides,
  };
}

function createMockTransactionReceipt() {
  return {
    status: 'success',
    gasUsed: 100000n,
    blockNumber: 12345n,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('AerodromeSwapService', () => {
  let service: AerodromeSwapService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AerodromeSwapService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Configuration & Factory
  // ---------------------------------------------------------------------------

  describe('Configuration', () => {
    it('should create instance with default config', () => {
      const svc = new AerodromeSwapService();
      expect(svc).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig: Partial<SwapConfig> = {
        rpcUrl: 'https://custom-base.example.com',
        defaultSlippage: 0.01,
        defaultDeadlineOffset: 600,
      };

      const svc = new AerodromeSwapService(customConfig);
      expect(svc).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const customConfig = {
        defaultSlippage: 0.01,
      };

      const svc = new AerodromeSwapService(customConfig);
      expect(svc).toBeDefined();
    });
  });

  describe('Factory Function', () => {
    it('should create service via factory function', () => {
      const svc = createSwapService();
      expect(svc).toBeInstanceOf(AerodromeSwapService);
    });

    it('should accept config in factory function', () => {
      const svc = createSwapService({
        defaultSlippage: 0.02,
      });

      expect(svc).toBeInstanceOf(AerodromeSwapService);
    });
  });

  // ---------------------------------------------------------------------------
  // Wallet Management
  // ---------------------------------------------------------------------------

  describe('Wallet Management', () => {
    it('should return null address when not initialized', () => {
      expect(service.getWalletAddress()).toBeNull();
    });

    it('should initialize wallet with private key', async () => {
      await service.initializeWallet(TEST_PRIVATE_KEY);
      expect(service.getWalletAddress()).toBe(TEST_WALLET_ADDRESS);
    });

    it('should return wallet address after initialization', async () => {
      expect(service.getWalletAddress()).toBeNull();
      await service.initializeWallet(TEST_PRIVATE_KEY);
      expect(service.getWalletAddress()).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Quote Methods
  // ---------------------------------------------------------------------------

  describe('Quote Methods', () => {
    describe('getQuote', () => {
      it('should reject zero amount', async () => {
        await expect(
          service.getQuote(createValidQuoteRequest({ amountIn: 0n }))
        ).rejects.toThrow('Amount must be greater than 0');
      });

      it('should reject negative amount', async () => {
        await expect(
          service.getQuote(createValidQuoteRequest({ amountIn: -1n }))
        ).rejects.toThrow('Amount must be greater than 0');
      });

      it('should reject same input and output token', async () => {
        await expect(
          service.getQuote(
            createValidQuoteRequest({
              tokenIn: TEST_TOKEN_IN,
              tokenOut: TEST_TOKEN_IN,
            })
          )
        ).rejects.toThrow('Input and output tokens must be different');
      });

      it('should reject invalid tokenIn address', async () => {
        await expect(
          service.getQuote(
            createValidQuoteRequest({
              tokenIn: '0xinvalid' as `0x${string}`,
            })
          )
        ).rejects.toThrow('Invalid tokenIn address');
      });

      it('should reject invalid tokenOut address', async () => {
        await expect(
          service.getQuote(
            createValidQuoteRequest({
              tokenOut: '0xinvalid' as `0x${string}`,
            })
          )
        ).rejects.toThrow('Invalid tokenOut address');
      });

      it('should throw when no route found', async () => {
        // Return zero address for all pool queries (no pool exists)
        mockReadContract.mockResolvedValue('0x0000000000000000000000000000000000000000');

        await expect(service.getQuote(createValidQuoteRequest())).rejects.toThrow(
          'No valid route found'
        );
      });

      it('should return quote with direct route', async () => {
        // Direct pool exists
        mockReadContract
          .mockResolvedValueOnce(TEST_POOL_ADDRESS) // poolFor
          .mockResolvedValueOnce([1000000000000000000n, 950000000000000000n]) // getAmountsOut
          .mockResolvedValueOnce([1000000000000000n, 950000000000000n]); // getAmountsOut for price impact

        const quote = await service.getQuote(createValidQuoteRequest());

        expect(quote.tokenIn).toBe(TEST_TOKEN_IN);
        expect(quote.tokenOut).toBe(TEST_TOKEN_OUT);
        expect(quote.amountIn).toBe(1000000000000000000n);
        expect(quote.amountOut).toBe(950000000000000000n);
        expect(quote.routes).toHaveLength(1);
      });

      it('should return quote with WETH route when direct not available', async () => {
        // No direct pool, but WETH route exists
        mockReadContract
          .mockResolvedValueOnce('0x0000000000000000000000000000000000000000') // poolFor (direct)
          .mockResolvedValueOnce(TEST_POOL_ADDRESS) // poolFor (via WETH, first leg)
          .mockResolvedValueOnce(TEST_POOL_ADDRESS) // poolFor (via WETH, second leg)
          .mockResolvedValueOnce([1000000000000000000n, 500000000000000000n, 950000000000000000n]) // getAmountsOut
          .mockResolvedValueOnce([1000000000000000n, 500000000000000n, 950000000000000n]); // getAmountsOut for price impact

        const quote = await service.getQuote(createValidQuoteRequest());

        expect(quote.routes).toHaveLength(2);
        expect(quote.routes[0].to).toBe(BASE_TOKENS.WETH);
        expect(quote.routes[1].from).toBe(BASE_TOKENS.WETH);
      });

      it('should calculate minimum output with slippage', async () => {
        mockReadContract
          .mockResolvedValueOnce(TEST_POOL_ADDRESS)
          .mockResolvedValueOnce([1000000000000000000n, 1000000000000000000n])
          .mockResolvedValueOnce([1000000000000000n, 1000000000000000n]);

        const quote = await service.getQuote(createValidQuoteRequest(), 0.01); // 1% slippage

        // amountOutMin should be 99% of amountOut
        expect(quote.amountOutMin).toBe(990000000000000000n);
      });

      it('should use default slippage when not specified', async () => {
        mockReadContract
          .mockResolvedValueOnce(TEST_POOL_ADDRESS)
          .mockResolvedValueOnce([1000000000000000000n, 1000000000000000000n])
          .mockResolvedValueOnce([1000000000000000n, 1000000000000000n]);

        const quote = await service.getQuote(createValidQuoteRequest());

        expect(quote.slippage).toBe(DEFAULT_SWAP_CONFIG.defaultSlippage);
      });

      it('should reject slippage too low', async () => {
        await expect(service.getQuote(createValidQuoteRequest(), 0.00001)).rejects.toThrow(
          'Slippage too low'
        );
      });

      it('should reject slippage too high', async () => {
        await expect(service.getQuote(createValidQuoteRequest(), 0.6)).rejects.toThrow(
          'Slippage too high'
        );
      });

      it('should include quote validity period', async () => {
        mockReadContract
          .mockResolvedValueOnce(TEST_POOL_ADDRESS)
          .mockResolvedValueOnce([1000000000000000000n, 950000000000000000n])
          .mockResolvedValueOnce([1000000000000000n, 950000000000000n]);

        const before = Date.now();
        const quote = await service.getQuote(createValidQuoteRequest());
        const after = Date.now();

        expect(quote.timestamp.getTime()).toBeGreaterThanOrEqual(before);
        expect(quote.timestamp.getTime()).toBeLessThanOrEqual(after);
        expect(quote.validUntil.getTime()).toBeGreaterThan(quote.timestamp.getTime());
      });

      it('should prefer stable pools when requested', async () => {
        mockReadContract
          .mockResolvedValueOnce(TEST_POOL_ADDRESS)
          .mockResolvedValueOnce([1000000000000000000n, 950000000000000000n])
          .mockResolvedValueOnce([1000000000000000n, 950000000000000n]);

        const quote = await service.getQuote(
          createValidQuoteRequest({ preferStable: true })
        );

        expect(quote.routes[0].stable).toBe(true);
      });
    });

    describe('swapCalibrToUsdc', () => {
      it('should throw when CALIBR token not configured', async () => {
        await expect(service.swapCalibrToUsdc(1000000000000000000n)).rejects.toThrow(
          'CALIBR token address not configured'
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Swap Execution
  // ---------------------------------------------------------------------------

  describe('Swap Execution', () => {
    describe('executeSwap', () => {
      it('should throw when wallet not initialized', async () => {
        await expect(
          service.executeSwap({ quote: createValidQuote() })
        ).rejects.toThrow('Wallet not initialized');
      });

      it('should throw when quote expired', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);

        const expiredQuote = createValidQuote({
          validUntil: new Date(Date.now() - 1000), // Expired 1 second ago
        });

        await expect(service.executeSwap({ quote: expiredQuote })).rejects.toThrow(
          'Quote has expired'
        );
      });

      it('should execute swap successfully', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);

        mockSimulateContract.mockResolvedValueOnce({ request: {} });
        mockWriteContract.mockResolvedValueOnce(TEST_TX_HASH);
        mockWaitForTransactionReceipt.mockResolvedValueOnce(createMockTransactionReceipt());

        const result = await service.executeSwap({ quote: createValidQuote() });

        expect(result.success).toBe(true);
        expect(result.txHash).toBe(TEST_TX_HASH);
        expect(result.gasUsed).toBe(100000n);
        expect(result.blockNumber).toBe(12345n);
      });

      it('should use custom recipient when provided', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);
        const customRecipient = '0xfedcba9876543210fedcba9876543210fedcba98' as const;

        mockSimulateContract.mockResolvedValueOnce({ request: {} });
        mockWriteContract.mockResolvedValueOnce(TEST_TX_HASH);
        mockWaitForTransactionReceipt.mockResolvedValueOnce(createMockTransactionReceipt());

        const result = await service.executeSwap({
          quote: createValidQuote(),
          recipient: customRecipient,
        });

        expect(result.success).toBe(true);
        // Verify simulate was called with the custom recipient
        expect(mockSimulateContract).toHaveBeenCalledWith(
          expect.objectContaining({
            args: expect.arrayContaining([customRecipient]),
          })
        );
      });

      it('should use custom deadline when provided', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);
        const customDeadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

        mockSimulateContract.mockResolvedValueOnce({ request: {} });
        mockWriteContract.mockResolvedValueOnce(TEST_TX_HASH);
        mockWaitForTransactionReceipt.mockResolvedValueOnce(createMockTransactionReceipt());

        const result = await service.executeSwap({
          quote: createValidQuote(),
          deadline: customDeadline,
        });

        expect(result.success).toBe(true);
        expect(mockSimulateContract).toHaveBeenCalledWith(
          expect.objectContaining({
            args: expect.arrayContaining([BigInt(customDeadline)]),
          })
        );
      });

      it('should return failure on reverted transaction', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);

        mockSimulateContract.mockResolvedValueOnce({ request: {} });
        mockWriteContract.mockResolvedValueOnce(TEST_TX_HASH);
        mockWaitForTransactionReceipt.mockResolvedValueOnce({
          status: 'reverted',
          gasUsed: 50000n,
          blockNumber: 12345n,
        });

        const result = await service.executeSwap({ quote: createValidQuote() });

        expect(result.success).toBe(false);
      });

      it('should calculate effective price', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);

        mockSimulateContract.mockResolvedValueOnce({ request: {} });
        mockWriteContract.mockResolvedValueOnce(TEST_TX_HASH);
        mockWaitForTransactionReceipt.mockResolvedValueOnce(createMockTransactionReceipt());

        const quote = createValidQuote({
          amountIn: 1000000000000000000n,
          amountOut: 950000000000000000n,
        });

        const result = await service.executeSwap({ quote });

        expect(result.effectivePrice).toBeCloseTo(0.95);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Approval Methods
  // ---------------------------------------------------------------------------

  describe('Approval Methods', () => {
    describe('checkApproval', () => {
      it('should return true when allowance is sufficient', async () => {
        mockReadContract.mockResolvedValueOnce(2000000000000000000n);

        const result = await service.checkApproval(
          TEST_TOKEN_IN,
          TEST_WALLET_ADDRESS,
          1000000000000000000n
        );

        expect(result).toBe(true);
      });

      it('should return false when allowance is insufficient', async () => {
        mockReadContract.mockResolvedValueOnce(500000000000000000n);

        const result = await service.checkApproval(
          TEST_TOKEN_IN,
          TEST_WALLET_ADDRESS,
          1000000000000000000n
        );

        expect(result).toBe(false);
      });

      it('should return true when allowance equals amount', async () => {
        mockReadContract.mockResolvedValueOnce(1000000000000000000n);

        const result = await service.checkApproval(
          TEST_TOKEN_IN,
          TEST_WALLET_ADDRESS,
          1000000000000000000n
        );

        expect(result).toBe(true);
      });
    });

    describe('approve', () => {
      it('should throw when wallet not initialized', async () => {
        await expect(
          service.approve({
            token: TEST_TOKEN_IN,
            spender: AERODROME_ADDRESSES.ROUTER,
            amount: 1000000000000000000n,
          })
        ).rejects.toThrow('Wallet not initialized');
      });

      it('should approve token successfully', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);

        mockSimulateContract.mockResolvedValueOnce({ request: {} });
        mockWriteContract.mockResolvedValueOnce(TEST_TX_HASH);
        mockWaitForTransactionReceipt.mockResolvedValueOnce({ status: 'success' });
        mockReadContract.mockResolvedValueOnce(1000000000000000000n); // New allowance

        const result = await service.approve({
          token: TEST_TOKEN_IN,
          spender: AERODROME_ADDRESSES.ROUTER,
          amount: 1000000000000000000n,
        });

        expect(result.success).toBe(true);
        expect(result.txHash).toBe(TEST_TX_HASH);
        expect(result.allowance).toBe(1000000000000000000n);
      });

      it('should return failure on reverted approval', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);

        mockSimulateContract.mockResolvedValueOnce({ request: {} });
        mockWriteContract.mockResolvedValueOnce(TEST_TX_HASH);
        mockWaitForTransactionReceipt.mockResolvedValueOnce({ status: 'reverted' });
        mockReadContract.mockResolvedValueOnce(0n);

        const result = await service.approve({
          token: TEST_TOKEN_IN,
          spender: AERODROME_ADDRESSES.ROUTER,
          amount: 1000000000000000000n,
        });

        expect(result.success).toBe(false);
      });
    });

    describe('approveMax', () => {
      it('should throw when wallet not initialized', async () => {
        await expect(service.approveMax(TEST_TOKEN_IN)).rejects.toThrow(
          'Wallet not initialized'
        );
      });

      it('should approve max uint256', async () => {
        await service.initializeWallet(TEST_PRIVATE_KEY);
        const maxUint256 = 2n ** 256n - 1n;

        mockSimulateContract.mockResolvedValueOnce({ request: {} });
        mockWriteContract.mockResolvedValueOnce(TEST_TX_HASH);
        mockWaitForTransactionReceipt.mockResolvedValueOnce({ status: 'success' });
        mockReadContract.mockResolvedValueOnce(maxUint256);

        const result = await service.approveMax(TEST_TOKEN_IN);

        expect(result.success).toBe(true);
        expect(result.allowance).toBe(maxUint256);
        expect(mockSimulateContract).toHaveBeenCalledWith(
          expect.objectContaining({
            args: [AERODROME_ADDRESSES.ROUTER, maxUint256],
          })
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Balance Methods
  // ---------------------------------------------------------------------------

  describe('Balance Methods', () => {
    describe('getBalance', () => {
      it('should return token balance', async () => {
        mockReadContract.mockResolvedValueOnce(5000000000000000000n);

        const balance = await service.getBalance(TEST_TOKEN_IN, TEST_WALLET_ADDRESS);

        expect(balance).toBe(5000000000000000000n);
      });

      it('should return zero for empty balance', async () => {
        mockReadContract.mockResolvedValueOnce(0n);

        const balance = await service.getBalance(TEST_TOKEN_IN, TEST_WALLET_ADDRESS);

        expect(balance).toBe(0n);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Price Impact Calculation
  // ---------------------------------------------------------------------------

  describe('Price Impact', () => {
    it('should calculate price impact', async () => {
      // Direct pool exists
      mockReadContract
        .mockResolvedValueOnce(TEST_POOL_ADDRESS) // poolFor
        .mockResolvedValueOnce([1000000000000000000n, 900000000000000000n]) // getAmountsOut (actual)
        .mockResolvedValueOnce([1000000000000000n, 950000000000000n]); // getAmountsOut (spot)

      const quote = await service.getQuote(createValidQuoteRequest());

      // Price impact should be positive when actual < expected
      expect(quote.priceImpact).toBeGreaterThanOrEqual(0);
    });

    it('should return zero price impact for small amounts', async () => {
      mockReadContract
        .mockResolvedValueOnce(TEST_POOL_ADDRESS)
        .mockResolvedValueOnce([1n, 1n]) // Very small amounts
        .mockResolvedValueOnce([0n, 0n]); // Spot returns 0

      const quote = await service.getQuote(createValidQuoteRequest({ amountIn: 1n }));

      expect(quote.priceImpact).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Route Finding
  // ---------------------------------------------------------------------------

  describe('Route Finding', () => {
    it('should prefer direct route when available', async () => {
      mockReadContract
        .mockResolvedValueOnce(TEST_POOL_ADDRESS) // Direct pool exists
        .mockResolvedValueOnce([1000000000000000000n, 950000000000000000n])
        .mockResolvedValueOnce([1000000000000000n, 950000000000000n]);

      const quote = await service.getQuote(createValidQuoteRequest());

      expect(quote.routes).toHaveLength(1);
      expect(quote.routes[0].from).toBe(TEST_TOKEN_IN);
      expect(quote.routes[0].to).toBe(TEST_TOKEN_OUT);
    });

    it('should use WETH route when direct not available', async () => {
      mockReadContract
        .mockResolvedValueOnce('0x0000000000000000000000000000000000000000') // No direct pool
        .mockResolvedValueOnce(TEST_POOL_ADDRESS) // tokenIn -> WETH exists
        .mockResolvedValueOnce(TEST_POOL_ADDRESS) // WETH -> tokenOut exists
        .mockResolvedValueOnce([1000000000000000000n, 500000000000000000n, 950000000000000000n])
        .mockResolvedValueOnce([1000000000000000n, 500000000000000n, 950000000000000n]);

      const quote = await service.getQuote(createValidQuoteRequest());

      expect(quote.routes).toHaveLength(2);
      expect(quote.routes[0].to).toBe(BASE_TOKENS.WETH);
      expect(quote.routes[1].from).toBe(BASE_TOKENS.WETH);
    });

    it('should throw when neither direct nor WETH route available', async () => {
      mockReadContract.mockResolvedValue('0x0000000000000000000000000000000000000000');

      await expect(service.getQuote(createValidQuoteRequest())).rejects.toThrow(
        'No valid route found'
      );
    });
  });
});

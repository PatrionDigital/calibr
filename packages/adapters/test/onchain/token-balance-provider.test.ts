/**
 * TokenBalanceProvider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBalanceProvider } from '../../src/onchain/token-balance-provider';
import type { Address } from 'viem';

// =============================================================================
// Mocks
// =============================================================================

const mockReadContract = vi.fn();

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: mockReadContract,
    })),
  };
});

// =============================================================================
// Test Data
// =============================================================================

const TEST_WALLET = '0x1234567890123456789012345678901234567890' as Address;
const TEST_TOKEN_ADDRESS = '0xabcdef0123456789abcdef0123456789abcdef01' as Address;
const TEST_TOKEN_ADDRESS_2 = '0xfedcba9876543210fedcba9876543210fedcba98' as Address;

// =============================================================================
// Tests
// =============================================================================

describe('TokenBalanceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  describe('Configuration', () => {
    it('should create instance with default config', () => {
      const provider = new TokenBalanceProvider();
      expect(provider).toBeDefined();
    });

    it('should accept custom RPC URLs', () => {
      const provider = new TokenBalanceProvider({
        baseRpcUrl: 'https://custom-base.example.com',
        polygonRpcUrl: 'https://custom-polygon.example.com',
      });
      expect(provider).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getTokenBalance
  // ---------------------------------------------------------------------------

  describe('getTokenBalance', () => {
    it('should return token balance for a single token', async () => {
      const provider = new TokenBalanceProvider();
      const tokenId = 123n;
      const expectedBalance = 1000000000000000000n; // 1 token with 18 decimals

      mockReadContract.mockResolvedValueOnce(expectedBalance);

      const result = await provider.getTokenBalance(
        TEST_WALLET,
        TEST_TOKEN_ADDRESS,
        tokenId,
        8453 // Base
      );

      expect(result.tokenAddress).toBe(TEST_TOKEN_ADDRESS);
      expect(result.tokenId).toBe(tokenId);
      expect(result.balance).toBe(expectedBalance);
      expect(result.balanceFormatted).toBe(1);
      expect(result.decimals).toBe(18);
    });

    it('should use default chainId of 8453 (Base)', async () => {
      const provider = new TokenBalanceProvider();
      mockReadContract.mockResolvedValueOnce(0n);

      await provider.getTokenBalance(
        TEST_WALLET,
        TEST_TOKEN_ADDRESS,
        1n
      );

      // Client was created for Base (chain 8453)
      expect(mockReadContract).toHaveBeenCalled();
    });

    it('should use custom decimals', async () => {
      const provider = new TokenBalanceProvider();
      const balance = 1000000n; // 1 token with 6 decimals

      mockReadContract.mockResolvedValueOnce(balance);

      const result = await provider.getTokenBalance(
        TEST_WALLET,
        TEST_TOKEN_ADDRESS,
        1n,
        8453,
        6 // USDC-like decimals
      );

      expect(result.balanceFormatted).toBe(1);
      expect(result.decimals).toBe(6);
    });

    it('should handle zero balance', async () => {
      const provider = new TokenBalanceProvider();
      mockReadContract.mockResolvedValueOnce(0n);

      const result = await provider.getTokenBalance(
        TEST_WALLET,
        TEST_TOKEN_ADDRESS,
        1n
      );

      expect(result.balance).toBe(0n);
      expect(result.balanceFormatted).toBe(0);
    });

    it('should handle large balances', async () => {
      const provider = new TokenBalanceProvider();
      const largeBalance = 1000000000000000000000n; // 1000 tokens

      mockReadContract.mockResolvedValueOnce(largeBalance);

      const result = await provider.getTokenBalance(
        TEST_WALLET,
        TEST_TOKEN_ADDRESS,
        1n
      );

      expect(result.balance).toBe(largeBalance);
      expect(result.balanceFormatted).toBe(1000);
    });

    it('should support Polygon chain', async () => {
      const provider = new TokenBalanceProvider();
      mockReadContract.mockResolvedValueOnce(0n);

      await provider.getTokenBalance(
        TEST_WALLET,
        TEST_TOKEN_ADDRESS,
        1n,
        137 // Polygon
      );

      expect(mockReadContract).toHaveBeenCalled();
    });

    it('should throw for unsupported chain', async () => {
      const provider = new TokenBalanceProvider();

      await expect(
        provider.getTokenBalance(
          TEST_WALLET,
          TEST_TOKEN_ADDRESS,
          1n,
          999 // Unsupported chain
        )
      ).rejects.toThrow('Unsupported chain ID: 999');
    });

    it('should reuse client for same chain', async () => {
      const provider = new TokenBalanceProvider();
      mockReadContract.mockResolvedValue(0n);

      await provider.getTokenBalance(TEST_WALLET, TEST_TOKEN_ADDRESS, 1n, 8453);
      await provider.getTokenBalance(TEST_WALLET, TEST_TOKEN_ADDRESS, 2n, 8453);

      // Both calls should use the same cached client
      expect(mockReadContract).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // getTokenBalancesBatch
  // ---------------------------------------------------------------------------

  describe('getTokenBalancesBatch', () => {
    it('should return empty array for empty input', async () => {
      const provider = new TokenBalanceProvider();

      const result = await provider.getTokenBalancesBatch(
        TEST_WALLET,
        [],
        8453
      );

      expect(result).toEqual([]);
      expect(mockReadContract).not.toHaveBeenCalled();
    });

    it('should return balances for multiple tokens from same contract', async () => {
      const provider = new TokenBalanceProvider();
      const tokenIds = [1n, 2n, 3n];
      const balances = [
        1000000000000000000n, // 1 token
        2000000000000000000n, // 2 tokens
        500000000000000000n,  // 0.5 tokens
      ];

      mockReadContract.mockResolvedValueOnce(balances);

      const result = await provider.getTokenBalancesBatch(
        TEST_WALLET,
        tokenIds.map(id => ({
          tokenAddress: TEST_TOKEN_ADDRESS,
          tokenId: id,
        })),
        8453
      );

      expect(result).toHaveLength(3);
      expect(result[0].tokenId).toBe(1n);
      expect(result[0].balanceFormatted).toBe(1);
      expect(result[1].tokenId).toBe(2n);
      expect(result[1].balanceFormatted).toBe(2);
      expect(result[2].tokenId).toBe(3n);
      expect(result[2].balanceFormatted).toBe(0.5);
    });

    it('should group tokens by contract address', async () => {
      const provider = new TokenBalanceProvider();

      // Mock two batch calls - one per contract
      mockReadContract
        .mockResolvedValueOnce([1000000000000000000n]) // First contract
        .mockResolvedValueOnce([2000000000000000000n]); // Second contract

      const result = await provider.getTokenBalancesBatch(
        TEST_WALLET,
        [
          { tokenAddress: TEST_TOKEN_ADDRESS, tokenId: 1n },
          { tokenAddress: TEST_TOKEN_ADDRESS_2, tokenId: 2n },
        ],
        8453
      );

      expect(result).toHaveLength(2);
      expect(mockReadContract).toHaveBeenCalledTimes(2);
    });

    it('should fallback to individual calls on batch failure', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const provider = new TokenBalanceProvider();

      // First call (batch) fails, then individual calls succeed
      mockReadContract
        .mockRejectedValueOnce(new Error('Batch failed'))
        .mockResolvedValueOnce(1000000000000000000n)
        .mockResolvedValueOnce(2000000000000000000n);

      const result = await provider.getTokenBalancesBatch(
        TEST_WALLET,
        [
          { tokenAddress: TEST_TOKEN_ADDRESS, tokenId: 1n },
          { tokenAddress: TEST_TOKEN_ADDRESS, tokenId: 2n },
        ],
        8453
      );

      expect(result).toHaveLength(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Batch call failed')
      );

      consoleSpy.mockRestore();
    });

    it('should return zero balance on individual call failure during fallback', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const provider = new TokenBalanceProvider();

      // Batch fails, first individual succeeds, second fails
      mockReadContract
        .mockRejectedValueOnce(new Error('Batch failed'))
        .mockResolvedValueOnce(1000000000000000000n)
        .mockRejectedValueOnce(new Error('Individual failed'));

      const result = await provider.getTokenBalancesBatch(
        TEST_WALLET,
        [
          { tokenAddress: TEST_TOKEN_ADDRESS, tokenId: 1n },
          { tokenAddress: TEST_TOKEN_ADDRESS, tokenId: 2n },
        ],
        8453
      );

      expect(result).toHaveLength(2);
      expect(result[0].balanceFormatted).toBe(1);
      expect(result[1].balance).toBe(0n);
      expect(result[1].balanceFormatted).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // scanWalletPositions
  // ---------------------------------------------------------------------------

  describe('scanWalletPositions', () => {
    it('should return empty array for empty input', async () => {
      const provider = new TokenBalanceProvider();

      const result = await provider.scanWalletPositions(
        TEST_WALLET,
        []
      );

      expect(result).toEqual([]);
    });

    it('should return positions with non-zero balance', async () => {
      const provider = new TokenBalanceProvider();

      mockReadContract.mockResolvedValueOnce([
        1000000000000000000n, // 1 token
        0n,                   // 0 tokens
      ]);

      const result = await provider.scanWalletPositions(
        TEST_WALLET,
        [
          {
            marketId: 'market-1',
            marketSlug: 'test-market-1',
            platform: 'LIMITLESS' as const,
            outcome: 'Yes',
            outcomeIndex: 0,
            tokenAddress: TEST_TOKEN_ADDRESS,
            tokenId: 1n,
            chainId: 8453,
          },
          {
            marketId: 'market-2',
            marketSlug: 'test-market-2',
            platform: 'LIMITLESS' as const,
            outcome: 'No',
            outcomeIndex: 1,
            tokenAddress: TEST_TOKEN_ADDRESS,
            tokenId: 2n,
            chainId: 8453,
          },
        ]
      );

      expect(result).toHaveLength(1);
      expect(result[0].marketId).toBe('market-1');
      expect(result[0].outcome).toBe('Yes');
      expect(result[0].balanceFormatted).toBe(1);
    });

    it('should filter by minBalance', async () => {
      const provider = new TokenBalanceProvider();

      mockReadContract.mockResolvedValueOnce([
        100000000000000n,     // 0.0001 tokens (at threshold)
        10000000000000n,      // 0.00001 tokens (below threshold)
      ]);

      const result = await provider.scanWalletPositions(
        TEST_WALLET,
        [
          {
            marketId: 'market-1',
            marketSlug: 'test-market-1',
            platform: 'LIMITLESS' as const,
            outcome: 'Yes',
            outcomeIndex: 0,
            tokenAddress: TEST_TOKEN_ADDRESS,
            tokenId: 1n,
            chainId: 8453,
          },
          {
            marketId: 'market-2',
            marketSlug: 'test-market-2',
            platform: 'LIMITLESS' as const,
            outcome: 'No',
            outcomeIndex: 1,
            tokenAddress: TEST_TOKEN_ADDRESS,
            tokenId: 2n,
            chainId: 8453,
          },
        ],
        0.0001 // default minBalance
      );

      expect(result).toHaveLength(1);
      expect(result[0].marketId).toBe('market-1');
    });

    it('should accept custom minBalance', async () => {
      const provider = new TokenBalanceProvider();

      mockReadContract.mockResolvedValueOnce([
        10000000000000000n, // 0.01 tokens
      ]);

      const result = await provider.scanWalletPositions(
        TEST_WALLET,
        [
          {
            marketId: 'market-1',
            marketSlug: 'test-market-1',
            platform: 'LIMITLESS' as const,
            outcome: 'Yes',
            outcomeIndex: 0,
            tokenAddress: TEST_TOKEN_ADDRESS,
            tokenId: 1n,
            chainId: 8453,
          },
        ],
        0.1 // Higher minBalance
      );

      expect(result).toHaveLength(0);
    });

    it('should group tokens by chain', async () => {
      const provider = new TokenBalanceProvider();

      // Mock calls for both chains
      mockReadContract
        .mockResolvedValueOnce([1000000000000000000n]) // Base
        .mockResolvedValueOnce([2000000000000000000n]); // Polygon

      const result = await provider.scanWalletPositions(
        TEST_WALLET,
        [
          {
            marketId: 'base-market',
            marketSlug: 'test-base',
            platform: 'LIMITLESS' as const,
            outcome: 'Yes',
            outcomeIndex: 0,
            tokenAddress: TEST_TOKEN_ADDRESS,
            tokenId: 1n,
            chainId: 8453, // Base
          },
          {
            marketId: 'polygon-market',
            marketSlug: 'test-polygon',
            platform: 'POLYMARKET' as const,
            outcome: 'Yes',
            outcomeIndex: 0,
            tokenAddress: TEST_TOKEN_ADDRESS,
            tokenId: 2n,
            chainId: 137, // Polygon
          },
        ]
      );

      expect(result).toHaveLength(2);
      expect(result.find(p => p.platform === 'LIMITLESS')?.chainId).toBe(8453);
      expect(result.find(p => p.platform === 'POLYMARKET')?.chainId).toBe(137);
    });

    it('should return complete position info', async () => {
      const provider = new TokenBalanceProvider();

      mockReadContract.mockResolvedValueOnce([5000000000000000000n]);

      const result = await provider.scanWalletPositions(
        TEST_WALLET,
        [
          {
            marketId: 'market-123',
            marketSlug: 'will-it-rain',
            platform: 'LIMITLESS' as const,
            outcome: 'Yes',
            outcomeIndex: 0,
            tokenAddress: TEST_TOKEN_ADDRESS,
            tokenId: 42n,
            chainId: 8453,
          },
        ]
      );

      expect(result[0]).toEqual({
        marketId: 'market-123',
        marketSlug: 'will-it-rain',
        platform: 'LIMITLESS',
        outcome: 'Yes',
        outcomeIndex: 0,
        tokenAddress: TEST_TOKEN_ADDRESS,
        tokenId: 42n,
        balance: 5000000000000000000n,
        balanceFormatted: 5,
        chainId: 8453,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Singleton Export
  // ---------------------------------------------------------------------------

  describe('Singleton Export', () => {
    it('should export tokenBalanceProvider instance', async () => {
      const { tokenBalanceProvider } = await import('../../src/onchain/token-balance-provider');
      expect(tokenBalanceProvider).toBeInstanceOf(TokenBalanceProvider);
    });
  });
});

/**
 * Tests for ERC-1155 Scanner and Token Balance Provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Address } from 'viem';

// Hoist mocks before module imports
const { mockReadContract, mockCreatePublicClient } = vi.hoisted(() => {
  const mockReadContract = vi.fn();
  const mockCreatePublicClient = vi.fn(() => ({
    readContract: mockReadContract,
  }));
  return { mockReadContract, mockCreatePublicClient };
});

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: mockCreatePublicClient,
    http: vi.fn(() => 'mock-transport'),
  };
});

vi.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  polygon: { id: 137, name: 'Polygon' },
}));

import {
  TokenBalanceProvider,
  type PositionTokenInfo,
  type TokenBalance,
  type OnChainPosition,
} from '../../src/onchain/token-balance-provider';

import {
  ERC1155Scanner,
  erc1155Scanner,
  type MarketTokenMapping,
  type ScannedPosition,
  type WalletScanResult,
} from '../../src/onchain/erc1155-scanner';

// =============================================================================
// Test Constants
// =============================================================================

const WALLET_ADDRESS: Address = '0x1234567890123456789012345678901234567890';
const TOKEN_ADDRESS_1: Address = '0xabcdef0123456789abcdef0123456789abcdef01';
const TOKEN_ADDRESS_2: Address = '0xfedcba9876543210fedcba9876543210fedcba98';

// =============================================================================
// TokenBalanceProvider Tests
// =============================================================================

describe('TokenBalanceProvider', () => {
  let provider: TokenBalanceProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePublicClient.mockReturnValue({
      readContract: mockReadContract,
    });
    provider = new TokenBalanceProvider();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const p = new TokenBalanceProvider();
      expect(p).toBeInstanceOf(TokenBalanceProvider);
    });

    it('should create instance with custom RPC URLs', () => {
      const p = new TokenBalanceProvider({
        baseRpcUrl: 'https://custom-base.rpc.com',
        polygonRpcUrl: 'https://custom-polygon.rpc.com',
      });
      expect(p).toBeInstanceOf(TokenBalanceProvider);
    });
  });

  describe('getTokenBalance', () => {
    it('should return token balance for single token', async () => {
      const expectedBalance = 1000000000000000000n; // 1 token
      mockReadContract.mockResolvedValue(expectedBalance);

      const result = await provider.getTokenBalance(
        WALLET_ADDRESS,
        TOKEN_ADDRESS_1,
        1n,
        8453,
        18
      );

      expect(result.tokenAddress).toBe(TOKEN_ADDRESS_1);
      expect(result.tokenId).toBe(1n);
      expect(result.balance).toBe(expectedBalance);
      expect(result.balanceFormatted).toBe(1);
      expect(result.decimals).toBe(18);
    });

    it('should handle zero balance', async () => {
      mockReadContract.mockResolvedValue(0n);

      const result = await provider.getTokenBalance(
        WALLET_ADDRESS,
        TOKEN_ADDRESS_1,
        1n
      );

      expect(result.balance).toBe(0n);
      expect(result.balanceFormatted).toBe(0);
    });

    it('should use default chain ID 8453 (Base)', async () => {
      mockReadContract.mockResolvedValue(100n);

      await provider.getTokenBalance(WALLET_ADDRESS, TOKEN_ADDRESS_1, 1n);

      expect(mockCreatePublicClient).toHaveBeenCalled();
    });

    it('should use default decimals 18', async () => {
      mockReadContract.mockResolvedValue(500000000000000000n); // 0.5 tokens

      const result = await provider.getTokenBalance(
        WALLET_ADDRESS,
        TOKEN_ADDRESS_1,
        1n,
        8453
      );

      expect(result.balanceFormatted).toBe(0.5);
    });

    it('should throw error for unsupported chain ID', async () => {
      await expect(
        provider.getTokenBalance(
          WALLET_ADDRESS,
          TOKEN_ADDRESS_1,
          1n,
          999 // Unsupported chain
        )
      ).rejects.toThrow('Unsupported chain ID: 999');
    });

    it('should support Polygon (chain ID 137)', async () => {
      mockReadContract.mockResolvedValue(1000000n);

      const result = await provider.getTokenBalance(
        WALLET_ADDRESS,
        TOKEN_ADDRESS_1,
        1n,
        137,
        6
      );

      expect(result.balanceFormatted).toBe(1);
    });

    it('should cache clients for reuse', async () => {
      mockReadContract.mockResolvedValue(100n);

      await provider.getTokenBalance(WALLET_ADDRESS, TOKEN_ADDRESS_1, 1n, 8453);
      await provider.getTokenBalance(WALLET_ADDRESS, TOKEN_ADDRESS_1, 2n, 8453);

      // Should only create one client for the same chain
      expect(mockCreatePublicClient).toHaveBeenCalledTimes(1);
    });

    it('should create separate clients for different chains', async () => {
      mockReadContract.mockResolvedValue(100n);

      await provider.getTokenBalance(WALLET_ADDRESS, TOKEN_ADDRESS_1, 1n, 8453);
      await provider.getTokenBalance(WALLET_ADDRESS, TOKEN_ADDRESS_1, 1n, 137);

      expect(mockCreatePublicClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTokenBalancesBatch', () => {
    it('should return empty array for empty tokens list', async () => {
      const result = await provider.getTokenBalancesBatch(WALLET_ADDRESS, []);
      expect(result).toEqual([]);
    });

    it('should batch request balances for tokens at same address', async () => {
      mockReadContract.mockResolvedValue([100n, 200n, 300n]);

      const tokens = [
        { tokenAddress: TOKEN_ADDRESS_1, tokenId: 1n },
        { tokenAddress: TOKEN_ADDRESS_1, tokenId: 2n },
        { tokenAddress: TOKEN_ADDRESS_1, tokenId: 3n },
      ];

      const result = await provider.getTokenBalancesBatch(
        WALLET_ADDRESS,
        tokens,
        8453,
        18
      );

      expect(result).toHaveLength(3);
      expect(mockReadContract).toHaveBeenCalledTimes(1);
    });

    it('should make separate batch calls for different token addresses', async () => {
      mockReadContract
        .mockResolvedValueOnce([100n, 200n])
        .mockResolvedValueOnce([300n]);

      const tokens = [
        { tokenAddress: TOKEN_ADDRESS_1, tokenId: 1n },
        { tokenAddress: TOKEN_ADDRESS_1, tokenId: 2n },
        { tokenAddress: TOKEN_ADDRESS_2, tokenId: 3n },
      ];

      const result = await provider.getTokenBalancesBatch(
        WALLET_ADDRESS,
        tokens,
        8453,
        18
      );

      expect(result).toHaveLength(3);
      expect(mockReadContract).toHaveBeenCalledTimes(2);
    });

    it('should fall back to individual calls if batch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReadContract
        .mockRejectedValueOnce(new Error('Batch failed'))
        .mockResolvedValueOnce(100n)
        .mockResolvedValueOnce(200n);

      const tokens = [
        { tokenAddress: TOKEN_ADDRESS_1, tokenId: 1n },
        { tokenAddress: TOKEN_ADDRESS_1, tokenId: 2n },
      ];

      const result = await provider.getTokenBalancesBatch(
        WALLET_ADDRESS,
        tokens,
        8453,
        18
      );

      expect(result).toHaveLength(2);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return zero balance if individual call fails', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReadContract
        .mockRejectedValueOnce(new Error('Batch failed'))
        .mockRejectedValueOnce(new Error('Individual failed'));

      const tokens = [{ tokenAddress: TOKEN_ADDRESS_1, tokenId: 1n }];

      const result = await provider.getTokenBalancesBatch(
        WALLET_ADDRESS,
        tokens,
        8453,
        18
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.balance).toBe(0n);
      expect(result[0]?.balanceFormatted).toBe(0);
      consoleSpy.mockRestore();
    });

    it('should format balances correctly with custom decimals', async () => {
      mockReadContract.mockResolvedValue([1000000n]); // 1 token with 6 decimals

      const tokens = [{ tokenAddress: TOKEN_ADDRESS_1, tokenId: 1n }];

      const result = await provider.getTokenBalancesBatch(
        WALLET_ADDRESS,
        tokens,
        8453,
        6
      );

      expect(result[0]?.balanceFormatted).toBe(1);
    });
  });

  describe('scanWalletPositions', () => {
    it('should return empty array for empty token list', async () => {
      const result = await provider.scanWalletPositions(WALLET_ADDRESS, []);
      expect(result).toEqual([]);
    });

    it('should scan wallet and return positions above minimum balance', async () => {
      mockReadContract.mockResolvedValue([1000000000000000000n, 500000000000000n]);

      const tokens: PositionTokenInfo[] = [
        {
          marketId: 'market-1',
          marketSlug: 'will-btc-reach-100k',
          platform: 'LIMITLESS',
          outcome: 'Yes',
          outcomeIndex: 0,
          tokenAddress: TOKEN_ADDRESS_1,
          tokenId: 1n,
          chainId: 8453,
        },
        {
          marketId: 'market-1',
          marketSlug: 'will-btc-reach-100k',
          platform: 'LIMITLESS',
          outcome: 'No',
          outcomeIndex: 1,
          tokenAddress: TOKEN_ADDRESS_1,
          tokenId: 2n,
          chainId: 8453,
        },
      ];

      const result = await provider.scanWalletPositions(
        WALLET_ADDRESS,
        tokens,
        0.0001
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.marketSlug).toBe('will-btc-reach-100k');
      expect(result[0]?.outcome).toBe('Yes');
      expect(result[0]?.balanceFormatted).toBe(1);
    });

    it('should filter out positions below minimum balance', async () => {
      mockReadContract.mockResolvedValue([1000000000000000000n, 10n]); // 1 token, tiny amount

      const tokens: PositionTokenInfo[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          platform: 'LIMITLESS',
          outcome: 'Yes',
          outcomeIndex: 0,
          tokenAddress: TOKEN_ADDRESS_1,
          tokenId: 1n,
          chainId: 8453,
        },
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          platform: 'LIMITLESS',
          outcome: 'No',
          outcomeIndex: 1,
          tokenAddress: TOKEN_ADDRESS_1,
          tokenId: 2n,
          chainId: 8453,
        },
      ];

      const result = await provider.scanWalletPositions(
        WALLET_ADDRESS,
        tokens,
        0.0001
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.outcome).toBe('Yes');
    });

    it('should group tokens by chain ID for batching', async () => {
      mockReadContract
        .mockResolvedValueOnce([1000000000000000000n])
        .mockResolvedValueOnce([2000000000000000000n]);

      const tokens: PositionTokenInfo[] = [
        {
          marketId: 'market-1',
          marketSlug: 'base-market',
          platform: 'LIMITLESS',
          outcome: 'Yes',
          outcomeIndex: 0,
          tokenAddress: TOKEN_ADDRESS_1,
          tokenId: 1n,
          chainId: 8453,
        },
        {
          marketId: 'market-2',
          marketSlug: 'poly-market',
          platform: 'POLYMARKET',
          outcome: 'Yes',
          outcomeIndex: 0,
          tokenAddress: TOKEN_ADDRESS_2,
          tokenId: 100n,
          chainId: 137,
        },
      ];

      const result = await provider.scanWalletPositions(WALLET_ADDRESS, tokens);

      expect(result).toHaveLength(2);
      expect(mockReadContract).toHaveBeenCalledTimes(2);
    });

    it('should use default minimum balance of 0.0001', async () => {
      mockReadContract.mockResolvedValue([50000000000000n]); // 0.00005 tokens

      const tokens: PositionTokenInfo[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          platform: 'LIMITLESS',
          outcome: 'Yes',
          outcomeIndex: 0,
          tokenAddress: TOKEN_ADDRESS_1,
          tokenId: 1n,
          chainId: 8453,
        },
      ];

      const result = await provider.scanWalletPositions(WALLET_ADDRESS, tokens);

      expect(result).toHaveLength(0);
    });
  });
});

// =============================================================================
// ERC1155Scanner Tests
// =============================================================================

describe('ERC1155Scanner', () => {
  let scanner: ERC1155Scanner;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePublicClient.mockReturnValue({
      readContract: mockReadContract,
    });
    scanner = new ERC1155Scanner();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const s = new ERC1155Scanner();
      expect(s).toBeInstanceOf(ERC1155Scanner);
    });

    it('should create instance with custom RPC URLs', () => {
      const s = new ERC1155Scanner({
        baseRpcUrl: 'https://custom-base.rpc.com',
        polygonRpcUrl: 'https://custom-polygon.rpc.com',
      });
      expect(s).toBeInstanceOf(ERC1155Scanner);
    });
  });

  describe('scanWallet', () => {
    it('should return empty result for empty markets list', async () => {
      const result = await scanner.scanWallet(WALLET_ADDRESS, []);

      expect(result.positions).toEqual([]);
      expect(result.totalPositions).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.marketsScanned).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should scan wallet and return positions', async () => {
      mockReadContract.mockResolvedValue([1000000000000000000n, 500000000000000000n]);

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'will-btc-reach-100k',
          question: 'Will Bitcoin reach $100k by 2024?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
              currentPrice: 0.65,
            },
            {
              index: 1,
              label: 'No',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '2',
              currentPrice: 0.35,
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.totalPositions).toBe(2);
      expect(result.marketsScanned).toBe(1);
      expect(result.walletAddress).toBe(WALLET_ADDRESS);
      expect(result.positions[0]?.question).toBe('Will Bitcoin reach $100k by 2024?');
    });

    it('should calculate total value from current prices', async () => {
      mockReadContract.mockResolvedValue([1000000000000000000n]); // 1 token

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test question?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
              currentPrice: 0.75,
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.totalValue).toBe(0.75);
      expect(result.positions[0]?.currentValue).toBe(0.75);
    });

    it('should handle markets without current prices', async () => {
      mockReadContract.mockResolvedValue([1000000000000000000n]);

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test question?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
              // No currentPrice
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.positions[0]?.currentPrice).toBeUndefined();
      expect(result.positions[0]?.currentValue).toBeUndefined();
      expect(result.totalValue).toBe(0);
    });

    it('should skip outcomes without token ID', async () => {
      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test question?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '', // Empty token ID
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.positions).toEqual([]);
      expect(result.totalPositions).toBe(0);
    });

    it('should skip outcomes without token address', async () => {
      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test question?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: '' as Address,
              tokenId: '1',
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.positions).toEqual([]);
    });

    it('should record errors for invalid token IDs', async () => {
      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test question?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: 'not-a-number', // Invalid token ID
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid token ID');
    });

    it('should handle scan errors gracefully with fallback', async () => {
      // When batch fails, it falls back to individual calls which may also fail
      // but returns zero balances instead of throwing
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockReadContract
        .mockRejectedValueOnce(new Error('Batch RPC error'))
        .mockRejectedValueOnce(new Error('Individual RPC error'));

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test question?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
            },
          ],
        },
      ];

      // Errors are caught and result in zero balances
      const result = await scanner.scanWallet(WALLET_ADDRESS, markets, {
        includeZeroBalance: true,
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(result.marketsScanned).toBe(1);
      consoleSpy.mockRestore();
    });

    it('should respect minBalance option', async () => {
      mockReadContract.mockResolvedValue([100000000000000n]); // 0.0001 tokens

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets, {
        minBalance: 0.001, // Higher threshold
      });

      expect(result.positions).toHaveLength(0);
    });

    it('should include zero balance when option is set', async () => {
      mockReadContract.mockResolvedValue([0n]);

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets, {
        includeZeroBalance: true,
      });

      expect(result.positions).toHaveLength(1);
      expect(result.positions[0]?.balanceFormatted).toBe(0);
    });

    it('should include collateral info in scanned positions', async () => {
      mockReadContract.mockResolvedValue([1000000000000000000n]);

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test?',
          platform: 'LIMITLESS',
          chainId: 8453,
          collateralAddress: '0xUSDC' as Address,
          collateralDecimals: 6,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.positions[0]?.collateralAddress).toBe('0xUSDC');
      expect(result.positions[0]?.collateralDecimals).toBe(6);
    });

    it('should return scan timestamp', async () => {
      const beforeScan = new Date();
      const result = await scanner.scanWallet(WALLET_ADDRESS, []);
      const afterScan = new Date();

      expect(result.scanTimestamp.getTime()).toBeGreaterThanOrEqual(beforeScan.getTime());
      expect(result.scanTimestamp.getTime()).toBeLessThanOrEqual(afterScan.getTime());
    });

    it('should handle POLYMARKET platform', async () => {
      mockReadContract.mockResolvedValue([1000000000000000000n]);

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'poly-market-1',
          marketSlug: 'poly-test',
          question: 'Poly test?',
          platform: 'POLYMARKET',
          chainId: 137,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '12345',
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.positions[0]?.platform).toBe('POLYMARKET');
    });

    it('should find outcome by index when label does not match', async () => {
      mockReadContract.mockResolvedValue([1000000000000000000n]);

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'test-market',
          question: 'Test?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
              currentPrice: 0.6,
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.positions[0]?.outcomeLabel).toBe('Yes');
      expect(result.positions[0]?.currentPrice).toBe(0.6);
    });

    it('should scan multiple markets at once', async () => {
      mockReadContract.mockResolvedValue([
        1000000000000000000n,
        500000000000000000n,
        2000000000000000000n,
        0n,
      ]);

      const markets: MarketTokenMapping[] = [
        {
          marketId: 'market-1',
          marketSlug: 'market-1',
          question: 'Market 1?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '1',
            },
            {
              index: 1,
              label: 'No',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '2',
            },
          ],
        },
        {
          marketId: 'market-2',
          marketSlug: 'market-2',
          question: 'Market 2?',
          platform: 'LIMITLESS',
          chainId: 8453,
          outcomes: [
            {
              index: 0,
              label: 'Yes',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '3',
            },
            {
              index: 1,
              label: 'No',
              tokenAddress: TOKEN_ADDRESS_1,
              tokenId: '4',
            },
          ],
        },
      ];

      const result = await scanner.scanWallet(WALLET_ADDRESS, markets);

      expect(result.marketsScanned).toBe(2);
      expect(result.totalPositions).toBe(3); // 4th position has 0 balance
    });
  });
});

// =============================================================================
// Singleton Export Tests
// =============================================================================

describe('erc1155Scanner singleton', () => {
  it('should be an instance of ERC1155Scanner', () => {
    expect(erc1155Scanner).toBeInstanceOf(ERC1155Scanner);
  });
});

// =============================================================================
// Type Tests
// =============================================================================

describe('Type definitions', () => {
  it('MarketTokenMapping should have required fields', () => {
    const mapping: MarketTokenMapping = {
      marketId: 'test',
      marketSlug: 'test-slug',
      question: 'Test?',
      platform: 'LIMITLESS',
      chainId: 8453,
      outcomes: [],
    };
    expect(mapping.marketId).toBe('test');
    expect(mapping.platform).toBe('LIMITLESS');
  });

  it('ScannedPosition should extend OnChainPosition', () => {
    const position: ScannedPosition = {
      marketId: 'test',
      marketSlug: 'test-slug',
      platform: 'LIMITLESS',
      outcome: 'Yes',
      outcomeIndex: 0,
      tokenAddress: TOKEN_ADDRESS_1,
      tokenId: 1n,
      balance: 1000n,
      balanceFormatted: 0.001,
      chainId: 8453,
      question: 'Test?',
      outcomeLabel: 'Yes',
      currentPrice: 0.5,
      currentValue: 0.0005,
    };
    expect(position.question).toBe('Test?');
    expect(position.currentPrice).toBe(0.5);
  });

  it('WalletScanResult should have all summary fields', () => {
    const result: WalletScanResult = {
      walletAddress: WALLET_ADDRESS,
      positions: [],
      totalPositions: 0,
      totalValue: 0,
      scanTimestamp: new Date(),
      marketsScanned: 0,
      errors: [],
    };
    expect(result.walletAddress).toBe(WALLET_ADDRESS);
    expect(result.errors).toEqual([]);
  });

  it('TokenBalance should have formatted balance', () => {
    const balance: TokenBalance = {
      tokenAddress: TOKEN_ADDRESS_1,
      tokenId: 1n,
      balance: 1000000000000000000n,
      balanceFormatted: 1.0,
      decimals: 18,
    };
    expect(balance.balanceFormatted).toBe(1.0);
  });

  it('PositionTokenInfo should have chain and market info', () => {
    const info: PositionTokenInfo = {
      marketId: 'test',
      marketSlug: 'test-slug',
      platform: 'POLYMARKET',
      outcome: 'Yes',
      outcomeIndex: 0,
      tokenAddress: TOKEN_ADDRESS_1,
      tokenId: 1n,
      chainId: 137,
    };
    expect(info.chainId).toBe(137);
    expect(info.platform).toBe('POLYMARKET');
  });

  it('OnChainPosition should include balance info', () => {
    const position: OnChainPosition = {
      marketId: 'test',
      marketSlug: 'test-slug',
      platform: 'LIMITLESS',
      outcome: 'Yes',
      outcomeIndex: 0,
      tokenAddress: TOKEN_ADDRESS_1,
      tokenId: 1n,
      balance: 500n,
      balanceFormatted: 0.0000000000000005,
      chainId: 8453,
    };
    expect(position.balance).toBe(500n);
  });
});

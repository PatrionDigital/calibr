/**
 * PredictFunAdapter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PredictFunAdapter } from '../../src/predictfun/adapter';
import { PredictFunClient } from '../../src/predictfun/client';
import { PREDICTFUN_CONTRACTS, BLAST_CHAIN_ID } from '../../src/predictfun/contracts';
import type { PredictFunMarket } from '../../src/predictfun/contracts';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('../../src/predictfun/client', () => {
  const mockClient = {
    getMarkets: vi.fn(),
    getMarket: vi.fn(),
    healthCheck: vi.fn(),
    clearCache: vi.fn(),
    getContracts: vi.fn(),
  };
  return {
    PredictFunClient: vi.fn(() => mockClient),
  };
});

function getMockClient() {
  const adapter = new PredictFunAdapter();
  return adapter.getClient() as unknown as {
    getMarkets: ReturnType<typeof vi.fn>;
    getMarket: ReturnType<typeof vi.fn>;
    healthCheck: ReturnType<typeof vi.fn>;
    clearCache: ReturnType<typeof vi.fn>;
    getContracts: ReturnType<typeof vi.fn>;
  };
}

function createMockMarket(overrides: Partial<PredictFunMarket> = {}): PredictFunMarket {
  return {
    conditionId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    questionId: '0xabcd1234',
    oracle: PREDICTFUN_CONTRACTS.umaCtfAdapter,
    outcomeCount: 2,
    outcomes: [
      { index: 0, tokenId: 'token0', price: 0.6 },
      { index: 1, tokenId: 'token1', price: 0.4 },
    ],
    isResolved: false,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PredictFunAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  describe('Configuration', () => {
    it('should have correct platform identifier', () => {
      const adapter = new PredictFunAdapter();
      expect(adapter.platform).toBe('PREDICTFUN');
    });

    it('should have correct config values', () => {
      const adapter = new PredictFunAdapter();
      expect(adapter.config.platform).toBe('PREDICTFUN');
      expect(adapter.config.apiBaseUrl).toBe('https://blast.predict.fun');
      expect(adapter.config.chainId).toBe(BLAST_CHAIN_ID);
      expect(adapter.config.wsUrl).toBeUndefined();
    });

    it('should accept client configuration', () => {
      const customConfig = { rpcUrl: 'https://custom-rpc.example.com' };
      new PredictFunAdapter({ client: customConfig });

      expect(PredictFunClient).toHaveBeenCalledWith(customConfig);
    });

    it('should use default config when none provided', () => {
      new PredictFunAdapter();

      expect(PredictFunClient).toHaveBeenCalledWith(undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // getMarkets
  // ---------------------------------------------------------------------------

  describe('getMarkets', () => {
    it('should fetch and map markets correctly', async () => {
      const mockClient = getMockClient();
      const mockMarkets = [createMockMarket(), createMockMarket({
        conditionId: '0xabcd',
        outcomes: [
          { index: 0, tokenId: 'token0', price: 0.7 },
          { index: 1, tokenId: 'token1', price: 0.3 },
        ],
      })];
      mockClient.getMarkets.mockResolvedValue(mockMarkets);

      const adapter = new PredictFunAdapter();
      const markets = await adapter.getMarkets();

      expect(markets).toHaveLength(2);
      expect(markets[0].platform).toBe('PREDICTFUN');
      expect(markets[0].id).toBe(mockMarkets[0].conditionId);
    });

    it('should pass limit parameter to client', async () => {
      const mockClient = getMockClient();
      mockClient.getMarkets.mockResolvedValue([]);

      const adapter = new PredictFunAdapter();
      await adapter.getMarkets({ limit: 10 });

      expect(mockClient.getMarkets).toHaveBeenCalledWith({ limit: 10 });
    });

    it('should return empty array when no markets found', async () => {
      const mockClient = getMockClient();
      mockClient.getMarkets.mockResolvedValue([]);

      const adapter = new PredictFunAdapter();
      const markets = await adapter.getMarkets();

      expect(markets).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getMarket
  // ---------------------------------------------------------------------------

  describe('getMarket', () => {
    it('should fetch and map a single market', async () => {
      const mockClient = getMockClient();
      const mockMarket = createMockMarket();
      mockClient.getMarket.mockResolvedValue(mockMarket);

      const adapter = new PredictFunAdapter();
      const market = await adapter.getMarket(mockMarket.conditionId);

      expect(mockClient.getMarket).toHaveBeenCalledWith(mockMarket.conditionId);
      expect(market).not.toBeNull();
      expect(market?.id).toBe(mockMarket.conditionId);
      expect(market?.platform).toBe('PREDICTFUN');
    });

    it('should return null for non-existent market', async () => {
      const mockClient = getMockClient();
      mockClient.getMarket.mockResolvedValue(null);

      const adapter = new PredictFunAdapter();
      const market = await adapter.getMarket('0xnonexistent');

      expect(market).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getEvents
  // ---------------------------------------------------------------------------

  describe('getEvents', () => {
    it('should return empty array (PredictFun does not support events)', async () => {
      const adapter = new PredictFunAdapter();
      const events = await adapter.getEvents();

      expect(events).toEqual([]);
    });

    it('should ignore any parameters', async () => {
      const adapter = new PredictFunAdapter();
      const events = await adapter.getEvents({ limit: 100, status: 'ACTIVE' });

      expect(events).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getOrderBook
  // ---------------------------------------------------------------------------

  describe('getOrderBook', () => {
    it('should return empty orderbook (not implemented)', async () => {
      const adapter = new PredictFunAdapter();
      const orderbook = await adapter.getOrderBook('0x123');

      expect(orderbook.marketId).toBe('0x123');
      expect(orderbook.platform).toBe('PREDICTFUN');
      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
      expect(orderbook.timestamp).toBeInstanceOf(Date);
    });

    it('should return empty orderbook for any market ID', async () => {
      const adapter = new PredictFunAdapter();
      const orderbook = await adapter.getOrderBook('0xdifferent');

      expect(orderbook.marketId).toBe('0xdifferent');
      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getTrades
  // ---------------------------------------------------------------------------

  describe('getTrades', () => {
    it('should return empty array (not implemented)', async () => {
      const adapter = new PredictFunAdapter();
      const trades = await adapter.getTrades('0x123');

      expect(trades).toEqual([]);
    });

    it('should ignore limit parameter', async () => {
      const adapter = new PredictFunAdapter();
      const trades = await adapter.getTrades('0x123', 50);

      expect(trades).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // healthCheck
  // ---------------------------------------------------------------------------

  describe('healthCheck', () => {
    it('should delegate to client health check', async () => {
      const mockClient = getMockClient();
      mockClient.healthCheck.mockResolvedValue(true);

      const adapter = new PredictFunAdapter();
      const result = await adapter.healthCheck();

      expect(mockClient.healthCheck).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when health check fails', async () => {
      const mockClient = getMockClient();
      mockClient.healthCheck.mockResolvedValue(false);

      const adapter = new PredictFunAdapter();
      const result = await adapter.healthCheck();

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // clearCache
  // ---------------------------------------------------------------------------

  describe('clearCache', () => {
    it('should delegate to client clear cache', () => {
      const mockClient = getMockClient();

      const adapter = new PredictFunAdapter();
      adapter.clearCache();

      expect(mockClient.clearCache).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // getClient
  // ---------------------------------------------------------------------------

  describe('getClient', () => {
    it('should return the underlying client instance', () => {
      const adapter = new PredictFunAdapter();
      const client = adapter.getClient();

      expect(client).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getContracts
  // ---------------------------------------------------------------------------

  describe('getContracts', () => {
    it('should delegate to client getContracts', () => {
      const mockClient = getMockClient();
      mockClient.getContracts.mockReturnValue(PREDICTFUN_CONTRACTS);

      const adapter = new PredictFunAdapter();
      const contracts = adapter.getContracts();

      expect(mockClient.getContracts).toHaveBeenCalled();
      expect(contracts).toBe(PREDICTFUN_CONTRACTS);
    });
  });

  // ---------------------------------------------------------------------------
  // Market Mapping
  // ---------------------------------------------------------------------------

  describe('Market Mapping', () => {
    describe('Basic Fields', () => {
      it('should map condition ID to id and externalId', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.id).toBe(mockMarket.conditionId);
        expect(market?.externalId).toBe(mockMarket.conditionId);
      });

      it('should generate question from condition ID', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          conditionId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.question).toBe('Market 0x12345678...');
      });

      it('should generate correct URL', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.url).toBe(`https://blast.predict.fun/market/${mockMarket.conditionId}`);
      });
    });

    describe('Status Mapping', () => {
      it('should map unresolved market to ACTIVE status', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({ isResolved: false });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.status).toBe('ACTIVE');
      });

      it('should map resolved market to RESOLVED status', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({ isResolved: true });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.status).toBe('RESOLVED');
      });
    });

    describe('Market Type Mapping', () => {
      it('should map 2-outcome market to BINARY', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({ outcomeCount: 2 });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.marketType).toBe('BINARY');
      });

      it('should map 3+ outcome market to MULTIPLE_CHOICE', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          outcomeCount: 3,
          outcomes: [
            { index: 0, tokenId: 'token0', price: 0.4 },
            { index: 1, tokenId: 'token1', price: 0.35 },
            { index: 2, tokenId: 'token2', price: 0.25 },
          ],
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.marketType).toBe('MULTIPLE_CHOICE');
      });
    });

    describe('Outcome Mapping', () => {
      it('should map outcomes correctly', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.outcomes).toHaveLength(2);
        expect(market?.outcomes[0].index).toBe(0);
        expect(market?.outcomes[0].label).toBe('Outcome 1');
        expect(market?.outcomes[0].price).toBe(0.6);
        expect(market?.outcomes[0].tokenId).toBe('token0');
        expect(market?.outcomes[1].index).toBe(1);
        expect(market?.outcomes[1].label).toBe('Outcome 2');
        expect(market?.outcomes[1].price).toBe(0.4);
      });

      it('should use 0 as default price when undefined', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          outcomes: [
            { index: 0, tokenId: 'token0' },
            { index: 1, tokenId: 'token1' },
          ],
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.outcomes[0].price).toBe(0);
        expect(market?.outcomes[1].price).toBe(0);
      });
    });

    describe('Price Mapping', () => {
      it('should set yesPrice from first outcome', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          outcomes: [
            { index: 0, tokenId: 'token0', price: 0.75 },
            { index: 1, tokenId: 'token1', price: 0.25 },
          ],
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.yesPrice).toBe(0.75);
      });

      it('should set noPrice from second outcome', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          outcomes: [
            { index: 0, tokenId: 'token0', price: 0.75 },
            { index: 1, tokenId: 'token1', price: 0.25 },
          ],
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.noPrice).toBe(0.25);
      });

      it('should use complement for noPrice when second outcome missing', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          outcomeCount: 1,
          outcomes: [
            { index: 0, tokenId: 'token0', price: 0.6 },
          ],
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.yesPrice).toBe(0.6);
        expect(market?.noPrice).toBeCloseTo(0.4);
      });

      it('should use 0.5 as default when no outcomes', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          outcomeCount: 0,
          outcomes: [],
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.yesPrice).toBe(0.5);
        expect(market?.noPrice).toBe(0.5);
      });
    });

    describe('Resolution Mapping', () => {
      it('should map winning outcome when resolved', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          isResolved: true,
          winningOutcome: 0,
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.resolution).toBe('Outcome 1');
        expect(market?.winningOutcomeIndex).toBe(0);
      });

      it('should mark correct outcome as winner', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          isResolved: true,
          winningOutcome: 1,
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.outcomes[0].isWinner).toBeNull();
        expect(market?.outcomes[1].isWinner).toBe(true);
      });

      it('should not set resolution for unresolved market', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({ isResolved: false });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.resolution).toBeUndefined();
        expect(market?.winningOutcomeIndex).toBeNull();
      });
    });

    describe('Platform Data', () => {
      it('should include platform-specific data', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.platformData).toEqual({
          conditionId: mockMarket.conditionId,
          questionId: mockMarket.questionId,
          oracle: mockMarket.oracle,
          chainId: BLAST_CHAIN_ID,
        });
      });
    });

    describe('Default Values', () => {
      it('should set volume to 0', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.volume).toBe(0);
      });

      it('should set liquidity to 0', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.liquidity).toBe(0);
      });

      it('should set category to undefined', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.category).toBeUndefined();
      });

      it('should set tags to empty array', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.tags).toEqual([]);
      });

      it('should set description to undefined', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.description).toBeUndefined();
      });

      it('should set createdAt to current date', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket();
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const before = new Date();
        const market = await adapter.getMarket(mockMarket.conditionId);
        const after = new Date();

        expect(market?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(market?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should set lastPrice to yesPrice', async () => {
        const mockClient = getMockClient();
        const mockMarket = createMockMarket({
          outcomes: [
            { index: 0, tokenId: 'token0', price: 0.65 },
            { index: 1, tokenId: 'token1', price: 0.35 },
          ],
        });
        mockClient.getMarket.mockResolvedValue(mockMarket);

        const adapter = new PredictFunAdapter();
        const market = await adapter.getMarket(mockMarket.conditionId);

        expect(market?.lastPrice).toBe(0.65);
      });
    });
  });
});

/**
 * Polymarket CLOB Client Tests
 * Tests for the PolymarketClobClient wrapper class
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PolymarketClobClient } from '../../src/polymarket/clob-client';

// Mock the @polymarket/clob-client
const mockClobClient = {
  getOrderBook: vi.fn(),
  getPrice: vi.fn(),
  getTrades: vi.fn(),
  getMarket: vi.fn(),
  getMidpoint: vi.fn(),
  getSpread: vi.fn(),
  getOpenOrders: vi.fn(),
};

vi.mock('@polymarket/clob-client', () => ({
  ClobClient: vi.fn(() => mockClobClient),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockOrderBook(overrides: Partial<{ bids: unknown[]; asks: unknown[] }> = {}) {
  return {
    bids: [
      { price: '0.65', size: '100' },
      { price: '0.64', size: '200' },
      { price: '0.63', size: '150' },
    ],
    asks: [
      { price: '0.67', size: '100' },
      { price: '0.68', size: '200' },
      { price: '0.69', size: '150' },
    ],
    ...overrides,
  };
}

function createMockTrades() {
  return [
    {
      id: 'trade-1',
      price: '0.65',
      size: '50',
      side: 'BUY',
      match_time: '2025-01-15T12:00:00Z',
      maker_address: '0xmaker1',
      taker_address: '0xtaker1',
    },
    {
      id: 'trade-2',
      price: '0.66',
      size: '75',
      side: 'SELL',
      created_at: '2025-01-15T11:00:00Z',
      maker_address: '0xmaker2',
      taker_address: '0xtaker2',
    },
  ];
}

// =============================================================================
// Configuration Tests
// =============================================================================

describe('PolymarketClobClient', () => {
  describe('Configuration', () => {
    it('should use default config values', () => {
      const client = new PolymarketClobClient();
      expect(client).toBeDefined();
    });

    it('should accept custom host', () => {
      const client = new PolymarketClobClient({
        host: 'https://custom-clob.example.com',
      });
      expect(client).toBeDefined();
    });

    it('should accept custom chain ID', () => {
      const client = new PolymarketClobClient({
        chainId: 80001, // Mumbai testnet
      });
      expect(client).toBeDefined();
    });
  });

  // ===========================================================================
  // Order Book Tests
  // ===========================================================================

  describe('getOrderBook', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch and transform order book', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(createMockOrderBook());

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(mockClobClient.getOrderBook).toHaveBeenCalledWith('token-123');
      expect(orderbook.marketId).toBe('token-123');
      expect(orderbook.platform).toBe('POLYMARKET');
      expect(orderbook.bids).toHaveLength(3);
      expect(orderbook.asks).toHaveLength(3);
    });

    it('should parse string prices and sizes to numbers', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(createMockOrderBook());

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(orderbook.bids[0]?.price).toBe(0.65);
      expect(orderbook.bids[0]?.size).toBe(100);
      expect(orderbook.asks[0]?.price).toBe(0.67);
      expect(orderbook.asks[0]?.size).toBe(100);
    });

    it('should calculate best bid as highest bid price', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(createMockOrderBook());

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(orderbook.bestBid).toBe(0.65);
    });

    it('should calculate best ask as lowest ask price', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(createMockOrderBook());

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(orderbook.bestAsk).toBe(0.67);
    });

    it('should calculate spread correctly', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(createMockOrderBook());

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(orderbook.spread).toBeCloseTo(0.02);
    });

    it('should calculate mid price correctly', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(createMockOrderBook());

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(orderbook.midPrice).toBeCloseTo(0.66);
    });

    it('should handle empty bids', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(
        createMockOrderBook({ bids: [] })
      );

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(orderbook.bids).toEqual([]);
      expect(orderbook.bestBid).toBeUndefined();
      expect(orderbook.spread).toBeUndefined();
      expect(orderbook.midPrice).toBeUndefined();
    });

    it('should handle empty asks', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(
        createMockOrderBook({ asks: [] })
      );

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(orderbook.asks).toEqual([]);
      expect(orderbook.bestAsk).toBeUndefined();
      expect(orderbook.spread).toBeUndefined();
      expect(orderbook.midPrice).toBeUndefined();
    });

    it('should handle null bids/asks', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce({});

      const client = new PolymarketClobClient();
      const orderbook = await client.getOrderBook('token-123');

      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
    });

    it('should include timestamp', async () => {
      mockClobClient.getOrderBook.mockResolvedValueOnce(createMockOrderBook());

      const client = new PolymarketClobClient();
      const before = new Date();
      const orderbook = await client.getOrderBook('token-123');
      const after = new Date();

      expect(orderbook.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(orderbook.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw descriptive error on failure', async () => {
      mockClobClient.getOrderBook.mockRejectedValueOnce(new Error('Network error'));

      const client = new PolymarketClobClient();
      await expect(client.getOrderBook('token-123')).rejects.toThrow(
        'Failed to fetch order book for token-123: Network error'
      );
    });
  });

  describe('getMarketOrderBooks', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch both YES and NO order books', async () => {
      mockClobClient.getOrderBook
        .mockResolvedValueOnce(createMockOrderBook())
        .mockResolvedValueOnce(createMockOrderBook());

      const client = new PolymarketClobClient();
      const result = await client.getMarketOrderBooks('yes-token', 'no-token');

      expect(mockClobClient.getOrderBook).toHaveBeenCalledWith('yes-token');
      expect(mockClobClient.getOrderBook).toHaveBeenCalledWith('no-token');
      expect(result.yes).toBeDefined();
      expect(result.no).toBeDefined();
    });

    it('should fetch order books in parallel', async () => {
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      mockClobClient.getOrderBook
        .mockImplementationOnce(async () => {
          await delay(50);
          return createMockOrderBook();
        })
        .mockImplementationOnce(async () => {
          await delay(50);
          return createMockOrderBook();
        });

      const client = new PolymarketClobClient();
      const start = Date.now();
      await client.getMarketOrderBooks('yes-token', 'no-token');
      const duration = Date.now() - start;

      // Should be less than 100ms if parallel (50ms each in series would be 100ms+)
      expect(duration).toBeLessThan(90);
    });
  });

  // ===========================================================================
  // Price Tests
  // ===========================================================================

  describe('getPrice', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch and return token price', async () => {
      mockClobClient.getPrice.mockResolvedValueOnce({ price: '0.72' });

      const client = new PolymarketClobClient();
      const result = await client.getPrice('token-123');

      expect(mockClobClient.getPrice).toHaveBeenCalledWith('token-123', 'buy');
      expect(result.tokenId).toBe('token-123');
      expect(result.price).toBe(0.72);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should default to buy side', async () => {
      mockClobClient.getPrice.mockResolvedValueOnce({ price: '0.50' });

      const client = new PolymarketClobClient();
      await client.getPrice('token-123');

      expect(mockClobClient.getPrice).toHaveBeenCalledWith('token-123', 'buy');
    });

    it('should support sell side', async () => {
      mockClobClient.getPrice.mockResolvedValueOnce({ price: '0.48' });

      const client = new PolymarketClobClient();
      await client.getPrice('token-123', 'sell');

      expect(mockClobClient.getPrice).toHaveBeenCalledWith('token-123', 'sell');
    });

    it('should return 0 for null price', async () => {
      mockClobClient.getPrice.mockResolvedValueOnce(null);

      const client = new PolymarketClobClient();
      const result = await client.getPrice('token-123');

      expect(result.price).toBe(0);
    });

    it('should return 0 for undefined price property', async () => {
      mockClobClient.getPrice.mockResolvedValueOnce({});

      const client = new PolymarketClobClient();
      const result = await client.getPrice('token-123');

      expect(result.price).toBe(0);
    });

    it('should throw descriptive error on failure', async () => {
      mockClobClient.getPrice.mockRejectedValueOnce(new Error('API error'));

      const client = new PolymarketClobClient();
      await expect(client.getPrice('token-123')).rejects.toThrow(
        'Failed to fetch price for token-123: API error'
      );
    });
  });

  describe('getPrices', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch prices for multiple tokens', async () => {
      mockClobClient.getPrice
        .mockResolvedValueOnce({ price: '0.60' })
        .mockResolvedValueOnce({ price: '0.70' })
        .mockResolvedValueOnce({ price: '0.55' });

      const client = new PolymarketClobClient();
      const results = await client.getPrices(['token-1', 'token-2', 'token-3']);

      expect(results).toHaveLength(3);
      expect(results[0]?.price).toBe(0.60);
      expect(results[1]?.price).toBe(0.70);
      expect(results[2]?.price).toBe(0.55);
    });

    it('should return 0 for failed price fetches', async () => {
      mockClobClient.getPrice
        .mockResolvedValueOnce({ price: '0.60' })
        .mockRejectedValueOnce(new Error('Token not found'))
        .mockResolvedValueOnce({ price: '0.55' });

      const client = new PolymarketClobClient();
      const results = await client.getPrices(['token-1', 'token-2', 'token-3']);

      expect(results).toHaveLength(3);
      expect(results[0]?.price).toBe(0.60);
      expect(results[1]?.price).toBe(0);
      expect(results[2]?.price).toBe(0.55);
    });

    it('should return empty array for empty input', async () => {
      const client = new PolymarketClobClient();
      const results = await client.getPrices([]);

      expect(results).toEqual([]);
    });
  });

  describe('getMarketPrices', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch YES and NO prices', async () => {
      mockClobClient.getPrice
        .mockResolvedValueOnce({ price: '0.65' })
        .mockResolvedValueOnce({ price: '0.35' });

      const client = new PolymarketClobClient();
      const result = await client.getMarketPrices('market-1', 'yes-token', 'no-token');

      expect(result.marketId).toBe('market-1');
      expect(result.yesTokenId).toBe('yes-token');
      expect(result.noTokenId).toBe('no-token');
      expect(result.yesPrice).toBe(0.65);
      expect(result.noPrice).toBe(0.35);
    });

    it('should calculate spread as deviation from unity', async () => {
      mockClobClient.getPrice
        .mockResolvedValueOnce({ price: '0.52' })
        .mockResolvedValueOnce({ price: '0.51' });

      const client = new PolymarketClobClient();
      const result = await client.getMarketPrices('market-1', 'yes', 'no');

      // Spread = |0.52 + 0.51 - 1| = 0.03
      expect(result.spread).toBeCloseTo(0.03);
    });

    it('should use YES price as mid price', async () => {
      mockClobClient.getPrice
        .mockResolvedValueOnce({ price: '0.73' })
        .mockResolvedValueOnce({ price: '0.27' });

      const client = new PolymarketClobClient();
      const result = await client.getMarketPrices('market-1', 'yes', 'no');

      expect(result.midPrice).toBe(0.73);
    });

    it('should include timestamp', async () => {
      mockClobClient.getPrice
        .mockResolvedValueOnce({ price: '0.50' })
        .mockResolvedValueOnce({ price: '0.50' });

      const client = new PolymarketClobClient();
      const result = await client.getMarketPrices('market-1', 'yes', 'no');

      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  // ===========================================================================
  // Trade History Tests
  // ===========================================================================

  describe('getTrades', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch and transform trades', async () => {
      mockClobClient.getTrades.mockResolvedValueOnce(createMockTrades());

      const client = new PolymarketClobClient();
      const trades = await client.getTrades('token-123');

      expect(mockClobClient.getTrades).toHaveBeenCalledWith({ asset_id: 'token-123' });
      expect(trades).toHaveLength(2);
    });

    it('should parse trade data correctly', async () => {
      mockClobClient.getTrades.mockResolvedValueOnce(createMockTrades());

      const client = new PolymarketClobClient();
      const trades = await client.getTrades('token-123');

      expect(trades[0]).toMatchObject({
        id: 'trade-1',
        marketId: 'token-123',
        platform: 'POLYMARKET',
        price: 0.65,
        size: 50,
        side: 'BUY',
        maker: '0xmaker1',
        taker: '0xtaker1',
      });
    });

    it('should use match_time for timestamp', async () => {
      mockClobClient.getTrades.mockResolvedValueOnce(createMockTrades());

      const client = new PolymarketClobClient();
      const trades = await client.getTrades('token-123');

      expect(trades[0]?.timestamp).toEqual(new Date('2025-01-15T12:00:00Z'));
    });

    it('should fall back to created_at for timestamp', async () => {
      mockClobClient.getTrades.mockResolvedValueOnce([
        { id: 'trade-3', price: '0.50', size: '10', side: 'buy', created_at: '2025-01-14T10:00:00Z' },
      ]);

      const client = new PolymarketClobClient();
      const trades = await client.getTrades('token-123');

      expect(trades[0]?.timestamp).toEqual(new Date('2025-01-14T10:00:00Z'));
    });

    it('should limit number of trades returned', async () => {
      const manyTrades = Array.from({ length: 200 }, (_, i) => ({
        id: `trade-${i}`,
        price: '0.50',
        size: '10',
        side: 'BUY',
      }));
      mockClobClient.getTrades.mockResolvedValueOnce(manyTrades);

      const client = new PolymarketClobClient();
      const trades = await client.getTrades('token-123', 50);

      expect(trades).toHaveLength(50);
    });

    it('should use default limit of 100', async () => {
      const manyTrades = Array.from({ length: 200 }, (_, i) => ({
        id: `trade-${i}`,
        price: '0.50',
        size: '10',
        side: 'BUY',
      }));
      mockClobClient.getTrades.mockResolvedValueOnce(manyTrades);

      const client = new PolymarketClobClient();
      const trades = await client.getTrades('token-123');

      expect(trades).toHaveLength(100);
    });

    it('should normalize side to uppercase BUY/SELL', async () => {
      mockClobClient.getTrades.mockResolvedValueOnce([
        { id: '1', price: '0.50', size: '10', side: 'buy' },
        { id: '2', price: '0.50', size: '10', side: 'sell' },
        { id: '3', price: '0.50', size: '10', side: 'SELL' },
      ]);

      const client = new PolymarketClobClient();
      const trades = await client.getTrades('token-123');

      expect(trades[0]?.side).toBe('BUY');
      expect(trades[1]?.side).toBe('SELL');
      expect(trades[2]?.side).toBe('SELL');
    });

    it('should handle null/undefined trades response', async () => {
      mockClobClient.getTrades.mockResolvedValueOnce(null);

      const client = new PolymarketClobClient();
      const trades = await client.getTrades('token-123');

      expect(trades).toEqual([]);
    });

    it('should throw descriptive error on failure', async () => {
      mockClobClient.getTrades.mockRejectedValueOnce(new Error('Connection error'));

      const client = new PolymarketClobClient();
      await expect(client.getTrades('token-123')).rejects.toThrow(
        'Failed to fetch trades for token-123: Connection error'
      );
    });
  });

  // ===========================================================================
  // Market Info Tests
  // ===========================================================================

  describe('getMarketInfo', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fetch and transform market info', async () => {
      mockClobClient.getMarket.mockResolvedValueOnce({
        condition_id: 'cond-123',
        question_id: 'q-456',
        tokens: [
          { token_id: 'yes-token', outcome: 'Yes' },
          { token_id: 'no-token', outcome: 'No' },
        ],
      });

      const client = new PolymarketClobClient();
      const result = await client.getMarketInfo('cond-123');

      expect(result).toEqual({
        conditionId: 'cond-123',
        questionId: 'q-456',
        tokens: [
          { tokenId: 'yes-token', outcome: 'Yes' },
          { tokenId: 'no-token', outcome: 'No' },
        ],
      });
    });

    it('should return null for non-existent market', async () => {
      mockClobClient.getMarket.mockResolvedValueOnce(null);

      const client = new PolymarketClobClient();
      const result = await client.getMarketInfo('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockClobClient.getMarket.mockRejectedValueOnce(new Error('API error'));

      const client = new PolymarketClobClient();
      const result = await client.getMarketInfo('cond-123');

      expect(result).toBeNull();
    });

    it('should handle missing question_id', async () => {
      mockClobClient.getMarket.mockResolvedValueOnce({
        condition_id: 'cond-123',
        tokens: [],
      });

      const client = new PolymarketClobClient();
      const result = await client.getMarketInfo('cond-123');

      expect(result?.questionId).toBe('');
    });

    it('should handle missing tokens', async () => {
      mockClobClient.getMarket.mockResolvedValueOnce({
        condition_id: 'cond-123',
      });

      const client = new PolymarketClobClient();
      const result = await client.getMarketInfo('cond-123');

      expect(result?.tokens).toEqual([]);
    });
  });

  describe('getMidpoint', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return midpoint price', async () => {
      mockClobClient.getMidpoint.mockResolvedValueOnce({ mid: '0.55' });

      const client = new PolymarketClobClient();
      const result = await client.getMidpoint('token-123');

      expect(result).toBe(0.55);
    });

    it('should return 0 on failure', async () => {
      mockClobClient.getMidpoint.mockRejectedValueOnce(new Error('Not found'));

      const client = new PolymarketClobClient();
      const result = await client.getMidpoint('token-123');

      expect(result).toBe(0);
    });

    it('should return 0 for null mid', async () => {
      mockClobClient.getMidpoint.mockResolvedValueOnce({});

      const client = new PolymarketClobClient();
      const result = await client.getMidpoint('token-123');

      expect(result).toBe(0);
    });
  });

  describe('getSpread', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return spread data', async () => {
      mockClobClient.getSpread.mockResolvedValueOnce({
        bid: '0.64',
        ask: '0.66',
      });

      const client = new PolymarketClobClient();
      const result = await client.getSpread('token-123');

      expect(result.bid).toBe(0.64);
      expect(result.ask).toBe(0.66);
      expect(result.spread).toBeCloseTo(0.02);
    });

    it('should return zeros on failure', async () => {
      mockClobClient.getSpread.mockRejectedValueOnce(new Error('API error'));

      const client = new PolymarketClobClient();
      const result = await client.getSpread('token-123');

      expect(result).toEqual({ bid: 0, ask: 0, spread: 0 });
    });

    it('should return zeros for null values', async () => {
      mockClobClient.getSpread.mockResolvedValueOnce({});

      const client = new PolymarketClobClient();
      const result = await client.getSpread('token-123');

      expect(result).toEqual({ bid: 0, ask: 0, spread: 0 });
    });
  });

  // ===========================================================================
  // Health Check Tests
  // ===========================================================================

  describe('healthCheck', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return true when API is accessible', async () => {
      mockClobClient.getOpenOrders.mockResolvedValueOnce([]);

      const client = new PolymarketClobClient();
      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return true even when getOpenOrders fails', async () => {
      // Open orders requires auth, but request going through means API is up
      mockClobClient.getOpenOrders.mockRejectedValueOnce(new Error('Unauthorized'));

      const client = new PolymarketClobClient();
      const result = await client.healthCheck();

      expect(result).toBe(true);
    });
  });
});

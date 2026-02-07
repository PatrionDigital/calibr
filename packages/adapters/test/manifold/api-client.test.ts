/**
 * Tests for Manifold Markets API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  ManifoldClient,
  manifoldClient,
  ManifoldAnswerSchema,
  ManifoldMarketSchema,
  ManifoldBetSchema,
  ManifoldUserSchema,
  type ManifoldMarket,
  type ManifoldAnswer,
  type ManifoldBet,
  type ManifoldUser,
  type ManifoldClientConfig,
} from '../../src/manifold/api-client';

// =============================================================================
// Test Data Helpers
// =============================================================================

function createMockMarket(overrides: Partial<ManifoldMarket> = {}): ManifoldMarket {
  return {
    id: 'market-123',
    slug: 'will-ai-pass-turing-test',
    question: 'Will an AI pass the Turing test by 2025?',
    textDescription: 'A market about AI capabilities',
    creatorId: 'creator-1',
    creatorUsername: 'forecaster',
    creatorName: 'Forecaster Pro',
    createdTime: Date.now() - 86400000,
    closeTime: Date.now() + 86400000 * 30,
    mechanism: 'cpmm-1',
    outcomeType: 'BINARY',
    isResolved: false,
    probability: 0.65,
    totalLiquidity: 10000,
    volume: 50000,
    volume24Hours: 2000,
    uniqueBettorCount: 150,
    ...overrides,
  };
}

function createMockAnswer(overrides: Partial<ManifoldAnswer> = {}): ManifoldAnswer {
  return {
    id: 'answer-1',
    text: 'Yes, by December 2025',
    probability: 0.4,
    index: 0,
    ...overrides,
  };
}

function createMockBet(overrides: Partial<ManifoldBet> = {}): ManifoldBet {
  return {
    id: 'bet-123',
    contractId: 'market-123',
    userId: 'user-1',
    amount: 100,
    shares: 150,
    outcome: 'YES',
    probBefore: 0.6,
    probAfter: 0.62,
    createdTime: Date.now(),
    ...overrides,
  };
}

function createMockUser(overrides: Partial<ManifoldUser> = {}): ManifoldUser {
  return {
    id: 'user-123',
    username: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    balance: 1000,
    totalDeposits: 500,
    createdTime: Date.now() - 86400000 * 365,
    ...overrides,
  };
}

function mockFetchResponse(data: unknown, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

// =============================================================================
// Zod Schema Tests
// =============================================================================

describe('Zod Schemas', () => {
  describe('ManifoldAnswerSchema', () => {
    it('should validate valid answer', () => {
      const answer = createMockAnswer();
      const result = ManifoldAnswerSchema.safeParse(answer);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields', () => {
      const answer = { id: 'a1', text: 'Option A' };
      const result = ManifoldAnswerSchema.safeParse(answer);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const answer = { text: 'No ID' };
      const result = ManifoldAnswerSchema.safeParse(answer);
      expect(result.success).toBe(false);
    });
  });

  describe('ManifoldMarketSchema', () => {
    it('should validate valid market', () => {
      const market = createMockMarket();
      const result = ManifoldMarketSchema.safeParse(market);
      expect(result.success).toBe(true);
    });

    it('should validate binary market', () => {
      const market = createMockMarket({ outcomeType: 'BINARY', mechanism: 'cpmm-1' });
      const result = ManifoldMarketSchema.safeParse(market);
      expect(result.success).toBe(true);
    });

    it('should validate multiple choice market', () => {
      const market = createMockMarket({
        outcomeType: 'MULTIPLE_CHOICE',
        mechanism: 'cpmm-multi-1',
        answers: [createMockAnswer(), createMockAnswer({ id: 'a2', text: 'Option B' })],
      });
      const result = ManifoldMarketSchema.safeParse(market);
      expect(result.success).toBe(true);
    });

    it('should validate resolved market', () => {
      const market = createMockMarket({
        isResolved: true,
        resolution: 'YES',
        resolutionTime: Date.now(),
        resolutionProbability: 1.0,
      });
      const result = ManifoldMarketSchema.safeParse(market);
      expect(result.success).toBe(true);
    });

    it('should require required fields', () => {
      const market = { id: 'test' };
      const result = ManifoldMarketSchema.safeParse(market);
      expect(result.success).toBe(false);
    });
  });

  describe('ManifoldBetSchema', () => {
    it('should validate valid bet', () => {
      const bet = createMockBet();
      const result = ManifoldBetSchema.safeParse(bet);
      expect(result.success).toBe(true);
    });

    it('should validate limit order', () => {
      const bet = createMockBet({
        limitProb: 0.5,
        orderAmount: 200,
        isFilled: false,
        isCancelled: false,
      });
      const result = ManifoldBetSchema.safeParse(bet);
      expect(result.success).toBe(true);
    });

    it('should validate redemption', () => {
      const bet = createMockBet({ isRedemption: true });
      const result = ManifoldBetSchema.safeParse(bet);
      expect(result.success).toBe(true);
    });
  });

  describe('ManifoldUserSchema', () => {
    it('should validate valid user', () => {
      const user = createMockUser();
      const result = ManifoldUserSchema.safeParse(user);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields', () => {
      const user = {
        id: 'u1',
        username: 'test',
        name: 'Test',
        balance: 100,
        createdTime: Date.now(),
      };
      const result = ManifoldUserSchema.safeParse(user);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// ManifoldClient Tests
// =============================================================================

describe('ManifoldClient', () => {
  let client: ManifoldClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client = new ManifoldClient();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const c = new ManifoldClient();
      expect(c).toBeInstanceOf(ManifoldClient);
    });

    it('should accept custom config', () => {
      const config: ManifoldClientConfig = {
        baseUrl: 'https://custom.api.com',
        apiKey: 'test-key',
        timeout: 60000,
      };
      const c = new ManifoldClient(config);
      expect(c).toBeInstanceOf(ManifoldClient);
    });

    it('should merge partial config with defaults', () => {
      const c = new ManifoldClient({ apiKey: 'my-key' });
      expect(c).toBeInstanceOf(ManifoldClient);
    });
  });

  describe('getMarkets', () => {
    it('should fetch markets with default params', async () => {
      const markets = [createMockMarket()];
      mockFetchResponse(markets);

      const result = await client.getMarkets();

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/markets'),
        expect.any(Object)
      );
    });

    it('should include limit param', async () => {
      mockFetchResponse([]);

      await client.getMarkets({ limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should include before param for pagination', async () => {
      mockFetchResponse([]);

      await client.getMarkets({ before: 'cursor-abc' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('before=cursor-abc'),
        expect.any(Object)
      );
    });

    it('should include sort and order params', async () => {
      mockFetchResponse([]);

      await client.getMarkets({ sort: 'updated-time', order: 'asc' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=updated-time'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('order=asc'),
        expect.any(Object)
      );
    });

    it('should cache market responses', async () => {
      const markets = [createMockMarket()];
      mockFetchResponse(markets);

      await client.getMarkets();
      await client.getMarkets();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchMarkets', () => {
    it('should search markets by term', async () => {
      const markets = [createMockMarket()];
      mockFetchResponse(markets);

      const result = await client.searchMarkets({ term: 'bitcoin' });

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/search-markets'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('term=bitcoin'),
        expect.any(Object)
      );
    });

    it('should filter by status', async () => {
      mockFetchResponse([]);

      await client.searchMarkets({ filter: 'open' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filter=open'),
        expect.any(Object)
      );
    });

    it('should filter by contract type', async () => {
      mockFetchResponse([]);

      await client.searchMarkets({ contractType: 'BINARY' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('contractType=BINARY'),
        expect.any(Object)
      );
    });

    it('should include topic slug', async () => {
      mockFetchResponse([]);

      await client.searchMarkets({ topicSlug: 'ai' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('topicSlug=ai'),
        expect.any(Object)
      );
    });

    it('should include pagination params', async () => {
      mockFetchResponse([]);

      await client.searchMarkets({ limit: 50, offset: 100 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=100'),
        expect.any(Object)
      );
    });
  });

  describe('getMarket', () => {
    it('should fetch market by ID', async () => {
      const market = createMockMarket();
      mockFetchResponse(market);

      const result = await client.getMarket('market-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('market-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/market/market-123'),
        expect.any(Object)
      );
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not found'),
      });

      const result = await client.getMarket('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(client.getMarket('test')).rejects.toThrow('500');
    });
  });

  describe('getMarketBySlug', () => {
    it('should fetch market by slug', async () => {
      const market = createMockMarket();
      mockFetchResponse(market);

      const result = await client.getMarketBySlug('will-ai-pass-turing-test');

      expect(result).not.toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/slug/will-ai-pass-turing-test'),
        expect.any(Object)
      );
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not found'),
      });

      const result = await client.getMarketBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getBets', () => {
    it('should fetch bets', async () => {
      const bets = [createMockBet()];
      mockFetchResponse(bets);

      const result = await client.getBets();

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/bets'),
        expect.any(Object)
      );
    });

    it('should filter by contract ID', async () => {
      mockFetchResponse([]);

      await client.getBets({ contractId: 'market-123' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('contractId=market-123'),
        expect.any(Object)
      );
    });

    it('should filter by user ID', async () => {
      mockFetchResponse([]);

      await client.getBets({ userId: 'user-1' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-1'),
        expect.any(Object)
      );
    });

    it('should include pagination params', async () => {
      mockFetchResponse([]);

      await client.getBets({ limit: 50, before: 'cursor' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('before=cursor'),
        expect.any(Object)
      );
    });
  });

  describe('getPositions', () => {
    it('should fetch positions for market', async () => {
      const positions = [{ id: 'pos-1', shares: 100 }];
      mockFetchResponse(positions);

      const result = await client.getPositions('market-123');

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/market/market-123/positions'),
        expect.any(Object)
      );
    });

    it('should filter by user ID', async () => {
      mockFetchResponse([]);

      await client.getPositions('market-123', { userId: 'user-1' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-1'),
        expect.any(Object)
      );
    });

    it('should include top/bottom params', async () => {
      mockFetchResponse([]);

      await client.getPositions('market-123', { top: 10, bottom: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('top=10'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('bottom=5'),
        expect.any(Object)
      );
    });

    it('should include order param', async () => {
      mockFetchResponse([]);

      await client.getPositions('market-123', { order: 'shares' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('order=shares'),
        expect.any(Object)
      );
    });
  });

  describe('getUser', () => {
    it('should fetch user by username', async () => {
      const user = createMockUser();
      mockFetchResponse(user);

      const result = await client.getUser('testuser');

      expect(result).not.toBeNull();
      expect(result?.username).toBe('testuser');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/user/testuser'),
        expect.any(Object)
      );
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not found'),
      });

      const result = await client.getUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getMe', () => {
    it('should fetch authenticated user', async () => {
      const authClient = new ManifoldClient({ apiKey: 'test-key' });
      const user = createMockUser();
      mockFetchResponse(user);

      const result = await authClient.getMe();

      expect(result.id).toBe('user-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v0/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Key test-key',
          }),
        })
      );
    });

    it('should throw error without API key', async () => {
      await expect(client.getMe()).rejects.toThrow('API key required');
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockFetchResponse([createMockMarket()]);

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      const market = createMockMarket();
      mockFetchResponse(market);
      mockFetchResponse({ ...market, question: 'Updated question' });

      await client.getMarket('test');
      client.clearCache();
      const result = await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result?.question).toBe('Updated question');
    });
  });

  describe('caching', () => {
    it('should cache GET responses', async () => {
      const market = createMockMarket();
      mockFetchResponse(market);

      await client.getMarket('test');
      await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      const market = createMockMarket();
      mockFetchResponse(market);
      mockFetchResponse({ ...market, question: 'Updated' });

      await client.getMarket('test');

      // Advance past cache TTL (30 seconds default)
      vi.advanceTimersByTime(31000);

      const result = await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result?.question).toBe('Updated');
    });

    it('should use different cache keys for different params', async () => {
      mockFetchResponse([createMockMarket({ id: '1' })]);
      mockFetchResponse([createMockMarket({ id: '2' })]);

      await client.getMarkets({ limit: 10 });
      await client.getMarkets({ limit: 20 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('timeout handling', () => {
    it('should abort request on timeout via AbortController', async () => {
      const shortTimeoutClient = new ManifoldClient({ timeout: 100 });

      mockFetch.mockImplementationOnce((_, options) => {
        // Simulate aborting
        return new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
          // Never resolve - let the abort happen
        });
      });

      vi.useRealTimers();
      await expect(shortTimeoutClient.getMarkets()).rejects.toThrow('timed out');
      vi.useFakeTimers();
    });
  });

  describe('API error handling', () => {
    it('should throw on non-200 responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Internal server error'),
      });

      await expect(client.getMarkets()).rejects.toThrow('Manifold API error: 500');
    });

    it('should include error text in exception', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid parameters'),
      });

      await expect(client.getMarkets()).rejects.toThrow('Invalid parameters');
    });
  });
});

// =============================================================================
// Singleton Export Tests
// =============================================================================

describe('manifoldClient singleton', () => {
  it('should be an instance of ManifoldClient', () => {
    expect(manifoldClient).toBeInstanceOf(ManifoldClient);
  });
});

// =============================================================================
// Type Tests
// =============================================================================

describe('Type definitions', () => {
  it('ManifoldClientConfig should accept all options', () => {
    const config: ManifoldClientConfig = {
      baseUrl: 'https://test.com',
      apiKey: 'key-123',
      timeout: 5000,
    };
    expect(config.baseUrl).toBe('https://test.com');
  });

  it('ManifoldMarket should have all market fields', () => {
    const market: ManifoldMarket = {
      id: 'test',
      slug: 'test-market',
      question: 'Test?',
      creatorId: 'c1',
      creatorUsername: 'creator',
      createdTime: Date.now(),
      isResolved: false,
    };
    expect(market.id).toBe('test');
  });

  it('ManifoldAnswer should have answer fields', () => {
    const answer: ManifoldAnswer = {
      id: 'a1',
      text: 'Option A',
      probability: 0.5,
    };
    expect(answer.text).toBe('Option A');
  });

  it('ManifoldBet should have bet fields', () => {
    const bet: ManifoldBet = {
      id: 'b1',
      contractId: 'm1',
      userId: 'u1',
      amount: 100,
      shares: 120,
      outcome: 'YES',
      createdTime: Date.now(),
    };
    expect(bet.amount).toBe(100);
  });

  it('ManifoldUser should have user fields', () => {
    const user: ManifoldUser = {
      id: 'u1',
      username: 'test',
      name: 'Test',
      balance: 1000,
      createdTime: Date.now(),
    };
    expect(user.balance).toBe(1000);
  });
});

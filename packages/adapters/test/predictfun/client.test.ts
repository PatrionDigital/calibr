/**
 * PredictFunClient Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PredictFunClient } from '../../src/predictfun/client';
import { PREDICTFUN_CONTRACTS, BLAST_RPC_URL } from '../../src/predictfun/contracts';

// =============================================================================
// Test Utilities
// =============================================================================

const mockFetch = vi.fn();

function mockRpcResponse(result: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result }),
  });
}

function mockRpcError(message: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, error: { message } }),
  });
}

function mockNetworkError(): void {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));
}

// =============================================================================
// Tests
// =============================================================================

describe('PredictFunClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  describe('configuration', () => {
    it('should use default RPC URL when none provided', () => {
      const client = new PredictFunClient();
      const contracts = client.getContracts();
      expect(contracts).toBe(PREDICTFUN_CONTRACTS);
    });

    it('should use custom RPC URL when provided', async () => {
      const customRpc = 'https://custom-rpc.example.com';
      const client = new PredictFunClient({ rpcUrl: customRpc });

      // Mock block number response
      mockRpcResponse('0x100');

      await client.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(customRpc, expect.any(Object));
    });

    it('should accept marketConditionIds in config', () => {
      const conditionIds = ['0x123', '0x456'];
      const client = new PredictFunClient({ marketConditionIds: conditionIds });
      expect(client).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getContracts
  // ---------------------------------------------------------------------------

  describe('getContracts', () => {
    it('should return PREDICTFUN_CONTRACTS', () => {
      const client = new PredictFunClient();
      const contracts = client.getContracts();

      expect(contracts).toEqual(PREDICTFUN_CONTRACTS);
      expect(contracts.conditionalTokens).toBe('0x8F9C9f888A4268Ab0E2DDa03A291769479bAc285');
      expect(contracts.ctfExchange).toBe('0x739f0331594029064C252559436eDce0E468E37a');
      expect(contracts.usdb).toBe('0x4300000000000000000000000000000000000003');
    });
  });

  // ---------------------------------------------------------------------------
  // healthCheck
  // ---------------------------------------------------------------------------

  describe('healthCheck', () => {
    it('should return true when RPC responds successfully', async () => {
      const client = new PredictFunClient();
      mockRpcResponse('0x1234');

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        BLAST_RPC_URL,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('eth_blockNumber'),
        })
      );
    });

    it('should return false when RPC returns error', async () => {
      const client = new PredictFunClient();
      mockRpcError('Connection refused');

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when fetch throws', async () => {
      const client = new PredictFunClient();
      mockNetworkError();

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // clearCache
  // ---------------------------------------------------------------------------

  describe('clearCache', () => {
    it('should clear cached data', async () => {
      const client = new PredictFunClient();

      // First call fetches from RPC
      mockRpcResponse('0x100'); // getBlockNumber
      await client.getMarkets();

      // Clear cache
      client.clearCache();

      // Second call should fetch again
      mockRpcResponse('0x101'); // getBlockNumber
      await client.getMarkets();

      // Both calls should have made RPC requests
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not throw when cache is empty', () => {
      const client = new PredictFunClient();
      expect(() => client.clearCache()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // getMarkets
  // ---------------------------------------------------------------------------

  describe('getMarkets', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const client = new PredictFunClient();
      mockRpcResponse('0x100'); // getBlockNumber

      const markets = await client.getMarkets();

      expect(markets).toEqual([]);
    });

    it('should cache results', async () => {
      const client = new PredictFunClient();
      mockRpcResponse('0x100'); // getBlockNumber

      // First call
      const markets1 = await client.getMarkets();
      // Second call should use cache
      const markets2 = await client.getMarkets();

      expect(markets1).toEqual(markets2);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should accept fromBlock parameter', async () => {
      const client = new PredictFunClient();
      mockRpcResponse('0x100'); // getBlockNumber

      const markets = await client.getMarkets({ fromBlock: 1000 });

      expect(markets).toEqual([]);
    });

    it('should accept limit parameter', async () => {
      const client = new PredictFunClient();
      mockRpcResponse('0x100'); // getBlockNumber

      const markets = await client.getMarkets({ limit: 10 });

      expect(markets).toEqual([]);
    });

    it('should return empty array on RPC error', async () => {
      const client = new PredictFunClient();
      mockRpcError('RPC unavailable');

      const markets = await client.getMarkets();

      expect(markets).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      const client = new PredictFunClient();
      mockNetworkError();

      const markets = await client.getMarkets();

      expect(markets).toEqual([]);
    });

    it('should use different cache keys for different fromBlock values', async () => {
      const client = new PredictFunClient();

      // First call with default (latest)
      mockRpcResponse('0x100');
      await client.getMarkets();

      // Second call with specific fromBlock - should not use cache
      mockRpcResponse('0x101');
      await client.getMarkets({ fromBlock: 5000 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // getMarket
  // ---------------------------------------------------------------------------

  describe('getMarket', () => {
    const testConditionId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should fetch market by condition ID', async () => {
      const client = new PredictFunClient();

      // Mock getOutcomeSlotCount response (returns 2 outcomes)
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      // Mock payoutDenominator response (returns 0 = not resolved)
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');

      const market = await client.getMarket(testConditionId);

      expect(market).not.toBeNull();
      expect(market?.conditionId).toBe(testConditionId);
      expect(market?.outcomeCount).toBe(2);
      expect(market?.outcomes).toHaveLength(2);
      expect(market?.isResolved).toBe(false);
    });

    it('should return null for non-existent market (outcomeCount = 0)', async () => {
      const client = new PredictFunClient();

      // Mock getOutcomeSlotCount response (returns 0)
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');

      const market = await client.getMarket(testConditionId);

      expect(market).toBeNull();
    });

    it('should detect resolved markets', async () => {
      const client = new PredictFunClient();

      // Mock getOutcomeSlotCount response (returns 2)
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      // Mock payoutDenominator response (returns 1 = resolved)
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000001');

      const market = await client.getMarket(testConditionId);

      expect(market?.isResolved).toBe(true);
    });

    it('should cache market results', async () => {
      const client = new PredictFunClient();

      // Mock responses for first call
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');

      // First call
      const market1 = await client.getMarket(testConditionId);
      // Second call should use cache
      const market2 = await client.getMarket(testConditionId);

      expect(market1).toEqual(market2);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Only first call made RPC requests
    });

    it('should build outcomes with uniform price distribution', async () => {
      const client = new PredictFunClient();

      // Mock 3 outcomes
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000003');
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');

      const market = await client.getMarket(testConditionId);

      expect(market?.outcomes).toHaveLength(3);
      expect(market?.outcomes[0].index).toBe(0);
      expect(market?.outcomes[1].index).toBe(1);
      expect(market?.outcomes[2].index).toBe(2);
      // Each outcome has 1/3 price
      expect(market?.outcomes[0].price).toBeCloseTo(1 / 3);
      expect(market?.outcomes[1].price).toBeCloseTo(1 / 3);
      expect(market?.outcomes[2].price).toBeCloseTo(1 / 3);
    });

    it('should set oracle to umaCtfAdapter', async () => {
      const client = new PredictFunClient();

      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');

      const market = await client.getMarket(testConditionId);

      expect(market?.oracle).toBe(PREDICTFUN_CONTRACTS.umaCtfAdapter);
    });

    it('should return null on RPC error', async () => {
      const client = new PredictFunClient();
      mockRpcError('Contract call failed');

      const market = await client.getMarket(testConditionId);

      expect(market).toBeNull();
    });

    it('should return null on network error', async () => {
      const client = new PredictFunClient();
      mockNetworkError();

      const market = await client.getMarket(testConditionId);

      expect(market).toBeNull();
    });

    it('should handle different condition ID lengths', async () => {
      const client = new PredictFunClient();
      const shortConditionId = '0x1234';

      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');

      const market = await client.getMarket(shortConditionId);

      expect(market?.conditionId).toBe(shortConditionId);
    });

    it('should call correct contract addresses', async () => {
      const client = new PredictFunClient();

      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');

      await client.getMarket(testConditionId);

      // Both calls should be to conditionalTokens contract
      const calls = mockFetch.mock.calls;
      expect(calls).toHaveLength(2);

      // Check first call (getOutcomeSlotCount)
      const firstBody = JSON.parse(calls[0][1].body);
      expect(firstBody.params[0].to).toBe(PREDICTFUN_CONTRACTS.conditionalTokens);
      expect(firstBody.params[0].data).toContain('abbc5e05'); // getOutcomeSlotCount selector

      // Check second call (payoutDenominator)
      const secondBody = JSON.parse(calls[1][1].body);
      expect(secondBody.params[0].to).toBe(PREDICTFUN_CONTRACTS.conditionalTokens);
      expect(secondBody.params[0].data).toContain('7e339ba8'); // payoutDenominator selector
    });
  });

  // ---------------------------------------------------------------------------
  // RPC Method Verification
  // ---------------------------------------------------------------------------

  describe('RPC method formatting', () => {
    it('should format eth_blockNumber request correctly', async () => {
      const client = new PredictFunClient();
      mockRpcResponse('0x100');

      await client.healthCheck();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody).toEqual({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      });
    });

    it('should format eth_call request correctly', async () => {
      const client = new PredictFunClient();
      const conditionId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');

      await client.getMarket(conditionId);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.jsonrpc).toBe('2.0');
      expect(callBody.id).toBe(1);
      expect(callBody.method).toBe('eth_call');
      expect(callBody.params).toHaveLength(2);
      expect(callBody.params[1]).toBe('latest');
    });

    it('should parse hex block number correctly', async () => {
      const client = new PredictFunClient();
      // 0x1234 = 4660 in decimal
      mockRpcResponse('0x1234');

      const healthy = await client.healthCheck();

      expect(healthy).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Cache Behavior
  // ---------------------------------------------------------------------------

  describe('cache behavior', () => {
    it('should expire cached getMarkets after TTL', async () => {
      vi.useFakeTimers();
      const client = new PredictFunClient();

      // First call
      mockRpcResponse('0x100');
      await client.getMarkets();

      // Advance time past TTL (60 seconds for markets)
      vi.advanceTimersByTime(61000);

      // Second call should fetch again
      mockRpcResponse('0x101');
      await client.getMarkets();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should expire cached getMarket after TTL', async () => {
      vi.useFakeTimers();
      const client = new PredictFunClient();
      const conditionId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      // First call
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');
      await client.getMarket(conditionId);

      // Advance time past TTL (30 seconds for market)
      vi.advanceTimersByTime(31000);

      // Second call should fetch again
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000002');
      mockRpcResponse('0x0000000000000000000000000000000000000000000000000000000000000000');
      await client.getMarket(conditionId);

      expect(mockFetch).toHaveBeenCalledTimes(4);
      vi.useRealTimers();
    });

    it('should return cached data within TTL', async () => {
      vi.useFakeTimers();
      const client = new PredictFunClient();

      // First call
      mockRpcResponse('0x100');
      const result1 = await client.getMarkets();

      // Advance time but stay within TTL
      vi.advanceTimersByTime(30000);

      // Second call should use cache
      const result2 = await client.getMarkets();

      expect(result1).toEqual(result2);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('should handle malformed RPC response gracefully', async () => {
      const client = new PredictFunClient();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ unexpected: 'format' }),
      });

      const market = await client.getMarket('0x123');

      expect(market).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      const client = new PredictFunClient();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it('should log errors to console', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const client = new PredictFunClient();

      mockRpcError('Test error');

      await client.getMarket('0x123');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PredictFun] Failed to fetch market:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Default Client Instance
  // ---------------------------------------------------------------------------

  describe('default client instance', () => {
    it('should export predictFunClient instance', async () => {
      const { predictFunClient } = await import('../../src/predictfun/client');
      expect(predictFunClient).toBeInstanceOf(PredictFunClient);
    });
  });
});

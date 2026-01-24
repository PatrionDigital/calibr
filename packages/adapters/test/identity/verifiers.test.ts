/**
 * Platform Verifier Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LimitlessVerifier, createLimitlessVerifier } from '../../src/identity/verifiers/limitless';
import { PolymarketVerifier, createPolymarketVerifier } from '../../src/identity/verifiers/polymarket';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LimitlessVerifier', () => {
  let verifier: LimitlessVerifier;
  const testWallet = '0x1234567890123456789012345678901234567890' as `0x${string}`;

  beforeEach(() => {
    verifier = new LimitlessVerifier();
    mockFetch.mockReset();
  });

  describe('platform', () => {
    it('should have correct platform identifier', () => {
      expect(verifier.platform).toBe('LIMITLESS');
    });
  });

  describe('verify', () => {
    it('should return verified=true when user has activity', async () => {
      // Mock positions endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ positions: [{ marketId: 'test', shares: 100 }] }),
      });

      // Mock user profile endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: testWallet,
          displayName: 'Test User',
          totalVolume: 5000,
        }),
      });

      const result = await verifier.verify({
        walletAddress: testWallet,
        platform: 'LIMITLESS',
      });

      expect(result.verified).toBe(true);
      expect(result.platform).toBe('LIMITLESS');
      expect(result.walletAddress).toBe(testWallet);
      expect(result.platformUserId).toBe(testWallet.toLowerCase());
      expect(result.proofHash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should return verified=false when user has no activity', async () => {
      // Mock positions endpoint - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ positions: [] }),
      });

      // Mock trades endpoint - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trades: [] }),
      });

      const result = await verifier.verify({
        walletAddress: testWallet,
        platform: 'LIMITLESS',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toContain('No Limitless activity found');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await verifier.verify({
        walletAddress: testWallet,
        platform: 'LIMITLESS',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('hasActivity', () => {
    it('should return true when user has positions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ positions: [{ marketId: 'test' }] }),
      });

      const result = await verifier.hasActivity(testWallet);
      expect(result).toBe(true);
    });

    it('should return true when user has trades but no positions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ positions: [] }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trades: [{ id: 'trade1' }] }),
      });

      const result = await verifier.hasActivity(testWallet);
      expect(result).toBe(true);
    });

    it('should return false when user has no activity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ positions: [] }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trades: [] }),
      });

      const result = await verifier.hasActivity(testWallet);
      expect(result).toBe(false);
    });
  });

  describe('getPlatformUserId', () => {
    it('should return wallet address when user has activity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ positions: [{ marketId: 'test' }] }),
      });

      const result = await verifier.getPlatformUserId(testWallet);
      expect(result).toBe(testWallet.toLowerCase());
    });

    it('should return null when user has no activity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ positions: [] }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trades: [] }),
      });

      const result = await verifier.getPlatformUserId(testWallet);
      expect(result).toBeNull();
    });
  });
});

describe('PolymarketVerifier', () => {
  let verifier: PolymarketVerifier;
  const testWallet = '0x1234567890123456789012345678901234567890' as `0x${string}`;

  beforeEach(() => {
    verifier = new PolymarketVerifier();
    mockFetch.mockReset();
  });

  describe('platform', () => {
    it('should have correct platform identifier', () => {
      expect(verifier.platform).toBe('POLYMARKET');
    });
  });

  describe('verify', () => {
    it('should return verified=true when user has CLOB positions', async () => {
      // Mock CLOB positions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ asset: 'token1', size: '100' }],
      });

      // Mock user profile
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Test User',
          totalTraded: 10000,
        }),
      });

      const result = await verifier.verify({
        walletAddress: testWallet,
        platform: 'POLYMARKET',
      });

      expect(result.verified).toBe(true);
      expect(result.platform).toBe('POLYMARKET');
      expect(result.metadata?.displayName).toBe('Test User');
    });

    it('should return verified=true when user has Gamma profile activity', async () => {
      // Mock CLOB positions - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      // Mock Gamma profile with activity
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Gamma User',
          totalTraded: 5000,
          positions: 3,
        }),
      });

      const result = await verifier.verify({
        walletAddress: testWallet,
        platform: 'POLYMARKET',
      });

      expect(result.verified).toBe(true);
    });

    it('should return verified=false when user has no activity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await verifier.verify({
        walletAddress: testWallet,
        platform: 'POLYMARKET',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toContain('No Polymarket activity found');
    });

    it('should use proxy wallet as platform user ID when available', async () => {
      const proxyWallet = '0xabcdef1234567890abcdef1234567890abcdef12';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ asset: 'token1' }],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          proxyWallet,
          name: 'Proxy User',
        }),
      });

      const result = await verifier.verify({
        walletAddress: testWallet,
        platform: 'POLYMARKET',
      });

      expect(result.platformUserId).toBe(proxyWallet);
    });
  });

  describe('hasActivity', () => {
    it('should return true when user has CLOB positions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ asset: 'token1' }],
      });

      const result = await verifier.hasActivity(testWallet);
      expect(result).toBe(true);
    });

    it('should return true when user has Gamma profile activity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalTraded: 100,
        }),
      });

      const result = await verifier.hasActivity(testWallet);
      expect(result).toBe(true);
    });
  });

  describe('getPlatformUserId', () => {
    it('should return proxy wallet when available', async () => {
      const proxyWallet = '0xabcdef1234567890abcdef1234567890abcdef12';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ proxyWallet }),
      });

      const result = await verifier.getPlatformUserId(testWallet);
      expect(result).toBe(proxyWallet);
    });

    it('should return wallet address when no proxy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ asset: 'token1' }],
      });

      const result = await verifier.getPlatformUserId(testWallet);
      expect(result).toBe(testWallet.toLowerCase());
    });
  });
});

describe('Factory functions', () => {
  describe('createLimitlessVerifier', () => {
    it('should create verifier with default config', () => {
      const verifier = createLimitlessVerifier();
      expect(verifier).toBeInstanceOf(LimitlessVerifier);
      expect(verifier.platform).toBe('LIMITLESS');
    });

    it('should create verifier with custom API URL', () => {
      const verifier = createLimitlessVerifier({
        apiBaseUrl: 'https://custom.api.com',
      });
      expect(verifier).toBeInstanceOf(LimitlessVerifier);
    });
  });

  describe('createPolymarketVerifier', () => {
    it('should create verifier with default config', () => {
      const verifier = createPolymarketVerifier();
      expect(verifier).toBeInstanceOf(PolymarketVerifier);
      expect(verifier.platform).toBe('POLYMARKET');
    });

    it('should create verifier with custom API URLs', () => {
      const verifier = createPolymarketVerifier({
        gammaApiUrl: 'https://custom-gamma.api.com',
        clobApiUrl: 'https://custom-clob.api.com',
      });
      expect(verifier).toBeInstanceOf(PolymarketVerifier);
    });
  });
});

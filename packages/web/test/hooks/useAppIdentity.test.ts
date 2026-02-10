/**
 * useAppIdentity Hook Tests
 * Tests for unified app identity state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAppIdentity } from '@/hooks/useAppIdentity';
import type { IdentityApiResponse, CalibrationTier } from '@/types/identity';

// =============================================================================
// Mock Setup
// =============================================================================

const mockUseAccount = vi.fn();
const mockUseChainId = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useChainId: () => mockUseChainId(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Test Utilities
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const createIdentityResponse = (
  overrides: Partial<IdentityApiResponse> = {}
): IdentityApiResponse => ({
  walletAddress: '0x1234567890123456789012345678901234567890',
  polymarketSafeAddress: null,
  polymarketSafeDeployed: false,
  hasClobCredentials: false,
  calibrationTier: null,
  linkedPlatforms: [],
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('useAppIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChainId.mockReturnValue(8453);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('disconnected state', () => {
    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });
    });

    it('returns empty identity when not connected', () => {
      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.walletAddress).toBeNull();
      expect(result.current.canTrade).toBe(false);
      expect(result.current.isFullyOnboarded).toBe(false);
    });

    it('does not fetch identity when not connected', () => {
      renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null identity source when not connected', () => {
      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      expect(result.current.identitySource).toBeNull();
    });
  });

  describe('connected state', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
      });
    });

    it('fetches identity when connected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse(),
        }),
      });

      renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/user/identity?address=${testAddress}`
        );
      });
    });

    it('returns wallet address when connected', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse(),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      expect(result.current.walletAddress).toBe(testAddress);
      expect(result.current.isConnected).toBe(true);
    });

    it('returns loading state while fetching', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('returns chain ID from wagmi', () => {
      mockUseChainId.mockReturnValue(84532);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse(),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      expect(result.current.chainId).toBe(84532);
    });
  });

  describe('identity source', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
      });
    });

    it('uses wallet as identity source when no safe deployed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            polymarketSafeDeployed: false,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.identitySource).toBe('wallet');
      });
    });

    it('uses safe as identity source when safe deployed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            polymarketSafeAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            polymarketSafeDeployed: true,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.identitySource).toBe('safe');
      });
    });
  });

  describe('trading capabilities', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
      });
    });

    it('canTrade is false without credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            hasClobCredentials: false,
            polymarketSafeDeployed: false,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.canTrade).toBe(false);
      });
    });

    it('canTrade is true with CLOB credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            hasClobCredentials: true,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.canTrade).toBe(true);
      });
    });

    it('canTrade is true with deployed safe', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            polymarketSafeDeployed: true,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.canTrade).toBe(true);
      });
    });
  });

  describe('onboarding status', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
      });
    });

    it('isFullyOnboarded is false with no linked platforms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            linkedPlatforms: [],
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFullyOnboarded).toBe(false);
      });
    });

    it('isFullyOnboarded is true with linked platforms', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            linkedPlatforms: [
              { platform: 'POLYMARKET', platformUserId: 'user123', verified: true },
            ],
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isFullyOnboarded).toBe(true);
        expect(result.current.linkedPlatforms).toHaveLength(1);
      });
    });
  });

  describe('calibration tier', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
      });
    });

    it('returns null calibration tier when not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            calibrationTier: null,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.calibrationTier).toBeNull();
      });
    });

    it.each([
      'APPRENTICE',
      'JOURNEYMAN',
      'EXPERT',
      'MASTER',
      'GRANDMASTER',
    ] as CalibrationTier[])('returns %s calibration tier correctly', async (tier) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            calibrationTier: tier,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.calibrationTier).toBe(tier);
      });
    });
  });

  describe('error handling', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
      });
    });

    it('still returns wallet address on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      // Even when API fails, wallet state should be preserved
      expect(result.current.walletAddress).toBe(testAddress);
      expect(result.current.isConnected).toBe(true);
    });

    it('returns default identity values on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      // Should still have wallet address even if API fails
      expect(result.current.walletAddress).toBe(testAddress);
      expect(result.current.canTrade).toBe(false);
      expect(result.current.linkedPlatforms).toEqual([]);
    });
  });

  describe('polymarket safe', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    const safeAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: testAddress,
        isConnected: true,
      });
    });

    it('returns safe address when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            polymarketSafeAddress: safeAddress,
            polymarketSafeDeployed: true,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.polymarketSafeAddress).toBe(safeAddress);
        expect(result.current.polymarketSafeDeployed).toBe(true);
      });
    });

    it('returns null safe address when not deployed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: createIdentityResponse({
            polymarketSafeAddress: null,
            polymarketSafeDeployed: false,
          }),
        }),
      });

      const { result } = renderHook(() => useAppIdentity(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.polymarketSafeAddress).toBeNull();
        expect(result.current.polymarketSafeDeployed).toBe(false);
      });
    });
  });
});

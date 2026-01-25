import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppIdentity } from '../useAppIdentity';
import {
  BASE_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
} from '@/types/identity';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useChainId: vi.fn(),
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

import { useAccount, useChainId } from 'wagmi';
import { useQuery } from '@tanstack/react-query';

describe('useAppIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: disconnected wallet
    (useAccount as Mock).mockReturnValue({
      address: undefined,
      isConnected: false,
    });
    (useChainId as Mock).mockReturnValue(undefined);
    (useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  describe('disconnected state', () => {
    it('returns empty identity when wallet is not connected', () => {
      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.walletAddress).toBeNull();
      expect(result.current.chainId).toBeNull();
      expect(result.current.identitySource).toBeNull();
      expect(result.current.canTrade).toBe(false);
      expect(result.current.isFullyOnboarded).toBe(false);
    });

    it('does not fetch identity data when disconnected', () => {
      renderHook(() => useAppIdentity());

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  describe('connected state - Base network', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890' as const;

    beforeEach(() => {
      (useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });
      (useChainId as Mock).mockReturnValue(BASE_CHAIN_ID);
    });

    it('returns connected state with wallet address', () => {
      (useQuery as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.isConnected).toBe(true);
      expect(result.current.walletAddress).toBe(mockAddress);
      expect(result.current.chainId).toBe(BASE_CHAIN_ID);
      expect(result.current.identitySource).toBe('wallet');
    });

    it('fetches identity data when connected', () => {
      (useQuery as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      renderHook(() => useAppIdentity());

      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          queryKey: ['identity', mockAddress],
        })
      );
    });

    it('populates identity from API response', () => {
      const mockApiResponse = {
        walletAddress: mockAddress,
        polymarketSafeAddress: '0xSafe123456789012345678901234567890123456',
        polymarketSafeDeployed: true,
        hasClobCredentials: true,
        calibrationTier: 'EXPERT' as const,
        linkedPlatforms: [
          { platform: 'POLYMARKET' as const, platformUserId: 'user123', verified: true },
        ],
      };

      (useQuery as Mock).mockReturnValue({
        data: mockApiResponse,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.polymarketSafeAddress).toBe(mockApiResponse.polymarketSafeAddress);
      expect(result.current.polymarketSafeDeployed).toBe(true);
      expect(result.current.hasClobCredentials).toBe(true);
      expect(result.current.calibrationTier).toBe('EXPERT');
      expect(result.current.linkedPlatforms).toHaveLength(1);
      expect(result.current.linkedPlatforms[0].platform).toBe('POLYMARKET');
    });

    it('sets canTrade to true when wallet and credentials are present', () => {
      (useQuery as Mock).mockReturnValue({
        data: {
          walletAddress: mockAddress,
          polymarketSafeAddress: '0xSafe123456789012345678901234567890123456',
          polymarketSafeDeployed: true,
          hasClobCredentials: true,
          calibrationTier: null,
          linkedPlatforms: [],
        },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.canTrade).toBe(true);
    });

    it('sets canTrade to false when credentials are missing', () => {
      (useQuery as Mock).mockReturnValue({
        data: {
          walletAddress: mockAddress,
          polymarketSafeAddress: null,
          polymarketSafeDeployed: false,
          hasClobCredentials: false,
          calibrationTier: null,
          linkedPlatforms: [],
        },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.canTrade).toBe(false);
    });

    it('sets isFullyOnboarded when wallet and linked platform exist', () => {
      (useQuery as Mock).mockReturnValue({
        data: {
          walletAddress: mockAddress,
          polymarketSafeAddress: null,
          polymarketSafeDeployed: false,
          hasClobCredentials: false,
          calibrationTier: null,
          linkedPlatforms: [
            { platform: 'LIMITLESS' as const, platformUserId: 'user456', verified: true },
          ],
        },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.isFullyOnboarded).toBe(true);
    });

    it('sets isFullyOnboarded to false when no platforms linked', () => {
      (useQuery as Mock).mockReturnValue({
        data: {
          walletAddress: mockAddress,
          polymarketSafeAddress: null,
          polymarketSafeDeployed: false,
          hasClobCredentials: false,
          calibrationTier: null,
          linkedPlatforms: [],
        },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.isFullyOnboarded).toBe(false);
    });
  });

  describe('connected state - Base Sepolia (testnet)', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890' as const;

    it('treats Base Sepolia as valid network', () => {
      (useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });
      (useChainId as Mock).mockReturnValue(BASE_SEPOLIA_CHAIN_ID);
      (useQuery as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.isConnected).toBe(true);
      expect(result.current.chainId).toBe(BASE_SEPOLIA_CHAIN_ID);
      expect(result.current.identitySource).toBe('wallet');
    });
  });

  describe('identity source priority', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890' as const;

    beforeEach(() => {
      (useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });
      (useChainId as Mock).mockReturnValue(BASE_CHAIN_ID);
    });

    it('uses wallet as identity source when no Safe is deployed', () => {
      (useQuery as Mock).mockReturnValue({
        data: {
          walletAddress: mockAddress,
          polymarketSafeAddress: null,
          polymarketSafeDeployed: false,
          hasClobCredentials: false,
          calibrationTier: null,
          linkedPlatforms: [],
        },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.identitySource).toBe('wallet');
    });

    it('uses safe as identity source when Safe is deployed', () => {
      (useQuery as Mock).mockReturnValue({
        data: {
          walletAddress: mockAddress,
          polymarketSafeAddress: '0xSafe123456789012345678901234567890123456',
          polymarketSafeDeployed: true,
          hasClobCredentials: true,
          calibrationTier: null,
          linkedPlatforms: [],
        },
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.identitySource).toBe('safe');
    });
  });

  describe('loading and error states', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890' as const;

    beforeEach(() => {
      (useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      });
      (useChainId as Mock).mockReturnValue(BASE_CHAIN_ID);
    });

    it('reflects loading state from query', () => {
      (useQuery as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);
    });

    it('reflects error state from query', () => {
      (useQuery as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      const { result } = renderHook(() => useAppIdentity());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
    });
  });
});

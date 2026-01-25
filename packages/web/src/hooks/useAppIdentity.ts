'use client';

import { useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import {
  type AppIdentity,
  type IdentityApiResponse,
  type IdentitySource,
  EMPTY_IDENTITY,
} from '@/types/identity';

/**
 * Fetch identity data from API
 */
async function fetchIdentity(address: string): Promise<IdentityApiResponse> {
  const response = await fetch(`/api/user/identity?address=${address}`);
  if (!response.ok) {
    throw new Error('Failed to fetch identity');
  }
  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch identity');
  }
  return json.data;
}

/**
 * Hook to get the unified app identity state
 *
 * Identity priority:
 * 1. Connected Wallet (Base)
 * 2. Polymarket Safe (if deployed)
 * 3. Linked Platform Identities (from EAS)
 *
 * @returns AppIdentity object with wallet, safe, and platform identity information
 */
export function useAppIdentity(): AppIdentity {
  // Get wallet state from wagmi
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Determine if we should fetch identity data
  const shouldFetch = isConnected && !!address;

  // Fetch identity data from API
  const { data: identityData, isLoading, isError } = useQuery({
    queryKey: ['identity', address],
    queryFn: () => fetchIdentity(address!),
    enabled: shouldFetch,
    staleTime: 30_000, // 30 seconds
    retry: 2,
  });

  // Compute derived identity state
  const identity = useMemo<AppIdentity>(() => {
    // If not connected, return empty identity
    if (!isConnected || !address) {
      return {
        ...EMPTY_IDENTITY,
        isLoading,
        isError,
      };
    }

    // Base identity from wallet
    const baseIdentity: AppIdentity = {
      walletAddress: address as `0x${string}`,
      chainId: chainId ?? null,
      isConnected: true,
      polymarketSafeAddress: null,
      polymarketSafeDeployed: false,
      hasClobCredentials: false,
      linkedPlatforms: [],
      calibrationTier: null,
      identitySource: 'wallet' as IdentitySource,
      canTrade: false,
      isFullyOnboarded: false,
      isLoading,
      isError,
    };

    // If no API data yet, return base identity
    if (!identityData) {
      return baseIdentity;
    }

    // Merge API data with base identity
    const polymarketSafeAddress = identityData.polymarketSafeAddress
      ? (identityData.polymarketSafeAddress as `0x${string}`)
      : null;
    const polymarketSafeDeployed = identityData.polymarketSafeDeployed;
    const hasClobCredentials = identityData.hasClobCredentials;
    const linkedPlatforms = identityData.linkedPlatforms;
    const calibrationTier = identityData.calibrationTier;

    // Determine identity source:
    // - If Safe is deployed, use 'safe' as identity source
    // - Otherwise, use 'wallet'
    const identitySource: IdentitySource = polymarketSafeDeployed ? 'safe' : 'wallet';

    // canTrade: Has wallet + platform credentials (CLOB or deployed Safe)
    const canTrade = isConnected && (hasClobCredentials || polymarketSafeDeployed);

    // isFullyOnboarded: Has wallet + at least one platform linked
    const isFullyOnboarded = isConnected && linkedPlatforms.length > 0;

    return {
      walletAddress: address as `0x${string}`,
      chainId: chainId ?? null,
      isConnected: true,
      polymarketSafeAddress,
      polymarketSafeDeployed,
      hasClobCredentials,
      linkedPlatforms,
      calibrationTier,
      identitySource,
      canTrade,
      isFullyOnboarded,
      isLoading,
      isError,
    };
  }, [isConnected, address, chainId, identityData, isLoading, isError]);

  return identity;
}

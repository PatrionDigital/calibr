import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { IdentityApiResponse, CalibrationTier, LinkedPlatform } from '@/types/identity';

// Ethereum address validation regex (allows both 0x and 0X prefix)
const ADDRESS_REGEX = /^0[xX][a-fA-F0-9]{40}$/;

// Request schema
const querySchema = z.object({
  address: z.string().regex(ADDRESS_REGEX, 'Invalid address format'),
});

/**
 * Response wrapper for consistent API responses
 */
function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * GET /api/user/identity
 *
 * Returns identity information for a wallet address including:
 * - Polymarket Safe address and deployment status
 * - CLOB credentials status
 * - Calibration tier
 * - Linked platform identities from EAS attestations
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  // Validate address is provided
  if (!address) {
    return errorResponse('Address required', 400);
  }

  // Validate address format
  const parseResult = querySchema.safeParse({ address });
  if (!parseResult.success) {
    return errorResponse('Invalid address format', 400);
  }

  // Normalize address to lowercase
  const normalizedAddress = address.toLowerCase();

  try {
    // Try to fetch from backend API
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    if (backendUrl) {
      const response = await fetch(
        `${backendUrl}/api/portfolio/wallet/${normalizedAddress}`,
        {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (response.ok) {
        const backendData = await response.json();
        if (backendData.success && backendData.data) {
          const wallet = backendData.data;
          // Map backend response to our identity format
          const identityData: IdentityApiResponse = {
            walletAddress: normalizedAddress,
            polymarketSafeAddress: wallet.polymarketSafeAddress || null,
            polymarketSafeDeployed: wallet.polymarketSafeDeployed ?? false,
            hasClobCredentials: !!(wallet.clobApiKey),
            calibrationTier: wallet.user?.calibration?.currentTier as CalibrationTier ?? null,
            linkedPlatforms: (wallet.user?.easAttestations || [])
              .filter((a: { schemaName: string }) => a.schemaName === 'CalibrIdentity')
              .map((a: { data: { platform: string; platformUserId: string; verified: boolean } }) => ({
                platform: a.data.platform,
                platformUserId: a.data.platformUserId,
                verified: a.data.verified,
              })) as LinkedPlatform[],
          };
          return successResponse(identityData);
        }
      }
    }

    // If backend is not available or returns no data, return default identity
    // This allows the app to work in development without a database connection
    const defaultIdentity: IdentityApiResponse = {
      walletAddress: normalizedAddress,
      polymarketSafeAddress: null,
      polymarketSafeDeployed: false,
      hasClobCredentials: false,
      calibrationTier: null,
      linkedPlatforms: [],
    };

    return successResponse(defaultIdentity);
  } catch (error) {
    console.error('Error fetching identity:', error);
    // Return default identity on error to allow graceful degradation
    const defaultIdentity: IdentityApiResponse = {
      walletAddress: normalizedAddress,
      polymarketSafeAddress: null,
      polymarketSafeDeployed: false,
      hasClobCredentials: false,
      calibrationTier: null,
      linkedPlatforms: [],
    };
    return successResponse(defaultIdentity);
  }
}

/**
 * Polymarket Identity Verifier
 * Verifies user identity on Polymarket prediction market (Polygon chain)
 */

import { keccak256, toBytes } from 'viem';
import type {
  IdentityPlatform,
  IdentityVerificationRequest,
  IdentityVerificationResult,
  IPlatformVerifier,
} from '../types';

const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com';

interface PolymarketProfile {
  proxyWallet?: string;
  name?: string;
  username?: string;
  profileImage?: string;
  bio?: string;
  totalTraded?: number;
  positions?: number;
}

interface PolymarketPosition {
  asset: string;
  conditionId: string;
  size: string;
  avgPrice: string;
  market: string;
}

/**
 * Polymarket Platform Verifier
 * Verifies identity by checking Polygon chain activity and CLOB positions
 */
export class PolymarketVerifier implements IPlatformVerifier {
  readonly platform: IdentityPlatform = 'POLYMARKET';
  private gammaApiUrl: string;
  private clobApiUrl: string;

  constructor(config?: { gammaApiUrl?: string; clobApiUrl?: string }) {
    this.gammaApiUrl = config?.gammaApiUrl || POLYMARKET_GAMMA_API;
    this.clobApiUrl = config?.clobApiUrl || POLYMARKET_CLOB_API;
  }

  /**
   * Verify user's identity on Polymarket
   * Polymarket uses Polygon chain with optional proxy wallets
   */
  async verify(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    const { walletAddress, platformUserId } = request;

    try {
      // Check for activity using the provided user ID or wallet address
      const userId = platformUserId || walletAddress;
      const hasActivity = await this.hasActivity(walletAddress);

      if (!hasActivity) {
        return {
          verified: false,
          platform: this.platform,
          walletAddress,
          platformUserId: userId.toLowerCase(),
          proofHash: '0x0' as `0x${string}`,
          verifiedAt: 0,
          error: 'No Polymarket activity found for this wallet',
        };
      }

      // Get user profile data
      const profile = await this.getUserProfile(walletAddress);
      const timestamp = Math.floor(Date.now() / 1000);

      // Determine the platform user ID (could be proxy wallet or main wallet)
      const resolvedUserId =
        profile?.proxyWallet || platformUserId || walletAddress.toLowerCase();

      // Generate proof hash
      const proofHash = this.generateProofHash(
        walletAddress,
        resolvedUserId,
        timestamp
      );

      return {
        verified: true,
        platform: this.platform,
        walletAddress,
        platformUserId: resolvedUserId,
        proofHash,
        verifiedAt: timestamp,
        metadata: {
          displayName: profile?.name || profile?.username,
          totalVolume: profile?.totalTraded,
          positionCount: profile?.positions,
        },
      };
    } catch (error) {
      return {
        verified: false,
        platform: this.platform,
        walletAddress,
        platformUserId: '',
        proofHash: '0x0' as `0x${string}`,
        verifiedAt: 0,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Check if user has any activity on Polymarket
   */
  async hasActivity(walletAddress: `0x${string}`): Promise<boolean> {
    try {
      // Check CLOB positions
      const positions = await this.getUserPositions(walletAddress);
      if (positions && positions.length > 0) {
        return true;
      }

      // Check gamma API for trade history
      const profile = await this.getUserProfile(walletAddress);
      if (profile && (profile.totalTraded || profile.positions)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific user ID
   * For Polymarket, this could be the proxy wallet or the main wallet
   */
  async getPlatformUserId(
    walletAddress: `0x${string}`
  ): Promise<string | null> {
    try {
      const profile = await this.getUserProfile(walletAddress);
      if (profile?.proxyWallet) {
        return profile.proxyWallet;
      }
      const hasActivity = await this.hasActivity(walletAddress);
      return hasActivity ? walletAddress.toLowerCase() : null;
    } catch {
      return null;
    }
  }

  /**
   * Get user's positions from Polymarket CLOB
   */
  private async getUserPositions(
    walletAddress: `0x${string}`
  ): Promise<PolymarketPosition[] | null> {
    try {
      const response = await fetch(
        `${this.clobApiUrl}/positions?user=${walletAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as PolymarketPosition[] | undefined;
      return data || [];
    } catch {
      return null;
    }
  }

  /**
   * Get user profile from Polymarket Gamma API
   */
  private async getUserProfile(
    walletAddress: `0x${string}`
  ): Promise<PolymarketProfile | null> {
    try {
      const response = await fetch(
        `${this.gammaApiUrl}/users/${walletAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json() as PolymarketProfile;
    } catch {
      return null;
    }
  }

  /**
   * Generate proof hash for attestation
   */
  private generateProofHash(
    walletAddress: `0x${string}`,
    platformUserId: string,
    timestamp: number
  ): `0x${string}` {
    const data = `${walletAddress}:${this.platform}:${platformUserId}:${timestamp}`;
    return keccak256(toBytes(data));
  }
}

// Export factory function
export function createPolymarketVerifier(config?: {
  gammaApiUrl?: string;
  clobApiUrl?: string;
}): PolymarketVerifier {
  return new PolymarketVerifier(config);
}

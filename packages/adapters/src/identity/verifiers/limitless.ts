/**
 * Limitless Identity Verifier
 * Verifies user identity on Limitless prediction market (Base chain)
 */

import { keccak256, toBytes } from 'viem';
import type {
  IdentityPlatform,
  IdentityVerificationRequest,
  IdentityVerificationResult,
  IPlatformVerifier,
} from '../types';

const LIMITLESS_API_BASE = 'https://api.limitless.exchange/api-v1';

interface LimitlessUserProfile {
  address: string;
  displayName?: string;
  username?: string;
  totalVolume?: number;
  positionCount?: number;
  createdAt?: string;
}

interface LimitlessPosition {
  marketId: string;
  outcome: string;
  shares: number;
  avgPrice: number;
}

/**
 * Limitless Platform Verifier
 * Verifies identity by checking on-chain activity and wallet ownership
 */
export class LimitlessVerifier implements IPlatformVerifier {
  readonly platform: IdentityPlatform = 'LIMITLESS';
  private apiBaseUrl: string;

  constructor(config?: { apiBaseUrl?: string }) {
    this.apiBaseUrl = config?.apiBaseUrl || LIMITLESS_API_BASE;
  }

  /**
   * Verify user's identity on Limitless
   * Since Limitless uses the same wallet as Base, verification is straightforward
   */
  async verify(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    const { walletAddress } = request;

    try {
      // Check if user has any activity on Limitless
      const hasActivity = await this.hasActivity(walletAddress);

      if (!hasActivity) {
        return {
          verified: false,
          platform: this.platform,
          walletAddress,
          platformUserId: walletAddress.toLowerCase(),
          proofHash: '0x0' as `0x${string}`,
          verifiedAt: 0,
          error: 'No Limitless activity found for this wallet',
        };
      }

      // Get user profile data if available
      const profile = await this.getUserProfile(walletAddress);
      const timestamp = Math.floor(Date.now() / 1000);

      // Generate proof hash
      const proofHash = this.generateProofHash(
        walletAddress,
        walletAddress.toLowerCase(), // Limitless uses wallet address as user ID
        timestamp
      );

      return {
        verified: true,
        platform: this.platform,
        walletAddress,
        platformUserId: walletAddress.toLowerCase(),
        proofHash,
        verifiedAt: timestamp,
        metadata: {
          displayName: profile?.displayName || profile?.username,
          totalVolume: profile?.totalVolume,
          positionCount: profile?.positionCount,
          createdAt: profile?.createdAt,
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
   * Check if user has any activity on Limitless
   */
  async hasActivity(walletAddress: `0x${string}`): Promise<boolean> {
    try {
      // Check for positions
      const positions = await this.getUserPositions(walletAddress);
      if (positions && positions.length > 0) {
        return true;
      }

      // Check for trade history
      const trades = await this.getUserTrades(walletAddress);
      return trades && trades.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific user ID (wallet address for Limitless)
   */
  async getPlatformUserId(
    walletAddress: `0x${string}`
  ): Promise<string | null> {
    const hasActivity = await this.hasActivity(walletAddress);
    return hasActivity ? walletAddress.toLowerCase() : null;
  }

  /**
   * Get user's positions on Limitless
   */
  private async getUserPositions(
    walletAddress: `0x${string}`
  ): Promise<LimitlessPosition[] | null> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/positions?owner=${walletAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.positions || data || [];
    } catch {
      return null;
    }
  }

  /**
   * Get user's trade history on Limitless
   */
  private async getUserTrades(
    walletAddress: `0x${string}`
  ): Promise<unknown[] | null> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/trades?trader=${walletAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.trades || data || [];
    } catch {
      return null;
    }
  }

  /**
   * Get user profile from Limitless
   */
  private async getUserProfile(
    walletAddress: `0x${string}`
  ): Promise<LimitlessUserProfile | null> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/users/${walletAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
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
export function createLimitlessVerifier(config?: {
  apiBaseUrl?: string;
}): LimitlessVerifier {
  return new LimitlessVerifier(config);
}

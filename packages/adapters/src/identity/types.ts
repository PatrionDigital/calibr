/**
 * Identity Verification Types
 * Types for cross-platform identity linking on Calibr
 */

/**
 * Supported platforms for identity verification
 */
export type IdentityPlatform = 'LIMITLESS' | 'POLYMARKET' | 'MANIFOLD' | 'OPINION';

/**
 * Verification status
 */
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';

/**
 * Identity verification request
 */
export interface IdentityVerificationRequest {
  /** User's Base wallet address */
  walletAddress: `0x${string}`;
  /** Platform to verify */
  platform: IdentityPlatform;
  /** Platform-specific user ID (optional - some platforms use wallet address) */
  platformUserId?: string;
  /** Signature proving wallet ownership */
  signature?: `0x${string}`;
  /** Message that was signed */
  signedMessage?: string;
}

/**
 * Identity verification result
 */
export interface IdentityVerificationResult {
  /** Whether verification succeeded */
  verified: boolean;
  /** Platform that was verified */
  platform: IdentityPlatform;
  /** User's wallet address */
  walletAddress: `0x${string}`;
  /** Platform-specific user ID */
  platformUserId: string;
  /** Proof hash for attestation */
  proofHash: `0x${string}`;
  /** Verification timestamp */
  verifiedAt: number;
  /** Error message if verification failed */
  error?: string;
  /** Additional platform-specific data */
  metadata?: {
    /** User's display name on platform */
    displayName?: string;
    /** Total volume traded */
    totalVolume?: number;
    /** Number of positions */
    positionCount?: number;
    /** Account creation date */
    createdAt?: string;
  };
}

/**
 * Identity link stored after verification
 */
export interface IdentityLink {
  /** Unique ID */
  id: string;
  /** User's Base wallet address */
  walletAddress: `0x${string}`;
  /** Platform name */
  platform: IdentityPlatform;
  /** Platform-specific user ID */
  platformUserId: string;
  /** Proof hash (for attestation) */
  proofHash: `0x${string}`;
  /** Whether currently verified */
  verified: boolean;
  /** When verified */
  verifiedAt: number;
  /** When link was created */
  createdAt: number;
  /** When link was last updated */
  updatedAt: number;
  /** EAS attestation UID (if attested on-chain) */
  attestationUid?: `0x${string}`;
}

/**
 * Platform verifier interface
 */
export interface IPlatformVerifier {
  /** Platform this verifier handles */
  readonly platform: IdentityPlatform;

  /**
   * Verify user owns account on this platform
   */
  verify(request: IdentityVerificationRequest): Promise<IdentityVerificationResult>;

  /**
   * Check if user has activity on this platform
   */
  hasActivity(walletAddress: `0x${string}`): Promise<boolean>;

  /**
   * Get user's platform-specific ID
   */
  getPlatformUserId(walletAddress: `0x${string}`): Promise<string | null>;
}

/**
 * Identity service configuration
 */
export interface IdentityServiceConfig {
  /** Base RPC URL */
  baseRpcUrl?: string;
  /** Polygon RPC URL (for Polymarket) */
  polygonRpcUrl?: string;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
}

/**
 * Message format for identity verification signing
 */
export const IDENTITY_VERIFICATION_MESSAGE = (
  platform: IdentityPlatform,
  walletAddress: string,
  timestamp: number
) => `Calibr Identity Verification

I am linking my ${platform} account to Calibr.

Wallet: ${walletAddress}
Platform: ${platform}
Timestamp: ${timestamp}

This signature proves I own this wallet and authorizes Calibr to link my ${platform} activity to my Calibr profile.`;

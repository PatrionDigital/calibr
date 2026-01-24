/**
 * Identity Verification Service
 * Manages cross-platform identity verification and linking for Calibr
 */

import { keccak256, toBytes, recoverMessageAddress } from 'viem';
import type {
  IdentityPlatform,
  IdentityVerificationRequest,
  IdentityVerificationResult,
  IdentityLink,
  IPlatformVerifier,
  IdentityServiceConfig,
} from './types';
import { IDENTITY_VERIFICATION_MESSAGE } from './types';

/**
 * Identity Verification Service
 * Coordinates identity verification across multiple prediction market platforms
 */
export class IdentityVerificationService {
  private verifiers: Map<IdentityPlatform, IPlatformVerifier> = new Map();
  private links: Map<string, IdentityLink> = new Map(); // In-memory cache
  private config: Required<IdentityServiceConfig>;

  constructor(config: IdentityServiceConfig = {}) {
    this.config = {
      baseRpcUrl: config.baseRpcUrl || 'https://mainnet.base.org',
      polygonRpcUrl: config.polygonRpcUrl || 'https://polygon-rpc.com',
      cacheTtlMs: config.cacheTtlMs || 3600000, // 1 hour default
    };
  }

  /**
   * Register a platform verifier
   */
  registerVerifier(verifier: IPlatformVerifier): void {
    this.verifiers.set(verifier.platform, verifier);
  }

  /**
   * Get a registered verifier
   */
  getVerifier(platform: IdentityPlatform): IPlatformVerifier | undefined {
    return this.verifiers.get(platform);
  }

  /**
   * Get all registered platforms
   */
  getRegisteredPlatforms(): IdentityPlatform[] {
    return Array.from(this.verifiers.keys());
  }

  /**
   * Generate a verification message for signing
   */
  generateVerificationMessage(
    platform: IdentityPlatform,
    walletAddress: `0x${string}`
  ): { message: string; timestamp: number } {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = IDENTITY_VERIFICATION_MESSAGE(platform, walletAddress, timestamp);
    return { message, timestamp };
  }

  /**
   * Verify wallet ownership via signature
   */
  async verifySignature(
    walletAddress: `0x${string}`,
    message: string,
    signature: `0x${string}`
  ): Promise<boolean> {
    try {
      const recoveredAddress = await recoverMessageAddress({
        message,
        signature,
      });
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Generate proof hash for attestation
   */
  generateProofHash(
    walletAddress: `0x${string}`,
    platform: IdentityPlatform,
    platformUserId: string,
    timestamp: number
  ): `0x${string}` {
    const data = `${walletAddress}:${platform}:${platformUserId}:${timestamp}`;
    return keccak256(toBytes(data));
  }

  /**
   * Verify user's identity on a platform
   */
  async verifyIdentity(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    const { walletAddress, platform, signature, signedMessage } = request;

    // Get verifier for platform
    const verifier = this.verifiers.get(platform);
    if (!verifier) {
      return {
        verified: false,
        platform,
        walletAddress,
        platformUserId: '',
        proofHash: '0x0' as `0x${string}`,
        verifiedAt: 0,
        error: `No verifier registered for platform: ${platform}`,
      };
    }

    // If signature provided, verify wallet ownership first
    if (signature && signedMessage) {
      const signatureValid = await this.verifySignature(
        walletAddress,
        signedMessage,
        signature
      );
      if (!signatureValid) {
        return {
          verified: false,
          platform,
          walletAddress,
          platformUserId: '',
          proofHash: '0x0' as `0x${string}`,
          verifiedAt: 0,
          error: 'Invalid signature - wallet ownership could not be verified',
        };
      }
    }

    // Perform platform-specific verification
    const result = await verifier.verify(request);

    // If verified, cache the link
    if (result.verified) {
      const linkId = `${walletAddress}:${platform}`;
      const link: IdentityLink = {
        id: linkId,
        walletAddress,
        platform,
        platformUserId: result.platformUserId,
        proofHash: result.proofHash,
        verified: true,
        verifiedAt: result.verifiedAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.links.set(linkId, link);
    }

    return result;
  }

  /**
   * Check if user has activity on any platform
   */
  async checkPlatformActivity(
    walletAddress: `0x${string}`
  ): Promise<Map<IdentityPlatform, boolean>> {
    const results = new Map<IdentityPlatform, boolean>();

    const checks = Array.from(this.verifiers.entries()).map(
      async ([platform, verifier]) => {
        try {
          const hasActivity = await verifier.hasActivity(walletAddress);
          results.set(platform, hasActivity);
        } catch {
          results.set(platform, false);
        }
      }
    );

    await Promise.all(checks);
    return results;
  }

  /**
   * Get linked identities for a wallet
   */
  getLinkedIdentities(walletAddress: `0x${string}`): IdentityLink[] {
    const links: IdentityLink[] = [];
    for (const [key, link] of this.links) {
      if (key.startsWith(walletAddress.toLowerCase())) {
        links.push(link);
      }
    }
    return links;
  }

  /**
   * Get a specific identity link
   */
  getIdentityLink(
    walletAddress: `0x${string}`,
    platform: IdentityPlatform
  ): IdentityLink | undefined {
    const linkId = `${walletAddress.toLowerCase()}:${platform}`;
    return this.links.get(linkId);
  }

  /**
   * Check if identity is linked
   */
  isIdentityLinked(
    walletAddress: `0x${string}`,
    platform: IdentityPlatform
  ): boolean {
    const link = this.getIdentityLink(walletAddress, platform);
    return link?.verified ?? false;
  }

  /**
   * Update attestation UID for a link
   */
  setAttestationUid(
    walletAddress: `0x${string}`,
    platform: IdentityPlatform,
    attestationUid: `0x${string}`
  ): void {
    const linkId = `${walletAddress.toLowerCase()}:${platform}`;
    const link = this.links.get(linkId);
    if (link) {
      link.attestationUid = attestationUid;
      link.updatedAt = Date.now();
      this.links.set(linkId, link);
    }
  }

  /**
   * Revoke an identity link
   */
  revokeIdentityLink(
    walletAddress: `0x${string}`,
    platform: IdentityPlatform
  ): boolean {
    const linkId = `${walletAddress.toLowerCase()}:${platform}`;
    return this.links.delete(linkId);
  }

  /**
   * Clear all cached links (for testing)
   */
  clearCache(): void {
    this.links.clear();
  }
}

// Export singleton instance
export const identityService = new IdentityVerificationService();

/**
 * Identity Verification Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  IdentityVerificationService,
  createIdentityService,
  IDENTITY_VERIFICATION_MESSAGE,
} from '../../src/identity';
import type {
  IdentityPlatform,
  IPlatformVerifier,
  IdentityVerificationRequest,
  IdentityVerificationResult,
} from '../../src/identity';

// Mock verifier for testing
class MockVerifier implements IPlatformVerifier {
  readonly platform: IdentityPlatform;
  private shouldVerify: boolean;
  private hasActivityResult: boolean;

  constructor(
    platform: IdentityPlatform,
    options?: { shouldVerify?: boolean; hasActivity?: boolean }
  ) {
    this.platform = platform;
    this.shouldVerify = options?.shouldVerify ?? true;
    this.hasActivityResult = options?.hasActivity ?? true;
  }

  async verify(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    const timestamp = Math.floor(Date.now() / 1000);

    if (this.shouldVerify) {
      return {
        verified: true,
        platform: this.platform,
        walletAddress: request.walletAddress,
        platformUserId: `${this.platform.toLowerCase()}-user-${request.walletAddress.slice(0, 8)}`,
        proofHash: `0x${'ab'.repeat(32)}` as `0x${string}`,
        verifiedAt: timestamp,
        metadata: {
          displayName: 'Test User',
          totalVolume: 1000,
          positionCount: 5,
        },
      };
    }

    return {
      verified: false,
      platform: this.platform,
      walletAddress: request.walletAddress,
      platformUserId: '',
      proofHash: '0x0' as `0x${string}`,
      verifiedAt: 0,
      error: 'Mock verification failed',
    };
  }

  async hasActivity(_walletAddress: `0x${string}`): Promise<boolean> {
    return this.hasActivityResult;
  }

  async getPlatformUserId(
    walletAddress: `0x${string}`
  ): Promise<string | null> {
    return this.hasActivityResult
      ? `${this.platform.toLowerCase()}-user-${walletAddress.slice(0, 8)}`
      : null;
  }
}

describe('IdentityVerificationService', () => {
  let service: IdentityVerificationService;
  const testWallet = '0x1234567890123456789012345678901234567890' as `0x${string}`;

  beforeEach(() => {
    service = new IdentityVerificationService();
  });

  describe('registerVerifier', () => {
    it('should register a verifier', () => {
      const verifier = new MockVerifier('LIMITLESS');
      service.registerVerifier(verifier);

      expect(service.getVerifier('LIMITLESS')).toBe(verifier);
    });

    it('should replace existing verifier for same platform', () => {
      const verifier1 = new MockVerifier('LIMITLESS');
      const verifier2 = new MockVerifier('LIMITLESS');

      service.registerVerifier(verifier1);
      service.registerVerifier(verifier2);

      expect(service.getVerifier('LIMITLESS')).toBe(verifier2);
    });
  });

  describe('getRegisteredPlatforms', () => {
    it('should return empty array when no verifiers registered', () => {
      expect(service.getRegisteredPlatforms()).toEqual([]);
    });

    it('should return all registered platforms', () => {
      service.registerVerifier(new MockVerifier('LIMITLESS'));
      service.registerVerifier(new MockVerifier('POLYMARKET'));

      const platforms = service.getRegisteredPlatforms();
      expect(platforms).toContain('LIMITLESS');
      expect(platforms).toContain('POLYMARKET');
      expect(platforms).toHaveLength(2);
    });
  });

  describe('generateVerificationMessage', () => {
    it('should generate a proper verification message', () => {
      const result = service.generateVerificationMessage('LIMITLESS', testWallet);

      expect(result.message).toContain('Calibr Identity Verification');
      expect(result.message).toContain('LIMITLESS');
      expect(result.message).toContain(testWallet);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should include timestamp in message', () => {
      const before = Math.floor(Date.now() / 1000);
      const result = service.generateVerificationMessage('POLYMARKET', testWallet);
      const after = Math.floor(Date.now() / 1000);

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
      expect(result.message).toContain(result.timestamp.toString());
    });
  });

  describe('generateProofHash', () => {
    it('should generate a deterministic hash', () => {
      const timestamp = 1700000000;
      const hash1 = service.generateProofHash(testWallet, 'LIMITLESS', 'user123', timestamp);
      const hash2 = service.generateProofHash(testWallet, 'LIMITLESS', 'user123', timestamp);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const timestamp = 1700000000;
      const hash1 = service.generateProofHash(testWallet, 'LIMITLESS', 'user123', timestamp);
      const hash2 = service.generateProofHash(testWallet, 'LIMITLESS', 'user456', timestamp);

      expect(hash1).not.toBe(hash2);
    });

    it('should return a valid 0x-prefixed hash', () => {
      const hash = service.generateProofHash(testWallet, 'LIMITLESS', 'user123', 1700000000);

      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('verifyIdentity', () => {
    beforeEach(() => {
      service.registerVerifier(new MockVerifier('LIMITLESS'));
      service.registerVerifier(new MockVerifier('POLYMARKET'));
    });

    it('should return error for unregistered platform', async () => {
      const result = await service.verifyIdentity({
        walletAddress: testWallet,
        platform: 'MANIFOLD',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toContain('No verifier registered');
    });

    it('should verify identity with registered verifier', async () => {
      const result = await service.verifyIdentity({
        walletAddress: testWallet,
        platform: 'LIMITLESS',
      });

      expect(result.verified).toBe(true);
      expect(result.platform).toBe('LIMITLESS');
      expect(result.walletAddress).toBe(testWallet);
      expect(result.platformUserId).toBeTruthy();
    });

    it('should cache verified links', async () => {
      await service.verifyIdentity({
        walletAddress: testWallet,
        platform: 'LIMITLESS',
      });

      const link = service.getIdentityLink(testWallet, 'LIMITLESS');
      expect(link).toBeDefined();
      expect(link?.verified).toBe(true);
    });

    it('should not cache failed verifications', async () => {
      service.registerVerifier(
        new MockVerifier('MANIFOLD', { shouldVerify: false })
      );

      await service.verifyIdentity({
        walletAddress: testWallet,
        platform: 'MANIFOLD',
      });

      const link = service.getIdentityLink(testWallet, 'MANIFOLD');
      expect(link).toBeUndefined();
    });
  });

  describe('checkPlatformActivity', () => {
    it('should check activity across all platforms', async () => {
      service.registerVerifier(new MockVerifier('LIMITLESS', { hasActivity: true }));
      service.registerVerifier(new MockVerifier('POLYMARKET', { hasActivity: false }));

      const results = await service.checkPlatformActivity(testWallet);

      expect(results.get('LIMITLESS')).toBe(true);
      expect(results.get('POLYMARKET')).toBe(false);
    });
  });

  describe('getLinkedIdentities', () => {
    it('should return empty array when no links exist', () => {
      const links = service.getLinkedIdentities(testWallet);
      expect(links).toEqual([]);
    });

    it('should return all linked identities for a wallet', async () => {
      service.registerVerifier(new MockVerifier('LIMITLESS'));
      service.registerVerifier(new MockVerifier('POLYMARKET'));

      await service.verifyIdentity({ walletAddress: testWallet, platform: 'LIMITLESS' });
      await service.verifyIdentity({ walletAddress: testWallet, platform: 'POLYMARKET' });

      const links = service.getLinkedIdentities(testWallet);
      expect(links).toHaveLength(2);
    });
  });

  describe('isIdentityLinked', () => {
    it('should return false when not linked', () => {
      expect(service.isIdentityLinked(testWallet, 'LIMITLESS')).toBe(false);
    });

    it('should return true when linked', async () => {
      service.registerVerifier(new MockVerifier('LIMITLESS'));
      await service.verifyIdentity({ walletAddress: testWallet, platform: 'LIMITLESS' });

      expect(service.isIdentityLinked(testWallet, 'LIMITLESS')).toBe(true);
    });
  });

  describe('setAttestationUid', () => {
    it('should set attestation UID on existing link', async () => {
      service.registerVerifier(new MockVerifier('LIMITLESS'));
      await service.verifyIdentity({ walletAddress: testWallet, platform: 'LIMITLESS' });

      const attestationUid = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
      service.setAttestationUid(testWallet, 'LIMITLESS', attestationUid);

      const link = service.getIdentityLink(testWallet, 'LIMITLESS');
      expect(link?.attestationUid).toBe(attestationUid);
    });

    it('should not fail for non-existent link', () => {
      const attestationUid = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;

      expect(() => {
        service.setAttestationUid(testWallet, 'LIMITLESS', attestationUid);
      }).not.toThrow();
    });
  });

  describe('revokeIdentityLink', () => {
    it('should revoke an existing link', async () => {
      service.registerVerifier(new MockVerifier('LIMITLESS'));
      await service.verifyIdentity({ walletAddress: testWallet, platform: 'LIMITLESS' });

      const result = service.revokeIdentityLink(testWallet, 'LIMITLESS');
      expect(result).toBe(true);
      expect(service.isIdentityLinked(testWallet, 'LIMITLESS')).toBe(false);
    });

    it('should return false for non-existent link', () => {
      const result = service.revokeIdentityLink(testWallet, 'LIMITLESS');
      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached links', async () => {
      service.registerVerifier(new MockVerifier('LIMITLESS'));
      service.registerVerifier(new MockVerifier('POLYMARKET'));

      await service.verifyIdentity({ walletAddress: testWallet, platform: 'LIMITLESS' });
      await service.verifyIdentity({ walletAddress: testWallet, platform: 'POLYMARKET' });

      service.clearCache();

      expect(service.getLinkedIdentities(testWallet)).toEqual([]);
    });
  });
});

describe('IDENTITY_VERIFICATION_MESSAGE', () => {
  it('should generate correct message format', () => {
    const message = IDENTITY_VERIFICATION_MESSAGE(
      'LIMITLESS',
      '0x1234567890123456789012345678901234567890',
      1700000000
    );

    expect(message).toContain('Calibr Identity Verification');
    expect(message).toContain('LIMITLESS');
    expect(message).toContain('0x1234567890123456789012345678901234567890');
    expect(message).toContain('1700000000');
  });
});

describe('createIdentityService', () => {
  it('should create service with default verifiers', () => {
    const service = createIdentityService();

    const platforms = service.getRegisteredPlatforms();
    expect(platforms).toContain('LIMITLESS');
    expect(platforms).toContain('POLYMARKET');
  });

  it('should create service without default verifiers when disabled', () => {
    const service = createIdentityService({ registerDefaultVerifiers: false });

    const platforms = service.getRegisteredPlatforms();
    expect(platforms).toHaveLength(0);
  });
});

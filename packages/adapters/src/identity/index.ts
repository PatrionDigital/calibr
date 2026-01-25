/**
 * Identity Verification Module
 * Cross-platform identity linking for Calibr
 */

// Types
export type {
  IdentityPlatform,
  VerificationStatus,
  IdentityVerificationRequest,
  IdentityVerificationResult,
  IdentityLink,
  IPlatformVerifier,
  IdentityServiceConfig,
} from './types';

export { IDENTITY_VERIFICATION_MESSAGE } from './types';

// Service
export {
  IdentityVerificationService,
  identityService,
} from './service';

// Platform Verifiers
export {
  LimitlessVerifier,
  createLimitlessVerifier,
} from './verifiers/limitless';

export {
  PolymarketVerifier,
  createPolymarketVerifier,
} from './verifiers/polymarket';

// Re-import for factory function (avoids dynamic require issues)
import { IdentityVerificationService as IdentityService } from './service';
import { createLimitlessVerifier as limitlessFactory } from './verifiers/limitless';
import { createPolymarketVerifier as polymarketFactory } from './verifiers/polymarket';

// Factory function to create a pre-configured identity service
export function createIdentityService(config?: {
  baseRpcUrl?: string;
  polygonRpcUrl?: string;
  cacheTtlMs?: number;
  registerDefaultVerifiers?: boolean;
}): IdentityService {
  const service = new IdentityService({
    baseRpcUrl: config?.baseRpcUrl,
    polygonRpcUrl: config?.polygonRpcUrl,
    cacheTtlMs: config?.cacheTtlMs,
  });

  // Register default verifiers unless explicitly disabled
  if (config?.registerDefaultVerifiers !== false) {
    service.registerVerifier(limitlessFactory());
    service.registerVerifier(polymarketFactory());
  }

  return service;
}

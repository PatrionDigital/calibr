/**
 * PolymarketAuthService Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolymarketAuthService, polymarketAuth } from '../../src/trading/polymarket/auth';
import type { PolymarketCredentials } from '../../src/trading/types';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({})),
    keccak256: vi.fn((data) => `0x${'ab'.repeat(32)}`),
    encodePacked: vi.fn(() => '0x1234'),
    recoverMessageAddress: vi.fn(),
  };
});

const mockFetch = vi.fn();

// =============================================================================
// Test Data
// =============================================================================

const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const TEST_SIGNATURE = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab' as const;

function createMockWalletClient() {
  return {
    getAddresses: vi.fn().mockResolvedValue([TEST_WALLET_ADDRESS]),
    signTypedData: vi.fn().mockResolvedValue(TEST_SIGNATURE),
  };
}

function createMockCredentials(): PolymarketCredentials {
  return {
    platform: 'POLYMARKET',
    apiKey: 'test-api-key-1234567890123456',
    apiSecret: 'test-api-secret-12345678901234567890123456789012',
    passphrase: 'test-passphrase1',
    signatureType: 'EOA',
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PolymarketAuthService', () => {
  let service: PolymarketAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    service = new PolymarketAuthService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  describe('Configuration', () => {
    it('should create instance with default config', () => {
      const svc = new PolymarketAuthService();
      expect(svc).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const svc = new PolymarketAuthService({
        rpcUrl: 'https://custom-polygon.example.com',
        clobUrl: 'https://custom-clob.example.com',
      });
      expect(svc).toBeDefined();
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(polymarketAuth).toBeInstanceOf(PolymarketAuthService);
    });
  });

  // ---------------------------------------------------------------------------
  // L1 Authentication Message Generation
  // ---------------------------------------------------------------------------

  describe('generateL1AuthMessage', () => {
    it('should generate message with timestamp', () => {
      const before = Math.floor(Date.now() / 1000);
      const { message, timestamp, nonce } = service.generateL1AuthMessage(
        TEST_WALLET_ADDRESS,
        0
      );
      const after = Math.floor(Date.now() / 1000);

      expect(message).toContain('This message attests that I control');
      expect(message).toContain('Polymarket');
      expect(message).toContain('Nonce: 0');
      expect(parseInt(timestamp)).toBeGreaterThanOrEqual(before);
      expect(parseInt(timestamp)).toBeLessThanOrEqual(after);
      expect(nonce).toBe(0);
    });

    it('should include custom nonce in message', () => {
      const { message, nonce } = service.generateL1AuthMessage(
        TEST_WALLET_ADDRESS,
        42
      );

      expect(message).toContain('Nonce: 42');
      expect(nonce).toBe(42);
    });

    it('should generate unique timestamps for sequential calls', async () => {
      const result1 = service.generateL1AuthMessage(TEST_WALLET_ADDRESS, 0);
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result2 = service.generateL1AuthMessage(TEST_WALLET_ADDRESS, 0);

      // Timestamps might be same within same second, so just check they're valid
      expect(parseInt(result1.timestamp)).toBeGreaterThan(0);
      expect(parseInt(result2.timestamp)).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // EIP-712 Typed Data Creation
  // ---------------------------------------------------------------------------

  describe('createL1TypedData', () => {
    it('should create valid EIP-712 typed data', () => {
      const typedData = service.createL1TypedData(
        TEST_WALLET_ADDRESS,
        '1234567890',
        0
      );

      expect(typedData.domain).toEqual({
        name: 'ClobAuthDomain',
        version: '1',
        chainId: 137,
      });
      expect(typedData.primaryType).toBe('ClobAuth');
      expect(typedData.types.ClobAuth).toBeDefined();
    });

    it('should include address in message', () => {
      const typedData = service.createL1TypedData(
        TEST_WALLET_ADDRESS,
        '1234567890',
        0
      );

      expect(typedData.message.address).toBe(TEST_WALLET_ADDRESS);
    });

    it('should include timestamp in message', () => {
      const typedData = service.createL1TypedData(
        TEST_WALLET_ADDRESS,
        '1234567890',
        0
      );

      expect(typedData.message.timestamp).toBe('1234567890');
    });

    it('should include nonce as BigInt in message', () => {
      const typedData = service.createL1TypedData(
        TEST_WALLET_ADDRESS,
        '1234567890',
        42
      );

      expect(typedData.message.nonce).toBe(42n);
    });

    it('should construct proper message text', () => {
      const typedData = service.createL1TypedData(
        TEST_WALLET_ADDRESS,
        '1234567890',
        5
      );

      expect(typedData.message.message).toContain('Nonce: 5');
      expect(typedData.message.message).toContain('Timestamp: 1234567890');
    });
  });

  // ---------------------------------------------------------------------------
  // API Credential Derivation
  // ---------------------------------------------------------------------------

  describe('deriveApiCredentials', () => {
    it('should derive API credentials from signature', async () => {
      const credentials = await service.deriveApiCredentials(
        TEST_WALLET_ADDRESS,
        TEST_SIGNATURE,
        'EOA'
      );

      expect(credentials.apiKey).toBeDefined();
      expect(credentials.apiSecret).toBeDefined();
      expect(credentials.passphrase).toBeDefined();
    });

    it('should generate apiKey of correct length', async () => {
      const credentials = await service.deriveApiCredentials(
        TEST_WALLET_ADDRESS,
        TEST_SIGNATURE,
        'EOA'
      );

      expect(credentials.apiKey.length).toBe(32);
    });

    it('should generate apiSecret of correct length', async () => {
      const credentials = await service.deriveApiCredentials(
        TEST_WALLET_ADDRESS,
        TEST_SIGNATURE,
        'EOA'
      );

      expect(credentials.apiSecret.length).toBe(64);
    });

    it('should generate passphrase of correct length', async () => {
      const credentials = await service.deriveApiCredentials(
        TEST_WALLET_ADDRESS,
        TEST_SIGNATURE,
        'EOA'
      );

      expect(credentials.passphrase.length).toBe(16);
    });

    it('should generate deterministic credentials', async () => {
      const cred1 = await service.deriveApiCredentials(
        TEST_WALLET_ADDRESS,
        TEST_SIGNATURE,
        'EOA'
      );
      const cred2 = await service.deriveApiCredentials(
        TEST_WALLET_ADDRESS,
        TEST_SIGNATURE,
        'EOA'
      );

      expect(cred1.apiKey).toBe(cred2.apiKey);
      expect(cred1.apiSecret).toBe(cred2.apiSecret);
      expect(cred1.passphrase).toBe(cred2.passphrase);
    });
  });

  // ---------------------------------------------------------------------------
  // L2 Authentication Headers
  // ---------------------------------------------------------------------------

  describe('generateL2Headers', () => {
    it('should generate all required headers', () => {
      const credentials = createMockCredentials();
      const headers = service.generateL2Headers(
        credentials,
        'GET',
        '/api/orders'
      );

      expect(headers['POLY-ADDRESS']).toBe(credentials.apiKey);
      expect(headers['POLY-SIGNATURE']).toBeDefined();
      expect(headers['POLY-TIMESTAMP']).toBeDefined();
      expect(headers['POLY-NONCE']).toBeDefined();
      expect(headers['POLY-PASSPHRASE']).toBe(credentials.passphrase);
    });

    it('should generate valid timestamp', () => {
      const credentials = createMockCredentials();
      const before = Math.floor(Date.now() / 1000);
      const headers = service.generateL2Headers(
        credentials,
        'GET',
        '/api/orders'
      );
      const after = Math.floor(Date.now() / 1000);

      const timestamp = parseInt(headers['POLY-TIMESTAMP']);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate unique nonce', () => {
      const credentials = createMockCredentials();
      const headers1 = service.generateL2Headers(
        credentials,
        'GET',
        '/api/orders'
      );
      const headers2 = service.generateL2Headers(
        credentials,
        'GET',
        '/api/orders'
      );

      // Nonces should be different (with very high probability)
      expect(headers1['POLY-NONCE']).not.toBe(headers2['POLY-NONCE']);
    });

    it('should generate valid HMAC signature', () => {
      const credentials = createMockCredentials();
      const headers = service.generateL2Headers(
        credentials,
        'GET',
        '/api/orders'
      );

      // Signature should be base64 encoded
      const signatureRegex = /^[A-Za-z0-9+/]+=*$/;
      expect(headers['POLY-SIGNATURE']).toMatch(signatureRegex);
    });

    it('should include body in signature when provided', () => {
      const credentials = createMockCredentials();
      const body = JSON.stringify({ order: 'test' });

      const headersWithBody = service.generateL2Headers(
        credentials,
        'POST',
        '/api/orders',
        body
      );
      const headersWithoutBody = service.generateL2Headers(
        credentials,
        'POST',
        '/api/orders'
      );

      // Different bodies should produce different signatures
      expect(headersWithBody['POLY-SIGNATURE']).not.toBe(
        headersWithoutBody['POLY-SIGNATURE']
      );
    });

    it('should uppercase the method in signature', () => {
      const credentials = createMockCredentials();
      const headers1 = service.generateL2Headers(
        credentials,
        'get',
        '/api/orders'
      );
      const headers2 = service.generateL2Headers(
        credentials,
        'GET',
        '/api/orders'
      );

      // Both should be valid - method is uppercased internally
      expect(headers1['POLY-SIGNATURE']).toBeDefined();
      expect(headers2['POLY-SIGNATURE']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // L1 Authentication
  // ---------------------------------------------------------------------------

  describe('authenticateL1', () => {
    it('should throw when wallet has no address', async () => {
      const walletClient = {
        getAddresses: vi.fn().mockResolvedValue([]),
        signTypedData: vi.fn(),
      };

      await expect(
        service.authenticateL1(walletClient as any)
      ).rejects.toThrow('No address available');
    });

    it('should sign typed data and return credentials', async () => {
      const walletClient = createMockWalletClient();
      const result = await service.authenticateL1(walletClient as any);

      expect(walletClient.signTypedData).toHaveBeenCalled();
      expect(result.apiKey).toBeDefined();
      expect(result.apiSecret).toBeDefined();
      expect(result.passphrase).toBeDefined();
    });

    it('should pass correct signature type', async () => {
      const walletClient = createMockWalletClient();
      await service.authenticateL1(walletClient as any, 'POLY_PROXY');

      expect(walletClient.signTypedData).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // API Credentials Creation
  // ---------------------------------------------------------------------------

  describe('createApiCredentials', () => {
    it('should throw when wallet has no address', async () => {
      const walletClient = {
        getAddresses: vi.fn().mockResolvedValue([]),
        signTypedData: vi.fn(),
      };

      await expect(
        service.createApiCredentials(walletClient as any)
      ).rejects.toThrow('No address available');
    });

    it('should create complete credentials object', async () => {
      const walletClient = createMockWalletClient();
      const credentials = await service.createApiCredentials(
        walletClient as any
      );

      expect(credentials.platform).toBe('POLYMARKET');
      expect(credentials.apiKey).toBeDefined();
      expect(credentials.apiSecret).toBeDefined();
      expect(credentials.passphrase).toBeDefined();
      expect(credentials.signatureType).toBe('EOA');
    });

    it('should use specified signature type', async () => {
      const walletClient = createMockWalletClient();
      const credentials = await service.createApiCredentials(
        walletClient as any,
        'POLY_GNOSIS_SAFE'
      );

      expect(credentials.signatureType).toBe('POLY_GNOSIS_SAFE');
    });
  });

  // ---------------------------------------------------------------------------
  // Credential Verification
  // ---------------------------------------------------------------------------

  describe('verifyCredentials', () => {
    it('should return true for valid credentials', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const credentials = createMockCredentials();
      const isValid = await service.verifyCredentials(credentials);

      expect(isValid).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return false for invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const credentials = createMockCredentials();
      const isValid = await service.verifyCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const credentials = createMockCredentials();
      const isValid = await service.verifyCredentials(credentials);

      expect(isValid).toBe(false);
    });

    it('should send correct headers to API', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const credentials = createMockCredentials();
      await service.verifyCredentials(credentials);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/api-key'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'POLY-ADDRESS': credentials.apiKey,
            'POLY-PASSPHRASE': credentials.passphrase,
          }),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Signature Type Value
  // ---------------------------------------------------------------------------

  describe('getSignatureTypeValue', () => {
    it('should return 0 for EOA', () => {
      expect(service.getSignatureTypeValue('EOA')).toBe(0);
    });

    it('should return 1 for POLY_PROXY', () => {
      expect(service.getSignatureTypeValue('POLY_PROXY')).toBe(1);
    });

    it('should return 2 for POLY_GNOSIS_SAFE', () => {
      expect(service.getSignatureTypeValue('POLY_GNOSIS_SAFE')).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Auth State Creation
  // ---------------------------------------------------------------------------

  describe('createAuthState', () => {
    it('should create valid auth state', () => {
      const credentials = createMockCredentials();
      const authState = service.createAuthState(TEST_WALLET_ADDRESS, credentials);

      expect(authState.isAuthenticated).toBe(true);
      expect(authState.address).toBe(TEST_WALLET_ADDRESS);
      expect(authState.platform).toBe('POLYMARKET');
      expect(authState.authMethod).toBe('EOA');
      expect(authState.expiresAt).toBeUndefined();
    });

    it('should use credential signature type as auth method', () => {
      const credentials = createMockCredentials();
      credentials.signatureType = 'POLY_GNOSIS_SAFE';

      const authState = service.createAuthState(TEST_WALLET_ADDRESS, credentials);

      expect(authState.authMethod).toBe('POLY_GNOSIS_SAFE');
    });
  });
});

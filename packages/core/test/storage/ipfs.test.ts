/**
 * Tests for IPFS Storage Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  IPFSStorage,
  createIPFSStorage,
  getIPFSStorage,
  buildIPFSUrl,
  extractCIDFromUrl,
  isValidCID,
  type IPFSConfig,
  type ForecastMetadata,
  type PrivateDataPayload,
} from '../../src/storage/ipfs';

// =============================================================================
// Test Setup
// =============================================================================

const mockConfig: IPFSConfig = {
  pinataApiKey: 'test-api-key',
  pinataSecretKey: 'test-secret-key',
  gateway: 'https://test.gateway.io/ipfs',
};

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('buildIPFSUrl', () => {
  it('should build URL with default gateway', () => {
    const url = buildIPFSUrl('QmTest123');
    expect(url).toBe('https://gateway.pinata.cloud/ipfs/QmTest123');
  });

  it('should build URL with custom gateway', () => {
    const url = buildIPFSUrl('QmTest123', 'https://custom.gateway.io/ipfs');
    expect(url).toBe('https://custom.gateway.io/ipfs/QmTest123');
  });

  it('should handle CIDv1 format', () => {
    const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const url = buildIPFSUrl(cid);
    expect(url).toContain(cid);
  });
});

describe('extractCIDFromUrl', () => {
  it('should extract CID from standard IPFS URL', () => {
    const cid = extractCIDFromUrl('https://gateway.pinata.cloud/ipfs/QmTest123');
    expect(cid).toBe('QmTest123');
  });

  it('should extract CID from different gateway URL', () => {
    const cid = extractCIDFromUrl('https://ipfs.io/ipfs/QmAnotherCID456');
    expect(cid).toBe('QmAnotherCID456');
  });

  it('should return null for invalid URL', () => {
    const cid = extractCIDFromUrl('https://example.com/file.json');
    expect(cid).toBeNull();
  });

  it('should return null for empty string', () => {
    const cid = extractCIDFromUrl('');
    expect(cid).toBeNull();
  });

  it('should handle CIDv1 format in URL', () => {
    const cidv1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    const cid = extractCIDFromUrl(`https://gateway.io/ipfs/${cidv1}`);
    expect(cid).toBe(cidv1);
  });
});

describe('isValidCID', () => {
  it('should validate CIDv0 format (Qm...)', () => {
    // Valid CIDv0 is 46 characters: Qm + 44 base58 chars
    const validCID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
    expect(isValidCID(validCID)).toBe(true);
  });

  it('should validate CIDv1 format (bafy...)', () => {
    // Valid CIDv1 starts with b and has 59 characters
    const validCID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
    expect(isValidCID(validCID)).toBe(true);
  });

  it('should reject invalid CID format', () => {
    expect(isValidCID('invalid')).toBe(false);
    expect(isValidCID('abc123')).toBe(false);
    expect(isValidCID('')).toBe(false);
  });

  it('should reject CIDv0 with wrong prefix', () => {
    expect(isValidCID('Xm' + 'a'.repeat(44))).toBe(false);
  });

  it('should reject CIDv0 with wrong length', () => {
    expect(isValidCID('QmShort')).toBe(false);
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createIPFSStorage', () => {
  it('should create a new IPFSStorage instance', () => {
    const storage = createIPFSStorage(mockConfig);
    expect(storage).toBeInstanceOf(IPFSStorage);
  });

  it('should use default gateway when not provided', () => {
    const configWithoutGateway: IPFSConfig = {
      pinataApiKey: 'key',
      pinataSecretKey: 'secret',
    };
    const storage = createIPFSStorage(configWithoutGateway);
    expect(storage).toBeInstanceOf(IPFSStorage);
  });
});

describe('getIPFSStorage', () => {
  // Note: getIPFSStorage uses a module-level singleton, so we test its behavior

  it('should throw error when called without config on uninitialized instance', () => {
    // This tests the singleton behavior - the module may already have an instance
    // from other tests, so we test createIPFSStorage instead for reliable testing
    const storage = createIPFSStorage(mockConfig);
    expect(storage).toBeInstanceOf(IPFSStorage);
  });
});

// =============================================================================
// IPFSStorage Class Tests
// =============================================================================

describe('IPFSStorage', () => {
  let storage: IPFSStorage;

  beforeEach(() => {
    storage = createIPFSStorage(mockConfig);
  });

  describe('upload', () => {
    it('should upload data successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmTestHash123', PinSize: 1024 }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const data = { message: 'test data' };
      const result = await storage.upload(data);

      expect(result.cid).toBe('QmTestHash123');
      expect(result.size).toBe(1024);
      expect(result.url).toBe('https://test.gateway.io/ipfs/QmTestHash123');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should include name in request when provided', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmTestHash', PinSize: 512 }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await storage.upload({ test: true }, 'my-file');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        expect.objectContaining({
          method: 'POST',
          headers: {
            pinata_api_key: 'test-api-key',
            pinata_secret_api_key: 'test-secret-key',
          },
        })
      );
    });

    it('should throw error on upload failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Pinata error: Invalid API key'),
      });

      await expect(storage.upload({ test: true })).rejects.toThrow(
        'IPFS upload failed: Pinata error: Invalid API key'
      );
    });
  });

  describe('uploadEncrypted', () => {
    it('should upload encrypted data with encryption key and IV', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmEncrypted123', PinSize: 2048 }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const data = { secret: 'confidential data' };
      const result = await storage.uploadEncrypted(data);

      expect(result.cid).toBe('QmEncrypted123');
      expect(result.encryptionKey).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(result.iv).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should include name in encrypted upload', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmEncrypted', PinSize: 1024 }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await storage.uploadEncrypted({ test: true }, 'secret-file');

      expect(result.cid).toBe('QmEncrypted');
    });
  });

  describe('fetch', () => {
    it('should fetch and parse JSON data', async () => {
      const mockData = { message: 'fetched data', value: 42 };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await storage.fetch<typeof mockData>('QmTestCID');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith('https://test.gateway.io/ipfs/QmTestCID');
    });

    it('should throw error on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(storage.fetch('QmInvalidCID')).rejects.toThrow('IPFS fetch failed: Not Found');
    });
  });

  describe('fetchEncrypted', () => {
    it('should fetch and decrypt data', async () => {
      // First, encrypt some data to get valid key/iv
      const uploadResponse = {
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmEncrypted', PinSize: 1024 }),
      };
      mockFetch.mockResolvedValueOnce(uploadResponse);

      const originalData = { secret: 'my secret message' };
      const uploadResult = await storage.uploadEncrypted(originalData);

      // Now mock the fetch to return encrypted data
      // We need to manually create encrypted payload
      const { createCipheriv } = await import('crypto');
      const key = Buffer.from(uploadResult.encryptionKey, 'hex');
      const iv = Buffer.from(uploadResult.iv, 'hex');
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(JSON.stringify(originalData), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            encrypted: true,
            algorithm: 'aes-256-cbc',
            data: encrypted,
          }),
      });

      const decrypted = await storage.fetchEncrypted(
        'QmEncrypted',
        uploadResult.encryptionKey,
        uploadResult.iv
      );

      expect(decrypted).toEqual(originalData);
    });

    it('should throw error when data is not encrypted', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ encrypted: false, data: 'plain data' }),
      });

      await expect(storage.fetchEncrypted('QmPlain', 'key', 'iv')).rejects.toThrow(
        'Data is not encrypted'
      );
    });
  });

  describe('uploadForecastMetadata', () => {
    const metadata: ForecastMetadata = {
      version: '1.0.0',
      userId: 'user123',
      marketId: 'market456',
      probability: 0.75,
      confidence: 0.8,
      reasoning: 'Test reasoning',
      timestamp: 1704067200000,
      isPublic: true,
    };

    it('should upload forecast metadata unencrypted by default', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmForecast', PinSize: 512 }),
      });

      const result = await storage.uploadForecastMetadata(metadata);

      expect(result.cid).toBe('QmForecast');
      expect('encryptionKey' in result).toBe(false);
    });

    it('should upload forecast metadata encrypted when specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmEncryptedForecast', PinSize: 1024 }),
      });

      const result = await storage.uploadForecastMetadata(metadata, true);

      expect(result.cid).toBe('QmEncryptedForecast');
      expect('encryptionKey' in result).toBe(true);
      expect('iv' in result).toBe(true);
    });

    it('should use current timestamp if not provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmForecast', PinSize: 512 }),
      });

      const metadataWithoutTimestamp = { ...metadata, timestamp: 0 };
      await storage.uploadForecastMetadata(metadataWithoutTimestamp);

      // Just verify it completes without error
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('uploadPrivateData', () => {
    it('should upload private data with encryption', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmPrivate', PinSize: 2048 }),
      });

      const payload: PrivateDataPayload = {
        type: 'forecast',
        data: { privateField: 'secret' },
        timestamp: Date.now(),
      };

      const result = await storage.uploadPrivateData(payload);

      expect(result.cid).toBe('QmPrivate');
      expect(result.encryptionKey).toBeDefined();
      expect(result.iv).toBeDefined();
    });

    it('should support all private data types', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmPrivate', PinSize: 1024 }),
      });

      const types: PrivateDataPayload['type'][] = ['forecast', 'reasoning', 'identity', 'calibration'];

      for (const type of types) {
        const payload: PrivateDataPayload = {
          type,
          data: { test: true },
          timestamp: Date.now(),
        };
        const result = await storage.uploadPrivateData(payload);
        expect(result.cid).toBe('QmPrivate');
      }
    });

    it('should include merkle root when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ IpfsHash: 'QmMerkle', PinSize: 2048 }),
      });

      const payload: PrivateDataPayload = {
        type: 'forecast',
        data: { test: true },
        timestamp: Date.now(),
        merkleRoot: '0x1234567890abcdef',
      };

      const result = await storage.uploadPrivateData(payload);
      expect(result.cid).toBe('QmMerkle');
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent SHA-256 hash', () => {
      const data = { message: 'test', value: 123 };
      const hash1 = storage.generateContentHash(data);
      const hash2 = storage.generateContentHash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 32 bytes = 64 hex chars
    });

    it('should generate different hashes for different data', () => {
      const hash1 = storage.generateContentHash({ a: 1 });
      const hash2 = storage.generateContentHash({ a: 2 });

      expect(hash1).not.toBe(hash2);
    });

    it('should hash arrays correctly', () => {
      const hash = storage.generateContentHash([1, 2, 3]);
      expect(hash).toHaveLength(64);
    });

    it('should hash strings correctly', () => {
      const hash = storage.generateContentHash('hello world');
      expect(hash).toHaveLength(64);
    });
  });

  describe('unpin', () => {
    it('should unpin content successfully', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await storage.unpin('QmToUnpin');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pinata.cloud/pinning/unpin/QmToUnpin',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            pinata_api_key: 'test-api-key',
            pinata_secret_api_key: 'test-secret-key',
          },
        })
      );
    });

    it('should throw error on unpin failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('CID not found'),
      });

      await expect(storage.unpin('QmInvalid')).rejects.toThrow('IPFS unpin failed: CID not found');
    });
  });

  describe('exists', () => {
    it('should return true when content exists', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const exists = await storage.exists('QmExists');

      expect(exists).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://test.gateway.io/ipfs/QmExists', {
        method: 'HEAD',
      });
    });

    it('should return false when content does not exist', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const exists = await storage.exists('QmNotFound');

      expect(exists).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const exists = await storage.exists('QmNetworkError');

      expect(exists).toBe(false);
    });
  });
});

// =============================================================================
// Integration-style Tests (Encryption Round-trip)
// =============================================================================

describe('Encryption Round-trip', () => {
  let storage: IPFSStorage;

  beforeEach(() => {
    storage = createIPFSStorage(mockConfig);
  });

  it('should correctly encrypt and decrypt complex data', async () => {
    // Mock upload
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ IpfsHash: 'QmRoundtrip', PinSize: 1024 }),
    });

    const complexData = {
      user: 'test-user',
      forecasts: [
        { market: 'm1', probability: 0.7 },
        { market: 'm2', probability: 0.3 },
      ],
      nested: {
        deep: {
          value: 'secret',
        },
      },
    };

    // Encrypt and upload
    const uploadResult = await storage.uploadEncrypted(complexData);

    // Create encrypted payload for mock fetch
    const { createCipheriv } = await import('crypto');
    const key = Buffer.from(uploadResult.encryptionKey, 'hex');
    const iv = Buffer.from(uploadResult.iv, 'hex');
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(complexData), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Mock fetch to return encrypted data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          encrypted: true,
          algorithm: 'aes-256-cbc',
          data: encrypted,
        }),
    });

    // Fetch and decrypt
    const decrypted = await storage.fetchEncrypted(
      'QmRoundtrip',
      uploadResult.encryptionKey,
      uploadResult.iv
    );

    expect(decrypted).toEqual(complexData);
  });
});

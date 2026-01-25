/**
 * IPFS Storage Service for Calibr.xyz
 * Handles off-chain storage for forecast reasoning, private data, and metadata
 *
 * Uses Pinata for pinned IPFS storage with encryption support for private data
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface IPFSConfig {
  pinataApiKey: string;
  pinataSecretKey: string;
  gateway?: string;
}

export interface UploadResult {
  cid: string;
  url: string;
  size: number;
  timestamp: number;
}

export interface EncryptedUploadResult extends UploadResult {
  encryptionKey: string; // Hex-encoded key for decryption
  iv: string; // Hex-encoded initialization vector
}

export interface ForecastMetadata {
  version: string;
  userId: string;
  marketId: string;
  probability: number;
  confidence: number;
  reasoning?: string;
  timestamp: number;
  isPublic: boolean;
  easUid?: string;
}

export interface PrivateDataPayload {
  type: 'forecast' | 'reasoning' | 'identity' | 'calibration';
  data: unknown;
  timestamp: number;
  merkleRoot?: string;
}

// =============================================================================
// IPFS Storage Class
// =============================================================================

export class IPFSStorage {
  private config: IPFSConfig;
  private gateway: string;

  constructor(config: IPFSConfig) {
    this.config = config;
    this.gateway = config.gateway || 'https://gateway.pinata.cloud/ipfs';
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Upload data to IPFS (unencrypted)
   * @param data Data to upload (will be JSON stringified)
   * @param name Optional name for the pin
   * @returns Upload result with CID
   */
  async upload(data: unknown, name?: string): Promise<UploadResult> {
    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', blob, name || 'data.json');

    if (name) {
      formData.append(
        'pinataMetadata',
        JSON.stringify({
          name,
          keyvalues: {
            app: 'calibr.xyz',
            timestamp: Date.now().toString(),
          },
        })
      );
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        pinata_api_key: this.config.pinataApiKey,
        pinata_secret_api_key: this.config.pinataSecretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`IPFS upload failed: ${error}`);
    }

    const result = await response.json() as { IpfsHash: string; PinSize: number };

    return {
      cid: result.IpfsHash,
      url: `${this.gateway}/${result.IpfsHash}`,
      size: result.PinSize,
      timestamp: Date.now(),
    };
  }

  /**
   * Upload encrypted data to IPFS
   * @param data Data to encrypt and upload
   * @param name Optional name for the pin
   * @returns Upload result with encryption key
   */
  async uploadEncrypted(data: unknown, name?: string): Promise<EncryptedUploadResult> {
    const jsonData = JSON.stringify(data);

    // Generate encryption key and IV
    const key = randomBytes(32); // AES-256
    const iv = randomBytes(16);

    // Encrypt the data
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(jsonData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Upload encrypted data
    const encryptedPayload = {
      encrypted: true,
      algorithm: 'aes-256-cbc',
      data: encrypted,
    };

    const uploadResult = await this.upload(encryptedPayload, name);

    return {
      ...uploadResult,
      encryptionKey: key.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  /**
   * Fetch data from IPFS
   * @param cid Content identifier
   * @returns Parsed JSON data
   */
  async fetch<T = unknown>(cid: string): Promise<T> {
    const response = await fetch(`${this.gateway}/${cid}`);

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Fetch and decrypt data from IPFS
   * @param cid Content identifier
   * @param encryptionKey Hex-encoded decryption key
   * @param iv Hex-encoded initialization vector
   * @returns Decrypted and parsed data
   */
  async fetchEncrypted<T = unknown>(cid: string, encryptionKey: string, iv: string): Promise<T> {
    const encryptedPayload = await this.fetch<{ encrypted: boolean; data: string }>(cid);

    if (!encryptedPayload.encrypted) {
      throw new Error('Data is not encrypted');
    }

    const key = Buffer.from(encryptionKey, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');

    const decipher = createDecipheriv('aes-256-cbc', key, ivBuffer);
    let decrypted = decipher.update(encryptedPayload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Upload forecast metadata to IPFS
   * @param metadata Forecast metadata
   * @param encrypt Whether to encrypt the data
   * @returns Upload result
   */
  async uploadForecastMetadata(
    metadata: ForecastMetadata,
    encrypt = false
  ): Promise<UploadResult | EncryptedUploadResult> {
    const payload = {
      ...metadata,
      version: '1.0.0',
      timestamp: metadata.timestamp || Date.now(),
    };

    const name = `forecast-${metadata.userId}-${metadata.marketId}-${Date.now()}`;

    if (encrypt) {
      return this.uploadEncrypted(payload, name);
    }

    return this.upload(payload, name);
  }

  /**
   * Upload private data payload
   * @param payload Private data payload
   * @returns Encrypted upload result
   */
  async uploadPrivateData(payload: PrivateDataPayload): Promise<EncryptedUploadResult> {
    const name = `private-${payload.type}-${Date.now()}`;
    return this.uploadEncrypted(payload, name);
  }

  /**
   * Generate content hash for data (without uploading)
   * @param data Data to hash
   * @returns SHA-256 hash
   */
  generateContentHash(data: unknown): string {
    const jsonData = JSON.stringify(data);
    return createHash('sha256').update(jsonData).digest('hex');
  }

  /**
   * Unpin content from Pinata
   * @param cid Content identifier to unpin
   */
  async unpin(cid: string): Promise<void> {
    const response = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      method: 'DELETE',
      headers: {
        pinata_api_key: this.config.pinataApiKey,
        pinata_secret_api_key: this.config.pinataSecretKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`IPFS unpin failed: ${error}`);
    }
  }

  /**
   * Check if content exists on IPFS
   * @param cid Content identifier
   * @returns True if content exists
   */
  async exists(cid: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.gateway}/${cid}`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let ipfsInstance: IPFSStorage | null = null;

/**
 * Get or create IPFS storage instance
 * @param config Optional config (required on first call)
 * @returns IPFS storage instance
 */
export function getIPFSStorage(config?: IPFSConfig): IPFSStorage {
  if (!ipfsInstance) {
    if (!config) {
      throw new Error('IPFS config required on first initialization');
    }
    ipfsInstance = new IPFSStorage(config);
  }
  return ipfsInstance;
}

/**
 * Create a new IPFS storage instance (useful for testing)
 * @param config IPFS configuration
 * @returns New IPFS storage instance
 */
export function createIPFSStorage(config: IPFSConfig): IPFSStorage {
  return new IPFSStorage(config);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Build IPFS URL from CID
 * @param cid Content identifier
 * @param gateway Optional gateway URL
 * @returns Full IPFS URL
 */
export function buildIPFSUrl(cid: string, gateway = 'https://gateway.pinata.cloud/ipfs'): string {
  return `${gateway}/${cid}`;
}

/**
 * Extract CID from IPFS URL
 * @param url IPFS URL
 * @returns CID or null if invalid URL
 */
export function extractCIDFromUrl(url: string): string | null {
  const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

/**
 * Validate CID format
 * @param cid Content identifier
 * @returns True if valid CID format
 */
export function isValidCID(cid: string): boolean {
  // Basic validation for CIDv0 (Qm...) and CIDv1 (bafy...)
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58})$/.test(cid);
}

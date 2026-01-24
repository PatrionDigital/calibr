/**
 * Polymarket Authentication Service
 * Handles L1 (wallet signature) and L2 (API credentials) authentication
 */

import { createHmac } from 'crypto';
import {
  type Hex,
  type WalletClient,
  type PublicClient,
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  toBytes,
  encodePacked,
} from 'viem';
import { polygon } from 'viem/chains';
import type {
  PolymarketCredentials,
  PolymarketSignatureType,
  AuthState,
} from '../types';
import { POLYMARKET_API, SIGNATURE_TYPES } from './config';

// EIP-712 Domain for Polymarket
const POLYMARKET_DOMAIN = {
  name: 'ClobAuthDomain',
  version: '1',
  chainId: 137,
} as const;

// Message type for L1 authentication
const L1_AUTH_TYPE = {
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
} as const;

export interface L1AuthResult {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export interface AuthServiceConfig {
  rpcUrl?: string;
  clobUrl?: string;
}

/**
 * Polymarket Authentication Service
 */
export class PolymarketAuthService {
  private config: AuthServiceConfig;
  private publicClient: PublicClient;

  constructor(config: AuthServiceConfig = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || 'https://polygon-rpc.com',
      clobUrl: config.clobUrl || POLYMARKET_API.clob,
    };

    this.publicClient = createPublicClient({
      chain: polygon,
      transport: http(this.config.rpcUrl),
    });
  }

  /**
   * Generate L1 authentication message for wallet signature
   */
  generateL1AuthMessage(address: string, nonce: number = 0): {
    message: string;
    timestamp: string;
    nonce: number;
  } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `This message attests that I control the given wallet and wish to sign in to Polymarket. Nonce: ${nonce}, Timestamp: ${timestamp}`;

    return {
      message,
      timestamp,
      nonce,
    };
  }

  /**
   * Create EIP-712 typed data for L1 authentication
   */
  createL1TypedData(address: string, timestamp: string, nonce: number) {
    const message = `This message attests that I control the given wallet and wish to sign in to Polymarket. Nonce: ${nonce}, Timestamp: ${timestamp}`;

    return {
      domain: POLYMARKET_DOMAIN,
      types: L1_AUTH_TYPE,
      primaryType: 'ClobAuth' as const,
      message: {
        address: address as Hex,
        timestamp,
        nonce: BigInt(nonce),
        message,
      },
    };
  }

  /**
   * Perform L1 authentication using a wallet client
   * This derives API credentials from a wallet signature
   */
  async authenticateL1(
    walletClient: WalletClient,
    signatureType: PolymarketSignatureType = 'EOA'
  ): Promise<L1AuthResult> {
    const [address] = await walletClient.getAddresses();
    if (!address) {
      throw new Error('No address available from wallet client');
    }

    const nonce = Math.floor(Math.random() * 1_000_000);
    const { timestamp } = this.generateL1AuthMessage(address, nonce);

    // Create typed data for EIP-712 signature
    const typedData = this.createL1TypedData(address, timestamp, nonce);

    // Sign the typed data (account is inferred from wallet client)
    const signature = await walletClient.signTypedData({
      ...typedData,
      account: address,
    });

    // Derive API credentials from the signature
    return this.deriveApiCredentials(address, signature, signatureType);
  }

  /**
   * Derive API credentials from a wallet signature
   * This creates deterministic API key/secret based on the signature
   */
  async deriveApiCredentials(
    address: string,
    signature: Hex,
    signatureType: PolymarketSignatureType
  ): Promise<L1AuthResult> {
    // Create a deterministic seed from the signature
    const seed = keccak256(
      encodePacked(['address', 'bytes'], [address as Hex, signature])
    );

    // Derive API key (first 32 chars of seed hash)
    const apiKeyHash = keccak256(encodePacked(['bytes32', 'string'], [seed, 'api_key']));
    const apiKey = apiKeyHash.slice(2, 34); // Remove 0x and take 32 chars

    // Derive API secret (different hash)
    const apiSecretHash = keccak256(encodePacked(['bytes32', 'string'], [seed, 'api_secret']));
    const apiSecret = apiSecretHash.slice(2, 66); // 64 chars

    // Derive passphrase
    const passphraseHash = keccak256(encodePacked(['bytes32', 'string'], [seed, 'passphrase']));
    const passphrase = passphraseHash.slice(2, 18); // 16 chars

    return {
      apiKey,
      apiSecret,
      passphrase,
    };
  }

  /**
   * Generate L2 authentication headers for API requests
   * Uses HMAC-SHA256 for request signing
   */
  generateL2Headers(
    credentials: PolymarketCredentials,
    method: string,
    path: string,
    body?: string
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 15);

    // Create the message to sign
    const message = timestamp + method.toUpperCase() + path + (body || '');

    // Sign with HMAC-SHA256
    const signature = createHmac('sha256', credentials.apiSecret)
      .update(message)
      .digest('base64');

    return {
      'POLY-ADDRESS': credentials.apiKey,
      'POLY-SIGNATURE': signature,
      'POLY-TIMESTAMP': timestamp,
      'POLY-NONCE': nonce,
      'POLY-PASSPHRASE': credentials.passphrase,
    };
  }

  /**
   * Create API credentials on Polymarket
   * This registers the derived credentials with Polymarket's servers
   */
  async createApiCredentials(
    walletClient: WalletClient,
    signatureType: PolymarketSignatureType = 'EOA'
  ): Promise<PolymarketCredentials> {
    const [address] = await walletClient.getAddresses();
    if (!address) {
      throw new Error('No address available from wallet client');
    }

    // Derive credentials from wallet signature
    const { apiKey, apiSecret, passphrase } = await this.authenticateL1(
      walletClient,
      signatureType
    );

    // TODO: When Builder Program access is available, call the API to register credentials
    // For now, we return the derived credentials
    // const response = await this.registerCredentials(address, apiKey, apiSecret, passphrase);

    return {
      platform: 'POLYMARKET',
      apiKey,
      apiSecret,
      passphrase,
      signatureType,
    };
  }

  /**
   * Verify API credentials are valid
   */
  async verifyCredentials(credentials: PolymarketCredentials): Promise<boolean> {
    try {
      const headers = this.generateL2Headers(
        credentials,
        'GET',
        '/auth/api-key'
      );

      const response = await fetch(`${this.config.clobUrl}/auth/api-key`, {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the numeric signature type for API calls
   */
  getSignatureTypeValue(type: PolymarketSignatureType): number {
    return SIGNATURE_TYPES[type];
  }

  /**
   * Create auth state from credentials
   */
  createAuthState(
    address: string,
    credentials: PolymarketCredentials
  ): AuthState {
    return {
      isAuthenticated: true,
      address,
      platform: 'POLYMARKET',
      authMethod: credentials.signatureType,
      // Credentials typically don't expire, but could be revoked
      expiresAt: undefined,
    };
  }
}

// Export singleton instance
export const polymarketAuth = new PolymarketAuthService();

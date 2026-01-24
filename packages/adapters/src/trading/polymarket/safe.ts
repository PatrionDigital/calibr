/**
 * Polymarket Safe Wallet Management
 * Handles Safe wallet detection, deployment, and activation for gasless trading
 */

import {
  type Hex,
  type WalletClient,
  type PublicClient,
  createPublicClient,
  http,
  getContract,
  encodeFunctionData,
  keccak256,
  encodePacked,
} from 'viem';
import { polygon } from 'viem/chains';
import type { PolymarketSafeWallet } from '../types';
import { POLYMARKET_ADDRESSES, POLYMARKET_API } from './config';

// Minimal Safe Proxy Factory ABI
const SAFE_PROXY_FACTORY_ABI = [
  {
    inputs: [
      { name: '_singleton', type: 'address' },
      { name: 'initializer', type: 'bytes' },
      { name: 'saltNonce', type: 'uint256' },
    ],
    name: 'createProxyWithNonce',
    outputs: [{ name: 'proxy', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: '_singleton', type: 'address' },
      { name: 'initializer', type: 'bytes' },
      { name: 'saltNonce', type: 'uint256' },
    ],
    name: 'calculateCreateProxyWithNonceAddress',
    outputs: [{ name: 'proxy', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Minimal Safe ABI for setup and module operations
const SAFE_ABI = [
  {
    inputs: [
      { name: '_owners', type: 'address[]' },
      { name: '_threshold', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'fallbackHandler', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'payment', type: 'uint256' },
      { name: 'paymentReceiver', type: 'address' },
    ],
    name: 'setup',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'module', type: 'address' }],
    name: 'isModuleEnabled',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'module', type: 'address' }],
    name: 'enableModule',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export interface SafeServiceConfig {
  rpcUrl?: string;
  proxyFactoryAddress?: string;
  safeModuleAddress?: string;
}

/**
 * Polymarket Safe Wallet Management Service
 */
export class PolymarketSafeService {
  private config: SafeServiceConfig;
  private publicClient: PublicClient;

  constructor(config: SafeServiceConfig = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || 'https://polygon-rpc.com',
      proxyFactoryAddress: config.proxyFactoryAddress || POLYMARKET_ADDRESSES.proxyFactory,
      safeModuleAddress: config.safeModuleAddress || POLYMARKET_ADDRESSES.safeModule,
    };

    this.publicClient = createPublicClient({
      chain: polygon,
      transport: http(this.config.rpcUrl),
    });
  }

  /**
   * Check if an address has a deployed Safe wallet
   */
  async getSafeWallet(ownerAddress: string): Promise<PolymarketSafeWallet | null> {
    try {
      // Calculate the expected Safe address for this owner
      const safeAddress = await this.calculateSafeAddress(ownerAddress);

      // Check if contract exists at that address
      const code = await this.publicClient.getBytecode({ address: safeAddress as Hex });

      if (!code || code === '0x') {
        // Safe not deployed yet
        return {
          address: safeAddress,
          isDeployed: false,
          isActivated: false,
          owners: [ownerAddress],
          threshold: 1,
        };
      }

      // Safe exists, get details
      const safeContract = getContract({
        address: safeAddress as Hex,
        abi: SAFE_ABI,
        client: this.publicClient,
      });

      const [owners, threshold, isModuleEnabled] = await Promise.all([
        safeContract.read.getOwners(),
        safeContract.read.getThreshold(),
        safeContract.read.isModuleEnabled([this.config.safeModuleAddress as Hex]),
      ]);

      return {
        address: safeAddress,
        isDeployed: true,
        isActivated: isModuleEnabled,
        owners: owners as string[],
        threshold: Number(threshold),
        polymarketProxyAddress: this.config.safeModuleAddress,
      };
    } catch (error) {
      console.error('Error fetching Safe wallet:', error);
      return null;
    }
  }

  /**
   * Calculate the deterministic Safe address for an owner
   */
  async calculateSafeAddress(ownerAddress: string, saltNonce?: string): Promise<string> {
    // Use a deterministic salt based on the owner address
    const salt = saltNonce || keccak256(
      encodePacked(['address', 'string'], [ownerAddress as Hex, 'polymarket_safe_v1'])
    );

    // Create setup data for a 1-of-1 Safe
    const setupData = this.createSetupData([ownerAddress], 1);

    // For now, return a placeholder - in production this would call the factory
    // to calculate the exact CREATE2 address
    const calculatedAddress = keccak256(
      encodePacked(
        ['bytes1', 'address', 'bytes32', 'bytes32'],
        [
          '0xff',
          this.config.proxyFactoryAddress as Hex,
          salt as Hex,
          keccak256(setupData as Hex),
        ]
      )
    );

    // Return last 20 bytes as address
    return `0x${calculatedAddress.slice(-40)}`;
  }

  /**
   * Create setup data for Safe initialization
   */
  private createSetupData(owners: string[], threshold: number): Hex {
    return encodeFunctionData({
      abi: SAFE_ABI,
      functionName: 'setup',
      args: [
        owners as Hex[],
        BigInt(threshold),
        '0x0000000000000000000000000000000000000000' as Hex, // to
        '0x' as Hex, // data
        '0x0000000000000000000000000000000000000000' as Hex, // fallbackHandler
        '0x0000000000000000000000000000000000000000' as Hex, // paymentToken
        BigInt(0), // payment
        '0x0000000000000000000000000000000000000000' as Hex, // paymentReceiver
      ],
    });
  }

  /**
   * Deploy a new Safe wallet via the Builder Program relayer
   * This is gasless when using the Builder Program
   */
  async deploySafe(
    walletClient: WalletClient,
    owners?: string[],
    threshold?: number
  ): Promise<PolymarketSafeWallet> {
    const [address] = await walletClient.getAddresses();
    if (!address) {
      throw new Error('No address available from wallet client');
    }

    const safeOwners = owners || [address];
    const safeThreshold = threshold || 1;

    // Check if Safe already exists
    const existingSafe = await this.getSafeWallet(address);
    if (existingSafe?.isDeployed) {
      return existingSafe;
    }

    // Create deployment request for the relayer
    // In production, this would be sent to Polymarket's relayer
    const deploymentRequest = {
      owners: safeOwners,
      threshold: safeThreshold,
      saltNonce: keccak256(
        encodePacked(['address', 'uint256'], [address as Hex, BigInt(Date.now())])
      ),
    };

    // TODO: When Builder Program access is available:
    // const response = await this.submitToRelayer('deploySafe', deploymentRequest);

    // For now, return the expected Safe address
    const safeAddress = await this.calculateSafeAddress(address, deploymentRequest.saltNonce);

    return {
      address: safeAddress,
      isDeployed: false, // Will be true after relayer processes
      isActivated: false,
      owners: safeOwners,
      threshold: safeThreshold,
    };
  }

  /**
   * Activate a Safe for Polymarket trading by enabling the Polymarket module
   */
  async activateSafe(
    walletClient: WalletClient,
    safeAddress: string
  ): Promise<boolean> {
    const [address] = await walletClient.getAddresses();
    if (!address) {
      throw new Error('No address available from wallet client');
    }

    // Check if Safe exists
    const safeWallet = await this.getSafeWallet(address);
    if (!safeWallet?.isDeployed) {
      throw new Error('Safe is not deployed');
    }

    if (safeWallet.isActivated) {
      return true; // Already activated
    }

    // Create activation transaction data
    const enableModuleData = encodeFunctionData({
      abi: SAFE_ABI,
      functionName: 'enableModule',
      args: [this.config.safeModuleAddress as Hex],
    });

    // TODO: When Builder Program access is available:
    // Submit this transaction through the relayer for gasless execution
    // const response = await this.submitToRelayer('executeTransaction', {
    //   safe: safeAddress,
    //   to: safeAddress,
    //   data: enableModuleData,
    //   operation: 0, // Call
    // });

    console.log('Safe activation request prepared:', {
      safe: safeAddress,
      module: this.config.safeModuleAddress,
      data: enableModuleData,
    });

    return true;
  }

  /**
   * Check if a Safe is activated for Polymarket trading
   */
  async isSafeActivated(safeAddress: string): Promise<boolean> {
    try {
      const safeContract = getContract({
        address: safeAddress as Hex,
        abi: SAFE_ABI,
        client: this.publicClient,
      });

      return await safeContract.read.isModuleEnabled([
        this.config.safeModuleAddress as Hex,
      ]);
    } catch {
      return false;
    }
  }

  /**
   * Get Safe transaction history from Polymarket
   */
  async getSafeTransactions(
    safeAddress: string,
    _limit = 50
  ): Promise<unknown[]> {
    // TODO: Fetch from Polymarket's API when available
    return [];
  }

  /**
   * Submit a request to the Polymarket relayer
   */
  private async submitToRelayer(
    method: string,
    params: Record<string, unknown>
  ): Promise<unknown> {
    const response = await fetch(`${POLYMARKET_API.relayer}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Relayer error: ${response.statusText}`);
    }

    return response.json();
  }
}

// Export singleton instance
export const polymarketSafe = new PolymarketSafeService();

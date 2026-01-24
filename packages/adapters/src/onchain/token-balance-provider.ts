/**
 * Token Balance Provider
 * Reads ERC-1155 token balances from on-chain contracts
 */

import { createPublicClient, http, type Address } from 'viem';
import { base, polygon } from 'viem/chains';

// Use a more flexible type to avoid version conflicts
type ViemClient = ReturnType<typeof createPublicClient>;

// =============================================================================
// Types
// =============================================================================

export interface TokenBalance {
  tokenAddress: Address;
  tokenId: bigint;
  balance: bigint;
  balanceFormatted: number;
  decimals: number;
}

export interface PositionTokenInfo {
  marketId: string;
  marketSlug: string;
  platform: 'LIMITLESS' | 'POLYMARKET';
  outcome: string;
  outcomeIndex: number;
  tokenAddress: Address;
  tokenId: bigint;
  chainId: number;
}

export interface OnChainPosition {
  marketId: string;
  marketSlug: string;
  platform: 'LIMITLESS' | 'POLYMARKET';
  outcome: string;
  outcomeIndex: number;
  tokenAddress: Address;
  tokenId: bigint;
  balance: bigint;
  balanceFormatted: number;
  chainId: number;
}

// =============================================================================
// ERC-1155 ABI (minimal)
// =============================================================================

const ERC1155_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids', type: 'uint256[]' },
    ],
    name: 'balanceOfBatch',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// =============================================================================
// Token Balance Provider
// =============================================================================

export class TokenBalanceProvider {
  private clients: Map<number, ViemClient> = new Map();

  constructor(
    private config: {
      baseRpcUrl?: string;
      polygonRpcUrl?: string;
    } = {}
  ) {
    // Initialize clients lazily
  }

  /**
   * Get or create a public client for a chain
   */
  private getClient(chainId: number): ViemClient {
    if (this.clients.has(chainId)) {
      return this.clients.get(chainId)!;
    }

    let client: ViemClient;

    switch (chainId) {
      case 8453: // Base
        client = createPublicClient({
          chain: base,
          transport: http(this.config.baseRpcUrl || 'https://mainnet.base.org'),
        }) as ViemClient;
        break;
      case 137: // Polygon
        client = createPublicClient({
          chain: polygon,
          transport: http(this.config.polygonRpcUrl || 'https://polygon-rpc.com'),
        }) as ViemClient;
        break;
      default:
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    this.clients.set(chainId, client);
    return client;
  }

  /**
   * Get ERC-1155 token balance for a single token
   */
  async getTokenBalance(
    walletAddress: Address,
    tokenAddress: Address,
    tokenId: bigint,
    chainId: number = 8453,
    decimals: number = 18
  ): Promise<TokenBalance> {
    const client = this.getClient(chainId);

    const balance = await client.readContract({
      address: tokenAddress,
      abi: ERC1155_ABI,
      functionName: 'balanceOf',
      args: [walletAddress, tokenId],
    });

    return {
      tokenAddress,
      tokenId,
      balance,
      balanceFormatted: Number(balance) / Math.pow(10, decimals),
      decimals,
    };
  }

  /**
   * Get ERC-1155 token balances in batch (more efficient)
   */
  async getTokenBalancesBatch(
    walletAddress: Address,
    tokens: Array<{ tokenAddress: Address; tokenId: bigint }>,
    chainId: number = 8453,
    decimals: number = 18
  ): Promise<TokenBalance[]> {
    if (tokens.length === 0) return [];

    const client = this.getClient(chainId);

    // Group by token address for batch calls
    const byAddress = new Map<Address, bigint[]>();
    for (const token of tokens) {
      if (!byAddress.has(token.tokenAddress)) {
        byAddress.set(token.tokenAddress, []);
      }
      byAddress.get(token.tokenAddress)!.push(token.tokenId);
    }

    const results: TokenBalance[] = [];

    // Make batch calls per contract
    for (const [tokenAddress, tokenIds] of byAddress) {
      try {
        const accounts = tokenIds.map(() => walletAddress);

        const balances = await client.readContract({
          address: tokenAddress,
          abi: ERC1155_ABI,
          functionName: 'balanceOfBatch',
          args: [accounts, tokenIds],
        });

        for (let i = 0; i < tokenIds.length; i++) {
          results.push({
            tokenAddress,
            tokenId: tokenIds[i]!,
            balance: balances[i]!,
            balanceFormatted: Number(balances[i]!) / Math.pow(10, decimals),
            decimals,
          });
        }
      } catch (error) {
        // If batch fails, fall back to individual calls
        console.warn(`[TokenBalanceProvider] Batch call failed for ${tokenAddress}, falling back to individual calls`);

        for (const tokenId of tokenIds) {
          try {
            const balance = await this.getTokenBalance(
              walletAddress,
              tokenAddress,
              tokenId,
              chainId,
              decimals
            );
            results.push(balance);
          } catch (err) {
            // Token doesn't exist or other error - treat as zero balance
            results.push({
              tokenAddress,
              tokenId,
              balance: 0n,
              balanceFormatted: 0,
              decimals,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Scan wallet for positions given a list of market token info
   */
  async scanWalletPositions(
    walletAddress: Address,
    marketTokens: PositionTokenInfo[],
    minBalance: number = 0.0001
  ): Promise<OnChainPosition[]> {
    if (marketTokens.length === 0) return [];

    // Group by chain ID
    const byChain = new Map<number, PositionTokenInfo[]>();
    for (const token of marketTokens) {
      if (!byChain.has(token.chainId)) {
        byChain.set(token.chainId, []);
      }
      byChain.get(token.chainId)!.push(token);
    }

    const positions: OnChainPosition[] = [];

    // Process each chain
    for (const [chainId, tokens] of byChain) {
      const balances = await this.getTokenBalancesBatch(
        walletAddress,
        tokens.map(t => ({
          tokenAddress: t.tokenAddress,
          tokenId: t.tokenId,
        })),
        chainId,
        18 // Limitless uses 18 decimals for outcome tokens
      );

      // Match balances back to tokens and filter for non-zero
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]!;
        const balance = balances[i];

        if (balance && balance.balanceFormatted >= minBalance) {
          positions.push({
            marketId: token.marketId,
            marketSlug: token.marketSlug,
            platform: token.platform,
            outcome: token.outcome,
            outcomeIndex: token.outcomeIndex,
            tokenAddress: token.tokenAddress,
            tokenId: token.tokenId,
            balance: balance.balance,
            balanceFormatted: balance.balanceFormatted,
            chainId,
          });
        }
      }
    }

    return positions;
  }
}

// Export singleton
export const tokenBalanceProvider = new TokenBalanceProvider();

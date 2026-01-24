/**
 * ERC-1155 Position Scanner
 * Scans wallets for prediction market positions using on-chain data
 */

import type { Address } from 'viem';
import {
  TokenBalanceProvider,
  type PositionTokenInfo,
  type OnChainPosition,
} from './token-balance-provider';

// =============================================================================
// Types
// =============================================================================

export interface MarketTokenMapping {
  marketId: string;
  marketSlug: string;
  question: string;
  platform: 'LIMITLESS' | 'POLYMARKET';
  chainId: number;
  collateralAddress?: Address;
  collateralDecimals?: number;
  outcomes: Array<{
    index: number;
    label: string;
    tokenAddress: Address;
    tokenId: string;
    currentPrice?: number;
  }>;
}

export interface ScannedPosition extends OnChainPosition {
  question: string;
  outcomeLabel: string;
  currentPrice?: number;
  currentValue?: number;
  collateralAddress?: Address;
  collateralDecimals?: number;
}

export interface WalletScanResult {
  walletAddress: Address;
  positions: ScannedPosition[];
  totalPositions: number;
  totalValue: number;
  scanTimestamp: Date;
  marketsScanned: number;
  errors: string[];
}

// =============================================================================
// ERC-1155 Scanner
// =============================================================================

export class ERC1155Scanner {
  private balanceProvider: TokenBalanceProvider;

  constructor(
    config: {
      baseRpcUrl?: string;
      polygonRpcUrl?: string;
    } = {}
  ) {
    this.balanceProvider = new TokenBalanceProvider(config);
  }

  /**
   * Scan a wallet for positions across multiple markets
   */
  async scanWallet(
    walletAddress: Address,
    markets: MarketTokenMapping[],
    options: {
      minBalance?: number;
      includeZeroBalance?: boolean;
    } = {}
  ): Promise<WalletScanResult> {
    const { minBalance = 0.0001, includeZeroBalance = false } = options;
    const errors: string[] = [];

    // Build token list from markets
    const tokenList: PositionTokenInfo[] = [];

    for (const market of markets) {
      for (const outcome of market.outcomes) {
        // Skip if no token ID
        if (!outcome.tokenId || !outcome.tokenAddress) {
          continue;
        }

        try {
          tokenList.push({
            marketId: market.marketId,
            marketSlug: market.marketSlug,
            platform: market.platform,
            outcome: outcome.label,
            outcomeIndex: outcome.index,
            tokenAddress: outcome.tokenAddress,
            tokenId: BigInt(outcome.tokenId),
            chainId: market.chainId,
          });
        } catch (err) {
          errors.push(`Invalid token ID for market ${market.marketSlug}: ${outcome.tokenId}`);
        }
      }
    }

    if (tokenList.length === 0) {
      return {
        walletAddress,
        positions: [],
        totalPositions: 0,
        totalValue: 0,
        scanTimestamp: new Date(),
        marketsScanned: markets.length,
        errors,
      };
    }

    // Scan for balances
    let onChainPositions: OnChainPosition[];
    try {
      onChainPositions = await this.balanceProvider.scanWalletPositions(
        walletAddress,
        tokenList,
        includeZeroBalance ? 0 : minBalance
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to scan wallet: ${message}`);
      return {
        walletAddress,
        positions: [],
        totalPositions: 0,
        totalValue: 0,
        scanTimestamp: new Date(),
        marketsScanned: markets.length,
        errors,
      };
    }

    // Enrich positions with market data
    const positions: ScannedPosition[] = [];
    let totalValue = 0;

    for (const pos of onChainPositions) {
      // Find the market for this position
      const market = markets.find(m => m.marketSlug === pos.marketSlug);
      if (!market) continue;

      // Find the outcome
      const outcome = market.outcomes.find(
        o => o.index === pos.outcomeIndex || o.label === pos.outcome
      );

      const currentPrice = outcome?.currentPrice;
      const currentValue = currentPrice !== undefined
        ? pos.balanceFormatted * currentPrice
        : undefined;

      if (currentValue !== undefined) {
        totalValue += currentValue;
      }

      positions.push({
        ...pos,
        question: market.question,
        outcomeLabel: outcome?.label || pos.outcome,
        currentPrice,
        currentValue,
        collateralAddress: market.collateralAddress,
        collateralDecimals: market.collateralDecimals,
      });
    }

    return {
      walletAddress,
      positions,
      totalPositions: positions.length,
      totalValue,
      scanTimestamp: new Date(),
      marketsScanned: markets.length,
      errors,
    };
  }
}

// Export singleton
export const erc1155Scanner = new ERC1155Scanner();

/**
 * Position Scanner Service
 * Scans wallet addresses for prediction market positions across platforms
 */

import { prisma } from '../lib/prisma';
import type { Platform } from '@prisma/client';
import {
  ERC1155Scanner,
  type MarketTokenMapping,
} from '@calibr/adapters';
import {
  batchFindPositionsByWalletIds,
  batchLookupPlatformConfigs,
  batchLookupPlatformMarkets,
  batchUpsertPositions,
  type PositionUpsertData,
} from '../lib/batch-queries';

// =============================================================================
// Types
// =============================================================================

export interface ScannedPosition {
  platform: 'POLYMARKET' | 'LIMITLESS';
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  outcome: 'YES' | 'NO';
  outcomeLabel: string;
  balance: bigint;
  balanceFormatted: number;
  tokenAddress: string;
  tokenId?: string;
  currentPrice?: number;
  costBasis?: number;
  unrealizedPnl?: number;
  chainId: number;
}

export interface PositionScanResult {
  address: string;
  positions: ScannedPosition[];
  totalValue: number;
  scanTimestamp: Date;
  errors: string[];
}

export interface PositionScanOptions {
  platforms?: ('POLYMARKET' | 'LIMITLESS')[];
  includeResolved?: boolean;
  minValue?: number;
  /** If true, scan on-chain for token balances instead of checking database */
  scanOnChain?: boolean;
}

// =============================================================================
// Position Scanner Class
// =============================================================================

export class PositionScanner {
  /**
   * Scan a wallet address for positions across all supported platforms
   * Note: This is a simplified implementation that queries our database
   * for markets and simulates position scanning. For production, this would
   * integrate with on-chain RPC calls to read actual token balances.
   */
  async scanWallet(
    address: string,
    options: PositionScanOptions = {}
  ): Promise<PositionScanResult> {
    const normalizedAddress = address.toLowerCase();
    const platforms = options.platforms || ['LIMITLESS', 'POLYMARKET'];
    const errors: string[] = [];
    const positions: ScannedPosition[] = [];

    // For now, we query existing positions from the database
    // In a full implementation, we would:
    // 1. Query on-chain for ERC-1155 token balances
    // 2. Match token IDs to markets in our database
    // 3. Return the positions

    for (const platform of platforms) {
      try {
        if (options.scanOnChain) {
          // Scan on-chain for actual token balances
          if (platform === 'LIMITLESS') {
            const onChainPositions = await this.scanLimitlessOnChain(normalizedAddress, options);
            positions.push(...onChainPositions);
          } else if (platform === 'POLYMARKET') {
            const onChainPositions = await this.scanPolymarketOnChain(normalizedAddress, options);
            positions.push(...onChainPositions);
          }
        } else {
          // Use database records
          const dbPositions = await this.getExistingPositions(
            normalizedAddress,
            platform,
            options
          );
          positions.push(...dbPositions);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to scan ${platform}: ${message}`);
      }
    }

    // Calculate total value
    const totalValue = positions.reduce((sum, pos) => {
      const value = pos.balanceFormatted * (pos.currentPrice || 0);
      return sum + value;
    }, 0);

    return {
      address: normalizedAddress,
      positions,
      totalValue,
      scanTimestamp: new Date(),
      errors,
    };
  }

  /**
   * Get existing positions from database for a wallet
   * OPTIMIZED: Uses batch query to fetch all wallet positions in single DB call
   */
  private async getExistingPositions(
    address: string,
    platform: 'POLYMARKET' | 'LIMITLESS',
    _options: PositionScanOptions
  ): Promise<ScannedPosition[]> {
    const positions: ScannedPosition[] = [];

    // Find wallet connections for this address
    const walletConnections = await prisma.walletConnection.findMany({
      where: {
        address: {
          equals: address,
          mode: 'insensitive',
        },
      },
      include: {
        user: true,
      },
    });

    if (walletConnections.length === 0) {
      return [];
    }

    // OPTIMIZED: Batch fetch positions for all wallets in a single query
    const walletIds = walletConnections.map((w) => w.id);
    const positionsByWallet = await batchFindPositionsByWalletIds(walletIds, platform);

    // Process all positions from all wallets
    for (const walletPositions of positionsByWallet.values()) {
      for (const pos of walletPositions) {
        const chainId = platform === 'LIMITLESS' ? 8453 : 137; // Base vs Polygon
        const platformData = pos.platformMarket.platformData as Record<string, unknown> | null;

        positions.push({
          platform,
          marketId: pos.platformMarket.externalId,
          marketSlug: (platformData?.slug as string) || pos.platformMarket.externalId,
          marketQuestion: pos.platformMarket.question,
          outcome: pos.outcome === 'YES' ? 'YES' : 'NO',
          outcomeLabel: pos.outcome,
          balance: BigInt(Math.floor(pos.shares * 1e18)),
          balanceFormatted: pos.shares,
          tokenAddress: (platformData?.exchange as string) || '',
          tokenId: pos.outcome === 'YES'
            ? (platformData?.yesTokenId as string)
            : (platformData?.noTokenId as string),
          currentPrice: pos.currentPrice ?? undefined,
          costBasis: pos.avgCostBasis,
          unrealizedPnl: pos.unrealizedPnl ?? undefined,
          chainId,
        });
      }
    }

    return positions;
  }

  /**
   * Scan on-chain for Limitless positions
   */
  async scanLimitlessOnChain(
    address: string,
    options: PositionScanOptions
  ): Promise<ScannedPosition[]> {
    const normalizedAddress = address.toLowerCase() as `0x${string}`;

    // Get all active Limitless markets from the database with token info
    const platformConfig = await prisma.platformConfig.findFirst({
      where: {
        slug: 'limitless',
        isActive: true,
      },
    });

    if (!platformConfig) {
      console.log('[PositionScanner] Limitless platform not configured');
      return [];
    }

    // Get markets with token IDs
    const markets = await prisma.platformMarket.findMany({
      where: {
        platformConfigId: platformConfig.id,
        isActive: options.includeResolved ? undefined : true,
      },
      select: {
        id: true,
        externalId: true,
        question: true,
        yesPrice: true,
        noPrice: true,
        platformData: true,
      },
    });

    // Build market token mappings
    const marketMappings: MarketTokenMapping[] = [];

    for (const market of markets) {
      const platformData = market.platformData as Record<string, unknown> | null;
      if (!platformData) continue;

      // Get the contract address - this could be in venue.exchange or address
      const venue = platformData.venue as { exchange?: string } | undefined;
      const contractAddress = venue?.exchange || (platformData.address as string | undefined);

      if (!contractAddress) continue;

      // Get token IDs
      const yesTokenId = platformData.yesTokenId as string | undefined;
      const noTokenId = platformData.noTokenId as string | undefined;
      const tokens = platformData.tokens as Record<string, string> | undefined;
      const collateralToken = platformData.collateralToken as { address?: string; decimals?: number } | undefined;

      // Build outcomes array
      const outcomes: MarketTokenMapping['outcomes'] = [];

      // Check for multi-outcome markets
      const platformOutcomes = platformData.outcomes as Array<{
        index: number;
        label: string;
        tokenId?: string;
        price?: number;
      }> | undefined;

      if (platformOutcomes && platformOutcomes.length > 0) {
        // Multi-outcome market
        for (const outcome of platformOutcomes) {
          const tokenId = outcome.tokenId || tokens?.[outcome.label.toLowerCase()];
          if (tokenId) {
            outcomes.push({
              index: outcome.index,
              label: outcome.label,
              tokenAddress: contractAddress as `0x${string}`,
              tokenId,
              currentPrice: outcome.price,
            });
          }
        }
      } else {
        // Binary market
        if (yesTokenId || tokens?.yes) {
          outcomes.push({
            index: 0,
            label: 'YES',
            tokenAddress: contractAddress as `0x${string}`,
            tokenId: yesTokenId || tokens?.yes || '',
            currentPrice: market.yesPrice ?? undefined,
          });
        }

        if (noTokenId || tokens?.no) {
          outcomes.push({
            index: 1,
            label: 'NO',
            tokenAddress: contractAddress as `0x${string}`,
            tokenId: noTokenId || tokens?.no || '',
            currentPrice: market.noPrice ?? undefined,
          });
        }
      }

      if (outcomes.length > 0) {
        marketMappings.push({
          marketId: market.id,
          marketSlug: market.externalId,
          question: market.question,
          platform: 'LIMITLESS',
          chainId: 8453, // Base
          collateralAddress: collateralToken?.address as `0x${string}` | undefined,
          collateralDecimals: collateralToken?.decimals ?? 6,
          outcomes,
        });
      }
    }

    if (marketMappings.length === 0) {
      console.log('[PositionScanner] No Limitless markets with token info found');
      return [];
    }

    console.log(`[PositionScanner] Scanning ${marketMappings.length} Limitless markets for wallet ${normalizedAddress}`);

    // Initialize the scanner with RPC URL from env
    const scanner = new ERC1155Scanner({
      baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    });

    // Scan for positions
    const scanResult = await scanner.scanWallet(normalizedAddress, marketMappings, {
      minBalance: options.minValue ?? 0.0001,
    });

    if (scanResult.errors.length > 0) {
      console.warn('[PositionScanner] Scan errors:', scanResult.errors);
    }

    console.log(`[PositionScanner] Found ${scanResult.positions.length} positions`);

    // Map to our ScannedPosition format
    return scanResult.positions.map((pos): ScannedPosition => ({
      platform: 'LIMITLESS',
      marketId: pos.marketSlug,
      marketSlug: pos.marketSlug,
      marketQuestion: pos.question,
      outcome: pos.outcomeLabel.toUpperCase() === 'YES' || pos.outcomeLabel.toUpperCase() === 'NO'
        ? pos.outcomeLabel.toUpperCase() as 'YES' | 'NO'
        : 'YES', // Default for multi-outcome
      outcomeLabel: pos.outcomeLabel,
      balance: pos.balance,
      balanceFormatted: pos.balanceFormatted,
      tokenAddress: pos.tokenAddress,
      tokenId: pos.tokenId.toString(),
      currentPrice: pos.currentPrice,
      costBasis: undefined, // Can't determine from on-chain
      unrealizedPnl: undefined, // Can't determine without cost basis
      chainId: 8453,
    }));
  }

  /**
   * Scan on-chain for Polymarket positions (placeholder for future implementation)
   */
  async scanPolymarketOnChain(
    _address: string,
    _options: PositionScanOptions
  ): Promise<ScannedPosition[]> {
    // This would:
    // 1. Query the Polymarket CTF contract on Polygon
    // 2. Get token balances for each outcome token
    // 3. Match to markets in our database
    // 4. Return positions with non-zero balances

    console.log('[PositionScanner] On-chain scanning not yet implemented');
    return [];
  }

  /**
   * Import scanned positions into the database for a user
   * OPTIMIZED: Uses batch lookups and batch upserts instead of N+1 queries
   */
  async importPositions(
    userId: string,
    scanResult: PositionScanResult,
    walletConnectionId?: string
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];

    if (scanResult.positions.length === 0) {
      return { imported: 0, errors };
    }

    // STEP 1: Batch lookup all platform configs (cached)
    const platformSlugs = [...new Set(scanResult.positions.map((p) => p.platform.toLowerCase()))];
    const platformConfigs = await batchLookupPlatformConfigs(platformSlugs);

    // Validate all platform configs exist
    for (const slug of platformSlugs) {
      if (!platformConfigs.has(slug)) {
        errors.push(`Platform config not found for ${slug}`);
      }
    }

    // STEP 2: Batch lookup all platform markets
    const marketLookupKeys: Array<{ platformConfigId: string; externalId: string }> = [];
    for (const position of scanResult.positions) {
      const config = platformConfigs.get(position.platform.toLowerCase());
      if (config) {
        marketLookupKeys.push({
          platformConfigId: config.id,
          externalId: position.marketId,
        });
      }
    }

    const platformMarkets = await batchLookupPlatformMarkets(marketLookupKeys);

    // STEP 3: Build batch upsert data
    const upsertData: PositionUpsertData[] = [];

    for (const position of scanResult.positions) {
      const config = platformConfigs.get(position.platform.toLowerCase());
      if (!config) {
        continue; // Already logged error above
      }

      const marketKey = `${config.id}:${position.marketId}`;
      const platformMarket = platformMarkets.get(marketKey);

      if (!platformMarket) {
        errors.push(`Market not found: ${position.marketId}`);
        continue;
      }

      upsertData.push({
        userId,
        platformMarketId: platformMarket.id,
        outcome: position.outcome,
        shares: position.balanceFormatted,
        avgCostBasis: position.costBasis || 0,
        currentPrice: position.currentPrice,
        currentValue: position.balanceFormatted * (position.currentPrice || 0),
        unrealizedPnl: position.unrealizedPnl,
        platform: position.platform as Platform,
        walletConnectionId,
      });
    }

    // STEP 4: Batch upsert all positions in a transaction
    const result = await batchUpsertPositions(upsertData);

    if (!result.success && result.error) {
      errors.push(`Batch upsert failed: ${result.error}`);
    }

    return { imported: result.count, errors };
  }

  /**
   * Get summary of positions for a wallet address
   */
  async getPositionSummary(address: string): Promise<{
    totalPositions: number;
    totalValue: number;
    byPlatform: Record<string, { count: number; value: number }>;
  }> {
    const result = await this.scanWallet(address);

    const byPlatform: Record<string, { count: number; value: number }> = {};

    for (const pos of result.positions) {
      if (!byPlatform[pos.platform]) {
        byPlatform[pos.platform] = { count: 0, value: 0 };
      }
      const platformStats = byPlatform[pos.platform];
      if (platformStats) {
        platformStats.count++;
        platformStats.value += pos.balanceFormatted * (pos.currentPrice || 0);
      }
    }

    return {
      totalPositions: result.positions.length,
      totalValue: result.totalValue,
      byPlatform,
    };
  }
}

// Export singleton
export const positionScanner = new PositionScanner();

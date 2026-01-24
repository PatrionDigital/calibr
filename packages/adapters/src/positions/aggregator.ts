/**
 * Position Aggregator Service
 * Aggregates positions across all platforms into a unified view
 */

import type { Address } from 'viem';
import type {
  ITradingAdapter,
  UnifiedPosition,
  TradingPlatform,
} from '../trading/types';
import {
  ERC1155Scanner,
  type MarketTokenMapping,
  type ScannedPosition,
} from '../onchain/erc1155-scanner';
import { getTradingAdapter } from '../trading/registry';

// =============================================================================
// Types
// =============================================================================

export interface AggregatedPosition {
  /** Unique position ID */
  id: string;
  /** Platform this position is on */
  platform: TradingPlatform;
  /** Market identifier on the platform */
  marketId: string;
  /** Unified market ID if matched */
  unifiedMarketId?: string;
  /** Market question */
  question: string;
  /** Outcome (YES/NO or index) */
  outcome: 'YES' | 'NO' | number;
  /** Outcome label for display */
  outcomeLabel: string;
  /** Position size in shares/contracts */
  size: number;
  /** Average entry price (0-1) */
  averagePrice: number;
  /** Current market price (0-1) */
  currentPrice: number;
  /** Unrealized P&L in collateral */
  unrealizedPnl: number;
  /** Realized P&L in collateral */
  realizedPnl: number;
  /** Total cost basis */
  costBasis: number;
  /** Current market value */
  marketValue: number;
  /** Return percentage */
  returnPct: number;
  /** Collateral token */
  collateralToken: string;
  /** Chain ID */
  chainId: number;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Source of position data */
  source: 'onchain' | 'api' | 'merged';
}

export interface PositionGroup {
  /** Unified market ID */
  unifiedMarketId: string;
  /** Market question */
  question: string;
  /** Positions across platforms */
  positions: AggregatedPosition[];
  /** Total size across all platforms */
  totalSize: number;
  /** Net exposure (YES size - NO size) */
  netExposure: number;
  /** Total unrealized P&L */
  totalUnrealizedPnl: number;
  /** Total realized P&L */
  totalRealizedPnl: number;
  /** Total cost basis */
  totalCostBasis: number;
  /** Total market value */
  totalMarketValue: number;
  /** Platforms with positions */
  platforms: TradingPlatform[];
}

export interface PortfolioSummary {
  /** Total positions across all platforms */
  totalPositions: number;
  /** Total unique markets */
  totalMarkets: number;
  /** Total market value */
  totalMarketValue: number;
  /** Total unrealized P&L */
  totalUnrealizedPnl: number;
  /** Total realized P&L */
  totalRealizedPnl: number;
  /** Total cost basis */
  totalCostBasis: number;
  /** Overall return percentage */
  overallReturnPct: number;
  /** Positions grouped by market */
  byMarket: PositionGroup[];
  /** Positions grouped by platform */
  byPlatform: Map<TradingPlatform, AggregatedPosition[]>;
  /** Last updated */
  updatedAt: Date;
}

export interface AggregatorConfig {
  /** Wallet address to scan */
  walletAddress: Address;
  /** Platforms to include */
  platforms?: TradingPlatform[];
  /** Market token mappings for on-chain scanning */
  marketMappings?: MarketTokenMapping[];
  /** Whether to include on-chain scanning */
  includeOnChain?: boolean;
  /** Whether to include API positions */
  includeApi?: boolean;
  /** Trading adapters (pre-authenticated) */
  adapters?: Map<TradingPlatform, ITradingAdapter>;
  /** Minimum position size to include */
  minSize?: number;
}

// =============================================================================
// Position Aggregator
// =============================================================================

export class PositionAggregator {
  private scanner: ERC1155Scanner;
  private adapters: Map<TradingPlatform, ITradingAdapter>;

  constructor(
    config: {
      baseRpcUrl?: string;
      polygonRpcUrl?: string;
    } = {}
  ) {
    this.scanner = new ERC1155Scanner(config);
    this.adapters = new Map();
  }

  /**
   * Register a trading adapter for a platform
   */
  registerAdapter(platform: TradingPlatform, adapter: ITradingAdapter): void {
    this.adapters.set(platform, adapter);
  }

  /**
   * Get or create a trading adapter for a platform
   */
  getAdapter(platform: TradingPlatform): ITradingAdapter | undefined {
    if (this.adapters.has(platform)) {
      return this.adapters.get(platform);
    }

    try {
      const adapter = getTradingAdapter(platform);
      this.adapters.set(platform, adapter);
      return adapter;
    } catch {
      return undefined;
    }
  }

  /**
   * Aggregate positions from all sources
   */
  async aggregatePositions(config: AggregatorConfig): Promise<PortfolioSummary> {
    const {
      walletAddress,
      platforms = ['LIMITLESS', 'POLYMARKET'],
      marketMappings = [],
      includeOnChain = true,
      includeApi = true,
      adapters,
      minSize = 0.0001,
    } = config;

    // Register provided adapters
    if (adapters) {
      for (const [platform, adapter] of adapters) {
        this.adapters.set(platform, adapter);
      }
    }

    const allPositions: AggregatedPosition[] = [];
    const errors: string[] = [];

    // 1. Fetch on-chain positions
    if (includeOnChain && marketMappings.length > 0) {
      try {
        const onChainPositions = await this.fetchOnChainPositions(
          walletAddress,
          marketMappings,
          minSize
        );
        allPositions.push(...onChainPositions);
      } catch (err) {
        errors.push(`On-chain scan failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Fetch API positions from each platform
    if (includeApi) {
      for (const platform of platforms) {
        try {
          const apiPositions = await this.fetchApiPositions(platform);
          allPositions.push(...apiPositions);
        } catch (err) {
          errors.push(`${platform} API failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // 3. Merge duplicate positions (same market + outcome from different sources)
    const mergedPositions = this.mergePositions(allPositions);

    // 4. Filter by minimum size
    const filteredPositions = mergedPositions.filter(p => p.size >= minSize);

    // 5. Group by market
    const byMarket = this.groupByMarket(filteredPositions);

    // 6. Group by platform
    const byPlatform = this.groupByPlatform(filteredPositions);

    // 7. Calculate totals
    const summary = this.calculateSummary(filteredPositions, byMarket, byPlatform);

    return summary;
  }

  /**
   * Fetch positions from on-chain scanning
   */
  private async fetchOnChainPositions(
    walletAddress: Address,
    marketMappings: MarketTokenMapping[],
    minBalance: number
  ): Promise<AggregatedPosition[]> {
    const result = await this.scanner.scanWallet(walletAddress, marketMappings, {
      minBalance,
      includeZeroBalance: false,
    });

    return result.positions.map(pos => this.mapScannedPosition(pos));
  }

  /**
   * Fetch positions from trading adapter API
   */
  private async fetchApiPositions(platform: TradingPlatform): Promise<AggregatedPosition[]> {
    const adapter = this.getAdapter(platform);
    if (!adapter) {
      return [];
    }

    const authState = adapter.getAuthState();
    if (!authState?.isAuthenticated) {
      return [];
    }

    const positions = await adapter.getPositions();
    return positions.map(pos => this.mapUnifiedPosition(pos));
  }

  /**
   * Map scanned position to aggregated format
   */
  private mapScannedPosition(pos: ScannedPosition): AggregatedPosition {
    const currentPrice = pos.currentPrice ?? 0.5;
    const size = pos.balanceFormatted;
    const marketValue = size * currentPrice;
    // For on-chain positions, we don't have cost basis, estimate from current price
    const costBasis = marketValue; // Conservative: assume bought at current price
    const unrealizedPnl = 0; // Unknown without cost basis

    return {
      id: `${pos.platform}-${pos.marketSlug}-${pos.outcomeIndex}`,
      platform: pos.platform,
      marketId: pos.marketSlug,
      question: pos.question,
      outcome: pos.outcomeIndex === 0 ? 'YES' : 'NO',
      outcomeLabel: pos.outcomeLabel,
      size,
      averagePrice: currentPrice, // Unknown, use current
      currentPrice,
      unrealizedPnl,
      realizedPnl: 0,
      costBasis,
      marketValue,
      returnPct: 0,
      collateralToken: 'USDC',
      chainId: pos.chainId,
      updatedAt: new Date(),
      source: 'onchain',
    };
  }

  /**
   * Map unified position from adapter to aggregated format
   */
  private mapUnifiedPosition(pos: UnifiedPosition): AggregatedPosition {
    const marketValue = pos.size * pos.currentPrice;
    const returnPct = pos.costBasis > 0
      ? ((marketValue - pos.costBasis) / pos.costBasis) * 100
      : 0;

    return {
      id: `${pos.platform}-${pos.marketId}-${pos.outcome}`,
      platform: pos.platform,
      marketId: pos.marketId,
      question: pos.marketQuestion || '',
      outcome: pos.outcome,
      outcomeLabel: typeof pos.outcome === 'number' ? `Outcome ${pos.outcome}` : pos.outcome,
      size: pos.size,
      averagePrice: pos.averagePrice,
      currentPrice: pos.currentPrice,
      unrealizedPnl: pos.unrealizedPnl,
      realizedPnl: pos.realizedPnl,
      costBasis: pos.costBasis,
      marketValue,
      returnPct,
      collateralToken: 'USDC',
      chainId: pos.platform === 'POLYMARKET' ? 137 : 8453,
      updatedAt: new Date(),
      source: 'api',
    };
  }

  /**
   * Merge duplicate positions from different sources
   * Prefer API data over on-chain when available
   */
  private mergePositions(positions: AggregatedPosition[]): AggregatedPosition[] {
    const merged = new Map<string, AggregatedPosition>();

    for (const pos of positions) {
      const key = pos.id;

      if (!merged.has(key)) {
        merged.set(key, pos);
        continue;
      }

      const existing = merged.get(key)!;

      // Prefer API data (has cost basis and P&L info)
      if (pos.source === 'api' && existing.source === 'onchain') {
        merged.set(key, { ...pos, source: 'merged' });
      } else if (pos.source === 'onchain' && existing.source === 'api') {
        merged.set(key, { ...existing, source: 'merged' });
      } else {
        // Same source, use larger size (more recent data)
        const keepExisting = existing.size >= pos.size;
        merged.set(key, {
          ...(keepExisting ? existing : pos),
          source: 'merged',
        });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Group positions by unified market
   */
  private groupByMarket(positions: AggregatedPosition[]): PositionGroup[] {
    const groups = new Map<string, PositionGroup>();

    for (const pos of positions) {
      const marketKey = pos.unifiedMarketId || `${pos.platform}-${pos.marketId}`;

      if (!groups.has(marketKey)) {
        groups.set(marketKey, {
          unifiedMarketId: marketKey,
          question: pos.question,
          positions: [],
          totalSize: 0,
          netExposure: 0,
          totalUnrealizedPnl: 0,
          totalRealizedPnl: 0,
          totalCostBasis: 0,
          totalMarketValue: 0,
          platforms: [],
        });
      }

      const group = groups.get(marketKey)!;
      group.positions.push(pos);
      group.totalSize += pos.size;
      group.totalUnrealizedPnl += pos.unrealizedPnl;
      group.totalRealizedPnl += pos.realizedPnl;
      group.totalCostBasis += pos.costBasis;
      group.totalMarketValue += pos.marketValue;

      // Net exposure: positive for YES, negative for NO
      const exposureSign = pos.outcome === 'YES' || pos.outcome === 0 ? 1 : -1;
      group.netExposure += pos.size * exposureSign;

      if (!group.platforms.includes(pos.platform)) {
        group.platforms.push(pos.platform);
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.totalMarketValue - a.totalMarketValue);
  }

  /**
   * Group positions by platform
   */
  private groupByPlatform(
    positions: AggregatedPosition[]
  ): Map<TradingPlatform, AggregatedPosition[]> {
    const groups = new Map<TradingPlatform, AggregatedPosition[]>();

    for (const pos of positions) {
      if (!groups.has(pos.platform)) {
        groups.set(pos.platform, []);
      }
      groups.get(pos.platform)!.push(pos);
    }

    return groups;
  }

  /**
   * Calculate portfolio summary
   */
  private calculateSummary(
    positions: AggregatedPosition[],
    byMarket: PositionGroup[],
    byPlatform: Map<TradingPlatform, AggregatedPosition[]>
  ): PortfolioSummary {
    let totalMarketValue = 0;
    let totalUnrealizedPnl = 0;
    let totalRealizedPnl = 0;
    let totalCostBasis = 0;

    for (const pos of positions) {
      totalMarketValue += pos.marketValue;
      totalUnrealizedPnl += pos.unrealizedPnl;
      totalRealizedPnl += pos.realizedPnl;
      totalCostBasis += pos.costBasis;
    }

    const overallReturnPct = totalCostBasis > 0
      ? ((totalMarketValue - totalCostBasis) / totalCostBasis) * 100
      : 0;

    return {
      totalPositions: positions.length,
      totalMarkets: byMarket.length,
      totalMarketValue,
      totalUnrealizedPnl,
      totalRealizedPnl,
      totalCostBasis,
      overallReturnPct,
      byMarket,
      byPlatform,
      updatedAt: new Date(),
    };
  }
}

// Export singleton
export const positionAggregator = new PositionAggregator();

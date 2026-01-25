/**
 * Predict.fun Platform Adapter
 * Blast L2 prediction market using Polymarket CTF protocol
 *
 * NOTE: This is a partial implementation. Predict.fun doesn't have a public
 * REST API, so full integration requires either:
 * 1. Running an indexer to track contract events
 * 2. Using a subgraph/indexing service
 * 3. Direct integration with their frontend's internal API (if available)
 *
 * This adapter provides the structure for future implementation.
 */

import {
  PredictFunClient,
  type PredictFunClientConfig,
} from './client';
import {
  BLAST_CHAIN_ID,
  type PredictFunMarket,
} from './contracts';
import type {
  IPlatformAdapter,
  PlatformConfig,
  PlatformMarket,
  PlatformEvent,
  OrderBook,
  Trade,
  MarketQueryParams,
  EventQueryParams,
  MarketOutcome,
} from '../types';

// =============================================================================
// Configuration
// =============================================================================

export interface PredictFunAdapterConfig {
  client?: PredictFunClientConfig;
}

// =============================================================================
// Mappers
// =============================================================================

/**
 * Map Predict.fun market to unified platform market
 */
function mapPredictFunMarket(market: PredictFunMarket): PlatformMarket {
  const outcomes: MarketOutcome[] = market.outcomes.map((o) => ({
    index: o.index,
    label: `Outcome ${o.index + 1}`,
    price: o.price ?? 0,
    tokenId: o.tokenId,
    isWinner: market.isResolved && market.winningOutcome === o.index ? true : null,
  }));

  const yesPrice = outcomes[0]?.price ?? 0.5;
  const noPrice = outcomes[1]?.price ?? (1 - yesPrice);

  return {
    id: market.conditionId,
    platform: 'PREDICTFUN' as const,
    externalId: market.conditionId,
    question: `Market ${market.conditionId.slice(0, 10)}...`,
    description: undefined,
    url: `https://blast.predict.fun/market/${market.conditionId}`,

    marketType: market.outcomeCount > 2 ? 'MULTIPLE_CHOICE' : 'BINARY',
    outcomes,

    yesPrice,
    noPrice,
    lastPrice: yesPrice,

    volume: 0,
    liquidity: 0,

    status: market.isResolved ? 'RESOLVED' : 'ACTIVE',
    createdAt: new Date(),
    resolution: market.winningOutcome !== undefined
      ? `Outcome ${market.winningOutcome + 1}`
      : undefined,
    winningOutcomeIndex: market.winningOutcome ?? null,

    category: undefined,
    tags: [],

    platformData: {
      conditionId: market.conditionId,
      questionId: market.questionId,
      oracle: market.oracle,
      chainId: BLAST_CHAIN_ID,
    },
  };
}

// =============================================================================
// PredictFun Adapter
// =============================================================================

export class PredictFunAdapter implements IPlatformAdapter {
  public readonly platform = 'PREDICTFUN' as const;
  public readonly config: PlatformConfig;

  private client: PredictFunClient;

  constructor(adapterConfig: PredictFunAdapterConfig = {}) {
    this.config = {
      platform: 'PREDICTFUN' as const,
      apiBaseUrl: 'https://blast.predict.fun',
      wsUrl: undefined,
      chainId: BLAST_CHAIN_ID,
    };

    this.client = new PredictFunClient(adapterConfig.client);
  }

  // ===========================================================================
  // Market Data Methods
  // ===========================================================================

  /**
   * Get markets
   * NOTE: Limited functionality - requires indexer for full implementation
   */
  async getMarkets(params?: MarketQueryParams): Promise<PlatformMarket[]> {
    const markets = await this.client.getMarkets({
      limit: params?.limit,
    });

    return markets.map(mapPredictFunMarket);
  }

  /**
   * Get a single market by condition ID
   */
  async getMarket(conditionId: string): Promise<PlatformMarket | null> {
    const market = await this.client.getMarket(conditionId);
    if (!market) return null;

    return mapPredictFunMarket(market);
  }

  /**
   * Get events (not supported - no event grouping)
   */
  async getEvents(_params?: EventQueryParams): Promise<PlatformEvent[]> {
    return [];
  }

  // ===========================================================================
  // Order Book Methods
  // ===========================================================================

  /**
   * Get order book
   * NOTE: Would require indexing exchange events
   */
  async getOrderBook(marketId: string): Promise<OrderBook> {
    return {
      marketId,
      platform: 'PREDICTFUN' as const,
      timestamp: new Date(),
      bids: [],
      asks: [],
    };
  }

  /**
   * Get trades
   * NOTE: Would require indexing OrderFilled events
   */
  async getTrades(_marketId: string, _limit = 100): Promise<Trade[]> {
    return [];
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.client.clearCache();
  }

  /**
   * Get the underlying client
   */
  getClient(): PredictFunClient {
    return this.client;
  }

  /**
   * Get contract addresses
   */
  getContracts() {
    return this.client.getContracts();
  }
}

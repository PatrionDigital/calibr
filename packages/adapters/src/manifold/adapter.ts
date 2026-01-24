/**
 * Manifold Markets Platform Adapter
 * Play-money prediction market platform
 */

import {
  ManifoldClient,
  type ManifoldClientConfig,
  type ManifoldMarket,
} from './api-client';
import type {
  IPlatformAdapter,
  PlatformConfig,
  PlatformMarket,
  PlatformEvent,
  OrderBook,
  Trade,
  MarketQueryParams,
  EventQueryParams,
  MarketStatus,
  MarketCategory,
  MarketType,
  MarketOutcome,
} from '../types';

// =============================================================================
// Configuration
// =============================================================================

export interface ManifoldAdapterConfig {
  client?: ManifoldClientConfig;
}

// =============================================================================
// Mappers
// =============================================================================

/**
 * Map Manifold market status to unified status
 */
function mapStatus(market: ManifoldMarket): MarketStatus {
  if (market.isResolved) return 'RESOLVED';
  if (market.closeTime && market.closeTime < Date.now()) return 'CLOSED';
  return 'ACTIVE';
}

/**
 * Map Manifold tags/groups to unified category
 */
function mapCategory(market: ManifoldMarket): MarketCategory | undefined {
  const tags = [
    ...(market.groupSlugs || []),
    ...(market.tags || []),
  ].map(t => t.toLowerCase());

  for (const tag of tags) {
    if (tag.includes('politic') || tag.includes('election') ||
        tag.includes('president') || tag.includes('congress') ||
        tag.includes('government') || tag.includes('trump') || tag.includes('biden')) {
      return 'POLITICS';
    }
    if (tag.includes('sport') || tag.includes('nfl') || tag.includes('nba') ||
        tag.includes('mlb') || tag.includes('soccer') || tag.includes('football') ||
        tag.includes('basketball') || tag.includes('tennis')) {
      return 'SPORTS';
    }
    if (tag.includes('crypto') || tag.includes('bitcoin') || tag.includes('ethereum') ||
        tag.includes('btc') || tag.includes('eth') || tag.includes('blockchain') ||
        tag.includes('defi') || tag.includes('nft')) {
      return 'CRYPTO';
    }
    if (tag.includes('econ') || tag.includes('finance') || tag.includes('stock') ||
        tag.includes('market') || tag.includes('fed') || tag.includes('inflation')) {
      return 'ECONOMICS';
    }
    if (tag.includes('tech') || tag.includes('ai') || tag.includes('science') ||
        tag.includes('space') || tag.includes('climate')) {
      return 'TECHNOLOGY';
    }
    if (tag.includes('entertainment') || tag.includes('movie') || tag.includes('tv') ||
        tag.includes('celebrity') || tag.includes('music')) {
      return 'ENTERTAINMENT';
    }
  }

  return 'OTHER';
}

/**
 * Map Manifold outcome type to unified market type
 */
function mapMarketType(outcomeType?: string): MarketType {
  switch (outcomeType) {
    case 'BINARY':
      return 'BINARY';
    case 'MULTIPLE_CHOICE':
    case 'FREE_RESPONSE':
      return 'MULTIPLE_CHOICE';
    case 'NUMERIC':
    case 'PSEUDO_NUMERIC':
    case 'NUMBER':
      return 'SCALAR';
    default:
      return 'BINARY';
  }
}

/**
 * Map Manifold market to unified platform market
 */
function mapManifoldMarket(market: ManifoldMarket): PlatformMarket {
  const marketType = mapMarketType(market.outcomeType);
  const outcomes: MarketOutcome[] = [];

  if (marketType === 'MULTIPLE_CHOICE' && market.answers && market.answers.length > 0) {
    // Multi-choice market
    for (const answer of market.answers) {
      outcomes.push({
        index: answer.index ?? outcomes.length,
        label: answer.text,
        price: answer.probability ?? 0,
        tokenId: answer.id,
        isWinner: answer.resolution === 'YES' ? true :
                  answer.resolution === 'NO' ? false : null,
      });
    }
  } else {
    // Binary market
    const prob = market.probability ?? market.p ?? 0.5;
    outcomes.push({
      index: 0,
      label: 'Yes',
      price: prob,
      isWinner: market.resolution === 'YES' ? true :
                market.resolution === 'NO' ? false : null,
    });
    outcomes.push({
      index: 1,
      label: 'No',
      price: 1 - prob,
      isWinner: market.resolution === 'NO' ? true :
                market.resolution === 'YES' ? false : null,
    });
  }

  const yesPrice = outcomes[0]?.price ?? 0.5;
  const noPrice = outcomes[1]?.price ?? (1 - yesPrice);

  // Calculate liquidity from pool
  let liquidity = market.totalLiquidity ?? 0;
  if (!liquidity && market.pool) {
    liquidity = Object.values(market.pool).reduce((sum, val) => sum + val, 0);
  }

  return {
    id: market.id,
    platform: 'MANIFOLD',
    externalId: market.id,
    question: market.question,
    description: market.textDescription ||
                 (typeof market.description === 'string' ? market.description : undefined),
    url: market.url || `https://manifold.markets/${market.creatorUsername}/${market.slug}`,
    imageUrl: market.coverImageUrl,

    marketType,
    outcomes,

    yesPrice,
    noPrice,
    lastPrice: yesPrice,

    volume: market.volume ?? 0,
    liquidity,

    status: mapStatus(market),
    createdAt: new Date(market.createdTime),
    closesAt: market.closeTime ? new Date(market.closeTime) : undefined,
    resolvedAt: market.resolutionTime ? new Date(market.resolutionTime) : undefined,
    resolution: market.resolution,
    winningOutcomeIndex: market.resolution === 'YES' ? 0 :
                         market.resolution === 'NO' ? 1 :
                         market.resolution ? parseInt(market.resolution) || null : null,

    category: mapCategory(market),
    tags: [...(market.groupSlugs || []), ...(market.tags || [])],

    platformData: {
      id: market.id,
      slug: market.slug,
      creatorId: market.creatorId,
      creatorUsername: market.creatorUsername,
      mechanism: market.mechanism,
      outcomeType: market.outcomeType,
      uniqueBettorCount: market.uniqueBettorCount,
      volume24Hours: market.volume24Hours,
      pool: market.pool,
    },
  };
}

// =============================================================================
// Manifold Adapter
// =============================================================================

export class ManifoldAdapter implements IPlatformAdapter {
  public readonly platform = 'MANIFOLD' as const;
  public readonly config: PlatformConfig;

  private client: ManifoldClient;

  constructor(adapterConfig: ManifoldAdapterConfig = {}) {
    this.config = {
      platform: 'MANIFOLD',
      apiBaseUrl: 'https://api.manifold.markets',
      wsUrl: 'wss://api.manifold.markets/ws',
      chainId: undefined, // Play money, no blockchain
    };

    this.client = new ManifoldClient(adapterConfig.client);
  }

  // ===========================================================================
  // Market Data Methods
  // ===========================================================================

  /**
   * Get markets with optional filtering
   */
  async getMarkets(params?: MarketQueryParams): Promise<PlatformMarket[]> {
    // Map filter to Manifold's filter param
    let filter: 'all' | 'open' | 'closed' | 'resolved' | undefined;
    if (params?.status) {
      switch (params.status) {
        case 'ACTIVE':
          filter = 'open';
          break;
        case 'CLOSED':
          filter = 'closed';
          break;
        case 'RESOLVED':
          filter = 'resolved';
          break;
        default:
          filter = 'all';
      }
    }

    // Map sort
    let sort: 'relevance' | 'newest' | 'score' | '24-hour-vol' | 'liquidity' | undefined;
    if (params?.sortBy) {
      switch (params.sortBy) {
        case 'volume':
          sort = '24-hour-vol';
          break;
        case 'liquidity':
          sort = 'liquidity';
          break;
        case 'created':
          sort = 'newest';
          break;
        default:
          sort = 'score';
      }
    }

    // Use search endpoint for better filtering
    const markets = await this.client.searchMarkets({
      term: params?.search,
      filter: filter || 'open',
      sort: sort || 'score',
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    });

    let mappedMarkets = markets.map(mapManifoldMarket);

    // Filter by category (client-side)
    if (params?.category) {
      mappedMarkets = mappedMarkets.filter(m => m.category === params.category);
    }

    return mappedMarkets;
  }

  /**
   * Get a single market by ID or slug
   */
  async getMarket(externalId: string): Promise<PlatformMarket | null> {
    // Try by ID first
    let market = await this.client.getMarket(externalId);

    // If not found, try by slug
    if (!market) {
      market = await this.client.getMarketBySlug(externalId);
    }

    if (!market) return null;

    return mapManifoldMarket(market);
  }

  /**
   * Get events (Manifold doesn't have event grouping, return empty)
   */
  async getEvents(_params?: EventQueryParams): Promise<PlatformEvent[]> {
    // Manifold doesn't group markets into events
    return [];
  }

  // ===========================================================================
  // Order Book Methods
  // ===========================================================================

  /**
   * Get order book (Manifold uses AMM, no traditional orderbook)
   * Returns implied orderbook from pool state
   */
  async getOrderBook(marketId: string): Promise<OrderBook> {
    const market = await this.client.getMarket(marketId);

    if (!market || !market.pool) {
      return {
        marketId,
        platform: 'MANIFOLD',
        timestamp: new Date(),
        bids: [],
        asks: [],
      };
    }

    // Manifold uses CPMM, so we approximate orderbook from probability
    const prob = market.probability ?? market.p ?? 0.5;

    // Create synthetic orderbook levels
    const bids = [{ price: prob - 0.01, size: 100 }];
    const asks = [{ price: prob + 0.01, size: 100 }];

    return {
      marketId,
      platform: 'MANIFOLD',
      timestamp: new Date(),
      bids,
      asks,
      bestBid: bids[0]?.price,
      bestAsk: asks[0]?.price,
      spread: 0.02,
      midPrice: prob,
    };
  }

  /**
   * Get recent trades (bets)
   */
  async getTrades(marketId: string, limit = 100): Promise<Trade[]> {
    const bets = await this.client.getBets({
      contractId: marketId,
      limit,
    });

    return bets.map(bet => ({
      id: bet.id,
      marketId: bet.contractId,
      platform: 'MANIFOLD' as const,
      price: bet.probAfter ?? bet.probBefore ?? 0,
      size: Math.abs(bet.amount),
      side: bet.amount > 0 ? 'BUY' as const : 'SELL' as const,
      timestamp: new Date(bet.createdTime),
      maker: undefined,
      taker: bet.userId,
    }));
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
   * Get the underlying API client
   */
  getClient(): ManifoldClient {
    return this.client;
  }
}

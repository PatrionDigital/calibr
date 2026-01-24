/**
 * Opinion (O.LAB) Platform Adapter
 * BNB Chain prediction market - AI-powered macro event trading
 */

import {
  OpinionClient,
  type OpinionClientConfig,
  type OpinionMarket,
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

export interface OpinionAdapterConfig {
  client?: OpinionClientConfig;
}

// =============================================================================
// Mappers
// =============================================================================

/**
 * Map Opinion market status to unified status
 */
function mapStatus(status?: string): MarketStatus {
  if (!status) return 'ACTIVE';

  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'TRADING':
      return 'ACTIVE';
    case 'PAUSED':
    case 'CLOSED':
      return 'CLOSED';
    case 'RESOLVED':
    case 'SETTLED':
      return 'RESOLVED';
    case 'CANCELLED':
    case 'VOIDED':
      return 'CANCELLED';
    default:
      return 'ACTIVE';
  }
}

/**
 * Map Opinion category to unified category
 */
function mapCategory(category?: string): MarketCategory | undefined {
  if (!category) return undefined;

  const categoryLower = category.toLowerCase();

  // Macro economic events (Opinion's specialty)
  if (categoryLower.includes('inflation') || categoryLower.includes('fed') ||
      categoryLower.includes('interest') || categoryLower.includes('employment') ||
      categoryLower.includes('gdp') || categoryLower.includes('cpi') ||
      categoryLower.includes('economic') || categoryLower.includes('finance')) {
    return 'ECONOMICS';
  }
  if (categoryLower.includes('politic') || categoryLower.includes('election') ||
      categoryLower.includes('government') || categoryLower.includes('geopolitical')) {
    return 'POLITICS';
  }
  if (categoryLower.includes('crypto') || categoryLower.includes('bitcoin') ||
      categoryLower.includes('ethereum') || categoryLower.includes('btc') ||
      categoryLower.includes('eth') || categoryLower.includes('defi')) {
    return 'CRYPTO';
  }
  if (categoryLower.includes('sport')) {
    return 'SPORTS';
  }
  if (categoryLower.includes('tech') || categoryLower.includes('ai') ||
      categoryLower.includes('science')) {
    return 'TECHNOLOGY';
  }
  if (categoryLower.includes('entertainment') || categoryLower.includes('celebrity')) {
    return 'ENTERTAINMENT';
  }

  return 'OTHER';
}

/**
 * Map Opinion market to unified platform market
 */
function mapOpinionMarket(market: OpinionMarket): PlatformMarket {
  // Build outcomes array
  const outcomes: MarketOutcome[] = [];
  const isMultiChoice = market.outcomes && market.outcomes.length > 2;

  if (market.outcomes && market.outcomes.length > 0) {
    for (let i = 0; i < market.outcomes.length; i++) {
      const outcome = market.outcomes[i];
      if (!outcome) continue;

      outcomes.push({
        index: outcome.index ?? i,
        label: outcome.title,
        price: outcome.price ?? 0,
        tokenId: outcome.tokenId,
        isWinner: market.winningOutcome
          ? outcome.tokenId === market.winningOutcome || outcome.title === market.winningOutcome
          : null,
      });
    }
  } else {
    // Default binary market
    outcomes.push({
      index: 0,
      label: 'Yes',
      price: 0.5,
      isWinner: null,
    });
    outcomes.push({
      index: 1,
      label: 'No',
      price: 0.5,
      isWinner: null,
    });
  }

  // Calculate prices for backwards compatibility
  const yesPrice = outcomes[0]?.price ?? 0.5;
  const noPrice = outcomes[1]?.price ?? (1 - yesPrice);

  // Determine market type
  const marketType: MarketType = isMultiChoice ? 'MULTIPLE_CHOICE' : 'BINARY';

  return {
    id: market.marketId,
    platform: 'OPINION' as const,
    externalId: market.marketId,
    question: market.title,
    description: market.description,
    url: `https://opinion.trade/market/${market.marketId}`,
    imageUrl: market.imageUrl,

    marketType,
    outcomes,

    // Legacy pricing
    yesPrice,
    noPrice,
    lastPrice: yesPrice,

    volume: market.volume ?? 0,
    liquidity: market.liquidity ?? 0,

    status: mapStatus(market.status),
    createdAt: market.createdAt ? new Date(market.createdAt) : new Date(),
    closesAt: market.expirationTime ? new Date(market.expirationTime) : undefined,
    resolvedAt: market.resolutionTime ? new Date(market.resolutionTime) : undefined,
    resolution: market.winningOutcome,
    winningOutcomeIndex: market.winningOutcome
      ? outcomes.findIndex(o => o.tokenId === market.winningOutcome || o.label === market.winningOutcome)
      : null,

    category: mapCategory(market.category),
    tags: market.category ? [market.category] : [],

    platformData: {
      marketId: market.marketId,
      quoteToken: market.quoteToken,
      outcomes: market.outcomes,
    },
  };
}

// =============================================================================
// Opinion Adapter
// =============================================================================

export class OpinionAdapter implements IPlatformAdapter {
  public readonly platform = 'OPINION' as const;
  public readonly config: PlatformConfig;

  private client: OpinionClient;

  constructor(adapterConfig: OpinionAdapterConfig = {}) {
    this.config = {
      platform: 'OPINION' as const,
      apiBaseUrl: 'https://proxy.opinion.trade:8443/openapi',
      wsUrl: undefined,
      chainId: 56, // BNB Chain
    };

    this.client = new OpinionClient(adapterConfig.client);
  }

  // ===========================================================================
  // Market Data Methods
  // ===========================================================================

  /**
   * Get markets with optional filtering
   */
  async getMarkets(params?: MarketQueryParams): Promise<PlatformMarket[]> {
    // Map status filter
    let apiStatus: 'ACTIVE' | 'PAUSED' | 'RESOLVED' | 'CANCELLED' | undefined;
    if (params?.status) {
      switch (params.status) {
        case 'ACTIVE':
          apiStatus = 'ACTIVE';
          break;
        case 'CLOSED':
          apiStatus = 'PAUSED';
          break;
        case 'RESOLVED':
          apiStatus = 'RESOLVED';
          break;
        case 'CANCELLED':
          apiStatus = 'CANCELLED';
          break;
      }
    }

    const markets = await this.client.getMarkets({
      status: apiStatus,
      page: params?.offset ? Math.floor(params.offset / 20) + 1 : 1,
      limit: Math.min(params?.limit || 20, 20), // API max is 20
    });

    let mappedMarkets = markets.map(mapOpinionMarket);

    // Filter by category (client-side since API doesn't support all our categories)
    if (params?.category) {
      mappedMarkets = mappedMarkets.filter(m => m.category === params.category);
    }

    // Filter by search (client-side)
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      mappedMarkets = mappedMarkets.filter(
        m =>
          m.question.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (params?.sortBy) {
      mappedMarkets.sort((a, b) => {
        let comparison = 0;
        switch (params.sortBy) {
          case 'volume':
            comparison = (b.volume || 0) - (a.volume || 0);
            break;
          case 'liquidity':
            comparison = (b.liquidity || 0) - (a.liquidity || 0);
            break;
          case 'created':
            comparison = b.createdAt.getTime() - a.createdAt.getTime();
            break;
          case 'closes':
            if (!a.closesAt) return 1;
            if (!b.closesAt) return -1;
            comparison = a.closesAt.getTime() - b.closesAt.getTime();
            break;
        }
        return params.sortOrder === 'asc' ? -comparison : comparison;
      });
    }

    return mappedMarkets;
  }

  /**
   * Get a single market by ID
   */
  async getMarket(externalId: string): Promise<PlatformMarket | null> {
    const market = await this.client.getMarket(externalId);
    if (!market) return null;

    const mapped = mapOpinionMarket(market);

    // Enrich with price data for each outcome
    try {
      for (const outcome of mapped.outcomes || []) {
        if (outcome.tokenId) {
          const price = await this.client.getLatestPrice(outcome.tokenId);
          if (price) {
            outcome.price = price.price;
          }
        }
      }

      // Update legacy prices
      if (mapped.outcomes && mapped.outcomes.length >= 2) {
        mapped.yesPrice = mapped.outcomes[0]?.price;
        mapped.noPrice = mapped.outcomes[1]?.price;
        mapped.lastPrice = mapped.yesPrice;
      }
    } catch {
      // Price data not available, continue with basic data
    }

    return mapped;
  }

  /**
   * Get events (Opinion doesn't have event grouping, return empty)
   */
  async getEvents(_params?: EventQueryParams): Promise<PlatformEvent[]> {
    // Opinion doesn't group markets into events
    return [];
  }

  // ===========================================================================
  // Order Book Methods
  // ===========================================================================

  /**
   * Get order book for a market's primary outcome
   */
  async getOrderBook(marketId: string): Promise<OrderBook> {
    // First get the market to find the token ID
    const market = await this.client.getMarket(marketId);
    if (!market?.outcomes?.[0]?.tokenId) {
      return {
        marketId,
        platform: 'OPINION' as const,
        timestamp: new Date(),
        bids: [],
        asks: [],
      };
    }

    const tokenId = market.outcomes[0].tokenId;
    const orderbook = await this.client.getOrderBook(tokenId);

    const bids = orderbook.bids.map(b => ({
      price: b.price,
      size: b.size,
    }));

    const asks = orderbook.asks.map(a => ({
      price: a.price,
      size: a.size,
    }));

    const bestBid = bids[0]?.price;
    const bestAsk = asks[0]?.price;
    const spread =
      bestBid !== undefined && bestAsk !== undefined
        ? bestAsk - bestBid
        : undefined;
    const midPrice =
      bestBid !== undefined && bestAsk !== undefined
        ? (bestBid + bestAsk) / 2
        : undefined;

    return {
      marketId,
      platform: 'OPINION' as const,
      timestamp: orderbook.timestamp ? new Date(orderbook.timestamp) : new Date(),
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      midPrice,
    };
  }

  /**
   * Get recent trades (not available in Opinion API)
   */
  async getTrades(_marketId: string, _limit = 100): Promise<Trade[]> {
    // Opinion API doesn't expose trades endpoint
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
   * Get the underlying API client
   */
  getClient(): OpinionClient {
    return this.client;
  }
}

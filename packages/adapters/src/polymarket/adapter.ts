/**
 * Polymarket Platform Adapter
 * Main adapter combining Gamma API and CLOB client for market data
 */

import { GammaClient, type GammaClientConfig, type GammaMarket, type GammaEvent } from './gamma-client';
import { PolymarketClobClient, type ClobClientConfig } from './clob-client';
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
} from '../types';

// =============================================================================
// Configuration
// =============================================================================

export interface PolymarketAdapterConfig {
  gamma?: GammaClientConfig;
  clob?: ClobClientConfig;
}

// =============================================================================
// Mappers
// =============================================================================

/**
 * Map Gamma market to unified platform market
 */
function mapGammaMarket(market: GammaMarket): PlatformMarket {
  // Parse outcome prices (e.g., "[0.55, 0.45]")
  let yesPrice: number | undefined;
  let noPrice: number | undefined;

  if (market.outcomePrices) {
    try {
      const prices = JSON.parse(market.outcomePrices) as number[];
      if (prices.length >= 2) {
        yesPrice = prices[0];
        noPrice = prices[1];
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Parse CLOB token IDs
  let clobTokenIds: string[] = [];
  if (market.clobTokenIds) {
    try {
      clobTokenIds = JSON.parse(market.clobTokenIds) as string[];
    } catch {
      // Ignore parsing errors
    }
  }

  // Determine market status
  let status: MarketStatus = 'ACTIVE';
  if (market.closed) {
    status = market.resolutionSource ? 'RESOLVED' : 'CLOSED';
  } else if (!market.active) {
    status = 'CANCELLED';
  }

  // Map category
  const category = mapCategory(market.category);

  return {
    id: market.id,
    platform: 'POLYMARKET',
    externalId: market.conditionId,
    question: market.question,
    description: market.description,
    url: `https://polymarket.com/event/${market.slug}`,
    imageUrl: market.image,
    yesPrice,
    noPrice,
    lastPrice: yesPrice,
    volume: parseFloat(market.volume || '0'),
    liquidity: parseFloat(market.liquidity || market.liquidityClob || '0'),
    bestBid: undefined, // Filled from CLOB
    bestAsk: undefined, // Filled from CLOB
    spread: undefined, // Filled from CLOB
    status,
    createdAt: market.createdAt ? new Date(market.createdAt) : new Date(),
    closesAt: market.endDate ? new Date(market.endDate) : undefined,
    resolvedAt: status === 'RESOLVED' && market.updatedAt ? new Date(market.updatedAt) : undefined,
    resolution: status === 'RESOLVED' ? market.resolutionSource : undefined,
    category,
    tags: [],
    platformData: {
      conditionId: market.conditionId,
      slug: market.slug,
      clobTokenIds,
      marketMakerAddress: market.marketMakerAddress,
      negRisk: market.negRisk,
      negRiskMarketId: market.negRiskMarketId,
      acceptingOrders: market.acceptingOrders,
      volume24hr: market.volume24hr,
      volumeClob: market.volumeClob,
    },
  };
}

/**
 * Map Gamma event to unified platform event
 */
function mapGammaEvent(event: GammaEvent): PlatformEvent {
  return {
    id: event.id,
    platform: 'POLYMARKET',
    externalId: event.id,
    title: event.title,
    description: event.description,
    markets: (event.markets || []).map(mapGammaMarket),
    category: mapCategory(undefined), // Events don't have categories in Gamma API
  };
}

/**
 * Map Polymarket category to unified category
 */
function mapCategory(category?: string): MarketCategory | undefined {
  if (!category) return undefined;

  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('politic') || categoryLower.includes('election')) {
    return 'POLITICS';
  }
  if (categoryLower.includes('sport') || categoryLower.includes('nfl') || categoryLower.includes('nba')) {
    return 'SPORTS';
  }
  if (categoryLower.includes('crypto') || categoryLower.includes('bitcoin') || categoryLower.includes('ethereum')) {
    return 'CRYPTO';
  }
  if (categoryLower.includes('econom') || categoryLower.includes('finance') || categoryLower.includes('fed')) {
    return 'ECONOMICS';
  }
  if (categoryLower.includes('science') || categoryLower.includes('tech')) {
    return 'TECHNOLOGY';
  }
  if (categoryLower.includes('entertainment') || categoryLower.includes('celebrity')) {
    return 'ENTERTAINMENT';
  }

  return 'OTHER';
}

// =============================================================================
// Polymarket Adapter
// =============================================================================

export class PolymarketAdapter implements IPlatformAdapter {
  public readonly platform = 'POLYMARKET' as const;
  public readonly config: PlatformConfig;

  private gammaClient: GammaClient;
  private clobClient: PolymarketClobClient;

  constructor(adapterConfig: PolymarketAdapterConfig = {}) {
    this.config = {
      platform: 'POLYMARKET',
      apiBaseUrl: 'https://gamma-api.polymarket.com',
      wsUrl: 'wss://ws-subscriptions-clob.polymarket.com',
      chainId: 137, // Polygon
    };

    this.gammaClient = new GammaClient(adapterConfig.gamma);
    this.clobClient = new PolymarketClobClient(adapterConfig.clob);
  }

  // ===========================================================================
  // Market Data Methods
  // ===========================================================================

  /**
   * Get markets with optional filtering
   */
  async getMarkets(params?: MarketQueryParams): Promise<PlatformMarket[]> {
    const gammaParams: Parameters<GammaClient['getMarkets']>[0] = {
      limit: params?.limit || 100,
      offset: params?.offset || 0,
    };

    // Map status filter
    if (params?.status === 'ACTIVE') {
      gammaParams.active = true;
      gammaParams.closed = false;
    } else if (params?.status === 'CLOSED' || params?.status === 'RESOLVED') {
      gammaParams.closed = true;
    }

    // Map sort
    if (params?.sortBy) {
      switch (params.sortBy) {
        case 'volume':
          gammaParams.order = 'volume';
          break;
        case 'liquidity':
          gammaParams.order = 'liquidity';
          break;
        case 'created':
          gammaParams.order = 'created_at';
          break;
        case 'closes':
          gammaParams.order = 'end_date_min';
          break;
      }
      gammaParams.ascending = params.sortOrder === 'asc';
    }

    let markets: GammaMarket[];

    if (params?.search) {
      markets = await this.gammaClient.searchMarkets(params.search, params.limit);
    } else {
      markets = await this.gammaClient.getMarkets(gammaParams);
    }

    const mappedMarkets = markets.map(mapGammaMarket);

    // Filter by category if specified
    if (params?.category) {
      return mappedMarkets.filter((m) => m.category === params.category);
    }

    return mappedMarkets;
  }

  /**
   * Get a single market by ID or slug
   */
  async getMarket(externalId: string): Promise<PlatformMarket | null> {
    const market = await this.gammaClient.getMarket(externalId);
    if (!market) return null;

    const mapped = mapGammaMarket(market);

    // Enrich with CLOB data if available
    const clobTokenIds = (mapped.platformData?.clobTokenIds as string[]) || [];
    const firstTokenId = clobTokenIds[0];
    if (firstTokenId) {
      try {
        const orderBook = await this.clobClient.getOrderBook(firstTokenId);
        mapped.bestBid = orderBook.bestBid;
        mapped.bestAsk = orderBook.bestAsk;
        mapped.spread = orderBook.spread;
      } catch {
        // CLOB data not available, continue with Gamma data only
      }
    }

    return mapped;
  }

  /**
   * Get events (grouped markets)
   */
  async getEvents(params?: EventQueryParams): Promise<PlatformEvent[]> {
    const events = await this.gammaClient.getEvents({
      limit: params?.limit || 50,
      offset: params?.offset || 0,
      active: params?.status === 'ACTIVE' ? true : undefined,
      closed: params?.status === 'CLOSED' || params?.status === 'RESOLVED' ? true : undefined,
    });

    return events.map(mapGammaEvent);
  }

  // ===========================================================================
  // Order Book Methods
  // ===========================================================================

  /**
   * Get order book for a market
   */
  async getOrderBook(tokenId: string): Promise<OrderBook> {
    return this.clobClient.getOrderBook(tokenId);
  }

  /**
   * Get recent trades for a market
   */
  async getTrades(tokenId: string, limit = 100): Promise<Trade[]> {
    return this.clobClient.getTrades(tokenId, limit);
  }

  // ===========================================================================
  // Price Methods
  // ===========================================================================

  /**
   * Get current prices for a market
   */
  async getMarketPrices(
    marketId: string,
    yesTokenId: string,
    noTokenId: string
  ): Promise<{
    yesPrice: number;
    noPrice: number;
    spread: number;
    midPrice: number;
    timestamp: Date;
  }> {
    const prices = await this.clobClient.getMarketPrices(marketId, yesTokenId, noTokenId);
    return {
      yesPrice: prices.yesPrice,
      noPrice: prices.noPrice,
      spread: prices.spread,
      midPrice: prices.midPrice,
      timestamp: prices.timestamp,
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Health check for both APIs
   */
  async healthCheck(): Promise<boolean> {
    const [gammaHealth, clobHealth] = await Promise.all([
      this.gammaClient.healthCheck(),
      this.clobClient.healthCheck(),
    ]);

    return gammaHealth && clobHealth;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.gammaClient.clearCache();
  }

  /**
   * Get the underlying Gamma client
   */
  getGammaClient(): GammaClient {
    return this.gammaClient;
  }

  /**
   * Get the underlying CLOB client
   */
  getClobClient(): PolymarketClobClient {
    return this.clobClient;
  }
}

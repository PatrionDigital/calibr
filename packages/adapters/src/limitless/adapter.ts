/**
 * Limitless Platform Adapter
 * Main adapter for market data from Limitless Exchange on Base
 */

import {
  LimitlessClient,
  type LimitlessClientConfig,
  type LimitlessMarket,
  type LimitlessGroup,
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

export interface LimitlessAdapterConfig {
  client?: LimitlessClientConfig;
}

// =============================================================================
// Mappers
// =============================================================================

/**
 * Parse volume string and convert from raw units to dollars
 * Limitless volumes are in micro-USDC (6 decimals)
 */
function parseVolume(volume: string | number | undefined, decimals: number = 6): number {
  if (volume === undefined || volume === null) return 0;
  const rawVolume = typeof volume === 'string' ? parseFloat(volume) : volume;
  if (isNaN(rawVolume)) return 0;
  // Convert from raw units to human-readable (e.g., micro-USDC to USDC)
  return rawVolume / Math.pow(10, decimals);
}

/**
 * Map Limitless market to unified platform market
 */
function mapLimitlessMarket(market: LimitlessMarket): PlatformMarket {
  // Check if this is a group market (multi-outcome)
  const isGroup = market.marketType === 'group' && market.markets && market.markets.length > 0;

  // Parse outcome prices
  // For CLOB markets: prices = [yesPrice, noPrice]
  // For AMM markets: prices are typically not in this array
  let yesPrice: number | undefined;
  let noPrice: number | undefined;
  const isClob = market.tradeType === 'clob';

  if (market.prices && market.prices.length >= 2) {
    // CLOB format: prices = [yesPrice, noPrice]
    yesPrice = market.prices[0];
    noPrice = market.prices[1];
  } else if (market.outcomes && market.outcomes.length >= 2) {
    // Outcomes array - need to invert for CLOB
    const price0 = market.outcomes[0]?.price ?? 0;
    const price1 = market.outcomes[1]?.price ?? 0;
    yesPrice = isClob ? (1 - price0) : price0;
    noPrice = isClob ? (1 - price1) : price1;
  }

  // Build outcomes array
  const outcomes: MarketOutcome[] = [];

  if (isGroup && market.markets) {
    // Group market: each sub-market is an outcome
    // For CLOB markets: prices = [yesProbability, noProbability]
    // For AMM markets: prices = [noPrice, yesPrice]
    for (let i = 0; i < market.markets.length; i++) {
      const subMarket = market.markets[i];
      if (!subMarket) continue;

      // Get the YES probability from the sub-market's prices array
      // CLOB: prices[0] is YES probability
      // AMM: prices[1] is YES probability
      let yesProbability = 0;
      if (subMarket.prices && subMarket.prices.length >= 2) {
        yesProbability = isClob
          ? (subMarket.prices[0] ?? 0)
          : (subMarket.prices[1] ?? 0);
      }

      outcomes.push({
        index: i,
        label: subMarket.title,
        price: yesProbability,
        tokenId: subMarket.tokens?.yes,
        isWinner: subMarket.winningOutcomeIndex !== null && subMarket.winningOutcomeIndex !== undefined
          ? subMarket.winningOutcomeIndex === 1 // YES wins when index is 1
          : null,
      });
    }
  } else if (market.outcomes && market.outcomes.length > 0) {
    // Use API-provided outcomes
    // For CLOB markets, the price field is the NO price (cost to buy NO)
    // We need to invert it to get the YES probability: probability = 1 - noPrice
    for (const outcome of market.outcomes) {
      // For CLOB: price is NO price, so YES probability = 1 - price
      // For AMM: price is already the probability
      const outcomePrice = outcome.price ?? 0;
      const probability = isClob ? (1 - outcomePrice) : outcomePrice;

      outcomes.push({
        index: outcome.index,
        label: outcome.title,
        price: probability,
        tokenId: market.tokens?.[outcome.title.toLowerCase()],
        isWinner: market.winningOutcomeIndex !== null
          ? market.winningOutcomeIndex === outcome.index
          : null,
      });
    }
  } else {
    // Default binary market outcomes
    outcomes.push({
      index: 0,
      label: 'Yes',
      price: yesPrice ?? 0.5,
      tokenId: market.tokens?.yes || market.yesTokenId,
      isWinner: market.winningOutcomeIndex !== null
        ? market.winningOutcomeIndex === 1 // YES wins when index is 1
        : null,
    });
    outcomes.push({
      index: 1,
      label: 'No',
      price: noPrice ?? 0.5,
      tokenId: market.tokens?.no || market.noTokenId,
      isWinner: market.winningOutcomeIndex !== null
        ? market.winningOutcomeIndex === 0 // NO wins when index is 0
        : null,
    });
  }

  // Determine market type
  const isMultiChoice = isGroup || outcomes.length > 2 || market.marketType === 'MULTIPLE_CHOICE';
  const marketType: MarketType = isMultiChoice ? 'MULTIPLE_CHOICE' : 'BINARY';

  // Determine market status based on API values
  let status: MarketStatus = 'ACTIVE';
  if (market.status) {
    const statusUpper = market.status.toUpperCase();
    switch (statusUpper) {
      case 'FUNDED':
      case 'ACTIVE':
      case 'TRADING':
        status = 'ACTIVE';
        break;
      case 'CLOSED':
      case 'ENDED':
        status = 'CLOSED';
        break;
      case 'RESOLVED':
      case 'SETTLED':
        status = 'RESOLVED';
        break;
      case 'CANCELLED':
      case 'VOIDED':
        status = 'CANCELLED';
        break;
      default:
        // If expired flag is set, treat as closed
        if (market.expired) {
          status = 'CLOSED';
        }
    }
  }

  // Parse volume - API returns volume in raw units (micro-USDC, 6 decimals)
  // For group markets, aggregate volume from sub-markets
  let volume: number;
  const collateralDecimals = market.collateralToken?.decimals ?? 6;

  if (isGroup && market.markets) {
    // Sum volume from all sub-markets
    volume = market.markets.reduce((sum, subMarket) => {
      return sum + parseVolume(subMarket.volume, collateralDecimals);
    }, 0);
  } else {
    volume = parseVolume(market.volume, collateralDecimals);
  }

  // Parse liquidity similarly
  const liquidity = parseVolume(market.liquidity, collateralDecimals);

  // Map category from categories array or category field
  const categoryStr = market.categories?.[0] || market.category;
  const category = mapCategory(categoryStr);

  // Get expiration date
  // Note: expirationTimestamp is already in milliseconds (e.g., 1769007600000)
  const closesAt = market.expirationTimestamp
    ? new Date(market.expirationTimestamp)
    : market.expirationDate
      ? new Date(market.expirationDate)
      : market.deadline
        ? new Date(market.deadline)
        : undefined;

  // Get token IDs from tokens object or individual fields
  const yesTokenId = market.tokens?.yes || market.yesTokenId;
  const noTokenId = market.tokens?.no || market.noTokenId;

  return {
    id: market.slug,
    platform: 'LIMITLESS',
    externalId: market.slug,
    question: market.title,
    description: market.description,
    url: `https://limitless.exchange/markets/${market.slug}`,
    imageUrl: market.logo || market.imageUrl,

    // Market type and outcomes
    marketType,
    outcomes,

    // Legacy pricing (for backwards compatibility)
    yesPrice,
    noPrice,
    lastPrice: yesPrice,

    volume,
    liquidity,
    bestBid: undefined, // Filled from orderbook
    bestAsk: undefined, // Filled from orderbook
    spread: undefined, // Filled from orderbook
    status,
    createdAt: market.createdAt ? new Date(market.createdAt) : new Date(),
    closesAt,
    resolvedAt: market.resolutionDate ? new Date(market.resolutionDate) : undefined,
    resolution: market.winningOutcomeIndex !== null && market.winningOutcomeIndex !== undefined
      ? (isMultiChoice
          ? outcomes.find(o => o.index === market.winningOutcomeIndex)?.label || 'Unknown'
          : (market.winningOutcomeIndex === 1 ? 'YES' : 'NO'))
      : undefined,
    winningOutcomeIndex: market.winningOutcomeIndex,
    category,
    tags: market.tags || [],
    platformData: {
      id: market.id,
      slug: market.slug,
      conditionId: market.conditionId,
      venue: market.venue,
      tokens: market.tokens,
      yesTokenId,
      noTokenId,
      collateralToken: market.collateralToken,
      ticker: market.ticker,
      strikePrice: market.strikePrice,
      groupSlug: market.groupSlug,
      isGroup: market.isGroup,
      marketType: isMultiChoice ? 'MULTIPLE_CHOICE' : 'BINARY',
      tradeType: market.tradeType,
      categories: market.categories,
      // Include outcomes for multi-outcome market support
      outcomes: outcomes.map(o => ({
        index: o.index,
        label: o.label,
        price: o.price,
        tokenId: o.tokenId,
        isWinner: o.isWinner,
      })),
    },
  };
}

/**
 * Map Limitless group to unified platform event
 */
function mapLimitlessGroup(group: LimitlessGroup): PlatformEvent {
  return {
    id: group.slug,
    platform: 'LIMITLESS',
    externalId: group.slug,
    title: group.title,
    description: group.description,
    markets: (group.markets || []).map(mapLimitlessMarket),
    category: mapCategory(group.category),
  };
}

/**
 * Map Limitless category to unified category
 */
function mapCategory(category?: string): MarketCategory | undefined {
  if (!category) return undefined;

  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('politic') || categoryLower.includes('election') || categoryLower.includes('trump') || categoryLower.includes('biden')) {
    return 'POLITICS';
  }
  if (categoryLower.includes('sport') || categoryLower.includes('nfl') || categoryLower.includes('nba') || categoryLower.includes('soccer')) {
    return 'SPORTS';
  }
  if (categoryLower.includes('crypto') || categoryLower.includes('bitcoin') || categoryLower.includes('ethereum') || categoryLower.includes('btc') || categoryLower.includes('eth')) {
    return 'CRYPTO';
  }
  if (categoryLower.includes('econom') || categoryLower.includes('finance') || categoryLower.includes('fed') || categoryLower.includes('stock')) {
    return 'ECONOMICS';
  }
  if (categoryLower.includes('science') || categoryLower.includes('tech') || categoryLower.includes('ai')) {
    return 'TECHNOLOGY';
  }
  if (categoryLower.includes('entertainment') || categoryLower.includes('celebrity') || categoryLower.includes('movie')) {
    return 'ENTERTAINMENT';
  }

  return 'OTHER';
}

// =============================================================================
// Limitless Adapter
// =============================================================================

export class LimitlessAdapter implements IPlatformAdapter {
  public readonly platform = 'LIMITLESS' as const;
  public readonly config: PlatformConfig;

  private client: LimitlessClient;

  constructor(adapterConfig: LimitlessAdapterConfig = {}) {
    this.config = {
      platform: 'LIMITLESS',
      apiBaseUrl: 'https://api.limitless.exchange',
      wsUrl: undefined, // TODO: Add WebSocket support
      chainId: 8453, // Base
    };

    this.client = new LimitlessClient(adapterConfig.client);
  }

  // ===========================================================================
  // Market Data Methods
  // ===========================================================================

  // API page size is fixed at 25
  private static readonly API_PAGE_SIZE = 25;

  /**
   * Get markets with optional filtering
   */
  async getMarkets(params?: MarketQueryParams): Promise<PlatformMarket[]> {
    // API uses fixed page size of 25, so convert offset to page number
    const page = params?.offset
      ? Math.floor(params.offset / LimitlessAdapter.API_PAGE_SIZE) + 1
      : 1;

    const { markets, groups } = await this.client.getActiveMarkets({
      page,
      sortBy: params?.sortBy === 'volume' ? 'volume' :
              params?.sortBy === 'liquidity' ? 'liquidity' :
              params?.sortBy === 'created' ? 'createdAt' : undefined,
    });

    // Combine individual markets and markets from groups
    let allMarkets: LimitlessMarket[] = [...markets];

    for (const group of groups) {
      if (group.markets) {
        allMarkets.push(...group.markets);
      }
    }

    // Handle search
    if (params?.search) {
      const searchResults = await this.client.searchMarkets(params.search, params.limit || 100);
      allMarkets = searchResults;
    }

    const mappedMarkets = allMarkets.map(mapLimitlessMarket);

    // Filter by status
    let filteredMarkets = mappedMarkets;
    if (params?.status) {
      filteredMarkets = filteredMarkets.filter((m) => m.status === params.status);
    }

    // Filter by category
    if (params?.category) {
      filteredMarkets = filteredMarkets.filter((m) => m.category === params.category);
    }

    return filteredMarkets;
  }

  /**
   * Get a single market by slug or address
   */
  async getMarket(externalId: string): Promise<PlatformMarket | null> {
    const market = await this.client.getMarket(externalId);
    if (!market) return null;

    const mapped = mapLimitlessMarket(market);

    // Enrich with orderbook data
    try {
      const orderbook = await this.client.getOrderBook(externalId);
      if (orderbook.bids && orderbook.bids.length > 0) {
        mapped.bestBid = orderbook.bids[0]?.price;
      }
      if (orderbook.asks && orderbook.asks.length > 0) {
        mapped.bestAsk = orderbook.asks[0]?.price;
      }
      if (mapped.bestBid !== undefined && mapped.bestAsk !== undefined) {
        mapped.spread = mapped.bestAsk - mapped.bestBid;
      }
      // Update price from last trade if available
      if (orderbook.lastTradePrice) {
        mapped.yesPrice = orderbook.lastTradePrice;
        mapped.noPrice = 1 - orderbook.lastTradePrice;
        mapped.lastPrice = orderbook.lastTradePrice;
      }
    } catch {
      // Orderbook data not available, continue with basic data
    }

    return mapped;
  }

  /**
   * Get events (grouped markets)
   */
  async getEvents(params?: EventQueryParams): Promise<PlatformEvent[]> {
    const { groups } = await this.client.getActiveMarkets({
      limit: params?.limit || 50,
      page: params?.offset ? Math.floor(params.offset / (params.limit || 50)) + 1 : 1,
    });

    return groups.map(mapLimitlessGroup);
  }

  // ===========================================================================
  // Order Book Methods
  // ===========================================================================

  /**
   * Get order book for a market
   */
  async getOrderBook(marketSlug: string): Promise<OrderBook> {
    const orderbook = await this.client.getOrderBook(marketSlug);

    const bids = (orderbook.bids || []).map((b) => ({
      price: b.price,
      size: b.size,
    }));

    const asks = (orderbook.asks || []).map((a) => ({
      price: a.price,
      size: a.size,
    }));

    const bestBid = bids[0]?.price;
    const bestAsk = asks[0]?.price;
    const spread = bestBid !== undefined && bestAsk !== undefined
      ? bestAsk - bestBid
      : undefined;
    const midPrice = bestBid !== undefined && bestAsk !== undefined
      ? (bestBid + bestAsk) / 2
      : orderbook.adjustedMidpoint;

    return {
      marketId: marketSlug,
      platform: 'LIMITLESS',
      timestamp: new Date(),
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      midPrice,
    };
  }

  /**
   * Get recent trades for a market
   * Note: Limitless API provides events, not raw trades
   */
  async getTrades(marketSlug: string, limit = 100): Promise<Trade[]> {
    // Limitless doesn't have a direct trades endpoint like Polymarket
    // We would need to parse from /markets/{slug}/events
    // For now, return empty array
    return [];
  }

  // ===========================================================================
  // Price Methods
  // ===========================================================================

  /**
   * Get current prices for a market
   */
  async getMarketPrices(
    marketSlug: string
  ): Promise<{
    yesPrice: number;
    noPrice: number;
    spread: number;
    midPrice: number;
    timestamp: Date;
  }> {
    const orderbook = await this.client.getOrderBook(marketSlug);

    const bestBid = orderbook.bids?.[0]?.price || 0;
    const bestAsk = orderbook.asks?.[0]?.price || 1;
    const midPrice = orderbook.adjustedMidpoint || (bestBid + bestAsk) / 2;

    return {
      yesPrice: midPrice,
      noPrice: 1 - midPrice,
      spread: bestAsk - bestBid,
      midPrice,
      timestamp: new Date(),
    };
  }

  /**
   * Get historical prices
   */
  async getHistoricalPrices(
    marketSlug: string,
    interval: '1h' | '6h' | '1d' | '1w' | '1m' | 'all' = '1d'
  ): Promise<Array<{ timestamp: Date; price: number }>> {
    const prices = await this.client.getHistoricalPrices(marketSlug, interval);
    return prices.map((p) => ({
      timestamp: new Date(p.timestamp),
      price: p.price,
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
  getClient(): LimitlessClient {
    return this.client;
  }
}

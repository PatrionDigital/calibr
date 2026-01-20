/**
 * Adapter Types for Calibr.ly Platform Integrations
 */

import { z } from 'zod';

// =============================================================================
// Platform Types
// =============================================================================

export type Platform = 'POLYMARKET' | 'KALSHI' | 'METACULUS' | 'MANIFOLD' | 'IEM';

export interface PlatformConfig {
  platform: Platform;
  apiBaseUrl: string;
  wsUrl?: string;
  chainId?: number;
  apiKey?: string;
  apiSecret?: string;
}

// =============================================================================
// Market Types
// =============================================================================

export const MarketStatusSchema = z.enum(['ACTIVE', 'CLOSED', 'RESOLVED', 'CANCELLED']);
export type MarketStatus = z.infer<typeof MarketStatusSchema>;

export const MarketCategorySchema = z.enum([
  'POLITICS',
  'SPORTS',
  'CRYPTO',
  'ECONOMICS',
  'SCIENCE',
  'ENTERTAINMENT',
  'TECHNOLOGY',
  'OTHER',
]);
export type MarketCategory = z.infer<typeof MarketCategorySchema>;

export interface PlatformMarket {
  id: string;
  platform: Platform;
  externalId: string;
  question: string;
  description?: string;
  url?: string;
  imageUrl?: string;

  // Pricing
  yesPrice?: number;
  noPrice?: number;
  lastPrice?: number;

  // Liquidity & Volume
  volume: number;
  liquidity: number;

  // Order book
  bestBid?: number;
  bestAsk?: number;
  spread?: number;

  // Status
  status: MarketStatus;
  createdAt: Date;
  closesAt?: Date;
  resolvedAt?: Date;
  resolution?: string;

  // Categorization
  category?: MarketCategory;
  tags?: string[];

  // Platform-specific data
  platformData?: Record<string, unknown>;
}

export interface PlatformEvent {
  id: string;
  platform: Platform;
  externalId: string;
  title: string;
  description?: string;
  markets: PlatformMarket[];
  category?: MarketCategory;
}

// =============================================================================
// Order Book Types
// =============================================================================

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  marketId: string;
  platform: Platform;
  timestamp: Date;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  midPrice?: number;
}

// =============================================================================
// Trade Types
// =============================================================================

export interface Trade {
  id: string;
  marketId: string;
  platform: Platform;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  timestamp: Date;
  maker?: string;
  taker?: string;
}

// =============================================================================
// Position Types
// =============================================================================

export interface PlatformPosition {
  marketId: string;
  platform: Platform;
  outcome: string;
  outcomeIndex: number;
  shares: number;
  avgCostBasis: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedPnl?: number;
}

// =============================================================================
// Adapter Interface
// =============================================================================

export interface IPlatformAdapter {
  platform: Platform;
  config: PlatformConfig;

  // Market data
  getMarkets(params?: MarketQueryParams): Promise<PlatformMarket[]>;
  getMarket(externalId: string): Promise<PlatformMarket | null>;
  getEvents(params?: EventQueryParams): Promise<PlatformEvent[]>;

  // Order book
  getOrderBook(marketId: string): Promise<OrderBook>;
  getTrades(marketId: string, limit?: number): Promise<Trade[]>;

  // Positions (if authenticated)
  getPositions?(): Promise<PlatformPosition[]>;

  // Health check
  healthCheck(): Promise<boolean>;
}

export interface MarketQueryParams {
  status?: MarketStatus;
  category?: MarketCategory;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'volume' | 'liquidity' | 'created' | 'closes';
  sortOrder?: 'asc' | 'desc';
}

export interface EventQueryParams {
  status?: MarketStatus;
  category?: MarketCategory;
  search?: string;
  limit?: number;
  offset?: number;
}

// =============================================================================
// Rate Limiting
// =============================================================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs?: number;
}

export interface RateLimitState {
  remaining: number;
  resetAt: Date;
  isLimited: boolean;
}

// =============================================================================
// Caching
// =============================================================================

export interface CacheConfig {
  ttlMs: number;
  maxSize?: number;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
}

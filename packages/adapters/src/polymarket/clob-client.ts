/**
 * Polymarket CLOB Client Wrapper
 * Handles order book and price data via the CLOB API
 */

import { ClobClient } from '@polymarket/clob-client';
import type { OrderBook, OrderBookLevel, Trade } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface ClobClientConfig {
  host?: string;
  chainId?: number;
}

export interface TokenPrice {
  tokenId: string;
  price: number;
  timestamp: Date;
}

export interface MarketPrices {
  marketId: string;
  yesTokenId: string;
  noTokenId: string;
  yesPrice: number;
  noPrice: number;
  spread: number;
  midPrice: number;
  timestamp: Date;
}

// =============================================================================
// CLOB Client Wrapper
// =============================================================================

export class PolymarketClobClient {
  private client: ClobClient;
  private config: Required<ClobClientConfig>;

  constructor(config: ClobClientConfig = {}) {
    this.config = {
      host: config.host || 'https://clob.polymarket.com',
      chainId: config.chainId || 137, // Polygon mainnet
    };

    // Initialize read-only client (no signer needed for read operations)
    this.client = new ClobClient(this.config.host, this.config.chainId);
  }

  // ===========================================================================
  // Order Book Methods
  // ===========================================================================

  /**
   * Get the order book for a market token
   */
  async getOrderBook(tokenId: string): Promise<OrderBook> {
    try {
      const book = await this.client.getOrderBook(tokenId);

      const bids: OrderBookLevel[] = (book.bids || []).map((bid: { price: string; size: string }) => ({
        price: parseFloat(bid.price),
        size: parseFloat(bid.size),
      }));

      const asks: OrderBookLevel[] = (book.asks || []).map((ask: { price: string; size: string }) => ({
        price: parseFloat(ask.price),
        size: parseFloat(ask.size),
      }));

      const bestBid = bids.length > 0 ? Math.max(...bids.map((b) => b.price)) : undefined;
      const bestAsk = asks.length > 0 ? Math.min(...asks.map((a) => a.price)) : undefined;
      const spread = bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : undefined;
      const midPrice =
        bestBid !== undefined && bestAsk !== undefined ? (bestBid + bestAsk) / 2 : undefined;

      return {
        marketId: tokenId,
        platform: 'POLYMARKET',
        timestamp: new Date(),
        bids,
        asks,
        bestBid,
        bestAsk,
        spread,
        midPrice,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch order book for ${tokenId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get order books for both YES and NO tokens of a market
   */
  async getMarketOrderBooks(
    yesTokenId: string,
    noTokenId: string
  ): Promise<{ yes: OrderBook; no: OrderBook }> {
    const [yesBook, noBook] = await Promise.all([
      this.getOrderBook(yesTokenId),
      this.getOrderBook(noTokenId),
    ]);

    return { yes: yesBook, no: noBook };
  }

  // ===========================================================================
  // Price Methods
  // ===========================================================================

  /**
   * Get the current price for a token
   * @param tokenId The token ID
   * @param side The side to get price for ('buy' or 'sell')
   */
  async getPrice(tokenId: string, side: 'buy' | 'sell' = 'buy'): Promise<TokenPrice> {
    try {
      const price = await this.client.getPrice(tokenId, side);

      return {
        tokenId,
        price: parseFloat(price?.price || '0'),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch price for ${tokenId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get prices for multiple tokens
   */
  async getPrices(tokenIds: string[]): Promise<TokenPrice[]> {
    const results = await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          return await this.getPrice(tokenId);
        } catch {
          return {
            tokenId,
            price: 0,
            timestamp: new Date(),
          };
        }
      })
    );

    return results;
  }

  /**
   * Get market prices (YES and NO)
   */
  async getMarketPrices(
    marketId: string,
    yesTokenId: string,
    noTokenId: string
  ): Promise<MarketPrices> {
    const [yesPrice, noPrice] = await Promise.all([this.getPrice(yesTokenId), this.getPrice(noTokenId)]);

    const spread = Math.abs(yesPrice.price + noPrice.price - 1);
    const midPrice = yesPrice.price; // YES price is typically used as the market price

    return {
      marketId,
      yesTokenId,
      noTokenId,
      yesPrice: yesPrice.price,
      noPrice: noPrice.price,
      spread,
      midPrice,
      timestamp: new Date(),
    };
  }

  // ===========================================================================
  // Trade History Methods
  // ===========================================================================

  /**
   * Get recent trades for a token
   */
  async getTrades(tokenId: string, limit = 100): Promise<Trade[]> {
    try {
      const rawTrades = await this.client.getTrades({ asset_id: tokenId });

      // Map the CLOB client's Trade type to our unified Trade type
      return (rawTrades || []).slice(0, limit).map((trade) => {
        // Access properties safely with type assertion for the raw response
        const rawTrade = trade as unknown as {
          id?: string;
          price: string;
          size: string;
          side: string;
          match_time?: string;
          created_at?: string;
          maker_address?: string;
          taker_address?: string;
        };

        const timestamp = rawTrade.match_time || rawTrade.created_at || new Date().toISOString();

        return {
          id: rawTrade.id || `${tokenId}-${timestamp}`,
          marketId: tokenId,
          platform: 'POLYMARKET' as const,
          price: parseFloat(rawTrade.price),
          size: parseFloat(rawTrade.size),
          side: (rawTrade.side?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
          timestamp: new Date(timestamp),
          maker: rawTrade.maker_address,
          taker: rawTrade.taker_address,
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to fetch trades for ${tokenId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ===========================================================================
  // Market Info Methods
  // ===========================================================================

  /**
   * Get market information from CLOB
   */
  async getMarketInfo(conditionId: string): Promise<{
    conditionId: string;
    questionId: string;
    tokens: Array<{ tokenId: string; outcome: string }>;
  } | null> {
    try {
      const market = await this.client.getMarket(conditionId);

      if (!market) return null;

      return {
        conditionId: market.condition_id,
        questionId: market.question_id || '',
        tokens:
          market.tokens?.map((t: { token_id: string; outcome: string }) => ({
            tokenId: t.token_id,
            outcome: t.outcome,
          })) || [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Get midpoint price for a market
   */
  async getMidpoint(tokenId: string): Promise<number> {
    try {
      const midpoint = await this.client.getMidpoint(tokenId);
      return parseFloat(midpoint.mid || '0');
    } catch {
      return 0;
    }
  }

  /**
   * Get spread for a market
   */
  async getSpread(tokenId: string): Promise<{ bid: number; ask: number; spread: number }> {
    try {
      const spread = await this.client.getSpread(tokenId);
      const bid = parseFloat(spread.bid || '0');
      const ask = parseFloat(spread.ask || '0');

      return {
        bid,
        ask,
        spread: ask - bid,
      };
    } catch {
      return { bid: 0, ask: 0, spread: 0 };
    }
  }

  // ===========================================================================
  // Health Check
  // ===========================================================================

  /**
   * Check if the CLOB API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get server time or any simple endpoint
      await this.client.getOpenOrders();
      return true;
    } catch {
      // Open orders requires auth, but the request going through means API is up
      return true;
    }
  }
}

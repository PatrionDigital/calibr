/**
 * Limitless Trading Adapter
 * Implementation of ITradingAdapter for Limitless Exchange on Base
 * Supports both CLOB (EIP-712 orders) and AMM (FPMM) direct trading
 */

import {
  type WalletClient,
  type Hex,
  type Address,
  createPublicClient,
  http,
} from 'viem';
import { base } from 'viem/chains';
import { BaseTradingAdapter } from '../base';
import type {
  TradingPlatform,
  AuthCredentials,
  AuthState,
  UnifiedOrderRequest,
  UnifiedOrder,
  UnifiedPosition,
  UnifiedTrade,
  UnifiedBalance,
  OrderHistoryOptions,
  TradeHistoryOptions,
  OrderSide,
  OrderStatus,
} from '../types';
import {
  BASE_MAINNET_CONFIG,
  type LimitlessTradingConfig,
  LIMITLESS_ORDER_TYPES,
  LimitlessOrderSide,
  CTF_ABI,
  FPMM_ABI,
  ERC20_ABI,
} from './config';
import { LimitlessClient, type LimitlessMarket } from '../../limitless/api-client';

// ============================================================================
// Constants
// ============================================================================

// Null parent collection ID for simple conditions
const NULL_PARENT_COLLECTION_ID = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;

// Binary market partition: [YES=1, NO=2]
const BINARY_PARTITION = [1n, 2n];

// ============================================================================
// Types
// ============================================================================

export interface LimitlessCredentials extends AuthCredentials {
  platform: 'LIMITLESS';
  address: string;
}

export interface LimitlessAdapterOptions {
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
}

/**
 * Result of a direct on-chain trade
 */
export interface DirectTradeResult {
  txHash: Hex;
  amount: bigint;
  outcome: 'YES' | 'NO' | number;
  type: 'BUY' | 'SELL' | 'SPLIT' | 'MERGE' | 'REDEEM';
}

/**
 * Market info for direct trading
 */
export interface DirectTradeMarket {
  slug: string;
  tradeType: 'amm' | 'clob';
  address?: Address;          // FPMM address for AMM markets
  conditionId: Hex;
  collateralToken: Address;
  collateralDecimals: number;
  venue?: {
    exchange: Address;
  };
}

interface LimitlessOrderData {
  id: string;
  marketSlug: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  size: number;
  price: number;
  status: string;
  createdAt: string;
  filledSize?: number;
  averagePrice?: number;
}

// ============================================================================
// Adapter Implementation
// ============================================================================

/**
 * Limitless Trading Adapter
 * Implements ITradingAdapter for trading on Limitless Exchange
 * Supports:
 * - CLOB markets via EIP-712 signed orders (requires API)
 * - AMM markets via direct FPMM contract interaction (no API needed)
 * - Direct CTF split/merge/redeem (no API needed)
 */
export class LimitlessTradingAdapter extends BaseTradingAdapter {
  readonly platform: TradingPlatform = 'LIMITLESS';

  private config: LimitlessTradingConfig;
  private client: LimitlessClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private publicClient: any; // Using any due to viem chain type incompatibilities
  private walletClient: WalletClient | null = null;
  private userAddress: string | null = null;
  private sessionCookie: string | null = null; // Limitless API session cookie
  private ownerId: string | null = null; // User ID from Limitless login (required for orders)

  constructor(options: LimitlessAdapterOptions = {}) {
    super();
    this.config = {
      ...BASE_MAINNET_CONFIG,
      chainId: options.chainId || BASE_MAINNET_CONFIG.chainId,
      rpcUrl: options.rpcUrl || BASE_MAINNET_CONFIG.rpcUrl,
      apiUrl: options.apiUrl || BASE_MAINNET_CONFIG.apiUrl,
    };

    this.client = new LimitlessClient({
      baseUrl: this.config.apiUrl,
    });

    // Create public client for read operations
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(this.config.rpcUrl),
    });
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Check if adapter is ready for trading
   */
  async isReady(): Promise<boolean> {
    return this.authState?.isAuthenticated === true && this.walletClient !== null;
  }

  /**
   * Set the wallet client for signing transactions
   */
  setWalletClient(walletClient: WalletClient): void {
    this.walletClient = walletClient;
  }

  /**
   * Authenticate with Limitless API
   * Uses message signing flow:
   * 1. Get signing message (nonce) from API
   * 2. Sign message with wallet
   * 3. Submit signature to login endpoint
   * 4. Store session cookie for subsequent requests
   */
  async authenticate(credentials?: AuthCredentials): Promise<AuthState> {
    // If already have session, verify it's still valid
    if (this.sessionCookie) {
      const isValid = await this.verifySession();
      if (isValid && this.userAddress) {
        this.authState = {
          isAuthenticated: true,
          address: this.userAddress,
          platform: 'LIMITLESS',
          authMethod: 'wallet',
        };
        return this.authState;
      }
    }

    // For basic auth with just address (no API session)
    if (credentials && this.isLimitlessCredentials(credentials)) {
      this.userAddress = credentials.address;
      this.authState = {
        isAuthenticated: true,
        address: credentials.address,
        platform: 'LIMITLESS',
        authMethod: 'wallet',
      };
      return this.authState;
    }

    if (!this.walletClient) {
      throw new Error('Wallet client required for authentication. Call setWalletClient() first.');
    }

    const [address] = await this.walletClient.getAddresses();
    if (!address) {
      throw new Error('No address available from wallet');
    }

    // Full API authentication flow
    try {
      // Step 1: Get signing message
      const signingMessageResponse = await fetch(`${this.config.apiUrl}/auth/signing-message`);
      if (!signingMessageResponse.ok) {
        throw new Error('Failed to get signing message');
      }
      const signingMessage = await signingMessageResponse.text();

      // Step 2: Sign the message
      const signature = await this.walletClient.signMessage({
        account: address,
        message: signingMessage,
      });

      // Step 3: Login with signature
      const loginResponse = await fetch(`${this.config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-account': address,
          'x-signing-message': signingMessage.startsWith('0x') ? signingMessage : `0x${Buffer.from(signingMessage).toString('hex')}`,
          'x-signature': signature,
        },
        body: JSON.stringify({ client: 'eoa' }),
      });

      if (!loginResponse.ok) {
        const error = await loginResponse.text();
        throw new Error(`Login failed: ${error}`);
      }

      // Step 4: Extract session cookie and ownerId
      const setCookie = loginResponse.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/limitless_session=([^;]+)/);
        if (match && match[1]) {
          this.sessionCookie = match[1];
        }
      }

      // Extract ownerId from response (required for order placement)
      try {
        const loginData = await loginResponse.json() as { id?: string; userId?: string };
        this.ownerId = loginData.id || loginData.userId || null;
      } catch {
        // Response may not be JSON, continue without ownerId
      }

      this.userAddress = address;
      this.authState = {
        isAuthenticated: true,
        address,
        platform: 'LIMITLESS',
        authMethod: 'wallet',
      };

      return this.authState;
    } catch (error) {
      // Fall back to basic auth without API session
      // (still allows direct contract trading, but not CLOB orders)
      console.warn('API authentication failed, using basic wallet auth:', error);
      this.userAddress = address;
      this.authState = {
        isAuthenticated: true,
        address,
        platform: 'LIMITLESS',
        authMethod: 'wallet',
      };
      return this.authState;
    }
  }

  /**
   * Verify current session is still valid
   */
  private async verifySession(): Promise<boolean> {
    if (!this.sessionCookie) return false;

    try {
      const response = await fetch(`${this.config.apiUrl}/auth/verify-auth`, {
        headers: {
          Cookie: `limitless_session=${this.sessionCookie}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if we have an active API session (required for CLOB orders)
   */
  hasApiSession(): boolean {
    return this.sessionCookie !== null;
  }

  /**
   * Type guard for Limitless credentials
   */
  private isLimitlessCredentials(creds: AuthCredentials): creds is LimitlessCredentials {
    return creds.platform === 'LIMITLESS' && 'address' in creds;
  }

  /**
   * Logout and clear state
   */
  async logout(): Promise<void> {
    // Clear API session if we have one
    if (this.sessionCookie) {
      try {
        await fetch(`${this.config.apiUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            Cookie: `limitless_session=${this.sessionCookie}`,
          },
        });
      } catch {
        // Ignore logout errors
      }
    }

    await super.logout();
    this.userAddress = null;
    this.sessionCookie = null;
    this.ownerId = null;
  }

  // ============================================================================
  // Order Methods
  // ============================================================================

  /**
   * Place an order on Limitless
   * Requires API session authentication (call authenticate() first)
   */
  async placeOrder(request: UnifiedOrderRequest): Promise<UnifiedOrder> {
    this.ensureAuthenticated();

    if (!this.walletClient || !this.userAddress) {
      throw new Error('Wallet client and address required');
    }

    if (!this.sessionCookie) {
      throw new Error('API session required for CLOB orders. Call authenticate() with wallet signing first.');
    }

    // Get market details for the exchange contract address
    const market = await this.client.getMarket(request.marketId);
    if (!market || !market.venue?.exchange) {
      throw new Error(`Market not found or missing exchange address: ${request.marketId}`);
    }

    // Get the token ID for the outcome
    const tokenId = this.getTokenId(market, request.outcome);

    // Build the order
    const { orderData, price } = await this.buildOrder(market, request, tokenId);

    // Sign the order using EIP-712
    const signature = await this.signOrder(market.venue.exchange, orderData);

    // Map order type to Limitless format (only GTC and FOK supported)
    const limitlessOrderType = this.mapOrderType(request.orderType);

    // Submit order to Limitless API
    const response = await this.submitOrder(request.marketId, orderData, signature, price, limitlessOrderType);

    return this.mapToUnifiedOrder(response, request.marketId);
  }

  /**
   * Map unified order type to Limitless order type
   * Limitless only supports GTC and FOK
   */
  private mapOrderType(orderType: string): 'GTC' | 'FOK' {
    switch (orderType) {
      case 'FOK':
        return 'FOK';
      case 'IOC':
        throw new Error('IOC (Immediate-or-Cancel) orders are not supported by Limitless. Use GTC or FOK.');
      case 'MARKET':
        // Market orders are handled as FOK in CLOB
        return 'FOK';
      case 'GTC':
      case 'LIMIT':
      case 'GTD':
      default:
        // Default to GTC for limit orders
        return 'GTC';
    }
  }

  /**
   * Build order data for signing
   * Based on Limitless API documentation:
   * - Uses `salt` (timestamp-based nonce) instead of `nonce`
   * - Amounts scaled by 1e6 (6 decimals for USDC)
   * - BUY: rounds up collateral; SELL: rounds down
   * - feeRateBps is 300 (3%)
   */
  private async buildOrder(
    market: LimitlessMarket,
    request: UnifiedOrderRequest,
    tokenId: string
  ): Promise<{ orderData: Record<string, unknown>; price: number }> {
    const side = request.side === 'BUY' ? LimitlessOrderSide.BUY : LimitlessOrderSide.SELL;

    // Generate salt: timestamp in milliseconds × 1000 + offset
    const salt = Date.now() * 1000 + Math.floor(Math.random() * 1000);

    // Price is probability (0-1), size is shares
    // Amounts are scaled by 1e6 (6 decimals for USDC)
    const shares = request.size;
    const price = request.price;

    // Calculate collateral based on side
    // BUY: collateral = (shares × price × 1e6 + 1e6 - 1) // 1e6 (round up)
    // SELL: collateral = (shares × price × 1e6) // 1e6 (round down)
    let makerAmount: number;
    let takerAmount: number;

    if (request.side === 'BUY') {
      // Buying shares: pay collateral, receive shares
      // makerAmount = collateral (what you pay), takerAmount = shares (what you receive)
      const collateral = Math.ceil(shares * price * 1e6) / 1e6;
      makerAmount = Math.round(collateral * 1e6);
      takerAmount = Math.round(shares * 1e6);
    } else {
      // Selling shares: pay shares, receive collateral
      // makerAmount = shares (what you sell), takerAmount = collateral (what you receive)
      const collateral = Math.floor(shares * price * 1e6) / 1e6;
      makerAmount = Math.round(shares * 1e6);
      takerAmount = Math.round(collateral * 1e6);
    }

    const orderData = {
      salt,
      maker: this.userAddress,
      signer: this.userAddress,
      taker: '0x0000000000000000000000000000000000000000', // Open order
      tokenId,
      makerAmount,
      takerAmount,
      expiration: '0', // 0 = no expiration (GTC)
      nonce: 0,
      feeRateBps: 300, // 3% fee
      side,
      signatureType: 0, // EOA signature
    };

    return { orderData, price };
  }

  /**
   * Sign an order using EIP-712
   */
  private async signOrder(
    exchangeAddress: string,
    orderData: Record<string, unknown>
  ): Promise<Hex> {
    if (!this.walletClient) {
      throw new Error('Wallet client required');
    }

    const domain = {
      name: this.config.domainName,
      version: this.config.domainVersion,
      chainId: this.config.chainId,
      verifyingContract: exchangeAddress as Hex,
    };

    // Sign using EIP-712
    // Cast to any to work around strict viem typing for custom EIP-712 domains
    const signature = await this.walletClient.signTypedData({
      account: this.userAddress as Hex,
      domain,
      types: LIMITLESS_ORDER_TYPES,
      primaryType: 'Order',
      message: orderData,
    } as Parameters<typeof this.walletClient.signTypedData>[0]);

    return signature;
  }

  /**
   * Submit signed order to Limitless API
   * Requires API session authentication
   *
   * Payload format (from Limitless API docs):
   * {
   *   "order": { salt, maker, signer, taker, tokenId, makerAmount, takerAmount, expiration, nonce, feeRateBps, side, signatureType, signature, price },
   *   "orderType": "GTC|FOK",
   *   "marketSlug": "<string>",
   *   "ownerId": "<string>"
   * }
   */
  private async submitOrder(
    marketSlug: string,
    orderData: Record<string, unknown>,
    signature: Hex,
    price: number,
    orderType: 'GTC' | 'FOK' | 'IOC' = 'GTC'
  ): Promise<LimitlessOrderData> {
    if (!this.sessionCookie) {
      throw new Error('API session required for CLOB orders. Call authenticate() first.');
    }

    // IOC is not supported by Limitless
    if (orderType === 'IOC') {
      throw new Error('IOC (Immediate-or-Cancel) orders are not supported by Limitless. Use GTC or FOK.');
    }

    const response = await fetch(`${this.config.apiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `limitless_session=${this.sessionCookie}`,
      },
      body: JSON.stringify({
        order: {
          ...orderData,
          signature,
          price,
        },
        orderType,
        marketSlug,
        ownerId: this.ownerId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to submit order: ${error}`);
    }

    return response.json() as Promise<LimitlessOrderData>;
  }

  /**
   * Get token ID for an outcome
   */
  private getTokenId(market: LimitlessMarket, outcome: 'YES' | 'NO' | number): string {
    if (typeof outcome === 'number') {
      // For multi-outcome markets, use outcome index
      const marketOutcome = market.outcomes?.[outcome];
      if (!marketOutcome) {
        throw new Error(`Invalid outcome index: ${outcome}`);
      }
      return market.tokenId || market.slug;
    }

    // Binary market: YES = 0, NO = 1
    if (outcome === 'YES') {
      return market.yesTokenId || '0';
    } else {
      return market.noTokenId || '1';
    }
  }

  /**
   * Map API response to unified order
   */
  private mapToUnifiedOrder(data: LimitlessOrderData, marketId: string): UnifiedOrder {
    return {
      id: data.id,
      platform: 'LIMITLESS',
      marketId,
      outcome: data.side === 'BUY' ? 'YES' : 'NO',
      side: data.side as OrderSide,
      orderType: 'GTC',
      status: this.mapOrderStatus(data.status),
      size: data.size,
      filledSize: data.filledSize || 0,
      remainingSize: data.size - (data.filledSize || 0),
      price: data.price,
      averagePrice: data.averagePrice,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.createdAt),
    };
  }

  /**
   * Map API status to unified status
   */
  private mapOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      pending: 'PENDING',
      open: 'OPEN',
      partial: 'PARTIALLY_FILLED',
      filled: 'FILLED',
      cancelled: 'CANCELLED',
      expired: 'EXPIRED',
      rejected: 'REJECTED',
    };
    return statusMap[status.toLowerCase()] || 'PENDING';
  }

  /**
   * Cancel an order
   * Uses DELETE /orders/{id} endpoint with session cookie authentication
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    this.ensureAuthenticated();

    if (!this.sessionCookie) {
      throw new Error('API session required to cancel orders. Call authenticate() first.');
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': `limitless_session=${this.sessionCookie}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Cancel order error:', error);
      return false;
    }
  }

  /**
   * Cancel all orders
   * If marketId is provided, uses DELETE /orders/all/{market_slug} endpoint
   * Otherwise, cancels orders individually
   */
  async cancelAllOrders(marketId?: string): Promise<number> {
    this.ensureAuthenticated();

    if (!this.sessionCookie) {
      throw new Error('API session required to cancel orders. Call authenticate() first.');
    }

    // If market ID provided, use batch cancel endpoint
    if (marketId) {
      try {
        const response = await fetch(`${this.config.apiUrl}/orders/all/${marketId}`, {
          method: 'DELETE',
          headers: {
            'Cookie': `limitless_session=${this.sessionCookie}`,
          },
        });

        if (response.ok) {
          const data = await response.json() as { cancelled?: number; count?: number };
          return data.cancelled || data.count || 0;
        }
      } catch (error) {
        console.error('Batch cancel error:', error);
      }
    }

    // Fallback: cancel orders individually
    const openOrders = await this.getOpenOrders(marketId);
    let cancelled = 0;

    for (const order of openOrders) {
      const success = await this.cancelOrder(order.id);
      if (success) cancelled++;
    }

    return cancelled;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<UnifiedOrder | null> {
    this.ensureAuthenticated();

    try {
      const headers: Record<string, string> = {};
      if (this.sessionCookie) {
        headers['Cookie'] = `limitless_session=${this.sessionCookie}`;
      }

      const response = await fetch(`${this.config.apiUrl}/orders/${orderId}`, { headers });
      if (!response.ok) return null;

      const data = await response.json() as LimitlessOrderData;
      return this.mapToUnifiedOrder(data, data.marketSlug);
    } catch {
      return null;
    }
  }

  /**
   * Get open orders
   * Uses statuses=LIVE filter as per Limitless API docs
   */
  async getOpenOrders(marketId?: string): Promise<UnifiedOrder[]> {
    this.ensureAuthenticated();

    if (!this.userAddress) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        statuses: 'LIVE', // API uses 'statuses=LIVE' for open orders
      });
      if (marketId) params.set('market', marketId);

      const headers: Record<string, string> = {};
      if (this.sessionCookie) {
        headers['Cookie'] = `limitless_session=${this.sessionCookie}`;
      }

      const response = await fetch(`${this.config.apiUrl}/orders?${params}`, { headers });
      if (!response.ok) return [];

      const data = await response.json() as { orders: LimitlessOrderData[] };
      return (data.orders || []).map((o) => this.mapToUnifiedOrder(o, o.marketSlug));
    } catch {
      return [];
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(options?: OrderHistoryOptions): Promise<UnifiedOrder[]> {
    this.ensureAuthenticated();

    if (!this.userAddress) {
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (options?.marketId) params.set('market', options.marketId);
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.offset) params.set('offset', options.offset.toString());

      const headers: Record<string, string> = {};
      if (this.sessionCookie) {
        headers['Cookie'] = `limitless_session=${this.sessionCookie}`;
      }

      const response = await fetch(`${this.config.apiUrl}/orders?${params}`, { headers });
      if (!response.ok) return [];

      const data = await response.json() as { orders: LimitlessOrderData[] };
      return (data.orders || []).map((o) => this.mapToUnifiedOrder(o, o.marketSlug));
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Position Methods
  // ============================================================================

  /**
   * Get all positions
   * Uses /portfolio/positions endpoint with session cookie
   */
  async getPositions(): Promise<UnifiedPosition[]> {
    this.ensureAuthenticated();

    if (!this.userAddress) {
      return [];
    }

    try {
      const headers: Record<string, string> = {};
      if (this.sessionCookie) {
        headers['Cookie'] = `limitless_session=${this.sessionCookie}`;
      }

      const response = await fetch(
        `${this.config.apiUrl}/portfolio/positions`,
        { headers }
      );
      if (!response.ok) return [];

      const data = await response.json() as {
        positions?: Array<{
          marketSlug: string;
          marketQuestion?: string;
          outcome: string;
          size: number;
          averagePrice: number;
          currentPrice: number;
          unrealizedPnl: number;
          realizedPnl: number;
          costBasis: number;
          tokensBalance?: {
            yes?: number;
            no?: number;
          };
        }>;
        tokensBalance?: Record<string, { yes?: number; no?: number }>;
      };

      // Handle both response formats
      if (data.positions) {
        return data.positions.map((p) => ({
          platform: 'LIMITLESS' as const,
          marketId: p.marketSlug,
          marketQuestion: p.marketQuestion,
          outcome: p.outcome === 'YES' ? 'YES' as const : 'NO' as const,
          size: p.size,
          averagePrice: p.averagePrice,
          currentPrice: p.currentPrice,
          unrealizedPnl: p.unrealizedPnl,
          realizedPnl: p.realizedPnl,
          costBasis: p.costBasis,
        }));
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get position for specific market and outcome
   */
  async getPosition(
    marketId: string,
    outcome: 'YES' | 'NO' | number
  ): Promise<UnifiedPosition | null> {
    const positions = await this.getPositions();
    return positions.find(
      (p) => p.marketId === marketId && p.outcome === outcome
    ) || null;
  }

  // ============================================================================
  // Trade Methods
  // ============================================================================

  /**
   * Get trade history
   */
  async getTrades(options?: TradeHistoryOptions): Promise<UnifiedTrade[]> {
    this.ensureAuthenticated();

    if (!this.userAddress) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        address: this.userAddress,
      });
      if (options?.marketId) params.set('market', options.marketId);
      if (options?.limit) params.set('limit', options.limit.toString());

      const response = await fetch(`${this.config.apiUrl}/trades?${params}`);
      if (!response.ok) return [];

      const data = await response.json() as {
        trades: Array<{
          id: string;
          orderId: string;
          marketSlug: string;
          outcome: string;
          side: string;
          price: number;
          size: number;
          fee: number;
          timestamp: string;
          txHash?: string;
        }>;
      };

      return (data.trades || []).map((t) => ({
        id: t.id,
        orderId: t.orderId,
        platform: 'LIMITLESS' as const,
        marketId: t.marketSlug,
        outcome: t.outcome === 'YES' ? 'YES' as const : 'NO' as const,
        side: t.side as OrderSide,
        price: t.price,
        size: t.size,
        fee: t.fee,
        timestamp: new Date(t.timestamp),
        transactionHash: t.txHash,
      }));
    } catch {
      return [];
    }
  }

  // ============================================================================
  // Balance Methods
  // ============================================================================

  /**
   * Get all balances
   */
  async getBalances(): Promise<UnifiedBalance[]> {
    this.ensureAuthenticated();

    if (!this.userAddress) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.config.apiUrl}/balances?address=${this.userAddress}`
      );
      if (!response.ok) return [];

      const data = await response.json() as {
        balances: Array<{
          token: string;
          available: number;
          locked: number;
          total: number;
          usdValue?: number;
        }>;
      };

      return (data.balances || []).map((b) => ({
        platform: 'LIMITLESS' as const,
        token: b.token,
        available: b.available,
        locked: b.locked,
        total: b.total,
        usdValue: b.usdValue,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get balance for specific token
   */
  async getBalance(token: string): Promise<UnifiedBalance | null> {
    const balances = await this.getBalances();
    return balances.find((b) => b.token === token) || null;
  }

  // ============================================================================
  // Market Data Methods
  // ============================================================================

  /**
   * Get best price for a market
   */
  async getBestPrice(
    marketId: string,
    outcome: 'YES' | 'NO' | number,
    side: OrderSide
  ): Promise<number | null> {
    try {
      const orderbook = await this.client.getOrderBook(marketId);
      if (!orderbook) return null;

      const outcomeStr = typeof outcome === 'number'
        ? (outcome === 0 ? 'YES' : 'NO')
        : outcome;

      // For YES outcome:
      // - BUY: look at asks (lowest ask)
      // - SELL: look at bids (highest bid)
      if (outcomeStr === 'YES') {
        if (side === 'BUY') {
          const asks = orderbook.asks || [];
          return asks[0]?.price ?? null;
        } else {
          const bids = orderbook.bids || [];
          return bids[0]?.price ?? null;
        }
      } else {
        // For NO, use complement pricing
        if (side === 'BUY') {
          const bids = orderbook.bids || [];
          const bestBid = bids[0]?.price;
          return bestBid != null ? 1 - bestBid : null;
        } else {
          const asks = orderbook.asks || [];
          const bestAsk = asks[0]?.price;
          return bestAsk != null ? 1 - bestAsk : null;
        }
      }
    } catch (error) {
      console.error('Get best price error:', error);
      return null;
    }
  }

  // ============================================================================
  // Direct On-Chain Trading Methods (No API Authentication Required)
  // ============================================================================

  /**
   * Get market info for direct trading
   */
  async getMarketForDirectTrade(marketSlug: string): Promise<DirectTradeMarket | null> {
    const market = await this.client.getMarket(marketSlug);
    if (!market) return null;

    return {
      slug: market.slug,
      tradeType: (market.tradeType as 'amm' | 'clob') || 'amm',
      address: market.address as Address | undefined,
      conditionId: market.conditionId as Hex,
      collateralToken: (market.collateralToken?.address || this.config.usdc) as Address,
      collateralDecimals: market.collateralToken?.decimals || 6,
      venue: market.venue ? { exchange: market.venue.exchange as Address } : undefined,
    };
  }

  /**
   * Buy outcome tokens directly from AMM (FPMM)
   * Only works for AMM markets
   * @param marketSlug - Market slug
   * @param outcomeIndex - 0 for YES, 1 for NO
   * @param amount - Amount of collateral to invest (in human units, e.g., 10 USDC)
   * @param minTokens - Minimum tokens to receive (slippage protection)
   */
  async buyFromAMM(
    marketSlug: string,
    outcomeIndex: number,
    amount: number,
    minTokens: number = 0
  ): Promise<DirectTradeResult> {
    if (!this.walletClient || !this.userAddress) {
      throw new Error('Wallet client required. Call setWalletClient() first.');
    }

    const market = await this.getMarketForDirectTrade(marketSlug);
    if (!market) throw new Error(`Market not found: ${marketSlug}`);
    if (market.tradeType !== 'amm') throw new Error('buyFromAMM only works for AMM markets');
    if (!market.address) throw new Error('AMM market has no contract address');

    const decimals = market.collateralDecimals;
    const investmentAmount = BigInt(Math.floor(amount * 10 ** decimals));
    const minOutcomeTokens = BigInt(Math.floor(minTokens * 10 ** 18)); // Outcome tokens have 18 decimals

    // Ensure collateral approval
    await this.ensureCollateralApproval(market.collateralToken, market.address, investmentAmount);

    // Execute buy
    const txHash = await this.walletClient.writeContract({
      address: market.address,
      abi: FPMM_ABI,
      functionName: 'buy',
      args: [investmentAmount, BigInt(outcomeIndex), minOutcomeTokens],
      account: this.userAddress as Address,
      chain: base,
    });

    return {
      txHash,
      amount: investmentAmount,
      outcome: outcomeIndex === 0 ? 'YES' : 'NO',
      type: 'BUY',
    };
  }

  /**
   * Sell outcome tokens directly to AMM (FPMM)
   * Only works for AMM markets
   * @param marketSlug - Market slug
   * @param outcomeIndex - 0 for YES, 1 for NO
   * @param returnAmount - Amount of collateral to receive (in human units)
   * @param maxTokens - Maximum tokens to sell (slippage protection)
   */
  async sellToAMM(
    marketSlug: string,
    outcomeIndex: number,
    returnAmount: number,
    maxTokens: number = Number.MAX_SAFE_INTEGER
  ): Promise<DirectTradeResult> {
    if (!this.walletClient || !this.userAddress) {
      throw new Error('Wallet client required. Call setWalletClient() first.');
    }

    const market = await this.getMarketForDirectTrade(marketSlug);
    if (!market) throw new Error(`Market not found: ${marketSlug}`);
    if (market.tradeType !== 'amm') throw new Error('sellToAMM only works for AMM markets');
    if (!market.address) throw new Error('AMM market has no contract address');

    const decimals = market.collateralDecimals;
    const returnAmountWei = BigInt(Math.floor(returnAmount * 10 ** decimals));
    const maxOutcomeTokens = BigInt(Math.floor(maxTokens * 10 ** 18));

    // Ensure CTF token approval for the FPMM
    await this.ensureCTFApproval(market.address);

    // Execute sell
    const txHash = await this.walletClient.writeContract({
      address: market.address,
      abi: FPMM_ABI,
      functionName: 'sell',
      args: [returnAmountWei, BigInt(outcomeIndex), maxOutcomeTokens],
      account: this.userAddress as Address,
      chain: base,
    });

    return {
      txHash,
      amount: returnAmountWei,
      outcome: outcomeIndex === 0 ? 'YES' : 'NO',
      type: 'SELL',
    };
  }

  /**
   * Calculate how many tokens you'll receive for a given investment
   */
  async calcBuyAmount(
    marketSlug: string,
    outcomeIndex: number,
    investmentAmount: number
  ): Promise<number> {
    const market = await this.getMarketForDirectTrade(marketSlug);
    if (!market || market.tradeType !== 'amm' || !market.address) {
      throw new Error('Invalid AMM market');
    }

    const amountWei = BigInt(Math.floor(investmentAmount * 10 ** market.collateralDecimals));

    const result = await this.publicClient.readContract({
      address: market.address,
      abi: FPMM_ABI,
      functionName: 'calcBuyAmount',
      args: [amountWei, BigInt(outcomeIndex)],
    });

    return Number(result) / 10 ** 18;
  }

  /**
   * Calculate how many tokens you need to sell for a given return
   */
  async calcSellAmount(
    marketSlug: string,
    outcomeIndex: number,
    returnAmount: number
  ): Promise<number> {
    const market = await this.getMarketForDirectTrade(marketSlug);
    if (!market || market.tradeType !== 'amm' || !market.address) {
      throw new Error('Invalid AMM market');
    }

    const amountWei = BigInt(Math.floor(returnAmount * 10 ** market.collateralDecimals));

    const result = await this.publicClient.readContract({
      address: market.address,
      abi: FPMM_ABI,
      functionName: 'calcSellAmount',
      args: [amountWei, BigInt(outcomeIndex)],
    });

    return Number(result) / 10 ** 18;
  }

  // ============================================================================
  // CTF Direct Methods (Split, Merge, Redeem)
  // ============================================================================

  /**
   * Split collateral into YES and NO tokens
   * Works for both AMM and CLOB markets
   * @param marketSlug - Market slug
   * @param amount - Amount of collateral to split (in human units)
   */
  async splitPosition(marketSlug: string, amount: number): Promise<DirectTradeResult> {
    if (!this.walletClient || !this.userAddress) {
      throw new Error('Wallet client required. Call setWalletClient() first.');
    }

    const market = await this.getMarketForDirectTrade(marketSlug);
    if (!market) throw new Error(`Market not found: ${marketSlug}`);

    const decimals = market.collateralDecimals;
    const amountWei = BigInt(Math.floor(amount * 10 ** decimals));

    // Ensure collateral approval for CTF contract
    await this.ensureCollateralApproval(market.collateralToken, this.config.ctfContract, amountWei);

    // Execute split
    const txHash = await this.walletClient.writeContract({
      address: this.config.ctfContract,
      abi: CTF_ABI,
      functionName: 'splitPosition',
      args: [
        market.collateralToken,
        NULL_PARENT_COLLECTION_ID,
        market.conditionId,
        BINARY_PARTITION,
        amountWei,
      ],
      account: this.userAddress as Address,
      chain: base,
    });

    return {
      txHash,
      amount: amountWei,
      outcome: 'YES', // Both YES and NO are created
      type: 'SPLIT',
    };
  }

  /**
   * Merge YES and NO tokens back into collateral
   * Works for both AMM and CLOB markets
   * @param marketSlug - Market slug
   * @param amount - Amount of token pairs to merge (in human units)
   */
  async mergePositions(marketSlug: string, amount: number): Promise<DirectTradeResult> {
    if (!this.walletClient || !this.userAddress) {
      throw new Error('Wallet client required. Call setWalletClient() first.');
    }

    const market = await this.getMarketForDirectTrade(marketSlug);
    if (!market) throw new Error(`Market not found: ${marketSlug}`);

    const decimals = market.collateralDecimals;
    const amountWei = BigInt(Math.floor(amount * 10 ** decimals));

    // Execute merge
    const txHash = await this.walletClient.writeContract({
      address: this.config.ctfContract,
      abi: CTF_ABI,
      functionName: 'mergePositions',
      args: [
        market.collateralToken,
        NULL_PARENT_COLLECTION_ID,
        market.conditionId,
        BINARY_PARTITION,
        amountWei,
      ],
      account: this.userAddress as Address,
      chain: base,
    });

    return {
      txHash,
      amount: amountWei,
      outcome: 'YES',
      type: 'MERGE',
    };
  }

  /**
   * Redeem winning tokens after market resolution
   * @param marketSlug - Market slug
   */
  async redeemPositions(marketSlug: string): Promise<DirectTradeResult> {
    if (!this.walletClient || !this.userAddress) {
      throw new Error('Wallet client required. Call setWalletClient() first.');
    }

    const market = await this.getMarketForDirectTrade(marketSlug);
    if (!market) throw new Error(`Market not found: ${marketSlug}`);

    // Index sets for binary market: [1, 2] = [YES, NO]
    const indexSets = [1n, 2n];

    // Execute redeem
    const txHash = await this.walletClient.writeContract({
      address: this.config.ctfContract,
      abi: CTF_ABI,
      functionName: 'redeemPositions',
      args: [
        market.collateralToken,
        NULL_PARENT_COLLECTION_ID,
        market.conditionId,
        indexSets,
      ],
      account: this.userAddress as Address,
      chain: base,
    });

    return {
      txHash,
      amount: 0n, // Amount determined by contract
      outcome: 'YES',
      type: 'REDEEM',
    };
  }

  /**
   * Get CTF token balance for a position
   * @param tokenId - ERC-1155 token ID (from market.tokens.yes or market.tokens.no)
   */
  async getPositionBalance(tokenId: string): Promise<bigint> {
    if (!this.userAddress) return 0n;

    const balance = await this.publicClient.readContract({
      address: this.config.ctfContract,
      abi: CTF_ABI,
      functionName: 'balanceOf',
      args: [this.userAddress as Address, BigInt(tokenId)],
    });

    return balance as bigint;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Ensure collateral token approval
   */
  private async ensureCollateralApproval(
    token: Address,
    spender: Address,
    amount: bigint
  ): Promise<void> {
    if (!this.walletClient || !this.userAddress) return;

    // Check current allowance
    const allowance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.userAddress as Address, spender],
    });

    if ((allowance as bigint) < amount) {
      // Approve max uint256 for convenience
      await this.walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
        account: this.userAddress as Address,
        chain: base,
      });
    }
  }

  /**
   * Ensure CTF token approval for a spender (e.g., FPMM contract)
   */
  private async ensureCTFApproval(spender: Address): Promise<void> {
    if (!this.walletClient || !this.userAddress) return;

    // Check if already approved
    const isApproved = await this.publicClient.readContract({
      address: this.config.ctfContract,
      abi: CTF_ABI,
      functionName: 'isApprovedForAll',
      args: [this.userAddress as Address, spender],
    });

    if (!isApproved) {
      await this.walletClient.writeContract({
        address: this.config.ctfContract,
        abi: CTF_ABI,
        functionName: 'setApprovalForAll',
        args: [spender, true],
        account: this.userAddress as Address,
        chain: base,
      });
    }
  }
}

/**
 * Factory function for creating Limitless adapter
 */
export function createLimitlessAdapter(
  config: Record<string, unknown> = {}
): LimitlessTradingAdapter {
  return new LimitlessTradingAdapter(config as LimitlessAdapterOptions);
}

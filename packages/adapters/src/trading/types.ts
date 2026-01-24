/**
 * Trading Types - Platform Agnostic
 * Abstract types for prediction market trading that can be implemented by any platform
 */

import { z } from 'zod';

// ============================================================================
// Common Trading Types (Platform Agnostic)
// ============================================================================

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'GTC' | 'GTD' | 'FOK' | 'IOC';
export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REJECTED';

/**
 * Trading-supported platforms
 * Note: Named differently from adapter Platform to avoid export conflicts
 */
export type TradingPlatform = 'POLYMARKET' | 'LIMITLESS' | 'KALSHI' | 'MANIFOLD' | 'METACULUS';

// ============================================================================
// Unified Order Interface
// ============================================================================

export interface UnifiedOrderRequest {
  /** Platform-specific market identifier */
  marketId: string;
  /** Outcome to trade (YES/NO or outcome index) */
  outcome: 'YES' | 'NO' | number;
  /** Buy or sell */
  side: OrderSide;
  /** Size in units (shares, contracts, etc.) */
  size: number;
  /** Price as probability (0-1) */
  price: number;
  /** Order type */
  orderType: OrderType;
  /** Optional expiration timestamp */
  expiresAt?: number;
  /** Optional client-provided order ID */
  clientOrderId?: string;
}

export interface UnifiedOrder {
  /** Platform-assigned order ID */
  id: string;
  /** Client-provided order ID if any */
  clientOrderId?: string;
  /** Platform this order is on */
  platform: TradingPlatform;
  /** Market identifier */
  marketId: string;
  /** Outcome */
  outcome: 'YES' | 'NO' | number;
  /** Side */
  side: OrderSide;
  /** Order type */
  orderType: OrderType;
  /** Order status */
  status: OrderStatus;
  /** Original size */
  size: number;
  /** Filled size */
  filledSize: number;
  /** Remaining size */
  remainingSize: number;
  /** Limit price (probability 0-1) */
  price: number;
  /** Average fill price */
  averagePrice?: number;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Platform-specific data */
  platformData?: Record<string, unknown>;
}

// ============================================================================
// Unified Position Interface
// ============================================================================

export interface UnifiedPosition {
  /** Platform */
  platform: TradingPlatform;
  /** Market identifier */
  marketId: string;
  /** Market question for display */
  marketQuestion?: string;
  /** Outcome held */
  outcome: 'YES' | 'NO' | number;
  /** Position size */
  size: number;
  /** Average entry price */
  averagePrice: number;
  /** Current market price */
  currentPrice: number;
  /** Unrealized P&L */
  unrealizedPnl: number;
  /** Realized P&L */
  realizedPnl: number;
  /** Total cost basis */
  costBasis: number;
  /** Platform-specific data */
  platformData?: Record<string, unknown>;
}

// ============================================================================
// Unified Trade/Fill Interface
// ============================================================================

export interface UnifiedTrade {
  /** Trade ID */
  id: string;
  /** Order ID this trade belongs to */
  orderId: string;
  /** Platform */
  platform: TradingPlatform;
  /** Market identifier */
  marketId: string;
  /** Outcome traded */
  outcome: 'YES' | 'NO' | number;
  /** Side */
  side: OrderSide;
  /** Execution price */
  price: number;
  /** Trade size */
  size: number;
  /** Fee paid */
  fee: number;
  /** Execution timestamp */
  timestamp: Date;
  /** Transaction hash if on-chain */
  transactionHash?: string;
  /** Platform-specific data */
  platformData?: Record<string, unknown>;
}

// ============================================================================
// Unified Balance Interface
// ============================================================================

export interface UnifiedBalance {
  /** Platform */
  platform: TradingPlatform;
  /** Token/currency symbol */
  token: string;
  /** Available for trading */
  available: number;
  /** Locked in orders */
  locked: number;
  /** Total balance */
  total: number;
  /** USD value if known */
  usdValue?: number;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthCredentials {
  /** Platform */
  platform: TradingPlatform;
  /** API key if applicable */
  apiKey?: string;
  /** API secret if applicable */
  apiSecret?: string;
  /** Additional credentials */
  [key: string]: unknown;
}

export interface AuthState {
  /** Is authenticated */
  isAuthenticated: boolean;
  /** User's address or identifier */
  address?: string;
  /** Platform */
  platform: TradingPlatform;
  /** Authentication method used */
  authMethod?: string;
  /** When authentication expires */
  expiresAt?: Date;
}

// ============================================================================
// Trading Adapter Interface
// ============================================================================

export interface ITradingAdapter {
  /** Platform identifier */
  readonly platform: TradingPlatform;

  /** Check if adapter is ready for trading */
  isReady(): Promise<boolean>;

  // Authentication
  authenticate(credentials?: AuthCredentials): Promise<AuthState>;
  getAuthState(): AuthState | null;
  logout(): Promise<void>;

  // Orders
  placeOrder(order: UnifiedOrderRequest): Promise<UnifiedOrder>;
  cancelOrder(orderId: string): Promise<boolean>;
  cancelAllOrders(marketId?: string): Promise<number>;
  getOrder(orderId: string): Promise<UnifiedOrder | null>;
  getOpenOrders(marketId?: string): Promise<UnifiedOrder[]>;
  getOrderHistory(options?: OrderHistoryOptions): Promise<UnifiedOrder[]>;

  // Positions
  getPositions(): Promise<UnifiedPosition[]>;
  getPosition(marketId: string, outcome: 'YES' | 'NO' | number): Promise<UnifiedPosition | null>;

  // Trades
  getTrades(options?: TradeHistoryOptions): Promise<UnifiedTrade[]>;

  // Balances
  getBalances(): Promise<UnifiedBalance[]>;
  getBalance(token: string): Promise<UnifiedBalance | null>;

  // Market data (for trading context)
  getBestPrice(marketId: string, outcome: 'YES' | 'NO' | number, side: OrderSide): Promise<number | null>;
}

export interface OrderHistoryOptions {
  marketId?: string;
  status?: OrderStatus[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface TradeHistoryOptions {
  marketId?: string;
  orderId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Polymarket-Specific Types
// ============================================================================

export type PolymarketSignatureType = 'EOA' | 'POLY_PROXY' | 'POLY_GNOSIS_SAFE';

export interface PolymarketCredentials extends AuthCredentials {
  platform: 'POLYMARKET';
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  signatureType: PolymarketSignatureType;
}

export interface PolymarketSafeWallet {
  address: string;
  isDeployed: boolean;
  isActivated: boolean;
  owners: string[];
  threshold: number;
  polymarketProxyAddress?: string;
}

export interface PolymarketTradingConfig {
  chainId: number;
  rpcUrl: string;
  clobUrl: string;
  relayerUrl?: string;
  exchangeAddress: string;
  negRiskExchangeAddress: string;
  negRiskAdapterAddress: string;
  collateralToken: string;
  conditionalTokensAddress: string;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const UnifiedOrderRequestSchema = z.object({
  marketId: z.string().min(1),
  outcome: z.union([z.enum(['YES', 'NO']), z.number()]),
  side: z.enum(['BUY', 'SELL']),
  size: z.number().positive(),
  price: z.number().min(0.001).max(0.999),
  orderType: z.enum(['MARKET', 'LIMIT', 'GTC', 'GTD', 'FOK', 'IOC']).default('LIMIT'),
  expiresAt: z.number().optional(),
  clientOrderId: z.string().optional(),
});

export const CancelOrderSchema = z.object({
  orderId: z.string().min(1),
});

// ============================================================================
// Trading Adapter Factory Type
// ============================================================================

export type TradingAdapterFactory = (config: Record<string, unknown>) => ITradingAdapter;

// Registry of available adapters
export interface TradingAdapterRegistry {
  register(platform: TradingPlatform, factory: TradingAdapterFactory): void;
  get(platform: TradingPlatform): TradingAdapterFactory | undefined;
  getAll(): Map<TradingPlatform, TradingAdapterFactory>;
}

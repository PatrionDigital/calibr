/**
 * Polymarket Trading Adapter
 * Full implementation of ITradingAdapter for Polymarket
 */

import { ClobClient } from '@polymarket/clob-client';
import type { WalletClient } from 'viem';
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
  PolymarketCredentials,
  PolymarketSafeWallet,
} from '../types';
import { PolymarketAuthService } from './auth';
import { PolymarketSafeService } from './safe';
import { PolymarketOrderBuilder } from './orders';
import { POLYGON_MAINNET_CONFIG, POLYMARKET_ADDRESSES } from './config';

export interface PolymarketAdapterOptions {
  chainId?: number;
  rpcUrl?: string;
  clobUrl?: string;
  useGasless?: boolean;
}

/**
 * Polymarket Trading Adapter
 * Implements the ITradingAdapter interface for Polymarket trading
 */
export class PolymarketTradingAdapter extends BaseTradingAdapter {
  readonly platform: TradingPlatform = 'POLYMARKET';

  private config: PolymarketAdapterOptions;
  private authService: PolymarketAuthService;
  private safeService: PolymarketSafeService;
  private orderBuilder: PolymarketOrderBuilder;
  private clobClient: ClobClient | null = null;
  private walletClient: WalletClient | null = null;
  private credentials: PolymarketCredentials | null = null;
  private safeWallet: PolymarketSafeWallet | null = null;

  constructor(config: PolymarketAdapterOptions = {}) {
    super();
    this.config = {
      chainId: config.chainId || POLYGON_MAINNET_CONFIG.chainId,
      rpcUrl: config.rpcUrl || POLYGON_MAINNET_CONFIG.rpcUrl,
      clobUrl: config.clobUrl || POLYGON_MAINNET_CONFIG.clobUrl,
      useGasless: config.useGasless ?? true,
    };

    this.authService = new PolymarketAuthService({
      rpcUrl: this.config.rpcUrl,
      clobUrl: this.config.clobUrl,
    });

    this.safeService = new PolymarketSafeService({
      rpcUrl: this.config.rpcUrl,
    });

    this.orderBuilder = new PolymarketOrderBuilder({
      rpcUrl: this.config.rpcUrl,
      clobUrl: this.config.clobUrl,
    });
  }

  /**
   * Check if adapter is ready for trading
   */
  async isReady(): Promise<boolean> {
    return this.authState?.isAuthenticated === true && this.clobClient !== null;
  }

  /**
   * Set the wallet client for signing
   */
  setWalletClient(walletClient: WalletClient): void {
    this.walletClient = walletClient;
  }

  /**
   * Authenticate with Polymarket
   */
  async authenticate(credentials?: AuthCredentials): Promise<AuthState> {
    // If credentials provided, use them directly
    if (credentials && this.isPolymarketCredentials(credentials)) {
      this.credentials = credentials;
      await this.initializeClobClient();

      this.authState = {
        isAuthenticated: true,
        address: credentials.apiKey,
        platform: 'POLYMARKET',
        authMethod: credentials.signatureType,
      };

      return this.authState;
    }

    // Otherwise, derive credentials from wallet
    if (!this.walletClient) {
      throw new Error('Wallet client required for authentication. Call setWalletClient() first.');
    }

    const [address] = await this.walletClient.getAddresses();
    if (!address) {
      throw new Error('No address available from wallet');
    }

    // Check for existing Safe wallet
    this.safeWallet = await this.safeService.getSafeWallet(address);

    // Determine signature type based on wallet setup
    const signatureType = this.safeWallet?.isActivated
      ? 'POLY_GNOSIS_SAFE'
      : 'EOA';

    // Create API credentials
    this.credentials = await this.authService.createApiCredentials(
      this.walletClient,
      signatureType
    );

    await this.initializeClobClient();

    this.authState = this.authService.createAuthState(address, this.credentials);

    return this.authState;
  }

  /**
   * Initialize the CLOB client
   */
  private async initializeClobClient(): Promise<void> {
    if (!this.credentials) {
      throw new Error('Credentials required');
    }

    // Initialize CLOB client without signer for read operations
    // Full signing will be done through order builder
    // Map our credentials format to CLOB client expected format
    const clobCreds = {
      key: this.credentials.apiKey,
      secret: this.credentials.apiSecret,
      passphrase: this.credentials.passphrase,
    };

    this.clobClient = new ClobClient(
      this.config.clobUrl!,
      this.config.chainId!,
      undefined, // Signer handled separately
      clobCreds as any // Type cast for credential format compatibility
    );

    // Initialize order builder as well
    await this.orderBuilder.initialize(this.credentials, this.walletClient || undefined);
  }

  /**
   * Type guard for Polymarket credentials
   */
  private isPolymarketCredentials(creds: AuthCredentials): creds is PolymarketCredentials {
    return creds.platform === 'POLYMARKET' && 'passphrase' in creds;
  }

  /**
   * Logout and clear state
   */
  async logout(): Promise<void> {
    await super.logout();
    this.clobClient = null;
    this.credentials = null;
    this.safeWallet = null;
  }

  // ============================================================================
  // Safe Wallet Methods
  // ============================================================================

  /**
   * Get the user's Safe wallet
   */
  async getSafeWallet(): Promise<PolymarketSafeWallet | null> {
    return this.safeWallet;
  }

  /**
   * Deploy a Safe wallet for the user
   */
  async deploySafe(): Promise<PolymarketSafeWallet> {
    if (!this.walletClient) {
      throw new Error('Wallet client required');
    }

    this.safeWallet = await this.safeService.deploySafe(this.walletClient);
    return this.safeWallet;
  }

  /**
   * Activate the Safe for Polymarket trading
   */
  async activateSafe(): Promise<boolean> {
    if (!this.walletClient || !this.safeWallet) {
      throw new Error('Wallet client and Safe wallet required');
    }

    const activated = await this.safeService.activateSafe(
      this.walletClient,
      this.safeWallet.address
    );

    if (activated) {
      this.safeWallet.isActivated = true;
    }

    return activated;
  }

  // ============================================================================
  // Order Methods
  // ============================================================================

  /**
   * Place an order
   */
  async placeOrder(request: UnifiedOrderRequest): Promise<UnifiedOrder> {
    this.ensureAuthenticated();

    if (!this.credentials) {
      throw new Error('Credentials required');
    }

    return this.orderBuilder.submitOrder(request, this.credentials);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    this.ensureAuthenticated();
    return this.orderBuilder.cancelOrder(orderId);
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(marketId?: string): Promise<number> {
    this.ensureAuthenticated();
    return this.orderBuilder.cancelAllOrders(marketId);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<UnifiedOrder | null> {
    this.ensureAuthenticated();
    return this.orderBuilder.getOrder(orderId);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(marketId?: string): Promise<UnifiedOrder[]> {
    this.ensureAuthenticated();
    return this.orderBuilder.getOpenOrders(marketId);
  }

  /**
   * Get order history
   */
  async getOrderHistory(_options?: OrderHistoryOptions): Promise<UnifiedOrder[]> {
    this.ensureAuthenticated();

    if (!this.clobClient) {
      throw new Error('CLOB client not initialized');
    }

    // TODO: Implement with CLOB client when API is available
    return [];
  }

  // ============================================================================
  // Position Methods
  // ============================================================================

  /**
   * Get all positions
   */
  async getPositions(): Promise<UnifiedPosition[]> {
    this.ensureAuthenticated();

    if (!this.clobClient) {
      throw new Error('CLOB client not initialized');
    }

    try {
      // Get balances which include position information
      // Using 'as any' to work around CLOB client type limitations
      const balances = await (this.clobClient as any).getBalanceAllowance({
        asset_type: 'CONDITIONAL',
      });

      // Map to unified positions
      return this.mapBalancesToPositions(balances);
    } catch (error) {
      console.error('Get positions error:', error);
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

  /**
   * Map balance response to positions
   */
  private mapBalancesToPositions(balances: unknown): UnifiedPosition[] {
    const positions: UnifiedPosition[] = [];
    const bal = balances as Record<string, unknown>;

    // Parse balance data - structure depends on CLOB API response
    if (Array.isArray(bal)) {
      for (const b of bal) {
        const item = b as Record<string, unknown>;
        if ((item.balance as number) > 0) {
          positions.push({
            platform: 'POLYMARKET',
            marketId: (item.asset_id || item.token_id || '') as string,
            outcome: ((item.outcome || 'YES') as string) === 'YES' ? 'YES' : 'NO',
            size: item.balance as number,
            averagePrice: 0, // Not available from balance endpoint
            currentPrice: 0, // Would need market data
            unrealizedPnl: 0,
            realizedPnl: 0,
            costBasis: 0,
            platformData: item,
          });
        }
      }
    }

    return positions;
  }

  // ============================================================================
  // Trade Methods
  // ============================================================================

  /**
   * Get trade history
   */
  async getTrades(_options?: TradeHistoryOptions): Promise<UnifiedTrade[]> {
    this.ensureAuthenticated();

    if (!this.clobClient) {
      throw new Error('CLOB client not initialized');
    }

    // TODO: Implement when CLOB client supports trade history
    return [];
  }

  // ============================================================================
  // Balance Methods
  // ============================================================================

  /**
   * Get all balances
   */
  async getBalances(): Promise<UnifiedBalance[]> {
    this.ensureAuthenticated();

    if (!this.clobClient) {
      throw new Error('CLOB client not initialized');
    }

    try {
      // Using 'as any' to work around CLOB client type limitations
      const client = this.clobClient as any;
      const [usdcBalance, collateralBalance] = await Promise.all([
        client.getBalanceAllowance({ asset_type: 'USDC' }),
        client.getBalanceAllowance({ asset_type: 'COLLATERAL' }),
      ]);

      const balances: UnifiedBalance[] = [];

      if (usdcBalance) {
        const usdc = usdcBalance as unknown as Record<string, number>;
        balances.push({
          platform: 'POLYMARKET',
          token: 'USDC',
          available: usdc.balance || 0,
          locked: 0, // Would need order data to calculate
          total: usdc.balance || 0,
          usdValue: usdc.balance || 0,
        });
      }

      if (collateralBalance) {
        const coll = collateralBalance as unknown as Record<string, number>;
        balances.push({
          platform: 'POLYMARKET',
          token: 'COLLATERAL',
          available: coll.balance || 0,
          locked: 0,
          total: coll.balance || 0,
        });
      }

      return balances;
    } catch (error) {
      console.error('Get balances error:', error);
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
    if (!this.clobClient) {
      // Can still get prices without auth
      return null;
    }

    try {
      const orderbook = await this.clobClient.getOrderBook(marketId);

      if (!orderbook) return null;

      const book = orderbook as unknown as { asks?: Array<{ price?: number }>; bids?: Array<{ price?: number }> };
      const outcomeStr = typeof outcome === 'number' ? (outcome === 0 ? 'YES' : 'NO') : outcome;

      // For YES outcome:
      // - BUY: look at asks (lowest ask)
      // - SELL: look at bids (highest bid)
      if (outcomeStr === 'YES') {
        if (side === 'BUY') {
          const asks = book.asks || [];
          const bestAsk = asks[0];
          if (!bestAsk || bestAsk.price == null) return null;
          return bestAsk.price;
        } else {
          const bids = book.bids || [];
          const bestBid = bids[0];
          if (!bestBid || bestBid.price == null) return null;
          return bestBid.price;
        }
      } else {
        // For NO, it's the complement
        if (side === 'BUY') {
          const bids = book.bids || [];
          const bestBid = bids[0];
          if (!bestBid || bestBid.price == null) return null;
          return 1 - bestBid.price;
        } else {
          const asks = book.asks || [];
          const bestAsk = asks[0];
          if (!bestAsk || bestAsk.price == null) return null;
          return 1 - bestAsk.price;
        }
      }
    } catch (error) {
      console.error('Get best price error:', error);
      return null;
    }
  }
}

/**
 * Factory function for creating Polymarket adapter
 */
export function createPolymarketAdapter(
  config: Record<string, unknown> = {}
): PolymarketTradingAdapter {
  return new PolymarketTradingAdapter(config as PolymarketAdapterOptions);
}

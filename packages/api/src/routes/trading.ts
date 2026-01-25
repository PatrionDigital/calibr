/**
 * Trading API Routes
 * Endpoints for trading on prediction markets (Polymarket, etc.)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import {
  getTradingAdapter,
  registerTradingAdapter,
  createPolymarketAdapter,
  createLimitlessAdapter,
  UnifiedOrderRequestSchema,
} from '@calibr/adapters';

// Register trading adapters on module load
registerTradingAdapter('POLYMARKET', createPolymarketAdapter);
registerTradingAdapter('LIMITLESS', createLimitlessAdapter);

export const tradingRoutes = new Hono();

// =============================================================================
// Request Validation Schemas
// =============================================================================

const AuthenticateSchema = z.object({
  platform: z.enum(['POLYMARKET', 'LIMITLESS', 'KALSHI']),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    passphrase: z.string().optional(),
    address: z.string().optional(), // For wallet-based auth (Limitless)
  }).optional(),
});

const PlaceOrderSchema = UnifiedOrderRequestSchema;

const CancelOrderSchema = z.object({
  orderId: z.string().min(1),
});

// In-memory session storage (replace with Redis in production)
const sessions = new Map<string, {
  platform: string;
  adapter: ReturnType<typeof getTradingAdapter>;
  createdAt: Date;
}>();

// =============================================================================
// Helper Functions
// =============================================================================

function getSessionId(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function getSession(sessionId: string | null) {
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

// =============================================================================
// Authentication Routes
// =============================================================================

/**
 * POST /trading/auth
 * Authenticate with a trading platform
 */
tradingRoutes.post('/auth', async (c) => {
  try {
    const body = await c.req.json();
    const { platform, credentials } = AuthenticateSchema.parse(body);

    // Get or create adapter
    const adapter = getTradingAdapter(platform as 'POLYMARKET' | 'LIMITLESS' | 'KALSHI');

    // Build credentials based on platform
    let authCredentials: Record<string, unknown> | undefined;

    if (platform === 'LIMITLESS' && credentials?.address) {
      // Limitless uses wallet-based auth
      authCredentials = {
        platform: 'LIMITLESS',
        address: credentials.address,
      };
    } else if (credentials) {
      // API key based auth (Polymarket, Kalshi)
      authCredentials = {
        platform,
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        passphrase: credentials.passphrase || '',
      };
    }

    // Authenticate
    const authState = await adapter.authenticate(authCredentials as any);

    if (!authState.isAuthenticated) {
      return c.json({
        success: false,
        error: 'Authentication failed',
      }, 401);
    }

    // Create session
    const sessionId = `${platform}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessions.set(sessionId, {
      platform,
      adapter,
      createdAt: new Date(),
    });

    return c.json({
      success: true,
      data: {
        sessionId,
        platform,
        address: authState.address,
        authMethod: authState.authMethod,
        expiresAt: authState.expiresAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Trading] Auth error:', error);

    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      }, 400);
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    }, 500);
  }
});

/**
 * POST /trading/logout
 * End trading session
 */
tradingRoutes.post('/logout', async (c) => {
  const sessionId = getSessionId(c);
  const session = getSession(sessionId);

  if (!session) {
    return c.json({
      success: false,
      error: 'No active session',
    }, 401);
  }

  await session.adapter.logout();
  sessions.delete(sessionId!);

  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * GET /trading/status
 * Get current trading session status
 */
tradingRoutes.get('/status', async (c) => {
  const sessionId = getSessionId(c);
  const session = getSession(sessionId);

  if (!session) {
    return c.json({
      success: true,
      data: {
        authenticated: false,
      },
    });
  }

  const authState = session.adapter.getAuthState();
  const isReady = await session.adapter.isReady();

  return c.json({
    success: true,
    data: {
      authenticated: authState?.isAuthenticated || false,
      platform: session.platform,
      address: authState?.address,
      isReady,
      sessionAge: Date.now() - session.createdAt.getTime(),
    },
  });
});

// =============================================================================
// Balance & Position Routes
// =============================================================================

/**
 * GET /trading/balances
 * Get account balances
 */
tradingRoutes.get('/balances', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  try {
    const balances = await session.adapter.getBalances();

    return c.json({
      success: true,
      data: { balances },
    });
  } catch (error) {
    console.error('[Trading] Get balances error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get balances',
    }, 500);
  }
});

/**
 * GET /trading/positions
 * Get all positions
 */
tradingRoutes.get('/positions', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  try {
    const positions = await session.adapter.getPositions();

    return c.json({
      success: true,
      data: { positions },
    });
  } catch (error) {
    console.error('[Trading] Get positions error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get positions',
    }, 500);
  }
});

/**
 * GET /trading/positions/:marketId
 * Get position for a specific market
 */
tradingRoutes.get('/positions/:marketId', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  const marketId = c.req.param('marketId');
  const outcome = c.req.query('outcome') as 'YES' | 'NO' | undefined;

  try {
    if (outcome) {
      const position = await session.adapter.getPosition(marketId, outcome);
      return c.json({
        success: true,
        data: { position },
      });
    }

    // Get both YES and NO positions
    const [yesPosition, noPosition] = await Promise.all([
      session.adapter.getPosition(marketId, 'YES'),
      session.adapter.getPosition(marketId, 'NO'),
    ]);

    return c.json({
      success: true,
      data: {
        positions: [yesPosition, noPosition].filter(Boolean),
      },
    });
  } catch (error) {
    console.error('[Trading] Get position error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get position',
    }, 500);
  }
});

// =============================================================================
// Order Routes
// =============================================================================

/**
 * POST /trading/orders
 * Place a new order
 */
tradingRoutes.post('/orders', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  try {
    const body = await c.req.json();
    const orderRequest = PlaceOrderSchema.parse(body);

    const order = await session.adapter.placeOrder(orderRequest);

    return c.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('[Trading] Place order error:', error);

    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid order request',
        details: error.errors,
      }, 400);
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to place order',
    }, 500);
  }
});

/**
 * GET /trading/orders
 * Get open orders
 */
tradingRoutes.get('/orders', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  const marketId = c.req.query('marketId');

  try {
    const orders = await session.adapter.getOpenOrders(marketId);

    return c.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('[Trading] Get orders error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get orders',
    }, 500);
  }
});

/**
 * GET /trading/orders/:orderId
 * Get a specific order
 */
tradingRoutes.get('/orders/:orderId', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  const orderId = c.req.param('orderId');

  try {
    const order = await session.adapter.getOrder(orderId);

    if (!order) {
      return c.json({
        success: false,
        error: 'Order not found',
      }, 404);
    }

    return c.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('[Trading] Get order error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get order',
    }, 500);
  }
});

/**
 * DELETE /trading/orders/:orderId
 * Cancel an order
 */
tradingRoutes.delete('/orders/:orderId', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  const orderId = c.req.param('orderId');

  try {
    const success = await session.adapter.cancelOrder(orderId);

    return c.json({
      success,
      message: success ? 'Order cancelled' : 'Failed to cancel order',
    });
  } catch (error) {
    console.error('[Trading] Cancel order error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel order',
    }, 500);
  }
});

/**
 * DELETE /trading/orders
 * Cancel all orders (optionally for a specific market)
 */
tradingRoutes.delete('/orders', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  const marketId = c.req.query('marketId');

  try {
    const cancelledCount = await session.adapter.cancelAllOrders(marketId);

    return c.json({
      success: true,
      data: {
        cancelledCount,
        marketId: marketId || 'all',
      },
    });
  } catch (error) {
    console.error('[Trading] Cancel all orders error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel orders',
    }, 500);
  }
});

// =============================================================================
// Trade History
// =============================================================================

/**
 * GET /trading/trades
 * Get trade history
 */
tradingRoutes.get('/trades', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  const query = c.req.query();
  const options = {
    marketId: query.marketId,
    limit: query.limit ? parseInt(query.limit) : undefined,
    offset: query.offset ? parseInt(query.offset) : undefined,
  };

  try {
    const trades = await session.adapter.getTrades(options);

    return c.json({
      success: true,
      data: { trades },
    });
  } catch (error) {
    console.error('[Trading] Get trades error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trades',
    }, 500);
  }
});

// =============================================================================
// Market Data for Trading
// =============================================================================

/**
 * GET /trading/price/:marketId
 * Get best price for trading
 */
tradingRoutes.get('/price/:marketId', async (c) => {
  const session = getSession(getSessionId(c));

  if (!session) {
    return c.json({
      success: false,
      error: 'Not authenticated',
    }, 401);
  }

  const marketId = c.req.param('marketId');
  const outcome = (c.req.query('outcome') || 'YES') as 'YES' | 'NO';
  const side = (c.req.query('side') || 'BUY') as 'BUY' | 'SELL';

  try {
    const price = await session.adapter.getBestPrice(marketId, outcome, side);

    return c.json({
      success: true,
      data: {
        marketId,
        outcome,
        side,
        price,
      },
    });
  } catch (error) {
    console.error('[Trading] Get price error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get price',
    }, 500);
  }
});

// =============================================================================
// Limitless API Proxy (to avoid CORS issues in browser)
// =============================================================================

/**
 * GET /trading/limitless/markets/:marketId
 * Proxy to Limitless API for market details
 */
tradingRoutes.get('/limitless/markets/:marketId', async (c) => {
  const marketId = c.req.param('marketId');

  try {
    const response = await fetch(`https://api.limitless.exchange/markets/${marketId}`);

    if (!response.ok) {
      return c.json({
        success: false,
        error: `Limitless API error: ${response.status}`,
      }, response.status as 400 | 404 | 500);
    }

    const data = await response.json();
    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Trading] Limitless proxy error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch from Limitless',
    }, 500);
  }
});

/**
 * POST /trading/limitless/orders
 * Proxy to Limitless API for submitting signed orders
 */
tradingRoutes.post('/limitless/orders', async (c) => {
  try {
    const body = await c.req.json();

    const response = await fetch('https://api.limitless.exchange/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.text();

    if (!response.ok) {
      return c.json({
        success: false,
        error: `Limitless API error: ${data}`,
      }, response.status as 400 | 404 | 500);
    }

    try {
      const jsonData = JSON.parse(data);
      return c.json({
        success: true,
        data: jsonData,
      });
    } catch {
      return c.json({
        success: true,
        data: { message: data },
      });
    }
  } catch (error) {
    console.error('[Trading] Limitless order proxy error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit order to Limitless',
    }, 500);
  }
});

// =============================================================================
// Available Platforms
// =============================================================================

/**
 * GET /trading/platforms
 * List available trading platforms
 */
tradingRoutes.get('/platforms', (c) => {
  return c.json({
    success: true,
    data: {
      platforms: [
        {
          id: 'POLYMARKET',
          name: 'Polymarket',
          status: 'available',
          features: ['limit_orders', 'market_orders', 'gasless'],
          requiresAuth: true,
          authMethods: ['api_key', 'wallet_signature'],
          chain: 'polygon',
        },
        {
          id: 'LIMITLESS',
          name: 'Limitless',
          status: 'available',
          features: ['limit_orders', 'gtc', 'fok'],
          requiresAuth: true,
          authMethods: ['wallet_signature'],
          chain: 'base',
        },
        {
          id: 'KALSHI',
          name: 'Kalshi',
          status: 'coming_soon',
          features: ['limit_orders', 'market_orders'],
          requiresAuth: true,
          authMethods: ['api_key'],
          chain: 'offchain',
        },
      ],
    },
  });
});

// =============================================================================
// Position Scanning (Read-Only Wallet Import)
// =============================================================================

import { positionScanner } from '../services/position-scanner';

const ScanWalletSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  platforms: z.array(z.enum(['POLYMARKET', 'LIMITLESS'])).optional(),
  includeResolved: z.boolean().optional().default(false),
});

/**
 * POST /trading/scan
 * Scan a wallet address for positions (no auth required)
 */
tradingRoutes.post('/scan', async (c) => {
  try {
    const body = await c.req.json();
    const { address, platforms, includeResolved } = ScanWalletSchema.parse(body);

    const result = await positionScanner.scanWallet(address, {
      platforms: platforms as ('POLYMARKET' | 'LIMITLESS')[] | undefined,
      includeResolved,
    });

    return c.json({
      success: true,
      data: {
        address: result.address,
        positions: result.positions.map(p => ({
          platform: p.platform,
          marketId: p.marketId,
          marketSlug: p.marketSlug,
          marketQuestion: p.marketQuestion,
          outcome: p.outcome,
          outcomeLabel: p.outcomeLabel,
          balance: p.balanceFormatted,
          currentPrice: p.currentPrice,
          estimatedValue: p.balanceFormatted * (p.currentPrice || 0),
          chainId: p.chainId,
        })),
        totalValue: result.totalValue,
        scanTimestamp: result.scanTimestamp.toISOString(),
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  } catch (error) {
    console.error('[Trading] Scan wallet error:', error);

    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      }, 400);
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan wallet',
    }, 500);
  }
});

/**
 * GET /trading/scan/:address
 * Quick scan for a wallet address
 */
tradingRoutes.get('/scan/:address', async (c) => {
  const address = c.req.param('address');
  const platformsParam = c.req.query('platforms');
  const includeResolved = c.req.query('includeResolved') === 'true';

  // Validate address
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return c.json({
      success: false,
      error: 'Invalid Ethereum address',
    }, 400);
  }

  try {
    const platforms = platformsParam
      ? platformsParam.split(',') as ('POLYMARKET' | 'LIMITLESS')[]
      : undefined;

    const result = await positionScanner.scanWallet(address, {
      platforms,
      includeResolved,
    });

    return c.json({
      success: true,
      data: {
        address: result.address,
        positionCount: result.positions.length,
        totalValue: result.totalValue,
        byPlatform: {
          LIMITLESS: result.positions.filter(p => p.platform === 'LIMITLESS').length,
          POLYMARKET: result.positions.filter(p => p.platform === 'POLYMARKET').length,
        },
        positions: result.positions.map(p => ({
          platform: p.platform,
          marketSlug: p.marketSlug,
          outcome: p.outcome,
          balance: p.balanceFormatted,
          currentPrice: p.currentPrice,
        })),
        scanTimestamp: result.scanTimestamp.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Trading] Scan wallet error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scan wallet',
    }, 500);
  }
});

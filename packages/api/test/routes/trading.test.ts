/**
 * Trading Routes Integration Tests
 * Tests trading API endpoints for order management and platform integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';

// Mock @calibr/adapters
vi.mock('@calibr/adapters', () => ({
  getTradingAdapter: vi.fn(),
  registerTradingAdapter: vi.fn(),
  createPolymarketAdapter: vi.fn(),
  createLimitlessAdapter: vi.fn(),
  UnifiedOrderRequestSchema: {
    parse: vi.fn((data) => data),
  },
}));

// Mock position scanner
vi.mock('../../src/services/position-scanner', () => ({
  positionScanner: {
    scanWallet: vi.fn(),
  },
}));

import { getTradingAdapter } from '@calibr/adapters';
import { positionScanner } from '../../src/services/position-scanner';
import { tradingRoutes } from '../../src/routes/trading';

const mockGetTradingAdapter = getTradingAdapter as ReturnType<typeof vi.fn>;
const mockPositionScanner = positionScanner as {
  scanWallet: ReturnType<typeof vi.fn>;
};

// Create mock adapter
const createMockAdapter = () => ({
  authenticate: vi.fn(),
  logout: vi.fn(),
  getAuthState: vi.fn(),
  isReady: vi.fn(),
  getBalances: vi.fn(),
  getPositions: vi.fn(),
  getPosition: vi.fn(),
  placeOrder: vi.fn(),
  getOpenOrders: vi.fn(),
  getOrder: vi.fn(),
  cancelOrder: vi.fn(),
  cancelAllOrders: vi.fn(),
  getTrades: vi.fn(),
  getBestPrice: vi.fn(),
});

// Create test app
const app = new Hono();
app.route('/trading', tradingRoutes);

describe('Trading Routes', () => {
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter = createMockAdapter();
    mockGetTradingAdapter.mockReturnValue(mockAdapter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // POST /trading/auth Tests
  // =============================================================================

  describe('POST /trading/auth', () => {
    it('should authenticate with valid credentials', async () => {
      mockAdapter.authenticate.mockResolvedValue({
        isAuthenticated: true,
        address: '0x123',
        authMethod: 'api_key',
      });

      const res = await app.request('/trading/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'POLYMARKET',
          credentials: {
            apiKey: 'test-key',
            apiSecret: 'test-secret',
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.platform).toBe('POLYMARKET');
      expect(data.data.sessionId).toBeDefined();
    });

    it('should return 401 when authentication fails', async () => {
      mockAdapter.authenticate.mockResolvedValue({
        isAuthenticated: false,
      });

      const res = await app.request('/trading/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'POLYMARKET',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication failed');
    });

    it('should return 400 for invalid platform', async () => {
      const res = await app.request('/trading/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'INVALID_PLATFORM',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request');
    });

    it('should authenticate with Limitless wallet-based auth', async () => {
      mockAdapter.authenticate.mockResolvedValue({
        isAuthenticated: true,
        address: '0xabc123',
        authMethod: 'wallet_signature',
      });

      const res = await app.request('/trading/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'LIMITLESS',
          credentials: {
            address: '0xabc123',
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.address).toBe('0xabc123');
    });
  });

  // =============================================================================
  // POST /trading/logout Tests
  // =============================================================================

  describe('POST /trading/logout', () => {
    it('should return 401 when no session', async () => {
      const res = await app.request('/trading/logout', {
        method: 'POST',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('No active session');
    });
  });

  // =============================================================================
  // GET /trading/status Tests
  // =============================================================================

  describe('GET /trading/status', () => {
    it('should return unauthenticated status when no session', async () => {
      const res = await app.request('/trading/status');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.authenticated).toBe(false);
    });
  });

  // =============================================================================
  // GET /trading/balances Tests
  // =============================================================================

  describe('GET /trading/balances', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/balances');

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // GET /trading/positions Tests
  // =============================================================================

  describe('GET /trading/positions', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/positions');

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // GET /trading/positions/:marketId Tests
  // =============================================================================

  describe('GET /trading/positions/:marketId', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/positions/m1');

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // POST /trading/orders Tests
  // =============================================================================

  describe('POST /trading/orders', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: 'm1',
          side: 'BUY',
          outcome: 'YES',
          amount: '100',
          price: 0.5,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // GET /trading/orders Tests
  // =============================================================================

  describe('GET /trading/orders', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/orders');

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // GET /trading/orders/:orderId Tests
  // =============================================================================

  describe('GET /trading/orders/:orderId', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/orders/order123');

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // DELETE /trading/orders/:orderId Tests
  // =============================================================================

  describe('DELETE /trading/orders/:orderId', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/orders/order123', {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // DELETE /trading/orders Tests
  // =============================================================================

  describe('DELETE /trading/orders', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/orders', {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // GET /trading/trades Tests
  // =============================================================================

  describe('GET /trading/trades', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/trades');

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // GET /trading/price/:marketId Tests
  // =============================================================================

  describe('GET /trading/price/:marketId', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/trading/price/m1');

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Not authenticated');
    });
  });

  // =============================================================================
  // GET /trading/platforms Tests
  // =============================================================================

  describe('GET /trading/platforms', () => {
    it('should return available platforms', async () => {
      const res = await app.request('/trading/platforms');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.platforms).toHaveLength(3);
      expect(data.data.platforms[0].id).toBe('POLYMARKET');
      expect(data.data.platforms[1].id).toBe('LIMITLESS');
      expect(data.data.platforms[2].id).toBe('KALSHI');
    });

    it('should include platform features and auth methods', async () => {
      const res = await app.request('/trading/platforms');

      const data = await res.json();
      const polymarket = data.data.platforms.find((p: { id: string }) => p.id === 'POLYMARKET');
      expect(polymarket.features).toContain('limit_orders');
      expect(polymarket.authMethods).toContain('api_key');
      expect(polymarket.chain).toBe('polygon');
    });
  });

  // =============================================================================
  // POST /trading/scan Tests
  // =============================================================================

  describe('POST /trading/scan', () => {
    it('should scan wallet for positions', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x1234567890123456789012345678901234567890',
        positions: [
          {
            platform: 'POLYMARKET',
            marketId: 'm1',
            marketSlug: 'test-market',
            marketQuestion: 'Will it happen?',
            outcome: 'YES',
            outcomeLabel: 'Yes',
            balanceFormatted: 100,
            currentPrice: 0.65,
            chainId: 137,
          },
        ],
        totalValue: 65,
        scanTimestamp: new Date(),
        errors: [],
      });

      const res = await app.request('/trading/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.positions).toHaveLength(1);
      expect(data.data.totalValue).toBe(65);
    });

    it('should return 400 for invalid address', async () => {
      const res = await app.request('/trading/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: 'invalid-address',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request');
    });

    it('should filter by platforms when specified', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x1234567890123456789012345678901234567890',
        positions: [],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      await app.request('/trading/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          platforms: ['POLYMARKET'],
        }),
      });

      expect(mockPositionScanner.scanWallet).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        expect.objectContaining({
          platforms: ['POLYMARKET'],
        })
      );
    });

    it('should include resolved positions when requested', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x1234567890123456789012345678901234567890',
        positions: [],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      await app.request('/trading/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          includeResolved: true,
        }),
      });

      expect(mockPositionScanner.scanWallet).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        expect.objectContaining({
          includeResolved: true,
        })
      );
    });
  });

  // =============================================================================
  // GET /trading/scan/:address Tests
  // =============================================================================

  describe('GET /trading/scan/:address', () => {
    it('should return 400 for invalid address format', async () => {
      const res = await app.request('/trading/scan/invalid');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid Ethereum address');
    });

    it('should scan wallet and return summary', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x1234567890123456789012345678901234567890',
        positions: [
          {
            platform: 'LIMITLESS',
            marketSlug: 'test',
            outcome: 'YES',
            balanceFormatted: 50,
            currentPrice: 0.7,
          },
        ],
        totalValue: 35,
        scanTimestamp: new Date(),
        errors: [],
      });

      const res = await app.request('/trading/scan/0x1234567890123456789012345678901234567890');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.positionCount).toBe(1);
      expect(data.data.totalValue).toBe(35);
      expect(data.data.byPlatform.LIMITLESS).toBe(1);
    });

    it('should parse platforms query parameter', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x1234567890123456789012345678901234567890',
        positions: [],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      await app.request('/trading/scan/0x1234567890123456789012345678901234567890?platforms=POLYMARKET,LIMITLESS');

      expect(mockPositionScanner.scanWallet).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        expect.objectContaining({
          platforms: ['POLYMARKET', 'LIMITLESS'],
        })
      );
    });
  });

  // =============================================================================
  // Limitless Proxy Routes (Basic Tests)
  // =============================================================================

  describe('GET /trading/limitless/markets/:marketId', () => {
    it('should proxy to Limitless API', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'm1', title: 'Test Market' }),
      });

      const res = await app.request('/trading/limitless/markets/test-market-id');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      global.fetch = originalFetch;
    });

    it('should handle Limitless API errors', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const res = await app.request('/trading/limitless/markets/non-existent');

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);

      global.fetch = originalFetch;
    });
  });

  describe('POST /trading/limitless/orders', () => {
    it('should proxy order to Limitless API', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ orderId: 'o1' })),
      });

      const res = await app.request('/trading/limitless/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId: 'm1', side: 'BUY' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      global.fetch = originalFetch;
    });

    it('should handle Limitless order errors', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid order'),
      });

      const res = await app.request('/trading/limitless/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);

      global.fetch = originalFetch;
    });
  });
});

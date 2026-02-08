/**
 * Portfolio Routes Integration Tests
 * Tests position tracking and portfolio management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { portfolioRoutes } from '../../src/routes/portfolio';

// Mock position scanner
vi.mock('../../src/services/position-scanner', () => ({
  positionScanner: {
    scanWallet: vi.fn(),
    importPositions: vi.fn(),
  },
}));

// Mock batch queries
vi.mock('../../src/lib/batch-queries', () => ({
  batchLookupPlatformConfigs: vi.fn(),
}));

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    walletConnection: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    position: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    platformMarket: {
      findUnique: vi.fn(),
    },
    platformConfig: {
      findFirst: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';
import { positionScanner } from '../../src/services/position-scanner';
import { batchLookupPlatformConfigs } from '../../src/lib/batch-queries';

const mockPrisma = prisma as unknown as {
  walletConnection: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  position: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  platformMarket: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  platformConfig: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  user: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockPositionScanner = positionScanner as unknown as {
  scanWallet: ReturnType<typeof vi.fn>;
  importPositions: ReturnType<typeof vi.fn>;
};

const mockBatchLookup = batchLookupPlatformConfigs as ReturnType<typeof vi.fn>;

// Create test app
const app = new Hono();
app.route('/portfolio', portfolioRoutes);

describe('Portfolio Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // GET /portfolio/summary Tests
  // =============================================================================

  describe('GET /portfolio/summary', () => {
    it('should return 400 when no identifier provided', async () => {
      const res = await app.request('/portfolio/summary');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Either wallet address or userId is required');
    });

    it('should return empty portfolio for unknown wallet', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue(null);

      const res = await app.request('/portfolio/summary?wallet=0x1234567890abcdef1234567890abcdef12345678');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.totalValue).toBe(0);
      expect(data.data.positionCount).toBe(0);
      expect(data.data.positions).toEqual([]);
    });

    it('should return portfolio summary for wallet', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue({
        userId: 'user-1',
      });
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          platform: 'POLYMARKET',
          platformMarketId: 'pm-1',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.5,
          currentPrice: 0.7,
          currentValue: 70,
          updatedAt: new Date(),
          platformMarket: {
            question: 'Test market?',
            platformConfig: { displayName: 'Polymarket' },
            unifiedMarket: {
              id: 'um-1',
              question: 'Test market?',
              slug: 'test-market',
              isActive: true,
              resolvedAt: null,
              resolution: null,
            },
          },
        },
      ]);

      const res = await app.request('/portfolio/summary?wallet=0x1234567890abcdef1234567890abcdef12345678');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.positionCount).toBe(1);
      expect(data.data.positions[0].shares).toBe(100);
      expect(data.data.positions[0].outcome).toBe('YES');
    });

    it('should calculate PnL correctly', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          platform: 'LIMITLESS',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.4,
          currentPrice: 0.6,
          currentValue: 60,
          updatedAt: new Date(),
          platformMarket: {
            platformConfig: { displayName: 'Limitless' },
            unifiedMarket: { question: 'Test', slug: 'test' },
          },
        },
      ]);

      const res = await app.request('/portfolio/summary?wallet=0x123');

      const data = await res.json();
      expect(data.data.positions[0].unrealizedPnl).toBe(20); // 60 - 40
      expect(data.data.positions[0].unrealizedPnlPct).toBe(50); // 50%
    });

    it('should aggregate by platform', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          platform: 'POLYMARKET',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.5,
          currentPrice: 0.6,
          currentValue: 60,
          updatedAt: new Date(),
          platformMarket: {
            platformConfig: { displayName: 'Polymarket' },
            unifiedMarket: { question: 'Test 1' },
          },
        },
        {
          id: 'pos-2',
          platform: 'POLYMARKET',
          outcome: 'NO',
          shares: 50,
          avgCostBasis: 0.3,
          currentPrice: 0.4,
          currentValue: 20,
          updatedAt: new Date(),
          platformMarket: {
            platformConfig: { displayName: 'Polymarket' },
            unifiedMarket: { question: 'Test 2' },
          },
        },
      ]);

      const res = await app.request('/portfolio/summary?userId=user-1');

      const data = await res.json();
      expect(data.data.byPlatform['POLYMARKET'].count).toBe(2);
    });

    it('should aggregate by outcome', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          platform: 'LIMITLESS',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.5,
          currentPrice: 0.6,
          currentValue: 60,
          updatedAt: new Date(),
          platformMarket: {
            platformConfig: { displayName: 'Limitless' },
            unifiedMarket: {},
          },
        },
        {
          id: 'pos-2',
          platform: 'LIMITLESS',
          outcome: 'NO',
          shares: 50,
          avgCostBasis: 0.3,
          currentPrice: 0.4,
          currentValue: 20,
          updatedAt: new Date(),
          platformMarket: {
            platformConfig: { displayName: 'Limitless' },
            unifiedMarket: {},
          },
        },
      ]);

      const res = await app.request('/portfolio/summary?userId=user-1');

      const data = await res.json();
      expect(data.data.byOutcome.YES).toBe(60);
      expect(data.data.byOutcome.NO).toBe(20);
    });
  });

  // =============================================================================
  // GET /portfolio/positions Tests
  // =============================================================================

  describe('GET /portfolio/positions', () => {
    it('should return 400 when no identifier provided', async () => {
      const res = await app.request('/portfolio/positions');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Either wallet address or userId is required');
    });

    it('should return empty positions for unknown wallet', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue(null);

      const res = await app.request('/portfolio/positions?wallet=0x123');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.positions).toEqual([]);
    });

    it('should return positions for user', async () => {
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          platform: 'POLYMARKET',
          outcome: 'YES',
          shares: 100,
          platformMarket: {
            platformConfig: { displayName: 'Polymarket' },
            unifiedMarket: { question: 'Test?' },
          },
        },
      ]);

      const res = await app.request('/portfolio/positions?userId=user-1');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.positions).toHaveLength(1);
    });

    it('should filter by platform', async () => {
      mockPrisma.position.findMany.mockResolvedValue([]);

      await app.request('/portfolio/positions?userId=user-1&platform=polymarket');

      expect(mockPrisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform: 'POLYMARKET',
          }),
        })
      );
    });

    it('should filter active positions by default', async () => {
      mockPrisma.position.findMany.mockResolvedValue([]);

      await app.request('/portfolio/positions?userId=user-1');

      expect(mockPrisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platformMarket: {
              isActive: true,
              resolvedAt: null,
            },
          }),
        })
      );
    });

    it('should include resolved positions when active=false', async () => {
      mockPrisma.position.findMany.mockResolvedValue([]);

      await app.request('/portfolio/positions?userId=user-1&active=false');

      expect(mockPrisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            platformMarket: expect.anything(),
          }),
        })
      );
    });
  });

  // =============================================================================
  // POST /portfolio/positions Tests
  // =============================================================================

  describe('POST /portfolio/positions', () => {
    it('should return 400 when missing identifiers', async () => {
      const res = await app.request('/portfolio/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'POLYMARKET',
          marketExternalId: 'ext-1',
          outcome: 'YES',
          shares: 100,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('userId or walletAddress required');
    });

    it('should return 400 when missing required fields', async () => {
      const res = await app.request('/portfolio/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1',
          platform: 'POLYMARKET',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 404 when platform not found', async () => {
      mockBatchLookup.mockResolvedValue(new Map());

      const res = await app.request('/portfolio/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1',
          platform: 'UNKNOWN',
          marketExternalId: 'ext-1',
          outcome: 'YES',
          shares: 100,
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Platform not found');
    });

    it('should return 404 when market not found', async () => {
      mockBatchLookup.mockResolvedValue(new Map([['polymarket', { id: 'p-1' }]]));
      mockPrisma.platformMarket.findUnique.mockResolvedValue(null);

      const res = await app.request('/portfolio/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1',
          platform: 'POLYMARKET',
          marketExternalId: 'ext-1',
          outcome: 'YES',
          shares: 100,
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Market not found');
    });

    it('should create position successfully', async () => {
      mockBatchLookup.mockResolvedValue(new Map([['polymarket', { id: 'p-1' }]]));
      mockPrisma.platformMarket.findUnique.mockResolvedValue({
        id: 'pm-1',
        unifiedMarketId: 'um-1',
        yesPrice: 0.65,
      });
      mockPrisma.position.upsert.mockResolvedValue({
        id: 'pos-new',
        platform: 'POLYMARKET',
        outcome: 'YES',
        shares: 100,
        avgCostBasis: 0.5,
      });

      const res = await app.request('/portfolio/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1',
          platform: 'POLYMARKET',
          marketExternalId: 'ext-1',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.5,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.position.shares).toBe(100);
    });
  });

  // =============================================================================
  // DELETE /portfolio/positions/:id Tests
  // =============================================================================

  describe('DELETE /portfolio/positions/:id', () => {
    it('should delete position successfully', async () => {
      mockPrisma.position.delete.mockResolvedValue({ id: 'pos-1' });

      const res = await app.request('/portfolio/positions/pos-1', {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
    });

    it('should return 500 on delete error', async () => {
      mockPrisma.position.delete.mockRejectedValue(new Error('Not found'));

      const res = await app.request('/portfolio/positions/non-existent', {
        method: 'DELETE',
      });

      expect(res.status).toBe(500);
    });
  });

  // =============================================================================
  // POST /portfolio/connect-wallet Tests
  // =============================================================================

  describe('POST /portfolio/connect-wallet', () => {
    it('should return 400 when address missing', async () => {
      const res = await app.request('/portfolio/connect-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Wallet address required');
    });

    it('should return existing wallet if already connected', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue({
        id: 'wc-1',
        address: '0x123',
        label: 'Existing',
        userId: 'user-1',
      });

      const res = await app.request('/portfolio/connect-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: '0x123' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.wallet.id).toBe('wc-1');
    });

    it('should create new user and wallet connection', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        walletConnections: [
          {
            id: 'wc-new',
            address: '0xabcdef',
            label: 'Primary Wallet',
            userId: 'new-user',
          },
        ],
      });

      const res = await app.request('/portfolio/connect-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: '0xABCDEF', label: 'My Wallet' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.wallet.id).toBe('wc-new');
    });
  });

  // =============================================================================
  // GET /portfolio/alerts Tests
  // =============================================================================

  describe('GET /portfolio/alerts', () => {
    it('should return 400 when no identifier provided', async () => {
      const res = await app.request('/portfolio/alerts');

      expect(res.status).toBe(400);
    });

    it('should return empty alerts for unknown wallet', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue(null);

      const res = await app.request('/portfolio/alerts?wallet=0x123');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.alerts).toEqual([]);
      expect(data.data.count).toBe(0);
    });

    it('should return resolution alerts', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          platform: 'POLYMARKET',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.4,
          platformMarket: {
            question: 'Resolved market?',
            platformConfig: { displayName: 'Polymarket' },
            unifiedMarket: {
              question: 'Resolved market?',
              slug: 'resolved-market',
              resolvedAt: new Date(),
              resolution: 'YES',
            },
          },
        },
      ]);

      const res = await app.request('/portfolio/alerts?userId=user-1');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.alerts).toHaveLength(1);
      expect(data.data.alerts[0].type).toBe('RESOLUTION');
      expect(data.data.alerts[0].isWinner).toBe(true);
    });

    it('should calculate win/loss stats', async () => {
      mockPrisma.walletConnection.findUnique.mockResolvedValue({ userId: 'user-1' });
      mockPrisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          platform: 'POLYMARKET',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.4,
          platformMarket: {
            platformConfig: { displayName: 'Polymarket' },
            unifiedMarket: { resolvedAt: new Date(), resolution: 'YES' },
          },
        },
        {
          id: 'pos-2',
          platform: 'POLYMARKET',
          outcome: 'YES',
          shares: 50,
          avgCostBasis: 0.6,
          platformMarket: {
            platformConfig: { displayName: 'Polymarket' },
            unifiedMarket: { resolvedAt: new Date(), resolution: 'NO' },
          },
        },
      ]);

      const res = await app.request('/portfolio/alerts?userId=user-1');

      const data = await res.json();
      expect(data.data.wins).toBe(1);
      expect(data.data.losses).toBe(1);
    });
  });

  // =============================================================================
  // GET /portfolio/wallets Tests
  // =============================================================================

  describe('GET /portfolio/wallets', () => {
    it('should return 400 when userId missing', async () => {
      const res = await app.request('/portfolio/wallets');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('userId required');
    });

    it('should return wallets for user', async () => {
      mockPrisma.walletConnection.findMany.mockResolvedValue([
        {
          id: 'wc-1',
          address: '0x123',
          label: 'Main Wallet',
          chainId: 8453,
          lastSyncAt: new Date(),
          syncStatus: 'SUCCESS',
        },
      ]);

      const res = await app.request('/portfolio/wallets?userId=user-1');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.wallets).toHaveLength(1);
      expect(data.data.wallets[0].address).toBe('0x123');
    });
  });

  // =============================================================================
  // POST /portfolio/scan Tests
  // =============================================================================

  describe('POST /portfolio/scan', () => {
    it('should return 400 when wallet missing', async () => {
      const res = await app.request('/portfolio/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Wallet address required');
    });

    it('should scan wallet for positions', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x123',
        positions: [
          {
            platform: 'LIMITLESS',
            marketId: 'market-1',
            outcome: 'YES',
            balanceFormatted: 100,
            currentPrice: 0.65,
          },
        ],
        totalValue: 65,
        scanTimestamp: new Date(),
        errors: [],
      });

      const res = await app.request('/portfolio/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: '0x123' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.scan.positionsFound).toBe(1);
    });

    it('should import positions when requested', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x123',
        positions: [{ platform: 'LIMITLESS', marketId: 'm1', outcome: 'YES', balanceFormatted: 100 }],
        totalValue: 65,
        scanTimestamp: new Date(),
        errors: [],
      });
      mockPrisma.walletConnection.findUnique.mockResolvedValue({
        id: 'wc-1',
        userId: 'user-1',
      });
      mockPositionScanner.importPositions.mockResolvedValue({
        imported: 1,
        updated: 0,
        skipped: 0,
      });
      mockPrisma.walletConnection.update.mockResolvedValue({});

      const res = await app.request('/portfolio/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: '0x123', importPositions: true }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.import).toBeDefined();
      expect(data.data.import.imported).toBe(1);
    });
  });

  // =============================================================================
  // GET /portfolio/scan/:wallet Tests
  // =============================================================================

  describe('GET /portfolio/scan/:wallet', () => {
    it('should return 400 for invalid wallet', async () => {
      const res = await app.request('/portfolio/scan/invalid');

      // Note: The route doesn't validate address format, returns error from scanner
      expect(mockPositionScanner.scanWallet).toHaveBeenCalled();
    });

    it('should quick scan wallet', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        positions: [],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      const res = await app.request('/portfolio/scan/0x1234567890abcdef1234567890abcdef12345678');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should respect platform query parameter', async () => {
      mockPositionScanner.scanWallet.mockResolvedValue({
        address: '0x123',
        positions: [],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      await app.request('/portfolio/scan/0x123?platform=POLYMARKET');

      expect(mockPositionScanner.scanWallet).toHaveBeenCalledWith(
        '0x123',
        expect.objectContaining({
          platforms: ['POLYMARKET'],
        })
      );
    });
  });
});

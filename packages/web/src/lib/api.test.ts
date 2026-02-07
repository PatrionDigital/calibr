/**
 * API Client Tests
 *
 * Tests for the Calibr API client:
 * - Request formatting
 * - Response parsing
 * - Error handling
 * - Markets API
 * - Portfolio API
 * - Forecasts API
 * - Attestations API
 * - Sync API
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  api,
  type UnifiedMarket,
  type MarketsResponse,
  type PortfolioSummary,
  type Forecast,
  type ForecastsResponse,
  type SyncStatus,
  type Attestation,
} from './api';

// =============================================================================
// Mocks
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to match URLs regardless of base
function expectUrlContaining(path: string) {
  return expect.stringContaining(path);
}

function createMockResponse<T>(data: T, success = true, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ success, data, error: success ? undefined : 'Test error' }),
  });
}

function createErrorResponse(message: string, status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ success: false, error: message }),
  });
}

// =============================================================================
// Sample Data
// =============================================================================

const sampleMarket: UnifiedMarket = {
  id: 'market-123',
  question: 'Will it rain tomorrow?',
  description: 'A test market',
  slug: 'will-it-rain-tomorrow',
  category: 'Weather',
  bestYesPrice: 0.65,
  bestNoPrice: 0.35,
  bestYesPlatform: 'polymarket',
  bestNoPlatform: 'polymarket',
  totalVolume: 10000,
  totalLiquidity: 5000,
  currentSpread: 0.02,
  isActive: true,
  closesAt: '2024-12-31T00:00:00.000Z',
  resolvedAt: null,
  resolution: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T12:00:00.000Z',
};

const sampleForecast: Forecast = {
  id: 'forecast-123',
  probability: 0.75,
  confidence: 0.8,
  commitMessage: 'Based on weather data',
  isPublic: true,
  kellyFraction: 0.5,
  recommendedSize: 100,
  executeRebalance: false,
  marketYesPrice: 0.65,
  marketNoPrice: 0.35,
  easAttestationUid: null,
  easAttestedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T12:00:00.000Z',
  unifiedMarket: {
    id: 'market-123',
    question: 'Will it rain tomorrow?',
    bestYesPrice: 0.65,
    bestNoPrice: 0.35,
  },
};

// =============================================================================
// Tests
// =============================================================================

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request formatting', () => {
    it('includes Content-Type header', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({ markets: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } })
      );

      await api.getMarkets();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('sends POST body as JSON', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ wallet: { id: '1', address: '0x123', label: null, userId: 'u1' } }));

      await api.connectWallet('0x123', 'My Wallet');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/portfolio/connect-wallet'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ address: '0x123', label: 'My Wallet' }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('throws error for non-ok response', async () => {
      mockFetch.mockImplementation(() => createErrorResponse('Not found', 404));

      await expect(api.getMarket('nonexistent')).rejects.toThrow('Not found');
    });

    it('throws error when success is false', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: false, error: 'Validation failed' }),
        })
      );

      await expect(api.getMarkets()).rejects.toThrow('Validation failed');
    });

    it('handles network errors', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      await expect(api.getMarkets()).rejects.toThrow('Network error');
    });

    it('handles malformed JSON response', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error('Invalid JSON')),
        })
      );

      await expect(api.getMarkets()).rejects.toThrow();
    });
  });

  describe('Markets API', () => {
    describe('getMarkets', () => {
      it('fetches markets without params', async () => {
        const response: MarketsResponse = {
          markets: [sampleMarket],
          pagination: { total: 1, limit: 20, offset: 0, hasMore: false },
        };
        mockFetch.mockImplementation(() => createMockResponse(response));

        const result = await api.getMarkets();

        expect(result.markets).toHaveLength(1);
        expect(result.markets[0]?.question).toBe('Will it rain tomorrow?');
        expect(mockFetch).toHaveBeenCalledWith(expectUrlContaining('/api/markets'), expect.any(Object));
      });

      it('includes pagination params', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({ markets: [], pagination: { total: 0, limit: 10, offset: 20, hasMore: false } })
        );

        await api.getMarkets({ limit: 10, offset: 20 });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('offset=20'),
          expect.any(Object)
        );
      });

      it('includes filter params', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({ markets: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } })
        );

        await api.getMarkets({ category: 'Politics', search: 'election', active: true });

        const call = mockFetch.mock.calls[0][0];
        expect(call).toContain('category=Politics');
        expect(call).toContain('search=election');
        expect(call).toContain('active=true');
      });
    });

    describe('getMarket', () => {
      it('fetches single market by id', async () => {
        mockFetch.mockImplementation(() => createMockResponse(sampleMarket));

        const result = await api.getMarket('market-123');

        expect(result.id).toBe('market-123');
        expect(result.question).toBe('Will it rain tomorrow?');
        expect(mockFetch).toHaveBeenCalledWith(expectUrlContaining('/api/markets/market-123'), expect.any(Object));
      });
    });

    describe('getMarketPrices', () => {
      it('fetches price history', async () => {
        const prices = [
          { id: 'p1', timestamp: '2024-01-01T00:00:00Z', yesPrice: 0.6, noPrice: 0.4, volume: 100, liquidity: 500, bestBid: 0.59, bestAsk: 0.61, spread: 0.02, platform: 'polymarket' },
        ];
        mockFetch.mockImplementation(() => createMockResponse(prices));

        const result = await api.getMarketPrices('market-123', 50);

        expect(result).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledWith(expectUrlContaining('/api/markets/market-123/prices?limit=50'), expect.any(Object));
      });
    });

    describe('searchMarkets', () => {
      it('searches markets by query', async () => {
        mockFetch.mockImplementation(() => createMockResponse([sampleMarket]));

        const result = await api.searchMarkets('rain');

        expect(result).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledWith(expectUrlContaining('/api/markets/search?q=rain'), expect.any(Object));
      });

      it('URL encodes search query', async () => {
        mockFetch.mockImplementation(() => createMockResponse([]));

        await api.searchMarkets('will it rain?');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('q=will%20it%20rain%3F'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Portfolio API', () => {
    describe('getPortfolioSummary', () => {
      it('fetches portfolio by wallet', async () => {
        const summary: PortfolioSummary = {
          totalValue: 1000,
          totalCost: 800,
          unrealizedPnl: 200,
          unrealizedPnlPct: 25,
          positionCount: 5,
          positions: [],
          byPlatform: {},
          byOutcome: { YES: 600, NO: 400, OTHER: 0 },
        };
        mockFetch.mockImplementation(() => createMockResponse(summary));

        const result = await api.getPortfolioSummary({ wallet: '0x123' });

        expect(result.totalValue).toBe(1000);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('wallet=0x123'),
          expect.any(Object)
        );
      });

      it('fetches portfolio by userId', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({ totalValue: 0, totalCost: 0, unrealizedPnl: 0, unrealizedPnlPct: 0, positionCount: 0, positions: [], byPlatform: {}, byOutcome: { YES: 0, NO: 0, OTHER: 0 } })
        );

        await api.getPortfolioSummary({ userId: 'user-123' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('userId=user-123'),
          expect.any(Object)
        );
      });
    });

    describe('connectWallet', () => {
      it('connects wallet with label', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({ wallet: { id: 'w1', address: '0x123', label: 'Main', userId: 'u1' } })
        );

        const result = await api.connectWallet('0x123', 'Main');

        expect(result.wallet.address).toBe('0x123');
        expect(result.wallet.label).toBe('Main');
      });
    });

    describe('addPosition', () => {
      it('adds position with all params', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            position: {
              id: 'pos-1',
              platform: 'polymarket',
              platformName: 'Polymarket',
              marketId: 'm1',
              marketQuestion: 'Test?',
              outcome: 'YES',
              shares: 100,
              avgCostBasis: 0.5,
              currentPrice: 0.6,
              currentValue: 60,
              unrealizedPnl: 10,
              unrealizedPnlPct: 20,
              isResolved: false,
              resolution: null,
              updatedAt: '2024-01-01',
            },
          })
        );

        await api.addPosition({
          platform: 'polymarket',
          marketExternalId: 'ext-123',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.5,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/portfolio/positions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('polymarket'),
          })
        );
      });
    });

    describe('deletePosition', () => {
      it('deletes position by id', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ deleted: true }));

        const result = await api.deletePosition('pos-123');

        expect(result.deleted).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/portfolio/positions/pos-123'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    describe('scanWallet', () => {
      it('scans wallet for positions', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            scan: { address: '0x123', positionsFound: 2, totalValue: 100, scanTimestamp: '2024-01-01', errors: [] },
            positions: [],
          })
        );

        const result = await api.scanWallet('0x123');

        expect(result.scan.positionsFound).toBe(2);
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/portfolio/scan'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('scans with custom platforms', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            scan: { address: '0x123', positionsFound: 0, totalValue: 0, scanTimestamp: '2024-01-01', errors: [] },
            positions: [],
          })
        );

        await api.scanWallet('0x123', { platforms: ['POLYMARKET', 'LIMITLESS'] });

        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/portfolio/scan'),
          expect.objectContaining({
            body: expect.stringContaining('POLYMARKET'),
          })
        );
      });
    });
  });

  describe('Forecasts API', () => {
    describe('getForecasts', () => {
      it('fetches forecasts list', async () => {
        const response: ForecastsResponse = {
          forecasts: [sampleForecast],
          total: 1,
          limit: 20,
          offset: 0,
        };
        mockFetch.mockImplementation(() => createMockResponse(response));

        const result = await api.getForecasts();

        expect(result.forecasts).toHaveLength(1);
        expect(result.forecasts[0]?.probability).toBe(0.75);
      });

      it('includes market filter', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({ forecasts: [], total: 0, limit: 20, offset: 0 })
        );

        await api.getForecasts({ marketId: 'market-123' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('marketId=market-123'),
          expect.any(Object)
        );
      });

      it('includes private flag', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({ forecasts: [], total: 0, limit: 20, offset: 0 })
        );

        await api.getForecasts({ includePrivate: true });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('includePrivate=true'),
          expect.any(Object)
        );
      });
    });

    describe('createForecast', () => {
      it('creates forecast with required params', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            forecast: sampleForecast,
            calculated: { edge: 0.1, edgePercentage: 10, hasPositiveEdge: true, priceChange: null },
          })
        );

        const result = await api.createForecast({
          unifiedMarketId: 'market-123',
          probability: 0.75,
        });

        expect(result.forecast.probability).toBe(0.75);
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/forecasts'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('0.75'),
          })
        );
      });

      it('creates forecast with optional params', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            forecast: sampleForecast,
            calculated: { edge: 0.1, edgePercentage: 10, hasPositiveEdge: true, priceChange: null },
          })
        );

        await api.createForecast({
          unifiedMarketId: 'market-123',
          probability: 0.75,
          confidence: 0.8,
          commitMessage: 'My reasoning',
          isPublic: true,
          kellyFraction: 0.5,
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.confidence).toBe(0.8);
        expect(body.commitMessage).toBe('My reasoning');
        expect(body.isPublic).toBe(true);
      });
    });

    describe('updateForecast', () => {
      it('updates forecast probability', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            forecast: { ...sampleForecast, probability: 0.8 },
            calculated: { edge: 0.15, edgePercentage: 15, hasPositiveEdge: true, priceChange: 0.05 },
          })
        );

        const result = await api.updateForecast('forecast-123', { probability: 0.8 });

        expect(result.forecast.probability).toBe(0.8);
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/forecasts/forecast-123'),
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    describe('deleteForecast', () => {
      it('deletes forecast', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ success: true }));

        const result = await api.deleteForecast('forecast-123');

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/forecasts/forecast-123'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    describe('getForecastStats', () => {
      it('fetches user forecast stats', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            totalForecasts: 50,
            publicForecasts: 40,
            privateForecasts: 10,
            attestedForecasts: 25,
            averageEdge: 0.05,
            recentForecasts: [],
          })
        );

        const result = await api.getForecastStats();

        expect(result.totalForecasts).toBe(50);
        expect(result.attestedForecasts).toBe(25);
      });
    });

    describe('recordAttestation', () => {
      it('records attestation for forecast', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            forecast: { id: 'f1', probability: 0.75, easAttestationUid: '0xabc', easAttestedAt: '2024-01-01' },
            attestation: { uid: '0xabc', txHash: '0xdef', chainId: 84532, easScanUrl: 'https://example.com' },
          })
        );

        const result = await api.recordAttestation('forecast-123', {
          attestationUid: '0xabc',
          txHash: '0xdef',
          chainId: 84532,
        });

        expect(result.attestation.uid).toBe('0xabc');
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/forecasts/forecast-123/attest'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  describe('Attestations API', () => {
    describe('getAttestations', () => {
      it('fetches attestations list', async () => {
        const attestation: Attestation = {
          id: 'a1',
          uid: '0x123',
          schemaUid: '0xschema',
          schemaName: 'Forecast',
          chainId: 84532,
          txHash: '0xtx',
          attester: '0xattester',
          recipient: '0xrecipient',
          data: {},
          userId: 'u1',
          isOffchain: false,
          isPrivate: false,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        };
        mockFetch.mockImplementation(() =>
          createMockResponse({ attestations: [attestation], total: 1, limit: 20, offset: 0 })
        );

        const result = await api.getAttestations();

        expect(result.attestations).toHaveLength(1);
        expect(result.attestations[0]?.uid).toBe('0x123');
      });

      it('filters by type', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({ attestations: [], total: 0, limit: 20, offset: 0 })
        );

        await api.getAttestations({ type: 'offchain' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('type=offchain'),
          expect.any(Object)
        );
      });
    });

    describe('storeOffchainAttestation', () => {
      it('stores offchain attestation', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            id: 'a1',
            uid: '0x123',
            schemaUid: '0xschema',
            schemaName: 'Forecast',
            chainId: 84532,
            txHash: null,
            attester: '0xattester',
            recipient: '0xrecipient',
            data: {},
            userId: 'u1',
            isOffchain: true,
            isPrivate: false,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          })
        );

        const result = await api.storeOffchainAttestation({
          uid: '0x123',
          signature: '0xsig',
          schemaUid: '0xschema',
          recipient: '0xrecipient',
          timestamp: 1704067200,
          data: { probability: 0.75 },
        });

        expect(result.isOffchain).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/attestations/offchain'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('verifySelectiveProof', () => {
      it('verifies merkle proof', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({
            verified: true,
            attestationFound: true,
            attestation: {
              uid: '0x123',
              schemaName: 'Forecast',
              createdAt: '2024-01-01',
              attester: '0xattester',
              recipient: '0xrecipient',
            },
          })
        );

        const result = await api.verifySelectiveProof({
          merkleRoot: '0xroot',
          revealedFields: [{ name: 'probability', value: 0.75, proof: ['0xproof1'] }],
        });

        expect(result.verified).toBe(true);
        expect(result.attestationFound).toBe(true);
      });
    });
  });

  describe('Sync API', () => {
    describe('getSyncStatus', () => {
      it('fetches sync status', async () => {
        const status: SyncStatus = {
          scheduler: {
            isRunning: true,
            marketSyncRunning: false,
            priceSyncRunning: false,
            lastMarketSync: '2024-01-01T00:00:00Z',
            lastPriceSync: '2024-01-01T00:05:00Z',
            marketSyncCount: 100,
            priceSyncCount: 500,
            errors: [],
          },
          health: {
            scheduler: true,
            polymarket: { healthy: true, details: { polymarketApi: true, database: true } },
            stats: { totalMarkets: 1000, activeMarkets: 500, lastSync: '2024-01-01', recentErrors: 0 },
          },
        };
        mockFetch.mockImplementation(() => createMockResponse(status));

        const result = await api.getSyncStatus();

        expect(result.scheduler.isRunning).toBe(true);
        expect(result.health.scheduler).toBe(true);
      });
    });

    describe('startSync', () => {
      it('starts sync scheduler', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ message: 'Sync started' }));

        const result = await api.startSync();

        expect(result.message).toBe('Sync started');
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/sync/start'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('stopSync', () => {
      it('stops sync scheduler', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ message: 'Sync stopped' }));

        const result = await api.stopSync();

        expect(result.message).toBe('Sync stopped');
        expect(mockFetch).toHaveBeenCalledWith(
          expectUrlContaining('/api/sync/stop'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('triggerMarketSync', () => {
      it('triggers market sync', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ message: 'Market sync triggered' }));

        const result = await api.triggerMarketSync();

        expect(result.message).toBe('Market sync triggered');
      });
    });
  });

  describe('Health API', () => {
    describe('getHealth', () => {
      it('fetches health status', async () => {
        mockFetch.mockImplementation(() =>
          createMockResponse({ status: 'healthy', database: 'connected', scheduler: 'running' })
        );

        const result = await api.getHealth();

        expect(result.status).toBe('healthy');
        expect(mockFetch).toHaveBeenCalledWith(expectUrlContaining('/health'), expect.any(Object));
      });
    });
  });
});

/**
 * API client for Calibr backend
 * Uses relative URLs to go through Next.js proxy (see next.config.mjs rewrites)
 * This avoids CORS issues and browser extension interference
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Market type - binary (YES/NO) or multi-outcome
 */
export type MarketType = 'BINARY' | 'MULTIPLE_CHOICE' | 'SCALAR';

/**
 * Individual outcome for a market
 */
export interface MarketOutcome {
  /** Index of this outcome (0-based) */
  index: number;
  /** Display label (e.g., 'Yes', 'No', 'Candidate A') */
  label: string;
  /** Current probability/price (0-1) */
  price: number;
  /** Platform-specific token ID for this outcome */
  tokenId?: string;
  /** Whether this outcome won (null if not resolved) */
  isWinner?: boolean | null;
}

export interface UnifiedMarket {
  id: string;
  question: string;
  description: string | null;
  slug: string;
  category: string | null;
  /** @deprecated Use outcomes for multi-outcome markets */
  bestYesPrice: number | null;
  /** @deprecated Use outcomes for multi-outcome markets */
  bestNoPrice: number | null;
  bestYesPlatform: string | null;
  bestNoPlatform: string | null;
  totalVolume: number;
  totalLiquidity: number;
  currentSpread: number | null;
  isActive: boolean;
  closesAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  platformMarkets?: PlatformMarket[];
}

export interface PlatformMarket {
  id: string;
  externalId: string;
  url: string | null;
  yesPrice: number | null;
  noPrice: number | null;
  volume: number;
  liquidity: number;
  isActive: boolean;
  closesAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  /** Platform configuration with name and slug */
  platformConfig?: {
    name: string;
    slug: string;
  };
  /** Platform-specific data including market type and outcomes */
  platformData?: {
    marketType?: string;
    outcomes?: MarketOutcome[];
    [key: string]: unknown;
  };
}

export interface PriceSnapshot {
  id: string;
  timestamp: string;
  yesPrice: number | null;
  noPrice: number | null;
  volume: number | null;
  liquidity: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  platform: string;
}

export interface SyncStatus {
  scheduler: {
    isRunning: boolean;
    marketSyncRunning: boolean;
    priceSyncRunning: boolean;
    lastMarketSync: string | null;
    lastPriceSync: string | null;
    marketSyncCount: number;
    priceSyncCount: number;
    errors: Array<{ timestamp: string; type: string; message: string }>;
  };
  health: {
    scheduler: boolean;
    polymarket: {
      healthy: boolean;
      details: {
        polymarketApi: boolean;
        database: boolean;
      };
    };
    stats: {
      totalMarkets: number;
      activeMarkets: number;
      lastSync: string | null;
      recentErrors: number;
    };
  };
}

export interface SyncStats {
  totalMarkets: number;
  activeMarkets: number;
  lastSync: string | null;
  recentErrors: number;
}

export interface MarketsResponse {
  markets: UnifiedMarket[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// =============================================================================
// Portfolio Types
// =============================================================================

export interface PortfolioPosition {
  id: string;
  platform: string;
  platformName: string;
  marketId: string;
  marketQuestion: string;
  marketSlug?: string;
  outcome: string;
  shares: number;
  avgCostBasis: number;
  currentPrice: number | null;
  currentValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  isResolved: boolean;
  resolution: string | null;
  updatedAt: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  positionCount: number;
  positions: PortfolioPosition[];
  byPlatform: Record<string, { value: number; cost: number; count: number }>;
  byOutcome: { YES: number; NO: number; OTHER: number };
}

export interface PositionTrade {
  id: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  fees: number;
  timestamp: string;
  txHash?: string;
}

export interface ConnectedWallet {
  id: string;
  address: string;
  label: string | null;
  userId: string;
}

export interface ResolutionAlert {
  id: string;
  type: 'RESOLUTION';
  marketQuestion: string;
  marketSlug?: string;
  platform: string;
  platformName: string;
  outcome: string;
  resolution: string | null;
  isWinner: boolean;
  shares: number;
  avgCostBasis: number;
  payout: number;
  realizedPnl: number;
  realizedPnlPct: number;
  resolvedAt: string | null;
}

export interface AlertsResponse {
  alerts: ResolutionAlert[];
  count: number;
  wins: number;
  losses: number;
  totalRealizedPnl: number;
}

// =============================================================================
// Position Scan Types
// =============================================================================

export interface ScannedPosition {
  platform: string;
  marketId: string;
  marketSlug: string;
  marketQuestion: string;
  outcome: string;
  outcomeLabel: string;
  balance: string;
  balanceFormatted: number;
  tokenAddress: string;
  tokenId?: string;
  currentPrice?: number;
  costBasis?: number;
  unrealizedPnl?: number;
  chainId: number;
}

export interface WalletScanResult {
  address: string;
  positions: ScannedPosition[];
  positionsFound: number;
  totalValue: number;
  scanTimestamp: string;
  errors: string[];
}

export interface WalletScanResponse {
  scan: {
    address: string;
    positionsFound: number;
    totalValue: number;
    scanTimestamp: string;
    errors: string[];
  };
  positions: ScannedPosition[];
  import?: {
    imported: number;
    errors: string[];
  };
}

// =============================================================================
// Forecast Types
// =============================================================================

export interface Forecast {
  id: string;
  probability: number;
  confidence: number;
  commitMessage: string | null;
  isPublic: boolean;
  kellyFraction: number;
  recommendedSize: number | null;
  executeRebalance: boolean;
  marketYesPrice: number | null;
  marketNoPrice: number | null;
  easAttestationUid: string | null;
  easAttestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  unifiedMarket: {
    id: string;
    question: string;
    bestYesPrice: number | null;
    bestNoPrice: number | null;
    isActive?: boolean;
    resolution?: string | null;
    resolvedAt?: string | null;
  };
  previousForecast?: {
    id: string;
    probability: number;
    createdAt: string;
  } | null;
  calculated?: {
    edge: number;
    edgePercentage: number;
    hasPositiveEdge: boolean;
    priceChange: number | null;
  };
}

export interface ForecastHistory {
  id: string;
  probability: number;
  confidence: number;
  commitMessage: string | null;
  createdAt: string;
  marketYesPrice: number | null;
  marketNoPrice: number | null;
  isPublic: boolean;
  easAttestationUid: string | null;
  version: number;
  priceChange: number | null;
}

export interface ForecastsResponse {
  forecasts: Forecast[];
  total: number;
  limit: number;
  offset: number;
}

export interface ForecastHistoryResponse {
  history: ForecastHistory[];
  count: number;
  currentForecast: ForecastHistory | null;
  market: {
    bestYesPrice: number | null;
    bestNoPrice: number | null;
    isActive: boolean;
    resolution: string | null;
  } | null;
}

export interface CreateForecastParams {
  unifiedMarketId: string;
  probability: number;
  confidence?: number;
  commitMessage?: string;
  isPublic?: boolean;
  kellyFraction?: number;
  executeRebalance?: boolean;
}

export interface ForecastStats {
  totalForecasts: number;
  publicForecasts: number;
  privateForecasts: number;
  attestedForecasts: number;
  averageEdge: number;
  recentForecasts: Array<{
    id: string;
    probability: number;
    marketQuestion: string;
    marketPrice: number | null;
    resolution: string | null;
    createdAt: string;
  }>;
  // Calibration metrics
  resolvedForecasts?: number;
  correctForecasts?: number;
  accuracy?: number;
  averageBrierScore?: number;
  calibrationBuckets?: Array<{
    bucket: string;
    minProb: number;
    maxProb: number;
    count: number;
    actualRate: number;
    expectedRate: number;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || `API error: ${res.status}`);
    }

    const json: ApiResponse<T> = await res.json();

    if (!json.success) {
      throw new Error(json.error || 'API request failed');
    }

    return json.data;
  }

  // Markets
  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    category?: string;
    search?: string;
    active?: boolean;
  }): Promise<MarketsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.active !== undefined) searchParams.set('active', String(params.active));

    const query = searchParams.toString();
    return this.fetch<MarketsResponse>(`/api/markets${query ? `?${query}` : ''}`);
  }

  async getMarket(id: string): Promise<UnifiedMarket> {
    return this.fetch<UnifiedMarket>(`/api/markets/${id}`);
  }

  async getMarketPrices(id: string, limit = 100): Promise<PriceSnapshot[]> {
    return this.fetch<PriceSnapshot[]>(`/api/markets/${id}/prices?limit=${limit}`);
  }

  async searchMarkets(query: string): Promise<UnifiedMarket[]> {
    return this.fetch<UnifiedMarket[]>(`/api/markets/search?q=${encodeURIComponent(query)}`);
  }

  // Sync
  async getSyncStatus(): Promise<SyncStatus> {
    return this.fetch<SyncStatus>('/api/sync/status');
  }

  async getSyncStats(): Promise<SyncStats> {
    return this.fetch<SyncStats>('/api/sync/stats');
  }

  async startSync(): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/sync/start', { method: 'POST' });
  }

  async stopSync(): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/sync/stop', { method: 'POST' });
  }

  async triggerMarketSync(): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/sync/markets', { method: 'POST' });
  }

  async triggerPriceSync(): Promise<{ message: string }> {
    return this.fetch<{ message: string }>('/api/sync/prices', { method: 'POST' });
  }

  // Health
  async getHealth(): Promise<{ status: string; database: string; scheduler: string }> {
    return this.fetch('/health');
  }

  // Portfolio
  async getPortfolioSummary(params: { wallet?: string; userId?: string }): Promise<PortfolioSummary> {
    const searchParams = new URLSearchParams();
    if (params.wallet) searchParams.set('wallet', params.wallet);
    if (params.userId) searchParams.set('userId', params.userId);
    return this.fetch<PortfolioSummary>(`/api/portfolio/summary?${searchParams}`);
  }

  async connectWallet(address: string, label?: string): Promise<{ wallet: ConnectedWallet }> {
    return this.fetch<{ wallet: ConnectedWallet }>('/api/portfolio/connect-wallet', {
      method: 'POST',
      body: JSON.stringify({ address, label }),
    });
  }

  async addPosition(params: {
    userId?: string;
    walletAddress?: string;
    platform: string;
    marketExternalId: string;
    outcome: string;
    shares: number;
    avgCostBasis?: number;
  }): Promise<{ position: PortfolioPosition }> {
    return this.fetch<{ position: PortfolioPosition }>('/api/portfolio/positions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPosition(id: string): Promise<PortfolioPosition & {
    trades?: PositionTrade[];
    market?: UnifiedMarket;
  }> {
    return this.fetch<PortfolioPosition & {
      trades?: PositionTrade[];
      market?: UnifiedMarket;
    }>(`/api/portfolio/positions/${id}`);
  }

  async deletePosition(id: string): Promise<{ deleted: boolean }> {
    return this.fetch<{ deleted: boolean }>(`/api/portfolio/positions/${id}`, {
      method: 'DELETE',
    });
  }

  async getAlerts(params: { wallet?: string; userId?: string; days?: number }): Promise<AlertsResponse> {
    const searchParams = new URLSearchParams();
    if (params.wallet) searchParams.set('wallet', params.wallet);
    if (params.userId) searchParams.set('userId', params.userId);
    if (params.days) searchParams.set('days', String(params.days));
    return this.fetch<AlertsResponse>(`/api/portfolio/alerts?${searchParams}`);
  }

  async scanWallet(
    wallet: string,
    options?: { platforms?: string[]; importPositions?: boolean }
  ): Promise<WalletScanResponse> {
    return this.fetch<WalletScanResponse>('/api/portfolio/scan', {
      method: 'POST',
      body: JSON.stringify({
        wallet,
        platforms: options?.platforms || ['LIMITLESS'],
        importPositions: options?.importPositions ?? true,
      }),
    });
  }

  async quickScanWallet(wallet: string, platform: string = 'LIMITLESS'): Promise<WalletScanResult> {
    return this.fetch<WalletScanResult>(`/api/portfolio/scan/${wallet}?platform=${platform}`);
  }

  // Forecasts
  async getForecasts(params?: {
    limit?: number;
    offset?: number;
    marketId?: string;
    includePrivate?: boolean;
  }): Promise<ForecastsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.marketId) searchParams.set('marketId', params.marketId);
    if (params?.includePrivate) searchParams.set('includePrivate', 'true');
    const query = searchParams.toString();
    return this.fetch<ForecastsResponse>(`/api/forecasts${query ? `?${query}` : ''}`);
  }

  async getForecast(id: string): Promise<Forecast> {
    return this.fetch<Forecast>(`/api/forecasts/${id}`);
  }

  async getForecastHistory(marketId: string): Promise<ForecastHistoryResponse> {
    return this.fetch<ForecastHistoryResponse>(`/api/forecasts/market/${marketId}`);
  }

  async createForecast(params: CreateForecastParams): Promise<{ forecast: Forecast; calculated: Forecast['calculated'] }> {
    return this.fetch<{ forecast: Forecast; calculated: Forecast['calculated'] }>('/api/forecasts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updateForecast(
    id: string,
    params: Partial<CreateForecastParams>
  ): Promise<{ forecast: Forecast; calculated: Forecast['calculated'] }> {
    return this.fetch<{ forecast: Forecast; calculated: Forecast['calculated'] }>(`/api/forecasts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  async deleteForecast(id: string): Promise<{ success: boolean }> {
    return this.fetch<{ success: boolean }>(`/api/forecasts/${id}`, {
      method: 'DELETE',
    });
  }

  async getForecastStats(): Promise<ForecastStats> {
    return this.fetch<ForecastStats>('/api/forecasts/user/stats');
  }

  async getAttestationData(id: string): Promise<{
    forecastId: string;
    isAttested: boolean;
    existingUid: string | null;
    attestationData: {
      schema: string;
      schemaString: string;
      fields: {
        probability: number;
        marketId: string;
        platform: string;
        confidence: number;
        reasoning: string;
        isPublic: boolean;
      };
    };
    market: {
      id: string;
      question: string;
    };
  }> {
    return this.fetch(`/api/forecasts/${id}/attest`);
  }

  async recordAttestation(
    forecastId: string,
    params: {
      attestationUid: string;
      txHash?: string;
      chainId?: number;
      schemaUid?: string;
    }
  ): Promise<{
    forecast: {
      id: string;
      probability: number;
      easAttestationUid: string;
      easAttestedAt: string;
    };
    attestation: {
      uid: string;
      txHash: string | null;
      chainId: number;
      easScanUrl: string;
    };
  }> {
    return this.fetch(`/api/forecasts/${forecastId}/attest`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Attestations
  async getAttestations(params?: {
    limit?: number;
    offset?: number;
    type?: 'all' | 'onchain' | 'offchain' | 'private';
  }): Promise<{
    attestations: Attestation[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.type) searchParams.set('type', params.type);
    const query = searchParams.toString();
    return this.fetch(`/api/attestations${query ? `?${query}` : ''}`);
  }

  async getAttestationByUid(uid: string): Promise<Attestation> {
    return this.fetch<Attestation>(`/api/attestations/${uid}`);
  }

  async storeOffchainAttestation(params: {
    uid: string;
    signature: string;
    schemaUid: string;
    recipient: string;
    timestamp: number;
    data: Record<string, unknown>;
    forecastId?: string;
  }): Promise<Attestation> {
    return this.fetch<Attestation>('/api/attestations/offchain', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async storeMerkleAttestation(params: {
    uid: string;
    txHash?: string;
    schemaUid: string;
    recipient: string;
    merkleRoot: string;
    leaves: Array<{
      index: number;
      name: string;
      type: string;
      value: unknown;
      hash: string;
    }>;
    proofs: Record<string, string[]>;
    forecastId?: string;
    chainId?: number;
  }): Promise<Attestation> {
    return this.fetch<Attestation>('/api/attestations/merkle', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getSelectiveProof(
    uid: string,
    fields?: string[]
  ): Promise<{
    merkleRoot: string;
    revealedFields: Array<{
      name: string;
      value: unknown;
      proof: string[];
    }>;
  }> {
    const searchParams = new URLSearchParams();
    if (fields?.length) searchParams.set('fields', fields.join(','));
    const query = searchParams.toString();
    return this.fetch(`/api/attestations/${uid}/proof${query ? `?${query}` : ''}`);
  }

  async verifySelectiveProof(proof: {
    merkleRoot: string;
    revealedFields: Array<{
      name: string;
      value: unknown;
      proof: string[];
    }>;
  }): Promise<{
    verified: boolean;
    attestationFound: boolean;
    reason?: string;
    attestation?: {
      uid: string;
      schemaName: string;
      createdAt: string;
      attester: string;
      recipient: string;
    };
  }> {
    return this.fetch('/api/attestations/verify', {
      method: 'POST',
      body: JSON.stringify(proof),
    });
  }

  async getAttestationStats(): Promise<{
    total: number;
    onchain: number;
    offchain: number;
    private: number;
  }> {
    return this.fetch('/api/attestations/user/stats');
  }
}

export interface Attestation {
  id: string;
  uid: string;
  schemaUid: string;
  schemaName: string;
  chainId: number;
  txHash: string | null;
  attester: string;
  recipient: string;
  data: Record<string, unknown>;
  userId: string;
  isOffchain: boolean;
  isPrivate: boolean;
  signature?: string | null;
  merkleRoot?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const api = new ApiClient();

/**
 * API client for Calibr backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface UnifiedMarket {
  id: string;
  question: string;
  description: string | null;
  slug: string;
  category: string | null;
  bestYesPrice: number | null;
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
  platform: string;
  externalId: string;
  url: string | null;
  yesPrice: number | null;
  noPrice: number | null;
  volume: number;
  liquidity: number;
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
}

export const api = new ApiClient();

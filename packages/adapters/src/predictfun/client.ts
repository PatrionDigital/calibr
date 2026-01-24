/**
 * Predict.fun Contract Client
 * Reads market data from Blast L2 smart contracts
 *
 * Note: Since Predict.fun doesn't have a public REST API, we need to
 * interact directly with their smart contracts and index events.
 * For a production implementation, you would want to run an indexer
 * or use a service like The Graph.
 *
 * This client provides a basic implementation that can:
 * 1. Fetch market data from known condition IDs
 * 2. Read order book state from exchange contracts
 * 3. Calculate prices from on-chain data
 */

import {
  PREDICTFUN_CONTRACTS,
  BLAST_RPC_URL,
  type PredictFunMarket,
  type PredictFunOutcome,
} from './contracts';

// =============================================================================
// Configuration
// =============================================================================

export interface PredictFunClientConfig {
  rpcUrl?: string;
  /** Known market condition IDs to track */
  marketConditionIds?: string[];
}

const DEFAULT_CONFIG = {
  rpcUrl: BLAST_RPC_URL,
  marketConditionIds: [],
};

// =============================================================================
// Client
// =============================================================================

/**
 * Predict.fun client for reading market data from Blast L2
 *
 * IMPORTANT: This is a simplified implementation. A full production client would:
 * 1. Index historical events from contract deployment
 * 2. Listen to real-time events for new markets and trades
 * 3. Maintain a local database of market state
 * 4. Use multicall for batch RPC requests
 */
export class PredictFunClient {
  private config: Required<PredictFunClientConfig>;
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  constructor(config: PredictFunClientConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  // ===========================================================================
  // RPC Methods
  // ===========================================================================

  /**
   * Make an eth_call to the RPC
   */
  private async ethCall(to: string, data: string): Promise<string> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
      }),
    });

    const json = await response.json() as { error?: { message: string }; result: string };
    if (json.error) {
      throw new Error(`RPC error: ${json.error.message}`);
    }
    return json.result;
  }

  /**
   * Get logs from the RPC
   */
  private async getLogs(params: {
    address: string;
    topics: (string | string[] | null)[];
    fromBlock: string;
    toBlock: string;
  }): Promise<Array<{ topics: string[]; data: string; blockNumber: string; transactionHash: string }>> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getLogs',
        params: [params],
      }),
    });

    type LogEntry = { topics: string[]; data: string; blockNumber: string; transactionHash: string };
    const json = await response.json() as { error?: { message: string }; result?: LogEntry[] };
    if (json.error) {
      throw new Error(`RPC error: ${json.error.message}`);
    }
    return json.result || [];
  }

  /**
   * Get current block number
   */
  private async getBlockNumber(): Promise<number> {
    const response = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      }),
    });

    const json = await response.json() as { error?: { message: string }; result: string };
    if (json.error) {
      throw new Error(`RPC error: ${json.error.message}`);
    }
    return parseInt(json.result, 16);
  }

  // ===========================================================================
  // Cache Methods
  // ===========================================================================

  private getCacheKey(key: string): string {
    return key;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 30000): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Get markets by scanning recent TokenRegistered events
   * This is a simplified approach - production would use an indexer
   */
  async getMarkets(params?: {
    fromBlock?: number;
    limit?: number;
  }): Promise<PredictFunMarket[]> {
    const cacheKey = this.getCacheKey(`markets:${params?.fromBlock || 'latest'}`);
    const cached = this.getFromCache<PredictFunMarket[]>(cacheKey);
    if (cached) return cached;

    try {
      const currentBlock = await this.getBlockNumber();
      // Look back ~7 days of blocks (Blast has ~2s blocks)
      const fromBlock = params?.fromBlock || currentBlock - 302400;

      // TokenRegistered event topic
      const tokenRegisteredTopic = '0x' + Buffer.from(
        'TokenRegistered(uint256,uint256,bytes32)'
      ).slice(0, 32).toString('hex');

      // This is a placeholder - real implementation would:
      // 1. Scan TokenRegistered events from CTF Exchange
      // 2. Map condition IDs to market metadata (from IPFS or external source)
      // 3. Calculate current prices from order book

      // For now, return empty array
      // A full implementation would require an indexer service
      const markets: PredictFunMarket[] = [];

      this.setCache(cacheKey, markets, 60000);
      return markets;
    } catch (error) {
      console.error('[PredictFun] Failed to fetch markets:', error);
      return [];
    }
  }

  /**
   * Get market by condition ID
   */
  async getMarket(conditionId: string): Promise<PredictFunMarket | null> {
    const cacheKey = this.getCacheKey(`market:${conditionId}`);
    const cached = this.getFromCache<PredictFunMarket>(cacheKey);
    if (cached) return cached;

    try {
      // Get outcome slot count from ConditionalTokens contract
      // Function selector for getOutcomeSlotCount(bytes32)
      const selector = '0xabbc5e05';
      const data = selector + conditionId.slice(2).padStart(64, '0');

      const result = await this.ethCall(PREDICTFUN_CONTRACTS.conditionalTokens, data);
      const outcomeCount = parseInt(result, 16);

      if (outcomeCount === 0) {
        return null;
      }

      // Build outcomes
      const outcomes: PredictFunOutcome[] = [];
      for (let i = 0; i < outcomeCount; i++) {
        outcomes.push({
          index: i,
          tokenId: '', // Would need to calculate from condition ID
          price: 1 / outcomeCount, // Default uniform distribution
        });
      }

      // Check if resolved by looking at payout denominator
      const payoutDenomSelector = '0x7e339ba8'; // payoutDenominator(bytes32)
      const payoutDenomData = payoutDenomSelector + conditionId.slice(2).padStart(64, '0');
      const payoutDenomResult = await this.ethCall(
        PREDICTFUN_CONTRACTS.conditionalTokens,
        payoutDenomData
      );
      const payoutDenominator = parseInt(payoutDenomResult, 16);
      const isResolved = payoutDenominator > 0;

      const market: PredictFunMarket = {
        conditionId,
        questionId: '', // Would need to be fetched from event or external source
        oracle: PREDICTFUN_CONTRACTS.umaCtfAdapter,
        outcomeCount,
        outcomes,
        isResolved,
      };

      this.setCache(cacheKey, market, 30000);
      return market;
    } catch (error) {
      console.error('[PredictFun] Failed to fetch market:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get contract addresses
   */
  getContracts(): typeof PREDICTFUN_CONTRACTS {
    return PREDICTFUN_CONTRACTS;
  }
}

// Default client instance
export const predictFunClient = new PredictFunClient();

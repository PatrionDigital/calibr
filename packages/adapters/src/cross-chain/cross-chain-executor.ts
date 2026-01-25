/**
 * Cross-Chain Executor Service
 * Orchestrates E2E execution: CALIBR -> USDC (swap) -> Bridge -> Trade
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
} from 'viem';
import { base, polygon } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  type ExecutionConfig,
  type TradeIntent,
  type StoredTradeIntent,
  type ExecutionStatus,
  type CrossChainExecutionResult,
  type ExecutionPhase,
  type ExecutionCostEstimate,
  type TimeEstimate,
  type ExecutionProgressEvent,
  type ExecutionOptions,
  type CalibrTradeRequest,
  type ICrossChainExecutor,
  DEFAULT_EXECUTION_CONFIG,
} from './types';

// =============================================================================
// Helpers
// =============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Cross-Chain Executor Implementation
// =============================================================================

export class CrossChainExecutor implements ICrossChainExecutor {
  private config: ExecutionConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem client types are complex
  private baseClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem client types are complex
  private polygonClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem client types are complex
  private walletClient: any = null;
  private account: Account | null = null;

  private intents: Map<string, StoredTradeIntent> = new Map();
  private executions: Map<string, ExecutionStatus> = new Map();
  private progressHandlers: Set<(event: ExecutionProgressEvent) => void> = new Set();
  private completeHandlers: Set<(result: CrossChainExecutionResult) => void> = new Set();

  constructor(config: Partial<ExecutionConfig> = {}) {
    this.config = { ...DEFAULT_EXECUTION_CONFIG, ...config };

    this.baseClient = createPublicClient({
      chain: base,
      transport: http(this.config.baseRpcUrl),
    });

    this.polygonClient = createPublicClient({
      chain: polygon,
      transport: http(this.config.polygonRpcUrl),
    });
  }

  // ===========================================================================
  // Wallet Management
  // ===========================================================================

  async initializeWallet(privateKey: `0x${string}`): Promise<void> {
    this.account = privateKeyToAccount(privateKey);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: base,
      transport: http(this.config.baseRpcUrl),
    });
  }

  getWalletAddress(): `0x${string}` | null {
    return this.account?.address ?? null;
  }

  // ===========================================================================
  // Cost Estimation
  // ===========================================================================

  estimateExecutionCost(amount: bigint): ExecutionCostEstimate {
    // Swap fee: ~0.3% (Aerodrome)
    const swapFee = (amount * 30n) / 10000n;

    // Bridge fee: $0.10 fixed
    const bridgeFee = 100000n; // 6 decimals

    // Trading fee: ~0.1% (Polymarket)
    const tradingFee = (amount * 10n) / 10000n;

    const totalFee = swapFee + bridgeFee + tradingFee;
    const netAmount = amount - totalFee;

    return {
      swapFee,
      bridgeFee,
      tradingFee,
      totalFee,
      netAmount,
    };
  }

  validateTradeIntent(intent: TradeIntent): void {
    if (intent.amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    if (!['POLYMARKET', 'LIMITLESS'].includes(intent.platform)) {
      throw new Error('Unsupported platform');
    }

    if (intent.price < 0 || intent.price > 1) {
      throw new Error('Price must be between 0 and 1');
    }

    if (!['YES', 'NO'].includes(intent.outcome)) {
      throw new Error('Outcome must be YES or NO');
    }

    if (!['BUY', 'SELL'].includes(intent.side)) {
      throw new Error('Side must be BUY or SELL');
    }

    if (!['GTC', 'FOK', 'IOC'].includes(intent.orderType)) {
      throw new Error('Invalid order type');
    }
  }

  // ===========================================================================
  // Intent Management
  // ===========================================================================

  async createTradeIntent(intent: TradeIntent): Promise<string> {
    this.validateTradeIntent(intent);

    const id = generateId('intent');
    const now = new Date();

    const storedIntent: StoredTradeIntent = {
      ...intent,
      id,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    this.intents.set(id, storedIntent);
    return id;
  }

  getTradeIntent(intentId: string): StoredTradeIntent | null {
    return this.intents.get(intentId) ?? null;
  }

  linkIntentToExecution(intentId: string, executionId: string): string {
    const intent = this.intents.get(intentId);
    if (intent) {
      intent.executionId = executionId;
      intent.updatedAt = new Date();
    }
    return executionId;
  }

  updateIntentStatus(intentId: string, status: ExecutionPhase): void {
    const intent = this.intents.get(intentId);
    if (intent) {
      intent.status = status;
      intent.updatedAt = new Date();
    }
  }

  getPendingIntents(): StoredTradeIntent[] {
    return Array.from(this.intents.values()).filter(
      (intent) => intent.status === 'PENDING'
    );
  }

  cancelTradeIntent(intentId: string): boolean {
    const intent = this.intents.get(intentId);
    if (!intent || intent.status !== 'PENDING') {
      return false;
    }

    intent.status = 'CANCELLED';
    intent.updatedAt = new Date();
    return true;
  }

  // ===========================================================================
  // Execution
  // ===========================================================================

  async startExecution(intentId: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized');
    }

    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new Error('Intent not found');
    }

    const executionId = generateId('exec');
    const now = new Date();

    const status: ExecutionStatus = {
      executionId,
      intentId,
      currentPhase: 'PENDING',
      completedPhases: [],
      startedAt: now,
      updatedAt: now,
      phaseDurations: {} as Record<ExecutionPhase, number>,
      transactionHashes: {},
    };

    this.executions.set(executionId, status);
    this.linkIntentToExecution(intentId, executionId);

    try {
      // Execute swap
      await this.executePhase(executionId, intentId, 'SWAPPING');

      // Execute bridge
      await this.executePhase(executionId, intentId, 'BRIDGING');

      return executionId;
    } catch (error) {
      this.updateIntentStatus(intentId, 'FAILED');
      intent.error = (error as Error).message;
      throw error;
    }
  }

  async executeFullFlow(
    intentId: string,
    options?: ExecutionOptions
  ): Promise<CrossChainExecutionResult> {
    const maxRetries = options?.maxRetries ?? this.config.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const executionId = await this.startExecution(intentId);

        const status = this.executions.get(executionId)!;
        const intent = this.intents.get(intentId)!;

        const result: CrossChainExecutionResult = {
          success: true,
          intentId,
          executionId,
          phases: [...status.completedPhases],
          totalDuration: Date.now() - status.startedAt.getTime(),
          summary: {
            inputAmount: intent.amount,
            outputAmount: intent.amount, // Simplified
            totalFees: 0n,
            transactionCount: Object.keys(status.transactionHashes).length,
          },
          transactionHashes: status.transactionHashes,
        };

        // Emit completion event
        this.emitComplete(result);

        return result;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await sleep(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  async executeTradeFromCalibrTokens(
    request: CalibrTradeRequest,
    options?: ExecutionOptions
  ): Promise<CrossChainExecutionResult> {
    if (options?.dryRun) {
      const estimate = this.estimateExecutionCost(request.calibrAmount);
      return {
        success: true,
        intentId: 'dry-run',
        executionId: 'dry-run',
        phases: [],
        totalDuration: 0,
        summary: {
          inputAmount: request.calibrAmount,
          outputAmount: estimate.netAmount,
          totalFees: estimate.totalFee,
          transactionCount: 0,
        },
        transactionHashes: {},
        dryRun: true,
        estimatedCost: estimate,
      };
    }

    const intentId = await this.createTradeIntent(request.trade);
    return this.executeFullFlow(intentId, options);
  }

  // ===========================================================================
  // Status
  // ===========================================================================

  getExecutionStatus(executionId: string): ExecutionStatus | null {
    return this.executions.get(executionId) ?? null;
  }

  getStatusMessage(executionId: string): string {
    const status = this.executions.get(executionId);
    if (!status) {
      return 'Execution not found';
    }

    const messages: Record<ExecutionPhase, string> = {
      PENDING: 'Preparing execution...',
      SWAPPING: 'Swapping CALIBR to USDC...',
      BRIDGING: 'Bridging USDC to Polygon...',
      AWAITING_ATTESTATION: 'Waiting for Circle attestation...',
      CLAIMING: 'Claiming USDC on Polygon...',
      TRADING: 'Executing trade...',
      COMPLETED: 'Execution completed successfully!',
      FAILED: `Execution failed: ${status.error ?? 'Unknown error'}`,
      CANCELLED: 'Execution cancelled',
    };

    return messages[status.currentPhase];
  }

  getEstimatedTimeToCompletion(executionId: string): TimeEstimate | null {
    const status = this.executions.get(executionId);
    if (!status) {
      return null;
    }

    // Estimate remaining time based on current phase
    const phaseEstimates: Record<ExecutionPhase, TimeEstimate> = {
      PENDING: { minSeconds: 600, maxSeconds: 2400, averageSeconds: 1200 },
      SWAPPING: { minSeconds: 30, maxSeconds: 180, averageSeconds: 60 },
      BRIDGING: { minSeconds: 600, maxSeconds: 2400, averageSeconds: 1200 },
      AWAITING_ATTESTATION: { minSeconds: 600, maxSeconds: 1800, averageSeconds: 900 },
      CLAIMING: { minSeconds: 30, maxSeconds: 180, averageSeconds: 60 },
      TRADING: { minSeconds: 10, maxSeconds: 60, averageSeconds: 30 },
      COMPLETED: { minSeconds: 0, maxSeconds: 0, averageSeconds: 0 },
      FAILED: { minSeconds: 0, maxSeconds: 0, averageSeconds: 0 },
      CANCELLED: { minSeconds: 0, maxSeconds: 0, averageSeconds: 0 },
    };

    return phaseEstimates[status.currentPhase];
  }

  getActiveExecutions(): ExecutionStatus[] {
    return Array.from(this.executions.values()).filter(
      (status) =>
        status.currentPhase !== 'COMPLETED' &&
        status.currentPhase !== 'FAILED' &&
        status.currentPhase !== 'CANCELLED'
    );
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  onExecutionProgress(handler: (event: ExecutionProgressEvent) => void): void {
    this.progressHandlers.add(handler);
  }

  onExecutionComplete(handler: (result: CrossChainExecutionResult) => void): void {
    this.completeHandlers.add(handler);
  }

  offExecutionProgress(handler: (event: ExecutionProgressEvent) => void): void {
    this.progressHandlers.delete(handler);
  }

  offExecutionComplete(handler: (result: CrossChainExecutionResult) => void): void {
    this.completeHandlers.delete(handler);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private async executePhase(
    executionId: string,
    intentId: string,
    phase: ExecutionPhase
  ): Promise<void> {
    const status = this.executions.get(executionId);
    if (!status) return;

    const startTime = Date.now();

    // Update status
    status.currentPhase = phase;
    status.updatedAt = new Date();
    this.updateIntentStatus(intentId, phase);

    // Emit progress
    this.emitProgress({
      executionId,
      intentId,
      phase,
      timestamp: new Date(),
    });

    // Simulate execution based on phase
    await this.simulatePhaseExecution(phase, status);

    // Record duration and mark complete
    status.phaseDurations[phase] = Date.now() - startTime;
    status.completedPhases.push(phase);

    // Update last successful phase on intent
    const intent = this.intents.get(intentId);
    if (intent) {
      intent.lastSuccessfulPhase = phase;
    }
  }

  private async simulatePhaseExecution(
    phase: ExecutionPhase,
    status: ExecutionStatus
  ): Promise<void> {
    if (!this.account) return;

    switch (phase) {
      case 'SWAPPING': {
        // Simulate swap transaction
        const { request: swapRequest } = await this.baseClient.simulateContract({
          address: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43', // Aerodrome Router
          abi: [
            {
              name: 'swapExactTokensForTokens',
              type: 'function',
              inputs: [],
              outputs: [],
            },
          ],
          functionName: 'swapExactTokensForTokens',
          args: [],
          account: this.account,
        });

        const swapTx = await this.walletClient.writeContract(swapRequest);
        await this.baseClient.waitForTransactionReceipt({ hash: swapTx });
        status.transactionHashes.swap = swapTx;
        break;
      }

      case 'BRIDGING': {
        // Simulate bridge transaction
        const { request: bridgeRequest } = await this.baseClient.simulateContract({
          address: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962', // CCTP TokenMessenger
          abi: [
            {
              name: 'depositForBurn',
              type: 'function',
              inputs: [],
              outputs: [],
            },
          ],
          functionName: 'depositForBurn',
          args: [],
          account: this.account,
        });

        const bridgeTx = await this.walletClient.writeContract(bridgeRequest);
        await this.baseClient.waitForTransactionReceipt({ hash: bridgeTx });
        status.transactionHashes.bridge = bridgeTx;
        break;
      }

      default:
        // Other phases don't require transactions in this simulation
        break;
    }
  }

  private emitProgress(event: ExecutionProgressEvent): void {
    for (const handler of this.progressHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  private emitComplete(result: CrossChainExecutionResult): void {
    for (const handler of this.completeHandlers) {
      try {
        handler(result);
      } catch {
        // Ignore handler errors
      }
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new cross-chain executor
 */
export function createCrossChainExecutor(
  config?: Partial<ExecutionConfig>
): CrossChainExecutor {
  return new CrossChainExecutor(config);
}

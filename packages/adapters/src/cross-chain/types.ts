/**
 * Cross-Chain Execution Types
 * Type definitions for E2E execution flow
 */

// =============================================================================
// Execution Phases
// =============================================================================

export const EXECUTION_PHASES = [
  'PENDING',
  'SWAPPING',
  'BRIDGING',
  'AWAITING_ATTESTATION',
  'CLAIMING',
  'TRADING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;

export type ExecutionPhase = (typeof EXECUTION_PHASES)[number];

// =============================================================================
// Configuration
// =============================================================================

export interface ExecutionConfig {
  baseRpcUrl: string;
  polygonRpcUrl: string;
  attestationApiUrl: string;
  defaultSlippage: number;
  maxRetries: number;
  retryDelay: number;
}

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  baseRpcUrl: 'https://mainnet.base.org',
  polygonRpcUrl: 'https://polygon-rpc.com',
  attestationApiUrl: 'https://iris-api.circle.com/attestations',
  defaultSlippage: 0.005, // 0.5%
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
};

// =============================================================================
// Trade Intent
// =============================================================================

export type TradePlatform = 'POLYMARKET' | 'LIMITLESS';
export type TradeOutcome = 'YES' | 'NO';
export type TradeSide = 'BUY' | 'SELL';
export type CrossChainOrderType = 'GTC' | 'FOK' | 'IOC';

export interface TradeIntent {
  id?: string;
  platform: TradePlatform;
  marketId: string;
  outcome: TradeOutcome;
  side: TradeSide;
  amount: bigint;
  price: number;
  orderType: CrossChainOrderType;
  status?: ExecutionPhase;
  executionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  error?: string;
  lastSuccessfulPhase?: ExecutionPhase;
}

export interface StoredTradeIntent extends TradeIntent {
  id: string;
  status: ExecutionPhase;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Execution Status
// =============================================================================

export interface ExecutionStatus {
  executionId: string;
  intentId: string;
  currentPhase: ExecutionPhase;
  completedPhases: ExecutionPhase[];
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  phaseDurations: Record<ExecutionPhase, number>;
  transactionHashes: {
    swap?: `0x${string}`;
    bridge?: `0x${string}`;
    claim?: `0x${string}`;
    trade?: `0x${string}`;
  };
  error?: string;
}

// =============================================================================
// Execution Result
// =============================================================================

export interface CrossChainExecutionResult {
  success: boolean;
  intentId: string;
  executionId: string;
  phases: ExecutionPhase[];
  totalDuration: number;
  summary: {
    inputAmount: bigint;
    outputAmount: bigint;
    totalFees: bigint;
    transactionCount: number;
  };
  transactionHashes: {
    swap?: `0x${string}`;
    bridge?: `0x${string}`;
    claim?: `0x${string}`;
    trade?: `0x${string}`;
  };
  error?: string;
  dryRun?: boolean;
  estimatedCost?: {
    swapFee: bigint;
    bridgeFee: bigint;
    tradingFee: bigint;
    totalFee: bigint;
    netAmount: bigint;
  };
}

// =============================================================================
// Cost Estimate
// =============================================================================

export interface ExecutionCostEstimate {
  swapFee: bigint;
  bridgeFee: bigint;
  tradingFee: bigint;
  totalFee: bigint;
  netAmount: bigint;
}

// =============================================================================
// Time Estimate
// =============================================================================

export interface TimeEstimate {
  minSeconds: number;
  maxSeconds: number;
  averageSeconds: number;
}

// =============================================================================
// Progress Event
// =============================================================================

export interface ExecutionProgressEvent {
  executionId: string;
  intentId: string;
  phase: ExecutionPhase;
  txHash?: string;
  error?: string;
  timestamp: Date;
}

// =============================================================================
// Execution Options
// =============================================================================

export interface ExecutionOptions {
  maxRetries?: number;
  dryRun?: boolean;
  slippage?: number;
}

// =============================================================================
// Full Execution Request
// =============================================================================

export interface CalibrTradeRequest {
  calibrAmount: bigint;
  trade: TradeIntent;
}

// =============================================================================
// Executor Interface
// =============================================================================

export interface ICrossChainExecutor {
  // Wallet management
  initializeWallet(privateKey: `0x${string}`): Promise<void>;
  getWalletAddress(): `0x${string}` | null;

  // Cost estimation
  estimateExecutionCost(amount: bigint): ExecutionCostEstimate;
  validateTradeIntent(intent: TradeIntent): void;

  // Intent management
  createTradeIntent(intent: TradeIntent): Promise<string>;
  getTradeIntent(intentId: string): StoredTradeIntent | null;
  linkIntentToExecution(intentId: string, executionId: string): string;
  updateIntentStatus(intentId: string, status: ExecutionPhase): void;
  getPendingIntents(): StoredTradeIntent[];
  cancelTradeIntent(intentId: string): boolean;

  // Execution
  startExecution(intentId: string): Promise<string>;
  executeFullFlow(intentId: string, options?: ExecutionOptions): Promise<CrossChainExecutionResult>;
  executeTradeFromCalibrTokens(
    request: CalibrTradeRequest,
    options?: ExecutionOptions
  ): Promise<CrossChainExecutionResult>;

  // Status
  getExecutionStatus(executionId: string): ExecutionStatus | null;
  getStatusMessage(executionId: string): string;
  getEstimatedTimeToCompletion(executionId: string): TimeEstimate | null;
  getActiveExecutions(): ExecutionStatus[];

  // Events
  onExecutionProgress(handler: (event: ExecutionProgressEvent) => void): void;
  onExecutionComplete(handler: (result: CrossChainExecutionResult) => void): void;
  offExecutionProgress(handler: (event: ExecutionProgressEvent) => void): void;
  offExecutionComplete(handler: (result: CrossChainExecutionResult) => void): void;
}

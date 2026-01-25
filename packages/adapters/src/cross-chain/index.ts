/**
 * Execution Module
 * Cross-chain E2E execution infrastructure
 */

// Types
export type {
  ExecutionPhase,
  ExecutionConfig,
  TradeIntent,
  StoredTradeIntent,
  TradePlatform,
  TradeOutcome,
  TradeSide,
  CrossChainOrderType,
  ExecutionStatus,
  CrossChainExecutionResult,
  ExecutionCostEstimate,
  TimeEstimate,
  ExecutionProgressEvent,
  ExecutionOptions,
  CalibrTradeRequest,
  ICrossChainExecutor,
} from './types';

// Constants
export {
  EXECUTION_PHASES,
  DEFAULT_EXECUTION_CONFIG,
} from './types';

// Service
export {
  CrossChainExecutor,
  createCrossChainExecutor,
} from './cross-chain-executor';

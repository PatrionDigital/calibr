/**
 * CrossChainExecutor Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrossChainExecutor, createCrossChainExecutor } from '../../src/cross-chain/cross-chain-executor';
import type { TradeIntent, ExecutionProgressEvent, CrossChainExecutionResult } from '../../src/cross-chain/types';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      simulateContract: vi.fn(),
      waitForTransactionReceipt: vi.fn(),
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: vi.fn(),
    })),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

// =============================================================================
// Test Data
// =============================================================================

function createValidTradeIntent(overrides: Partial<TradeIntent> = {}): TradeIntent {
  return {
    platform: 'POLYMARKET',
    marketId: 'test-market-123',
    outcome: 'YES',
    side: 'BUY',
    amount: 1000000n, // 1 USDC (6 decimals)
    price: 0.65,
    orderType: 'GTC',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('CrossChainExecutor', () => {
  let executor: CrossChainExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new CrossChainExecutor();
  });

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  describe('Configuration', () => {
    it('should create instance with default config', () => {
      expect(executor).toBeDefined();
    });

    it('should accept custom config', () => {
      const customExecutor = new CrossChainExecutor({
        baseRpcUrl: 'https://custom-base.example.com',
        polygonRpcUrl: 'https://custom-polygon.example.com',
        maxRetries: 5,
      });
      expect(customExecutor).toBeDefined();
    });

    it('should merge partial config with defaults', () => {
      const customExecutor = new CrossChainExecutor({
        maxRetries: 10,
      });
      expect(customExecutor).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Factory Function
  // ---------------------------------------------------------------------------

  describe('createCrossChainExecutor', () => {
    it('should create executor via factory function', () => {
      const exec = createCrossChainExecutor();
      expect(exec).toBeInstanceOf(CrossChainExecutor);
    });

    it('should accept config via factory', () => {
      const exec = createCrossChainExecutor({
        maxRetries: 5,
      });
      expect(exec).toBeInstanceOf(CrossChainExecutor);
    });
  });

  // ---------------------------------------------------------------------------
  // Wallet Management
  // ---------------------------------------------------------------------------

  describe('Wallet Management', () => {
    it('should return null wallet address before initialization', () => {
      expect(executor.getWalletAddress()).toBeNull();
    });

    it('should return wallet address after initialization', async () => {
      await executor.initializeWallet('0x1234567890123456789012345678901234567890123456789012345678901234');
      expect(executor.getWalletAddress()).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  // ---------------------------------------------------------------------------
  // Cost Estimation
  // ---------------------------------------------------------------------------

  describe('estimateExecutionCost', () => {
    it('should calculate swap fee as 0.3%', () => {
      const amount = 10000000n; // 10 USDC
      const estimate = executor.estimateExecutionCost(amount);

      // 0.3% of 10000000 = 30000
      expect(estimate.swapFee).toBe(30000n);
    });

    it('should include fixed bridge fee of $0.10', () => {
      const estimate = executor.estimateExecutionCost(1000000n);
      expect(estimate.bridgeFee).toBe(100000n); // 0.10 USDC with 6 decimals
    });

    it('should calculate trading fee as 0.1%', () => {
      const amount = 10000000n; // 10 USDC
      const estimate = executor.estimateExecutionCost(amount);

      // 0.1% of 10000000 = 10000
      expect(estimate.tradingFee).toBe(10000n);
    });

    it('should calculate total fee correctly', () => {
      const amount = 10000000n;
      const estimate = executor.estimateExecutionCost(amount);

      expect(estimate.totalFee).toBe(
        estimate.swapFee + estimate.bridgeFee + estimate.tradingFee
      );
    });

    it('should calculate net amount correctly', () => {
      const amount = 10000000n;
      const estimate = executor.estimateExecutionCost(amount);

      expect(estimate.netAmount).toBe(amount - estimate.totalFee);
    });

    it('should handle small amounts', () => {
      const amount = 1000n;
      const estimate = executor.estimateExecutionCost(amount);

      // 0.3% of 1000 = 3, 0.1% of 1000 = 1
      expect(estimate.swapFee).toBe(3n);
      expect(estimate.tradingFee).toBe(1n);
      expect(estimate.bridgeFee).toBe(100000n);
    });

    it('should handle large amounts', () => {
      const amount = 1000000000000n; // 1M USDC
      const estimate = executor.estimateExecutionCost(amount);

      // 0.3% = 3000000000, 0.1% = 1000000000
      expect(estimate.swapFee).toBe(3000000000n);
      expect(estimate.tradingFee).toBe(1000000000n);
      expect(estimate.netAmount).toBe(amount - estimate.totalFee);
    });
  });

  // ---------------------------------------------------------------------------
  // validateTradeIntent
  // ---------------------------------------------------------------------------

  describe('validateTradeIntent', () => {
    it('should accept valid trade intent', () => {
      const intent = createValidTradeIntent();
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should throw for zero amount', () => {
      const intent = createValidTradeIntent({ amount: 0n });
      expect(() => executor.validateTradeIntent(intent)).toThrow('Amount must be greater than 0');
    });

    it('should throw for negative amount', () => {
      const intent = createValidTradeIntent({ amount: -1n });
      expect(() => executor.validateTradeIntent(intent)).toThrow('Amount must be greater than 0');
    });

    it('should throw for unsupported platform', () => {
      const intent = createValidTradeIntent({ platform: 'KALSHI' as 'POLYMARKET' });
      expect(() => executor.validateTradeIntent(intent)).toThrow('Unsupported platform');
    });

    it('should accept POLYMARKET platform', () => {
      const intent = createValidTradeIntent({ platform: 'POLYMARKET' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should accept LIMITLESS platform', () => {
      const intent = createValidTradeIntent({ platform: 'LIMITLESS' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should throw for price less than 0', () => {
      const intent = createValidTradeIntent({ price: -0.1 });
      expect(() => executor.validateTradeIntent(intent)).toThrow('Price must be between 0 and 1');
    });

    it('should throw for price greater than 1', () => {
      const intent = createValidTradeIntent({ price: 1.5 });
      expect(() => executor.validateTradeIntent(intent)).toThrow('Price must be between 0 and 1');
    });

    it('should accept price of 0', () => {
      const intent = createValidTradeIntent({ price: 0 });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should accept price of 1', () => {
      const intent = createValidTradeIntent({ price: 1 });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should throw for invalid outcome', () => {
      const intent = createValidTradeIntent({ outcome: 'MAYBE' as 'YES' });
      expect(() => executor.validateTradeIntent(intent)).toThrow('Outcome must be YES or NO');
    });

    it('should accept YES outcome', () => {
      const intent = createValidTradeIntent({ outcome: 'YES' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should accept NO outcome', () => {
      const intent = createValidTradeIntent({ outcome: 'NO' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should throw for invalid side', () => {
      const intent = createValidTradeIntent({ side: 'HOLD' as 'BUY' });
      expect(() => executor.validateTradeIntent(intent)).toThrow('Side must be BUY or SELL');
    });

    it('should accept BUY side', () => {
      const intent = createValidTradeIntent({ side: 'BUY' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should accept SELL side', () => {
      const intent = createValidTradeIntent({ side: 'SELL' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should throw for invalid order type', () => {
      const intent = createValidTradeIntent({ orderType: 'LIMIT' as 'GTC' });
      expect(() => executor.validateTradeIntent(intent)).toThrow('Invalid order type');
    });

    it('should accept GTC order type', () => {
      const intent = createValidTradeIntent({ orderType: 'GTC' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should accept FOK order type', () => {
      const intent = createValidTradeIntent({ orderType: 'FOK' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });

    it('should accept IOC order type', () => {
      const intent = createValidTradeIntent({ orderType: 'IOC' });
      expect(() => executor.validateTradeIntent(intent)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Intent Management
  // ---------------------------------------------------------------------------

  describe('Intent Management', () => {
    describe('createTradeIntent', () => {
      it('should create and store trade intent', async () => {
        const intent = createValidTradeIntent();
        const id = await executor.createTradeIntent(intent);

        expect(id).toBeDefined();
        expect(id).toMatch(/^intent-\d+-[a-z0-9]+$/);
      });

      it('should generate unique IDs', async () => {
        const ids = new Set<string>();
        for (let i = 0; i < 10; i++) {
          const id = await executor.createTradeIntent(createValidTradeIntent());
          ids.add(id);
        }
        expect(ids.size).toBe(10);
      });

      it('should store intent with PENDING status', async () => {
        const id = await executor.createTradeIntent(createValidTradeIntent());
        const stored = executor.getTradeIntent(id);

        expect(stored?.status).toBe('PENDING');
      });

      it('should set createdAt and updatedAt', async () => {
        const before = new Date();
        const id = await executor.createTradeIntent(createValidTradeIntent());
        const after = new Date();

        const stored = executor.getTradeIntent(id);
        expect(stored?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(stored?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
        expect(stored?.updatedAt).toEqual(stored?.createdAt);
      });

      it('should throw for invalid intent', async () => {
        const intent = createValidTradeIntent({ amount: 0n });
        await expect(executor.createTradeIntent(intent)).rejects.toThrow();
      });
    });

    describe('getTradeIntent', () => {
      it('should return null for non-existent intent', () => {
        expect(executor.getTradeIntent('non-existent-id')).toBeNull();
      });

      it('should return stored intent', async () => {
        const intent = createValidTradeIntent({ marketId: 'my-market' });
        const id = await executor.createTradeIntent(intent);

        const stored = executor.getTradeIntent(id);
        expect(stored?.marketId).toBe('my-market');
      });
    });

    describe('getPendingIntents', () => {
      it('should return empty array when no intents', () => {
        expect(executor.getPendingIntents()).toEqual([]);
      });

      it('should return only pending intents', async () => {
        const id1 = await executor.createTradeIntent(createValidTradeIntent());
        const id2 = await executor.createTradeIntent(createValidTradeIntent());

        // Cancel one
        executor.cancelTradeIntent(id1);

        const pending = executor.getPendingIntents();
        expect(pending).toHaveLength(1);
        expect(pending[0].id).toBe(id2);
      });
    });

    describe('cancelTradeIntent', () => {
      it('should return false for non-existent intent', () => {
        expect(executor.cancelTradeIntent('non-existent')).toBe(false);
      });

      it('should cancel pending intent', async () => {
        const id = await executor.createTradeIntent(createValidTradeIntent());

        const result = executor.cancelTradeIntent(id);

        expect(result).toBe(true);
        expect(executor.getTradeIntent(id)?.status).toBe('CANCELLED');
      });

      it('should return false for already cancelled intent', async () => {
        const id = await executor.createTradeIntent(createValidTradeIntent());
        executor.cancelTradeIntent(id);

        expect(executor.cancelTradeIntent(id)).toBe(false);
      });

      it('should update updatedAt on cancel', async () => {
        const id = await executor.createTradeIntent(createValidTradeIntent());
        const before = executor.getTradeIntent(id)?.updatedAt;

        await new Promise(r => setTimeout(r, 10)); // Small delay
        executor.cancelTradeIntent(id);

        const after = executor.getTradeIntent(id)?.updatedAt;
        expect(after?.getTime()).toBeGreaterThan(before!.getTime());
      });
    });

    describe('linkIntentToExecution', () => {
      it('should link intent to execution', async () => {
        const intentId = await executor.createTradeIntent(createValidTradeIntent());
        executor.linkIntentToExecution(intentId, 'exec-123');

        const intent = executor.getTradeIntent(intentId);
        expect(intent?.executionId).toBe('exec-123');
      });

      it('should return execution ID', async () => {
        const intentId = await executor.createTradeIntent(createValidTradeIntent());
        const result = executor.linkIntentToExecution(intentId, 'exec-456');

        expect(result).toBe('exec-456');
      });

      it('should handle non-existent intent gracefully', () => {
        const result = executor.linkIntentToExecution('non-existent', 'exec-789');
        expect(result).toBe('exec-789');
      });
    });

    describe('updateIntentStatus', () => {
      it('should update intent status', async () => {
        const id = await executor.createTradeIntent(createValidTradeIntent());
        executor.updateIntentStatus(id, 'SWAPPING');

        expect(executor.getTradeIntent(id)?.status).toBe('SWAPPING');
      });

      it('should handle non-existent intent gracefully', () => {
        expect(() => executor.updateIntentStatus('non-existent', 'BRIDGING')).not.toThrow();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Execution Status
  // ---------------------------------------------------------------------------

  describe('Execution Status', () => {
    describe('getExecutionStatus', () => {
      it('should return null for non-existent execution', () => {
        expect(executor.getExecutionStatus('non-existent')).toBeNull();
      });
    });

    describe('getStatusMessage', () => {
      it('should return "Execution not found" for non-existent execution', () => {
        expect(executor.getStatusMessage('non-existent')).toBe('Execution not found');
      });
    });

    describe('getEstimatedTimeToCompletion', () => {
      it('should return null for non-existent execution', () => {
        expect(executor.getEstimatedTimeToCompletion('non-existent')).toBeNull();
      });
    });

    describe('getActiveExecutions', () => {
      it('should return empty array when no executions', () => {
        expect(executor.getActiveExecutions()).toEqual([]);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Execution (requires wallet)
  // ---------------------------------------------------------------------------

  describe('startExecution', () => {
    it('should throw when wallet not initialized', async () => {
      const id = await executor.createTradeIntent(createValidTradeIntent());

      await expect(executor.startExecution(id)).rejects.toThrow('Wallet not initialized');
    });

    it('should throw when intent not found', async () => {
      await executor.initializeWallet('0x1234567890123456789012345678901234567890123456789012345678901234');

      await expect(executor.startExecution('non-existent')).rejects.toThrow('Intent not found');
    });
  });

  // ---------------------------------------------------------------------------
  // Dry Run Execution
  // ---------------------------------------------------------------------------

  describe('executeTradeFromCalibrTokens', () => {
    it('should return dry run result without execution', async () => {
      const request = {
        calibrAmount: 10000000n, // 10 USDC
        trade: createValidTradeIntent(),
      };

      const result = await executor.executeTradeFromCalibrTokens(request, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.intentId).toBe('dry-run');
      expect(result.executionId).toBe('dry-run');
      expect(result.phases).toEqual([]);
      expect(result.totalDuration).toBe(0);
    });

    it('should calculate estimated cost in dry run', async () => {
      const calibrAmount = 10000000n;
      const request = {
        calibrAmount,
        trade: createValidTradeIntent(),
      };

      const result = await executor.executeTradeFromCalibrTokens(request, { dryRun: true });

      expect(result.estimatedCost).toBeDefined();
      expect(result.summary.inputAmount).toBe(calibrAmount);
      expect(result.summary.outputAmount).toBe(result.estimatedCost!.netAmount);
      expect(result.summary.totalFees).toBe(result.estimatedCost!.totalFee);
    });

    it('should have zero transaction count in dry run', async () => {
      const result = await executor.executeTradeFromCalibrTokens(
        { calibrAmount: 1000000n, trade: createValidTradeIntent() },
        { dryRun: true }
      );

      expect(result.summary.transactionCount).toBe(0);
      expect(result.transactionHashes).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  describe('Event Handlers', () => {
    describe('onExecutionProgress', () => {
      it('should register progress handler', () => {
        const handler = vi.fn();
        expect(() => executor.onExecutionProgress(handler)).not.toThrow();
      });

      it('should allow multiple handlers', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        executor.onExecutionProgress(handler1);
        executor.onExecutionProgress(handler2);

        // No error should occur
      });
    });

    describe('offExecutionProgress', () => {
      it('should unregister progress handler', () => {
        const handler = vi.fn();
        executor.onExecutionProgress(handler);

        expect(() => executor.offExecutionProgress(handler)).not.toThrow();
      });

      it('should handle unregistering non-existent handler', () => {
        const handler = vi.fn();
        expect(() => executor.offExecutionProgress(handler)).not.toThrow();
      });
    });

    describe('onExecutionComplete', () => {
      it('should register complete handler', () => {
        const handler = vi.fn();
        expect(() => executor.onExecutionComplete(handler)).not.toThrow();
      });
    });

    describe('offExecutionComplete', () => {
      it('should unregister complete handler', () => {
        const handler = vi.fn();
        executor.onExecutionComplete(handler);

        expect(() => executor.offExecutionComplete(handler)).not.toThrow();
      });
    });
  });
});

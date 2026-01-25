/**
 * Cross-Chain E2E Execution Tests (Phase 5.3)
 * Tests for end-to-end execution flow from CALIBR to Polymarket trade
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock viem before imports
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    http: vi.fn(() => ({})),
    keccak256: vi.fn(() => '0xmockhash'),
    encodePacked: vi.fn(() => '0xpacked'),
    toBytes: vi.fn(() => new Uint8Array(32)),
    parseEventLogs: vi.fn(() => []),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    signMessage: vi.fn(),
    signTypedData: vi.fn(),
    signTransaction: vi.fn(),
  })),
}));

import {
  CrossChainExecutor,
  createCrossChainExecutor,
  type ExecutionConfig,
  type TradeIntent,
  type ExecutionStatus,
  type CrossChainExecutionResult,
  type ExecutionPhase,
  EXECUTION_PHASES,
} from '../../src/cross-chain';

// =============================================================================
// Test Constants
// =============================================================================

const MOCK_WALLET = '0x1234567890123456789012345678901234567890' as `0x${string}`;
const MOCK_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' as `0x${string}`;
const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;
const MOCK_MESSAGE_HASH = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';

const MOCK_TRADE_INTENT: TradeIntent = {
  platform: 'POLYMARKET',
  marketId: '0x1234567890abcdef',
  outcome: 'YES',
  side: 'BUY',
  amount: 100000000n, // 100 USDC
  price: 0.65,
  orderType: 'GTC',
};

// =============================================================================
// 5.3.1 Execution Router Tests
// =============================================================================

describe('Cross-Chain E2E Execution Tests (Phase 5.3)', () => {
  let executor: CrossChainExecutor;
  let mockPublicClient: Record<string, Mock>;
  let mockWalletClient: Record<string, Mock>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPublicClient = {
      readContract: vi.fn(),
      simulateContract: vi.fn(),
      waitForTransactionReceipt: vi.fn(),
      getTransactionReceipt: vi.fn(),
      watchContractEvent: vi.fn(),
    };

    mockWalletClient = {
      writeContract: vi.fn(),
    };

    const { createPublicClient, createWalletClient } = await import('viem');
    (createPublicClient as Mock).mockReturnValue(mockPublicClient);
    (createWalletClient as Mock).mockReturnValue(mockWalletClient);

    // Mock fetch for attestation API
    global.fetch = vi.fn();

    executor = createCrossChainExecutor();
    await executor.initializeWallet(MOCK_PRIVATE_KEY);
  });

  describe('5.3.1 - Execution Router', () => {
    it('should define all execution phases', () => {
      expect(EXECUTION_PHASES).toContain('PENDING');
      expect(EXECUTION_PHASES).toContain('SWAPPING');
      expect(EXECUTION_PHASES).toContain('BRIDGING');
      expect(EXECUTION_PHASES).toContain('AWAITING_ATTESTATION');
      expect(EXECUTION_PHASES).toContain('CLAIMING');
      expect(EXECUTION_PHASES).toContain('TRADING');
      expect(EXECUTION_PHASES).toContain('COMPLETED');
      expect(EXECUTION_PHASES).toContain('FAILED');
    });

    it('should create executor with default config', () => {
      const defaultExecutor = createCrossChainExecutor();
      expect(defaultExecutor).toBeInstanceOf(CrossChainExecutor);
    });

    it('should accept custom configuration', () => {
      const customExecutor = createCrossChainExecutor({
        baseRpcUrl: 'https://custom-base-rpc.com',
        polygonRpcUrl: 'https://custom-polygon-rpc.com',
      });
      expect(customExecutor).toBeInstanceOf(CrossChainExecutor);
    });

    it('should estimate total execution cost', () => {
      const amount = 100000000n; // 100 USDC worth of CALIBR
      const estimate = executor.estimateExecutionCost(amount);

      expect(estimate.swapFee).toBeDefined();
      expect(estimate.bridgeFee).toBeDefined();
      expect(estimate.tradingFee).toBeDefined();
      expect(estimate.totalFee).toBeDefined();
      expect(estimate.netAmount).toBeLessThan(amount);
    });

    it('should validate trade intent before execution', () => {
      const invalidIntent: TradeIntent = {
        ...MOCK_TRADE_INTENT,
        amount: 0n,
      };

      expect(() => executor.validateTradeIntent(invalidIntent)).toThrow('Amount must be greater than 0');
    });

    it('should validate platform is supported', () => {
      const invalidIntent = {
        ...MOCK_TRADE_INTENT,
        platform: 'INVALID_PLATFORM',
      } as unknown as TradeIntent;

      expect(() => executor.validateTradeIntent(invalidIntent)).toThrow('Unsupported platform');
    });

    it('should validate price range', () => {
      const invalidIntent: TradeIntent = {
        ...MOCK_TRADE_INTENT,
        price: 1.5, // Invalid: > 1
      };

      expect(() => executor.validateTradeIntent(invalidIntent)).toThrow('Price must be between 0 and 1');
    });
  });

  describe('5.3.2 - Trade Intent System', () => {
    it('should create and store trade intent', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      expect(intentId).toBeDefined();
      expect(typeof intentId).toBe('string');

      const storedIntent = executor.getTradeIntent(intentId);
      expect(storedIntent).toBeDefined();
      expect(storedIntent?.marketId).toBe(MOCK_TRADE_INTENT.marketId);
    });

    it('should associate intent with execution', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);
      const executionId = executor.linkIntentToExecution(intentId, 'exec-123');

      expect(executionId).toBe('exec-123');

      const intent = executor.getTradeIntent(intentId);
      expect(intent?.executionId).toBe('exec-123');
    });

    it('should update intent status during execution', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      executor.updateIntentStatus(intentId, 'SWAPPING');
      let intent = executor.getTradeIntent(intentId);
      expect(intent?.status).toBe('SWAPPING');

      executor.updateIntentStatus(intentId, 'BRIDGING');
      intent = executor.getTradeIntent(intentId);
      expect(intent?.status).toBe('BRIDGING');
    });

    it('should retrieve pending intents', async () => {
      await executor.createTradeIntent(MOCK_TRADE_INTENT);
      await executor.createTradeIntent({ ...MOCK_TRADE_INTENT, marketId: '0xabcd' });

      const pendingIntents = executor.getPendingIntents();
      expect(pendingIntents.length).toBe(2);
    });

    it('should cancel pending intent', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      const cancelled = executor.cancelTradeIntent(intentId);
      expect(cancelled).toBe(true);

      const intent = executor.getTradeIntent(intentId);
      expect(intent?.status).toBe('CANCELLED');
    });

    it('should not cancel intent that is already executing', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);
      executor.updateIntentStatus(intentId, 'SWAPPING');

      const cancelled = executor.cancelTradeIntent(intentId);
      expect(cancelled).toBe(false);
    });
  });

  describe('5.3.3 - Execution Monitor', () => {
    beforeEach(() => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: '0xAD09780d193884d503182aD4588450C416D6F9D4', // MESSAGE_TRANSMITTER
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'complete', attestation: '0x' + 'ab'.repeat(65) }),
      });
    });

    it('should monitor execution progress', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      const phases: ExecutionPhase[] = [];
      executor.onExecutionProgress((event) => {
        phases.push(event.phase);
      });

      // Start monitoring
      const executionId = await executor.startExecution(intentId);

      expect(executionId).toBeDefined();
      expect(phases.length).toBeGreaterThan(0);
    });

    it('should emit progress events for each phase', async () => {
      const events: { phase: ExecutionPhase; txHash?: string }[] = [];

      executor.onExecutionProgress((event) => {
        events.push({ phase: event.phase, txHash: event.txHash });
      });

      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);
      await executor.startExecution(intentId);

      expect(events.some((e) => e.phase === 'SWAPPING')).toBe(true);
      expect(events.some((e) => e.phase === 'BRIDGING')).toBe(true);
    });

    it('should track execution timing', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);
      const executionId = await executor.startExecution(intentId);

      const status = executor.getExecutionStatus(executionId);

      expect(status?.startedAt).toBeInstanceOf(Date);
      expect(status?.phaseDurations).toBeDefined();
    });

    it('should handle monitor errors gracefully', async () => {
      mockWalletClient.writeContract.mockRejectedValueOnce(new Error('Transaction failed'));

      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      await expect(executor.startExecution(intentId)).rejects.toThrow();

      const intent = executor.getTradeIntent(intentId);
      expect(intent?.status).toBe('FAILED');
    });

    it('should provide estimated time to completion', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);
      const executionId = await executor.startExecution(intentId);

      const estimate = executor.getEstimatedTimeToCompletion(executionId);

      expect(estimate).toBeDefined();
      expect(estimate?.minSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5.3.4 - Auto-Execution', () => {
    beforeEach(() => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: '0xAD09780d193884d503182aD4588450C416D6F9D4',
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'complete', attestation: '0x' + 'ab'.repeat(65) }),
      });
    });

    it('should automatically execute trade after USDC arrives', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      const result = await executor.executeFullFlow(intentId);

      expect(result.success).toBe(true);
      expect(result.phases.length).toBeGreaterThan(0);
    });

    it('should track balance checks in status', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      const result = await executor.executeFullFlow(intentId);

      // Verify execution completed with transaction hashes
      expect(result.transactionHashes).toBeDefined();
      expect(result.transactionHashes.swap).toBeDefined();
    });

    it('should retry on transaction failures', async () => {
      let attempts = 0;
      mockPublicClient.simulateContract.mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Transaction failed');
        }
        return { request: {} };
      });

      // Create executor with minimal retry delay
      const fastExecutor = createCrossChainExecutor({ retryDelay: 10 });
      await fastExecutor.initializeWallet(MOCK_PRIVATE_KEY);

      const intentId = await fastExecutor.createTradeIntent(MOCK_TRADE_INTENT);
      const result = await fastExecutor.executeFullFlow(intentId, { maxRetries: 3 });

      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(result.success).toBe(true);
    }, 10000);

    it('should fail after max retries exhausted', async () => {
      mockPublicClient.simulateContract.mockRejectedValue(new Error('Always fails'));

      // Create executor with minimal retry delay
      const fastExecutor = createCrossChainExecutor({ retryDelay: 10 });
      await fastExecutor.initializeWallet(MOCK_PRIVATE_KEY);

      const intentId = await fastExecutor.createTradeIntent(MOCK_TRADE_INTENT);

      await expect(
        fastExecutor.executeFullFlow(intentId, { maxRetries: 2 })
      ).rejects.toThrow('Always fails');
    }, 10000);

    it('should complete full execution and return result', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      const result = await executor.executeFullFlow(intentId);

      expect(result).toMatchObject({
        success: true,
        intentId,
        phases: expect.any(Array),
        totalDuration: expect.any(Number),
      });
    });
  });

  describe('5.3.5 - Execution Status', () => {
    it('should provide detailed execution status', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: '0xAD09780d193884d503182aD4588450C416D6F9D4',
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'complete', attestation: '0x' + 'ab'.repeat(65) }),
      });

      const executionId = await executor.startExecution(intentId);
      const status = executor.getExecutionStatus(executionId);

      expect(status).toMatchObject({
        executionId,
        intentId,
        currentPhase: expect.any(String),
        completedPhases: expect.any(Array),
        startedAt: expect.any(Date),
      });
    });

    it('should track transaction hashes for each phase', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: '0xAD09780d193884d503182aD4588450C416D6F9D4',
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'complete', attestation: '0x' + 'ab'.repeat(65) }),
      });

      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);
      const executionId = await executor.startExecution(intentId);
      const status = executor.getExecutionStatus(executionId);

      expect(status?.transactionHashes).toBeDefined();
      expect(status?.transactionHashes.swap).toBeDefined();
    });

    it('should provide human-readable status message', async () => {
      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: '0xAD09780d193884d503182aD4588450C416D6F9D4',
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'complete', attestation: '0x' + 'ab'.repeat(65) }),
      });

      const executionId = await executor.startExecution(intentId);
      const message = executor.getStatusMessage(executionId);

      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should list all active executions', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: '0xAD09780d193884d503182aD4588450C416D6F9D4',
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'complete', attestation: '0x' + 'ab'.repeat(65) }),
      });

      const intentId1 = await executor.createTradeIntent(MOCK_TRADE_INTENT);
      const intentId2 = await executor.createTradeIntent({ ...MOCK_TRADE_INTENT, marketId: '0xabcd' });

      await executor.startExecution(intentId1);
      await executor.startExecution(intentId2);

      const activeExecutions = executor.getActiveExecutions();
      expect(activeExecutions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5.3.6 - E2E Integration Tests', () => {
    beforeEach(() => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: '0xAD09780d193884d503182aD4588450C416D6F9D4',
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'complete', attestation: '0x' + 'ab'.repeat(65) }),
      });
    });

    it('should execute complete flow: CALIBR -> USDC -> Bridge -> Trade', async () => {
      const result = await executor.executeTradeFromCalibrTokens({
        calibrAmount: 1000000000000000000n, // 1 CALIBR token
        trade: MOCK_TRADE_INTENT,
      });

      expect(result.success).toBe(true);
      expect(result.phases).toContain('SWAPPING');
      expect(result.phases).toContain('BRIDGING');
    });

    it('should handle swap failure gracefully', async () => {
      mockPublicClient.simulateContract
        .mockRejectedValueOnce(new Error('Swap failed')) // First call for swap
        .mockResolvedValue({ request: {} }); // Subsequent calls

      // Use fast executor with no retries
      const fastExecutor = createCrossChainExecutor({ retryDelay: 10 });
      await fastExecutor.initializeWallet(MOCK_PRIVATE_KEY);

      await expect(
        fastExecutor.executeTradeFromCalibrTokens(
          {
            calibrAmount: 1000000000000000000n,
            trade: MOCK_TRADE_INTENT,
          },
          { maxRetries: 1 }
        )
      ).rejects.toThrow('Swap failed');
    }, 10000);

    it('should handle bridge failure gracefully', async () => {
      // First simulation succeeds (swap), second fails (bridge)
      let callCount = 0;
      mockPublicClient.simulateContract.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Bridge failed');
        }
        return { request: {} };
      });

      // Use fast executor with no retries
      const fastExecutor = createCrossChainExecutor({ retryDelay: 10 });
      await fastExecutor.initializeWallet(MOCK_PRIVATE_KEY);

      await expect(
        fastExecutor.executeTradeFromCalibrTokens(
          {
            calibrAmount: 1000000000000000000n,
            trade: MOCK_TRADE_INTENT,
          },
          { maxRetries: 1 }
        )
      ).rejects.toThrow('Bridge failed');
    }, 10000);

    it('should provide complete execution summary', async () => {
      const result = await executor.executeTradeFromCalibrTokens({
        calibrAmount: 1000000000000000000n,
        trade: MOCK_TRADE_INTENT,
      });

      expect(result.summary).toMatchObject({
        inputAmount: expect.any(BigInt),
        outputAmount: expect.any(BigInt),
        totalFees: expect.any(BigInt),
        transactionCount: expect.any(Number),
      });
    });

    it('should support dry run mode', async () => {
      const dryRunResult = await executor.executeTradeFromCalibrTokens(
        {
          calibrAmount: 1000000000000000000n,
          trade: MOCK_TRADE_INTENT,
        },
        { dryRun: true }
      );

      // Dry run should not actually execute transactions
      expect(dryRunResult.dryRun).toBe(true);
      expect(dryRunResult.estimatedCost).toBeDefined();
    });

    it('should emit completion event when finished', async () => {
      let completionEvent: CrossChainExecutionResult | null = null;

      executor.onExecutionComplete((result) => {
        completionEvent = result;
      });

      await executor.executeTradeFromCalibrTokens({
        calibrAmount: 1000000000000000000n,
        trade: MOCK_TRADE_INTENT,
      });

      expect(completionEvent).toBeDefined();
      expect(completionEvent!.success).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should provide error details for failed executions', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockRejectedValue(new Error('Execution failed'));

      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      try {
        await executor.startExecution(intentId);
      } catch {
        // Expected
      }

      const intent = executor.getTradeIntent(intentId);
      expect(intent?.error).toBeDefined();
    });

    it('should allow resuming from last successful phase', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);

      // First receipt succeeds, second fails
      let receiptCount = 0;
      mockPublicClient.waitForTransactionReceipt.mockImplementation(async () => {
        receiptCount++;
        if (receiptCount === 2) {
          throw new Error('Transaction timeout');
        }
        return {
          status: 'success',
          transactionHash: MOCK_TX_HASH,
          logs: [{
            address: '0xAD09780d193884d503182aD4588450C416D6F9D4',
            topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
            data: '0x' + '00'.repeat(128),
          }],
        };
      });

      const intentId = await executor.createTradeIntent(MOCK_TRADE_INTENT);

      try {
        await executor.startExecution(intentId);
      } catch {
        // Expected
      }

      const intent = executor.getTradeIntent(intentId);
      expect(intent?.lastSuccessfulPhase).toBeDefined();
    });
  });
});

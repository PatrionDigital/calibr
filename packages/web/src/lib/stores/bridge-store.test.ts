/**
 * Bridge Store Tests
 *
 * Tests for cross-chain USDC bridging store:
 * - Default state
 * - Bridge initiation
 * - Phase updates
 * - Status refresh
 * - Attestation checking
 * - Bridge management (select, abandon, remove)
 * - Utility functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useBridgeStore,
  type BridgeStatus,
  type BridgePhase,
} from './bridge-store';

// =============================================================================
// Mocks
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockResponse<T>(data: T, success = true) {
  return Promise.resolve({
    ok: success,
    json: () => Promise.resolve({ success, data }),
  });
}

// Sample bridge status
const sampleBridge: BridgeStatus = {
  trackingId: 'bridge-123',
  phase: 'initiated',
  sourceChain: 'BASE',
  destinationChain: 'POLYGON',
  amount: '1000000', // 1 USDC
  amountUsd: '1.00',
  hasAttestation: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('useBridgeStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store by clearing localStorage and recreating
    window.localStorage.clear();
    // Reset store state
    useBridgeStore.setState({
      activeBridges: {},
      selectedBridgeId: null,
      isInitiating: false,
      isPolling: false,
      lastError: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('default state', () => {
    it('has empty activeBridges', () => {
      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.activeBridges).toEqual({});
    });

    it('has selectedBridgeId as null', () => {
      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.selectedBridgeId).toBeNull();
    });

    it('has isInitiating as false', () => {
      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.isInitiating).toBe(false);
    });

    it('has isPolling as false', () => {
      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.isPolling).toBe(false);
    });

    it('has lastError as null', () => {
      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.lastError).toBeNull();
    });
  });

  describe('initiateBridge', () => {
    it('sets isInitiating to true during initiation', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useBridgeStore());

      act(() => {
        result.current.initiateBridge({
          amount: '1000000',
          destinationChain: 'POLYGON',
          walletAddress: '0x123',
          userId: 'user-1',
          walletConnectionId: 'conn-1',
        });
      });

      expect(result.current.isInitiating).toBe(true);
    });

    it('creates a new bridge on success', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          trackingId: 'bridge-new',
          phase: 'pending_initiation',
          sourceChain: 'BASE',
          destinationChain: 'POLYGON',
          amount: '1000000',
          netAmount: '990000',
          feeBreakdown: { netAmountUsd: '0.99' },
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      let trackingId: string | null = null;
      await act(async () => {
        trackingId = await result.current.initiateBridge({
          amount: '1000000',
          destinationChain: 'POLYGON',
          walletAddress: '0x123',
          userId: 'user-1',
          walletConnectionId: 'conn-1',
        });
      });

      expect(trackingId).toBe('bridge-new');
      expect(result.current.activeBridges['bridge-new']).toBeDefined();
      expect(result.current.selectedBridgeId).toBe('bridge-new');
      expect(result.current.isInitiating).toBe(false);
    });

    it('returns null on failure and sets error', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'Initiation failed' }),
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      let trackingId: string | null = null;
      await act(async () => {
        trackingId = await result.current.initiateBridge({
          amount: '1000000',
          destinationChain: 'POLYGON',
          walletAddress: '0x123',
          userId: 'user-1',
          walletConnectionId: 'conn-1',
        });
      });

      expect(trackingId).toBeNull();
      expect(result.current.lastError).toBeTruthy();
      expect(result.current.isInitiating).toBe(false);
    });
  });

  describe('updateBridgePhase', () => {
    beforeEach(async () => {
      // Set up an existing bridge
      useBridgeStore.setState({
        activeBridges: { [sampleBridge.trackingId]: sampleBridge },
      });
    });

    it('updates phase in local state', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}));

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.updateBridgePhase('bridge-123', 'pending_attestation');
      });

      expect(result.current.activeBridges['bridge-123']!.phase).toBe('pending_attestation');
    });

    it('updates additional data along with phase', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}));

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.updateBridgePhase('bridge-123', 'initiated', {
          sourceTxHash: '0xabc',
          messageHash: '0xdef',
        });
      });

      expect(result.current.activeBridges['bridge-123']!.sourceTxHash).toBe('0xabc');
      expect(result.current.activeBridges['bridge-123']!.messageHash).toBe('0xdef');
    });

    it('sets completedAt when phase is completed', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}));

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.updateBridgePhase('bridge-123', 'completed');
      });

      expect(result.current.activeBridges['bridge-123']!.completedAt).toBeTruthy();
    });

    it('sets error on API failure', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'Update failed' }),
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.updateBridgePhase('bridge-123', 'attested');
      });

      expect(result.current.lastError).toBeTruthy();
    });

    it('does nothing for non-existent bridge', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}));

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.updateBridgePhase('non-existent', 'attested');
      });

      expect(result.current.activeBridges['non-existent']).toBeUndefined();
    });
  });

  describe('refreshBridgeStatus', () => {
    it('sets isPolling during refresh', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useBridgeStore());

      act(() => {
        result.current.refreshBridgeStatus('bridge-123');
      });

      expect(result.current.isPolling).toBe(true);
    });

    it('updates bridge status from API response', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          trackingId: 'bridge-123',
          phase: 'attested',
          status: 'active',
          sourceTxHash: '0xsource',
          destTxHash: undefined,
          messageHash: '0xmsg',
          hasAttestation: true,
          amount: 1.0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T01:00:00.000Z',
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      let status: BridgeStatus | null = null;
      await act(async () => {
        status = await result.current.refreshBridgeStatus('bridge-123');
      });

      expect(status).toBeTruthy();
      expect(status!.phase).toBe('attested');
      expect(status!.hasAttestation).toBe(true);
      expect(result.current.isPolling).toBe(false);
    });

    it('returns null and sets error on failure', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'Refresh failed' }),
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      let status: BridgeStatus | null = null;
      await act(async () => {
        status = await result.current.refreshBridgeStatus('bridge-123');
      });

      expect(status).toBeNull();
      expect(result.current.lastError).toBeTruthy();
      expect(result.current.isPolling).toBe(false);
    });
  });

  describe('checkAttestation', () => {
    beforeEach(async () => {
      useBridgeStore.setState({
        activeBridges: { [sampleBridge.trackingId]: sampleBridge },
      });
    });

    it('returns ready true when attestation is available', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          status: 'complete',
          attestation: '0xattestationdata',
          ready: true,
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      let attestationResult: { ready: boolean; attestation?: string } = { ready: false };
      await act(async () => {
        attestationResult = await result.current.checkAttestation('bridge-123', '0xmessagehash');
      });

      expect(attestationResult.ready).toBe(true);
      expect(attestationResult.attestation).toBe('0xattestationdata');
      expect(result.current.activeBridges['bridge-123']!.phase).toBe('attested');
      expect(result.current.activeBridges['bridge-123']!.hasAttestation).toBe(true);
    });

    it('returns ready false when attestation not available', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          status: 'pending',
          ready: false,
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      let attestationResult: { ready: boolean; attestation?: string } = { ready: false };
      await act(async () => {
        attestationResult = await result.current.checkAttestation('bridge-123', '0xmessagehash');
      });

      expect(attestationResult.ready).toBe(false);
      expect(result.current.activeBridges['bridge-123']!.phase).toBe('initiated');
    });

    it('returns ready false on error', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      const { result } = renderHook(() => useBridgeStore());

      let attestationResult: { ready: boolean; attestation?: string } = { ready: true };
      await act(async () => {
        attestationResult = await result.current.checkAttestation('bridge-123', '0xmessagehash');
      });

      expect(attestationResult.ready).toBe(false);
    });
  });

  describe('abandonBridge', () => {
    beforeEach(async () => {
      useBridgeStore.setState({
        activeBridges: { [sampleBridge.trackingId]: sampleBridge },
        selectedBridgeId: sampleBridge.trackingId,
      });
    });

    it('sets bridge phase to abandoned', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}));

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.abandonBridge('bridge-123');
      });

      expect(result.current.activeBridges['bridge-123']!.phase).toBe('abandoned');
    });

    it('clears selection if abandoned bridge was selected', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}));

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.abandonBridge('bridge-123');
      });

      expect(result.current.selectedBridgeId).toBeNull();
    });

    it('sets error on failure', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'Abandon failed' }),
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.abandonBridge('bridge-123');
      });

      expect(result.current.lastError).toBeTruthy();
    });
  });

  describe('selectBridge', () => {
    beforeEach(async () => {
      useBridgeStore.setState({
        activeBridges: { [sampleBridge.trackingId]: sampleBridge },
      });
    });

    it('selects a bridge', () => {
      const { result } = renderHook(() => useBridgeStore());

      act(() => {
        result.current.selectBridge('bridge-123');
      });

      expect(result.current.selectedBridgeId).toBe('bridge-123');
    });

    it('clears selection with null', () => {
      const { result } = renderHook(() => useBridgeStore());

      act(() => {
        result.current.selectBridge('bridge-123');
      });

      act(() => {
        result.current.selectBridge(null);
      });

      expect(result.current.selectedBridgeId).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears the last error', () => {
      useBridgeStore.setState({ lastError: 'Some error' });

      const { result } = renderHook(() => useBridgeStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.lastError).toBeNull();
    });
  });

  describe('removeBridge', () => {
    beforeEach(async () => {
      useBridgeStore.setState({
        activeBridges: { [sampleBridge.trackingId]: sampleBridge },
        selectedBridgeId: sampleBridge.trackingId,
      });
    });

    it('removes bridge from activeBridges', () => {
      const { result } = renderHook(() => useBridgeStore());

      act(() => {
        result.current.removeBridge('bridge-123');
      });

      expect(result.current.activeBridges['bridge-123']).toBeUndefined();
    });

    it('clears selection if removed bridge was selected', () => {
      const { result } = renderHook(() => useBridgeStore());

      act(() => {
        result.current.removeBridge('bridge-123');
      });

      expect(result.current.selectedBridgeId).toBeNull();
    });

    it('preserves selection if different bridge was selected', () => {
      useBridgeStore.setState({ selectedBridgeId: 'other-bridge' });

      const { result } = renderHook(() => useBridgeStore());

      act(() => {
        result.current.removeBridge('bridge-123');
      });

      expect(result.current.selectedBridgeId).toBe('other-bridge');
    });
  });

  describe('getEstimate', () => {
    it('returns estimate on success', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          fees: { bridgeFee: '10000', bridgeFeeUsd: '0.01' },
          output: { netAmount: '990000', netAmountUsd: '0.99' },
          inputAmount: '1000000',
          inputAmountUsd: '1.00',
          timing: { minMinutes: 10, maxMinutes: 20, averageMinutes: 15 },
        })
      );

      const { result } = renderHook(() => useBridgeStore());

      let estimate = null;
      await act(async () => {
        estimate = await result.current.getEstimate('1000000', 'POLYGON');
      });

      expect(estimate).toEqual({
        inputAmount: '1000000',
        inputAmountUsd: '1.00',
        bridgeFee: '10000',
        bridgeFeeUsd: '0.01',
        netAmount: '990000',
        netAmountUsd: '0.99',
        minMinutes: 10,
        maxMinutes: 20,
        averageMinutes: 15,
      });
    });

    it('returns null on failure', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      const { result } = renderHook(() => useBridgeStore());

      let estimate = null;
      await act(async () => {
        estimate = await result.current.getEstimate('1000000', 'POLYGON');
      });

      expect(estimate).toBeNull();
    });
  });

  describe('getActiveBridgeCount', () => {
    it('returns 0 for empty bridges', () => {
      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.getActiveBridgeCount()).toBe(0);
    });

    it('counts only active bridges', () => {
      const completedBridge: BridgeStatus = { ...sampleBridge, trackingId: 'completed', phase: 'completed' };
      const failedBridge: BridgeStatus = { ...sampleBridge, trackingId: 'failed', phase: 'failed' };
      const abandonedBridge: BridgeStatus = { ...sampleBridge, trackingId: 'abandoned', phase: 'abandoned' };
      const activeBridge: BridgeStatus = { ...sampleBridge, trackingId: 'active', phase: 'attested' };

      useBridgeStore.setState({
        activeBridges: {
          completed: completedBridge,
          failed: failedBridge,
          abandoned: abandonedBridge,
          active: activeBridge,
        },
      });

      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.getActiveBridgeCount()).toBe(1);
    });

    it('counts multiple active bridges', () => {
      const bridge1: BridgeStatus = { ...sampleBridge, trackingId: 'b1', phase: 'initiated' };
      const bridge2: BridgeStatus = { ...sampleBridge, trackingId: 'b2', phase: 'pending_attestation' };
      const bridge3: BridgeStatus = { ...sampleBridge, trackingId: 'b3', phase: 'claiming' };

      useBridgeStore.setState({
        activeBridges: { b1: bridge1, b2: bridge2, b3: bridge3 },
      });

      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.getActiveBridgeCount()).toBe(3);
    });
  });

  describe('hasPendingBridges', () => {
    it('returns false when no bridges', () => {
      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.hasPendingBridges()).toBe(false);
    });

    it('returns false when only completed bridges', () => {
      useBridgeStore.setState({
        activeBridges: {
          b1: { ...sampleBridge, phase: 'completed' },
        },
      });

      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.hasPendingBridges()).toBe(false);
    });

    it('returns true when active bridges exist', () => {
      useBridgeStore.setState({
        activeBridges: {
          b1: { ...sampleBridge, phase: 'initiated' },
        },
      });

      const { result } = renderHook(() => useBridgeStore());
      expect(result.current.hasPendingBridges()).toBe(true);
    });
  });

  describe('refreshAllBridges', () => {
    it('refreshes all bridges in parallel', async () => {
      const bridge1: BridgeStatus = { ...sampleBridge, trackingId: 'b1' };
      const bridge2: BridgeStatus = { ...sampleBridge, trackingId: 'b2' };

      useBridgeStore.setState({
        activeBridges: { b1: bridge1, b2: bridge2 },
      });

      mockFetch.mockImplementation((url) => {
        const id = url.includes('b1') ? 'b1' : 'b2';
        return createMockResponse({
          trackingId: id,
          phase: 'attested',
          status: 'active',
          hasAttestation: true,
          amount: 1.0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T01:00:00.000Z',
        });
      });

      const { result } = renderHook(() => useBridgeStore());

      await act(async () => {
        await result.current.refreshAllBridges();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('bridge phases', () => {
    const phases: BridgePhase[] = [
      'pending_initiation',
      'initiated',
      'pending_attestation',
      'attested',
      'claiming',
      'completed',
      'failed',
      'abandoned',
    ];

    phases.forEach((phase) => {
      it(`supports ${phase} phase`, () => {
        useBridgeStore.setState({
          activeBridges: {
            test: { ...sampleBridge, phase },
          },
        });

        const { result } = renderHook(() => useBridgeStore());
        expect(result.current.activeBridges['test']!.phase).toBe(phase);
      });
    });
  });
});

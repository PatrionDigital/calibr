/**
 * Bridge Store
 * Manages cross-chain USDC bridging state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export type BridgePhase =
  | 'pending_initiation'
  | 'initiated'
  | 'pending_attestation'
  | 'attested'
  | 'claiming'
  | 'completed'
  | 'failed'
  | 'abandoned';

export type SupportedChain = 'BASE' | 'POLYGON' | 'ETHEREUM';

export interface BridgeStatus {
  trackingId: string;
  phase: BridgePhase;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string; // In USDC decimals (6)
  amountUsd: string;
  sourceTxHash?: string;
  destTxHash?: string;
  messageHash?: string;
  hasAttestation: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BridgeInitiateParams {
  amount: string; // In USDC decimals (6)
  destinationChain: 'POLYGON' | 'ETHEREUM';
  recipient?: string;
  walletAddress: string;
  userId: string;
  walletConnectionId: string;
}

export interface BridgeEstimate {
  inputAmount: string;
  inputAmountUsd: string;
  bridgeFee: string;
  bridgeFeeUsd: string;
  netAmount: string;
  netAmountUsd: string;
  minMinutes: number;
  maxMinutes: number;
  averageMinutes: number;
}

export interface BridgeStore {
  // State
  activeBridges: Record<string, BridgeStatus>;
  selectedBridgeId: string | null;
  isInitiating: boolean;
  isPolling: boolean;
  lastError: string | null;

  // Actions
  initiateBridge: (params: BridgeInitiateParams) => Promise<string | null>;
  updateBridgePhase: (
    trackingId: string,
    phase: BridgePhase,
    data?: Partial<BridgeStatus>
  ) => Promise<void>;
  refreshBridgeStatus: (trackingId: string) => Promise<BridgeStatus | null>;
  refreshAllBridges: () => Promise<void>;
  checkAttestation: (trackingId: string, messageHash: string) => Promise<{ ready: boolean; attestation?: string }>;
  abandonBridge: (trackingId: string) => Promise<void>;
  selectBridge: (trackingId: string | null) => void;
  clearError: () => void;
  removeBridge: (trackingId: string) => void;

  // Utilities
  getEstimate: (amount: string, destinationChain: 'POLYGON' | 'ETHEREUM') => Promise<BridgeEstimate | null>;
  getActiveBridgeCount: () => number;
  hasPendingBridges: () => boolean;
}

// =============================================================================
// API Helpers
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useBridgeStore = create<BridgeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      activeBridges: {},
      selectedBridgeId: null,
      isInitiating: false,
      isPolling: false,
      lastError: null,

      // Actions
      initiateBridge: async (params: BridgeInitiateParams) => {
        set({ isInitiating: true, lastError: null });

        try {
          const result = await apiFetch<{
            trackingId: string;
            phase: BridgePhase;
            sourceChain: SupportedChain;
            destinationChain: SupportedChain;
            amount: string;
            netAmount: string;
            feeBreakdown: { netAmountUsd: string };
          }>('/api/bridge/initiate', {
            method: 'POST',
            body: JSON.stringify(params),
          });

          const newBridge: BridgeStatus = {
            trackingId: result.trackingId,
            phase: result.phase,
            sourceChain: result.sourceChain,
            destinationChain: result.destinationChain,
            amount: params.amount,
            amountUsd: (Number(params.amount) / 1e6).toFixed(2),
            hasAttestation: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set((state) => ({
            activeBridges: {
              ...state.activeBridges,
              [result.trackingId]: newBridge,
            },
            selectedBridgeId: result.trackingId,
            isInitiating: false,
          }));

          return result.trackingId;
        } catch (error) {
          set({
            isInitiating: false,
            lastError: error instanceof Error ? error.message : 'Failed to initiate bridge',
          });
          return null;
        }
      },

      updateBridgePhase: async (
        trackingId: string,
        phase: BridgePhase,
        data?: Partial<BridgeStatus>
      ) => {
        try {
          await apiFetch(`/api/bridge/${trackingId}/update`, {
            method: 'POST',
            body: JSON.stringify({
              phase,
              sourceTxHash: data?.sourceTxHash,
              messageHash: data?.messageHash,
              attestation: data?.hasAttestation ? 'present' : undefined,
              destTxHash: data?.destTxHash,
              error: data?.error,
            }),
          });

          set((state) => {
            const existing = state.activeBridges[trackingId];
            if (!existing) return state;

            return {
              activeBridges: {
                ...state.activeBridges,
                [trackingId]: {
                  ...existing,
                  ...data,
                  phase,
                  updatedAt: new Date().toISOString(),
                  completedAt: phase === 'completed' ? new Date().toISOString() : existing.completedAt,
                },
              },
            };
          });
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : 'Failed to update bridge',
          });
        }
      },

      refreshBridgeStatus: async (trackingId: string) => {
        set({ isPolling: true });

        try {
          const result = await apiFetch<{
            trackingId: string;
            phase: BridgePhase;
            status: string;
            sourceTxHash?: string;
            destTxHash?: string;
            messageHash?: string;
            hasAttestation: boolean;
            amount: number;
            error?: string;
            createdAt: string;
            updatedAt: string;
            completedAt?: string;
          }>(`/api/bridge/status/${trackingId}`);

          const status: BridgeStatus = {
            trackingId: result.trackingId,
            phase: result.phase,
            sourceChain: 'BASE',
            destinationChain: 'POLYGON',
            amount: String(result.amount * 1e6),
            amountUsd: result.amount.toFixed(2),
            sourceTxHash: result.sourceTxHash,
            destTxHash: result.destTxHash,
            messageHash: result.messageHash,
            hasAttestation: result.hasAttestation,
            error: result.error,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            completedAt: result.completedAt,
          };

          set((state) => ({
            activeBridges: {
              ...state.activeBridges,
              [trackingId]: status,
            },
            isPolling: false,
          }));

          return status;
        } catch (error) {
          set({
            isPolling: false,
            lastError: error instanceof Error ? error.message : 'Failed to refresh status',
          });
          return null;
        }
      },

      refreshAllBridges: async () => {
        const { activeBridges } = get();
        const trackingIds = Object.keys(activeBridges);

        await Promise.all(
          trackingIds.map((id) => get().refreshBridgeStatus(id))
        );
      },

      checkAttestation: async (trackingId: string, messageHash: string) => {
        try {
          const result = await apiFetch<{
            status: string;
            attestation?: string;
            ready: boolean;
          }>(`/api/bridge/attestation/${messageHash}`);

          if (result.ready && result.attestation) {
            set((state) => {
              const existing = state.activeBridges[trackingId];
              if (!existing) return state;

              return {
                activeBridges: {
                  ...state.activeBridges,
                  [trackingId]: {
                    ...existing,
                    phase: 'attested',
                    hasAttestation: true,
                    updatedAt: new Date().toISOString(),
                  },
                },
              };
            });
          }

          return {
            ready: result.ready,
            attestation: result.attestation,
          };
        } catch {
          return { ready: false };
        }
      },

      abandonBridge: async (trackingId: string) => {
        try {
          await apiFetch(`/api/bridge/abandon/${trackingId}`, {
            method: 'DELETE',
          });

          set((state) => {
            const existing = state.activeBridges[trackingId];
            if (!existing) return state;

            return {
              activeBridges: {
                ...state.activeBridges,
                [trackingId]: {
                  ...existing,
                  phase: 'abandoned',
                  updatedAt: new Date().toISOString(),
                },
              },
              selectedBridgeId:
                state.selectedBridgeId === trackingId ? null : state.selectedBridgeId,
            };
          });
        } catch (error) {
          set({
            lastError: error instanceof Error ? error.message : 'Failed to abandon bridge',
          });
        }
      },

      selectBridge: (trackingId: string | null) => {
        set({ selectedBridgeId: trackingId });
      },

      clearError: () => {
        set({ lastError: null });
      },

      removeBridge: (trackingId: string) => {
        set((state) => {
          const newBridges = { ...state.activeBridges };
          delete newBridges[trackingId];
          return {
            activeBridges: newBridges,
            selectedBridgeId:
              state.selectedBridgeId === trackingId ? null : state.selectedBridgeId,
          };
        });
      },

      // Utilities
      getEstimate: async (amount: string, destinationChain: 'POLYGON' | 'ETHEREUM') => {
        try {
          const result = await apiFetch<{
            fees: { bridgeFee: string; bridgeFeeUsd: string };
            output: { netAmount: string; netAmountUsd: string };
            inputAmount: string;
            inputAmountUsd: string;
            timing: { minMinutes: number; maxMinutes: number; averageMinutes: number };
          }>(`/api/bridge/estimate?amount=${amount}&destinationChain=${destinationChain}`);

          return {
            inputAmount: result.inputAmount,
            inputAmountUsd: result.inputAmountUsd,
            bridgeFee: result.fees.bridgeFee,
            bridgeFeeUsd: result.fees.bridgeFeeUsd,
            netAmount: result.output.netAmount,
            netAmountUsd: result.output.netAmountUsd,
            minMinutes: result.timing.minMinutes,
            maxMinutes: result.timing.maxMinutes,
            averageMinutes: result.timing.averageMinutes,
          };
        } catch {
          return null;
        }
      },

      getActiveBridgeCount: () => {
        const { activeBridges } = get();
        return Object.values(activeBridges).filter(
          (b) => !['completed', 'failed', 'abandoned'].includes(b.phase)
        ).length;
      },

      hasPendingBridges: () => {
        return get().getActiveBridgeCount() > 0;
      },
    }),
    {
      name: 'calibr-bridge-store',
      version: 1,
      partialize: (state) => ({
        activeBridges: state.activeBridges,
        selectedBridgeId: state.selectedBridgeId,
      }),
    }
  )
);

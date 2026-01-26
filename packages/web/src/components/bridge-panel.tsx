'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, type Hex, keccak256, decodeEventLog } from 'viem';
import { base } from 'wagmi/chains';
import { useBridgeStore, type BridgeEstimate } from '@/lib/stores/bridge-store';
import { BridgeStatusDisplay } from './bridge-status';

// =============================================================================
// Types
// =============================================================================

interface BridgePanelProps {
  walletAddress?: string;
  onBridgeInitiated?: (trackingId: string) => void;
  defaultAmount?: string;
  compact?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Hex;
const TOKEN_MESSENGER = '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962' as Hex;
const POLYGON_DOMAIN = 7;

// MessageSent event signature
const MESSAGE_SENT_EVENT = '0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036';

// ERC20 ABI for approval
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// TokenMessenger ABI for depositForBurn
const TOKEN_MESSENGER_ABI = [
  {
    name: 'depositForBurn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
    ],
    outputs: [{ name: 'nonce', type: 'uint64' }],
  },
] as const;

// MessageSent event ABI for parsing
const MESSAGE_SENT_ABI = [
  {
    type: 'event',
    name: 'MessageSent',
    inputs: [{ name: 'message', type: 'bytes', indexed: false }],
  },
] as const;

// =============================================================================
// Helpers
// =============================================================================

function addressToBytes32(address: Hex): Hex {
  return `0x000000000000000000000000${address.slice(2)}` as Hex;
}

// =============================================================================
// Component
// =============================================================================

export function BridgePanel({
  walletAddress: propWalletAddress,
  onBridgeInitiated,
  defaultAmount = '',
  compact = false,
}: BridgePanelProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const walletAddress = propWalletAddress || connectedAddress;

  // Bridge store
  const {
    activeBridges,
    selectedBridgeId,
    isInitiating,
    lastError,
    initiateBridge,
    updateBridgePhase,
    getEstimate,
    clearError,
    selectBridge,
  } = useBridgeStore();

  // Local state
  const [amount, setAmount] = useState(defaultAmount);
  const [destinationChain] = useState<'POLYGON' | 'ETHEREUM'>('POLYGON');
  const [estimate, setEstimate] = useState<BridgeEstimate | null>(null);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [currentTrackingId, setCurrentTrackingId] = useState<string | null>(null);
  const [bridgeStep, setBridgeStep] = useState<'input' | 'approving' | 'bridging' | 'monitoring'>('input');

  // USDC balance on Base
  const { data: baseBalance, refetch: refetchBalance } = useBalance({
    address: walletAddress as Hex,
    token: BASE_USDC,
    chainId: base.id,
  });

  // Contract write hooks
  const { writeContractAsync: writeApprove, isPending: isApproving } = useWriteContract();
  const {
    writeContractAsync: writeDeposit,
    isPending: isDepositing,
    data: depositTxHash,
  } = useWriteContract();

  // Wait for deposit receipt
  const { data: depositReceipt, isLoading: isWaitingDeposit } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });

  // Fetch estimate when amount changes
  useEffect(() => {
    const fetchEstimate = async () => {
      if (!amount || parseFloat(amount) <= 0) {
        setEstimate(null);
        return;
      }

      setIsLoadingEstimate(true);
      try {
        const amountWei = parseUnits(amount, 6).toString();
        const est = await getEstimate(amountWei, destinationChain);
        setEstimate(est);
      } catch {
        setEstimate(null);
      } finally {
        setIsLoadingEstimate(false);
      }
    };

    const debounce = setTimeout(fetchEstimate, 500);
    return () => clearTimeout(debounce);
  }, [amount, destinationChain, getEstimate]);

  // Handle deposit receipt - extract message hash
  useEffect(() => {
    if (!depositReceipt || !currentTrackingId) return;

    // Find MessageSent event in logs
    const messageSentLog = depositReceipt.logs.find(
      (log) => log.topics[0] === MESSAGE_SENT_EVENT
    );

    if (messageSentLog) {
      try {
        // Decode the event to get the message
        const decoded = decodeEventLog({
          abi: MESSAGE_SENT_ABI,
          data: messageSentLog.data,
          topics: messageSentLog.topics,
        });

        const message = decoded.args.message;
        const messageHash = keccak256(message);

        // Update bridge status with message hash
        updateBridgePhase(currentTrackingId, 'pending_attestation', {
          sourceTxHash: depositReceipt.transactionHash,
          messageHash,
        });

        setBridgeStep('monitoring');
        selectBridge(currentTrackingId);
      } catch (err) {
        console.error('[BridgePanel] Failed to parse MessageSent event:', err);
      }
    }
  }, [depositReceipt, currentTrackingId, updateBridgePhase, selectBridge]);

  // Handle MAX button
  const handleMax = useCallback(() => {
    if (baseBalance) {
      setAmount(baseBalance.formatted);
    }
  }, [baseBalance]);

  // Handle bridge initiation
  const handleBridge = async () => {
    if (!walletAddress || !amount || parseFloat(amount) <= 0) return;

    clearError();

    // Check chain
    if (chainId !== base.id) {
      try {
        switchChain({ chainId: base.id });
        return;
      } catch {
        return;
      }
    }

    try {
      const amountWei = parseUnits(amount, 6);
      const recipientBytes32 = addressToBytes32(walletAddress as Hex);

      // Step 1: Create tracking record
      const trackingId = await initiateBridge({
        amount: amountWei.toString(),
        destinationChain,
        walletAddress: walletAddress as string,
        userId: walletAddress as string, // Use wallet as user ID for now
        walletConnectionId: walletAddress as string, // Placeholder
      });

      if (!trackingId) {
        throw new Error('Failed to create bridge tracking record');
      }

      setCurrentTrackingId(trackingId);
      onBridgeInitiated?.(trackingId);

      // Step 2: Approve USDC
      setBridgeStep('approving');
      await writeApprove({
        address: BASE_USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TOKEN_MESSENGER, amountWei],
      });

      // Step 3: Call depositForBurn
      setBridgeStep('bridging');
      await writeDeposit({
        address: TOKEN_MESSENGER,
        abi: TOKEN_MESSENGER_ABI,
        functionName: 'depositForBurn',
        args: [amountWei, POLYGON_DOMAIN, recipientBytes32, BASE_USDC],
      });

      // Update bridge status to initiated
      await updateBridgePhase(trackingId, 'initiated', {
        sourceTxHash: depositTxHash,
      });

      // Refetch balance
      refetchBalance();
    } catch (err) {
      console.error('[BridgePanel] Bridge error:', err);
      setBridgeStep('input');
    }
  };

  // Show monitoring view if we have an active bridge
  if (bridgeStep === 'monitoring' && selectedBridgeId) {
    return (
      <div className="space-y-4">
        <BridgeStatusDisplay
          trackingId={selectedBridgeId}
          onComplete={() => {
            setBridgeStep('input');
            setCurrentTrackingId(null);
            selectBridge(null);
            refetchBalance();
          }}
        />
        <button
          onClick={() => {
            setBridgeStep('input');
            selectBridge(null);
          }}
          className="w-full py-2 text-xs border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] transition-colors"
        >
          BRIDGE MORE
        </button>
      </div>
    );
  }

  const isPending = isApproving || isDepositing || isWaitingDeposit || isInitiating;
  const amountNum = parseFloat(amount) || 0;
  const hasBalance = baseBalance && amountNum <= parseFloat(baseBalance.formatted);

  return (
    <div className="ascii-box p-4 space-y-4">
      {/* Header */}
      <h3 className="text-sm font-bold text-[hsl(var(--primary))]">
        [BRIDGE USDC]
      </h3>

      {/* Route Display */}
      <div className="flex items-center justify-between text-xs border border-[hsl(var(--border))] p-3">
        <div className="text-center">
          <div className="font-bold">BASE</div>
          <div className="text-[hsl(var(--muted-foreground))]">Source</div>
        </div>
        <div className="text-[hsl(var(--primary))]">→→→</div>
        <div className="text-center">
          <div className="font-bold">POLYGON</div>
          <div className="text-[hsl(var(--muted-foreground))]">Destination</div>
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
          AMOUNT (USDC)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            placeholder="0.00"
            disabled={isPending}
            className="flex-1 bg-black border border-[hsl(var(--border))] px-3 py-2 text-sm font-mono focus:border-[hsl(var(--primary))] focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleMax}
            disabled={isPending || !baseBalance}
            className="px-3 py-2 text-xs font-bold border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] disabled:opacity-50 transition-colors"
          >
            MAX
          </button>
        </div>
        {baseBalance && (
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
            Balance: ${parseFloat(baseBalance.formatted).toFixed(2)} USDC on Base
          </div>
        )}
      </div>

      {/* Fee Breakdown */}
      {!compact && (
        <div className="border border-[hsl(var(--border))] p-3 space-y-2">
          <div className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
            FEES
          </div>
          {isLoadingEstimate ? (
            <div className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse">
              Calculating...
            </div>
          ) : estimate ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">Bridge fee:</span>
                <span>${estimate.bridgeFeeUsd}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">Network gas:</span>
                <span>~$0.05</span>
              </div>
              <div className="flex justify-between text-xs border-t border-[hsl(var(--border))] pt-2">
                <span className="text-[hsl(var(--muted-foreground))]">You receive:</span>
                <span className="font-bold text-[hsl(var(--primary))]">
                  ${estimate.netAmountUsd} USDC
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">Est. time:</span>
                <span>{estimate.minMinutes}-{estimate.maxMinutes} min</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Enter an amount to see fees
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {lastError && (
        <div className="text-xs text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))] p-2">
          {lastError}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleBridge}
        disabled={
          isPending ||
          !isConnected ||
          !amount ||
          amountNum <= 0 ||
          !hasBalance
        }
        className={`w-full py-3 text-sm font-bold border transition-colors ${
          isPending || !isConnected || !amount || amountNum <= 0 || !hasBalance
            ? 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
            : 'border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black'
        }`}
      >
        {isApproving
          ? 'APPROVING USDC...'
          : isDepositing
            ? 'CONFIRM IN WALLET...'
            : isWaitingDeposit
              ? 'BRIDGING...'
              : isInitiating
                ? 'INITIATING...'
                : !isConnected
                  ? 'CONNECT WALLET'
                  : chainId !== base.id
                    ? 'SWITCH TO BASE'
                    : !hasBalance
                      ? 'INSUFFICIENT BALANCE'
                      : 'INITIATE BRIDGE'}
      </button>

      {/* Info */}
      <div className="text-[10px] text-[hsl(var(--muted-foreground))] text-center space-y-1">
        <p>Bridge uses Circle CCTP for secure cross-chain transfers.</p>
        <p>Typical completion time: 15-30 minutes.</p>
      </div>

      {/* Active Bridges List */}
      {Object.keys(activeBridges).length > 0 && (
        <div className="border-t border-[hsl(var(--border))] pt-4">
          <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] mb-2">
            ACTIVE BRIDGES
          </div>
          <div className="space-y-2">
            {Object.values(activeBridges)
              .filter((b) => !['completed', 'failed', 'abandoned'].includes(b.phase))
              .map((bridge) => (
                <button
                  key={bridge.trackingId}
                  onClick={() => {
                    selectBridge(bridge.trackingId);
                    setBridgeStep('monitoring');
                  }}
                  className="w-full flex items-center justify-between p-2 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
                    <span className="text-xs">${bridge.amountUsd} USDC</span>
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {bridge.phase.replace('_', ' ').toUpperCase()}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

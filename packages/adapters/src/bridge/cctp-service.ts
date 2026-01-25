/**
 * CCTP Bridge Service
 * Cross-chain USDC bridge service using Circle CCTP
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  type Account,
} from 'viem';
import { base, polygon, mainnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  type BridgeConfig,
  type BridgeRequest,
  type BridgeResult,
  type BridgeStatus,
  type BridgePhase,
  type AttestationResult,
  type AttestationOptions,
  type ClaimRequest,
  type ClaimResult,
  type BridgeTimeEstimate,
  type BridgeProgressEvent,
  type IBridgeService,
  type SupportedChain,
  CCTP_ADDRESSES,
  CCTP_DOMAINS,
  DEFAULT_BRIDGE_CONFIG,
} from './types';
import {
  TOKEN_MESSENGER_ABI,
  MESSAGE_TRANSMITTER_ABI,
  USDC_ABI,
  MESSAGE_SENT_EVENT_SIGNATURE,
} from './abi';

// =============================================================================
// Helpers
// =============================================================================

function generateTrackingId(): string {
  return `bridge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function addressToBytes32(address: `0x${string}`): `0x${string}` {
  // Pad address to 32 bytes
  return `0x000000000000000000000000${address.slice(2)}` as `0x${string}`;
}

function getChainConfig(chain: SupportedChain) {
  switch (chain) {
    case 'BASE':
      return { viemChain: base, addresses: CCTP_ADDRESSES.BASE, domain: CCTP_DOMAINS.BASE };
    case 'POLYGON':
      return { viemChain: polygon, addresses: CCTP_ADDRESSES.POLYGON, domain: CCTP_DOMAINS.POLYGON };
    case 'ETHEREUM':
      return { viemChain: mainnet, addresses: CCTP_ADDRESSES.ETHEREUM, domain: CCTP_DOMAINS.ETHEREUM };
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

// =============================================================================
// Bridge Service Implementation
// =============================================================================

export class CCTPBridgeService implements IBridgeService {
  private config: BridgeConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem client types are complex with chain-specific types
  private sourceClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem client types are complex with chain-specific types
  private destClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem client types are complex with chain-specific types
  private walletClient: any = null;
  private account: Account | null = null;

  private bridgeStatuses: Map<string, BridgeStatus> = new Map();
  private eventHandlers: Map<string, Set<(event: BridgeProgressEvent) => void>> = new Map();

  constructor(config: Partial<BridgeConfig> = {}) {
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...config };

    this.sourceClient = createPublicClient({
      chain: base,
      transport: http(this.config.sourceRpcUrl),
    });

    this.destClient = createPublicClient({
      chain: polygon,
      transport: http(this.config.destRpcUrl),
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
      transport: http(this.config.sourceRpcUrl),
    });
  }

  getWalletAddress(): `0x${string}` | null {
    return this.account?.address ?? null;
  }

  // ===========================================================================
  // Bridge Operations
  // ===========================================================================

  async initiateBridge(request: BridgeRequest): Promise<BridgeResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized. Call initializeWallet() first.');
    }

    // Validate request
    this.validateBridgeRequest(request);

    const recipient = request.recipient ?? this.account.address;
    const trackingId = generateTrackingId();
    const sourceChain: SupportedChain = 'BASE';
    const destConfig = getChainConfig(request.destinationChain);

    // Calculate fees if requested
    let netAmount = request.amount;
    let feeBreakdown;
    if (request.includeFee) {
      const bridgeFee = this.calculateBridgeFee(request.amount);
      netAmount = request.amount - bridgeFee;
      feeBreakdown = {
        bridgeFee,
        totalFee: bridgeFee,
        netAmount,
      };
    }

    // Check and handle approval if needed
    await this.ensureApproval(request.amount);

    // Execute depositForBurn
    const recipientBytes32 = addressToBytes32(recipient);

    const { request: txRequest } = await this.sourceClient.simulateContract({
      address: CCTP_ADDRESSES.BASE.TOKEN_MESSENGER,
      abi: TOKEN_MESSENGER_ABI,
      functionName: 'depositForBurn',
      args: [
        request.amount,
        destConfig.domain,
        recipientBytes32,
        CCTP_ADDRESSES.BASE.USDC,
      ],
      account: this.account,
    });

    const txHash = await this.walletClient.writeContract(txRequest);
    const receipt = await this.sourceClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== 'success') {
      throw new Error('Bridge transaction failed');
    }

    // Extract message from logs
    const { message, messageHash } = this.extractMessageFromLogs(receipt.logs);

    // Update status
    this.updateBridgeStatus(trackingId, 'initiated', {
      sourceChain,
      destinationChain: request.destinationChain,
      amount: request.amount,
      sourceTxHash: txHash,
      messageHash,
    });

    // Emit progress event
    this.emitProgress({
      trackingId,
      phase: 'initiated',
      txHash,
    });

    return {
      success: true,
      txHash,
      status: 'initiated',
      sourceChain,
      destinationChain: request.destinationChain,
      recipient,
      amount: request.amount,
      netAmount,
      messageHash,
      message,
      trackingId,
      feeBreakdown,
    };
  }

  async waitForAttestation(
    messageHash: string,
    options?: AttestationOptions
  ): Promise<AttestationResult> {
    const pollingInterval = options?.pollingInterval ?? this.config.pollingInterval;
    const maxAttempts = options?.maxAttempts ?? this.config.maxPollingAttempts;

    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `${this.config.attestationApiUrl}/${messageHash}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = (await response.json()) as { status: string; attestation?: string };

        if (data.status === 'complete' && data.attestation) {
          return {
            status: 'attested',
            attestation: data.attestation,
          };
        }

        // Still pending, wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        attempts++;
      } catch (error) {
        if (attempts >= maxAttempts - 1) {
          throw new Error('Failed to get attestation: ' + (error as Error).message);
        }
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));
        attempts++;
      }
    }

    throw new Error('Attestation timeout: max attempts reached');
  }

  async claimOnDestination(request: ClaimRequest): Promise<ClaimResult> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized. Call initializeWallet() first.');
    }

    // Validate inputs
    if (!request.message.match(/^0x[a-fA-F0-9]+$/)) {
      throw new Error('Invalid message format');
    }
    if (!request.attestation.match(/^0x[a-fA-F0-9]+$/)) {
      throw new Error('Invalid attestation format');
    }

    const destConfig = getChainConfig(request.destinationChain);

    // Create wallet client for destination chain
    const destWalletClient = createWalletClient({
      account: this.account,
      chain: destConfig.viemChain,
      transport: http(this.config.destRpcUrl),
    });

    try {
      const { request: txRequest } = await this.destClient.simulateContract({
        address: destConfig.addresses.MESSAGE_TRANSMITTER,
        abi: MESSAGE_TRANSMITTER_ABI,
        functionName: 'receiveMessage',
        args: [request.message as `0x${string}`, request.attestation as `0x${string}`],
        account: this.account,
      });

      const txHash = await destWalletClient.writeContract(txRequest);
      const receipt = await this.destClient.waitForTransactionReceipt({ hash: txHash });

      return {
        success: receipt.status === 'success',
        txHash,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async executeBridge(request: BridgeRequest): Promise<{
    success: boolean;
    sourceTxHash: `0x${string}`;
    destTxHash: `0x${string}`;
    trackingId: string;
  }> {
    // Step 1: Initiate bridge
    const initResult = await this.initiateBridge(request);

    if (!initResult.messageHash || !initResult.message) {
      throw new Error('Failed to extract message from bridge initiation');
    }

    // Update status
    this.updateBridgeStatus(initResult.trackingId!, 'pending_attestation');
    this.emitProgress({
      trackingId: initResult.trackingId!,
      phase: 'pending_attestation',
    });

    // Step 2: Wait for attestation
    const attestResult = await this.waitForAttestation(initResult.messageHash);

    if (attestResult.status !== 'attested' || !attestResult.attestation) {
      throw new Error('Failed to get attestation');
    }

    // Update status
    this.updateBridgeStatus(initResult.trackingId!, 'attested', {
      attestation: attestResult.attestation,
    });
    this.emitProgress({
      trackingId: initResult.trackingId!,
      phase: 'attested',
    });

    // Step 3: Claim on destination
    this.updateBridgeStatus(initResult.trackingId!, 'claiming');
    const claimResult = await this.claimOnDestination({
      message: initResult.message,
      attestation: attestResult.attestation,
      destinationChain: request.destinationChain,
    });

    if (!claimResult.success) {
      this.updateBridgeStatus(initResult.trackingId!, 'failed', {
        error: claimResult.error,
      });
      throw new Error(`Failed to claim on destination: ${claimResult.error}`);
    }

    // Update final status
    this.updateBridgeStatus(initResult.trackingId!, 'completed', {
      destTxHash: claimResult.txHash,
    });
    this.emitProgress({
      trackingId: initResult.trackingId!,
      phase: 'completed',
      txHash: claimResult.txHash,
    });

    return {
      success: true,
      sourceTxHash: initResult.txHash,
      destTxHash: claimResult.txHash!,
      trackingId: initResult.trackingId!,
    };
  }

  // ===========================================================================
  // Status Tracking
  // ===========================================================================

  getBridgeStatus(trackingId: string): BridgeStatus | null {
    return this.bridgeStatuses.get(trackingId) ?? null;
  }

  updateBridgeStatus(
    trackingId: string,
    phase: BridgePhase,
    data?: Partial<BridgeStatus>
  ): void {
    const existing = this.bridgeStatuses.get(trackingId);
    const now = new Date();

    const status: BridgeStatus = {
      trackingId,
      phase,
      sourceChain: data?.sourceChain ?? existing?.sourceChain ?? 'BASE',
      destinationChain: data?.destinationChain ?? existing?.destinationChain ?? 'POLYGON',
      amount: data?.amount ?? existing?.amount ?? 0n,
      sourceTxHash: data?.sourceTxHash ?? existing?.sourceTxHash,
      destTxHash: data?.destTxHash ?? existing?.destTxHash,
      messageHash: data?.messageHash ?? existing?.messageHash,
      attestation: data?.attestation ?? existing?.attestation,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      estimatedCompletionTime: this.calculateEstimatedCompletion(phase),
      error: data?.error ?? existing?.error,
    };

    this.bridgeStatuses.set(trackingId, status);
  }

  getActiveBridges(): BridgeStatus[] {
    const active: BridgeStatus[] = [];
    for (const status of this.bridgeStatuses.values()) {
      if (status.phase !== 'completed' && status.phase !== 'failed' && status.phase !== 'abandoned') {
        active.push(status);
      }
    }
    return active;
  }

  markBridgeAbandoned(trackingId: string): void {
    this.updateBridgeStatus(trackingId, 'abandoned');
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  calculateBridgeFee(_amount: bigint): bigint {
    // Fixed fee of $0.10 in USDC (6 decimals)
    return this.config.bridgeFee;
  }

  estimateBridgeTime(_destinationChain: SupportedChain): BridgeTimeEstimate {
    // CCTP typically takes 15-30 minutes
    // Attestation time varies but usually 10-15 mins
    return {
      minSeconds: 600,    // 10 minutes minimum
      maxSeconds: 2400,   // 40 minutes maximum
      averageSeconds: 1200, // 20 minutes average
    };
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  on(event: 'bridgeProgress', handler: (event: BridgeProgressEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: 'bridgeProgress', handler: (event: BridgeProgressEvent) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private validateBridgeRequest(request: BridgeRequest): void {
    if (request.amount <= 0n) {
      throw new Error('Amount must be greater than 0');
    }

    if (request.recipient && !request.recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid recipient address');
    }

    if (request.destinationChain !== 'POLYGON' && request.destinationChain !== 'ETHEREUM') {
      throw new Error('Unsupported destination chain');
    }
  }

  private async ensureApproval(amount: bigint): Promise<void> {
    if (!this.account) return;

    const allowance = (await this.sourceClient.readContract({
      address: CCTP_ADDRESSES.BASE.USDC,
      abi: USDC_ABI,
      functionName: 'allowance',
      args: [this.account.address, CCTP_ADDRESSES.BASE.TOKEN_MESSENGER],
    })) as bigint;

    if (allowance < amount) {
      const { request: approveRequest } = await this.sourceClient.simulateContract({
        address: CCTP_ADDRESSES.BASE.USDC,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CCTP_ADDRESSES.BASE.TOKEN_MESSENGER, amount],
        account: this.account,
      });

      const approveTx = await this.walletClient.writeContract(approveRequest);
      await this.sourceClient.waitForTransactionReceipt({ hash: approveTx });
    }
  }

  private extractMessageFromLogs(logs: readonly any[]): { message: string; messageHash: string } {
    // Find MessageSent event
    const messageSentLog = logs.find(
      (log) =>
        log.address.toLowerCase() === CCTP_ADDRESSES.BASE.MESSAGE_TRANSMITTER.toLowerCase() &&
        log.topics[0] === MESSAGE_SENT_EVENT_SIGNATURE
    );

    if (!messageSentLog) {
      throw new Error('Failed to extract message from transaction logs');
    }

    // The message is in the data field
    const message = messageSentLog.data;
    const messageHash = keccak256(toBytes(message));

    return { message, messageHash };
  }

  private calculateEstimatedCompletion(phase: BridgePhase): Date {
    const now = new Date();
    const estimate = this.estimateBridgeTime('POLYGON');

    switch (phase) {
      case 'initiated':
        return new Date(now.getTime() + estimate.averageSeconds * 1000);
      case 'pending_attestation':
        return new Date(now.getTime() + (estimate.averageSeconds * 0.6) * 1000);
      case 'attested':
        return new Date(now.getTime() + (estimate.averageSeconds * 0.2) * 1000);
      case 'claiming':
        return new Date(now.getTime() + 60000); // 1 minute
      default:
        return now;
    }
  }

  private emitProgress(event: BridgeProgressEvent): void {
    const handlers = this.eventHandlers.get('bridgeProgress');
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch {
          // Ignore handler errors
        }
      }
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new CCTP bridge service
 */
export function createBridgeService(config?: Partial<BridgeConfig>): CCTPBridgeService {
  return new CCTPBridgeService(config);
}

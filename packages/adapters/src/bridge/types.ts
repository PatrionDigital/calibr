/**
 * CCTP Bridge Types
 * Type definitions for Circle CCTP bridge integration
 */

// =============================================================================
// Chain Configuration
// =============================================================================

export type SupportedChain = 'BASE' | 'POLYGON' | 'ETHEREUM';

export interface ChainAddresses {
  TOKEN_MESSENGER: `0x${string}`;
  MESSAGE_TRANSMITTER: `0x${string}`;
  USDC: `0x${string}`;
}

export interface CCTPAddresses {
  BASE: ChainAddresses;
  POLYGON: ChainAddresses;
  ETHEREUM: ChainAddresses;
}

// =============================================================================
// Domain IDs (Circle CCTP specific)
// =============================================================================

export const CCTP_DOMAINS = {
  ETHEREUM: 0,
  AVALANCHE: 1,
  OPTIMISM: 2,
  ARBITRUM: 3,
  NOBLE: 4,
  SOLANA: 5,
  BASE: 6,
  POLYGON: 7,
} as const;

export type CCTPDomain = (typeof CCTP_DOMAINS)[keyof typeof CCTP_DOMAINS];

// =============================================================================
// Contract Addresses
// =============================================================================

export const CCTP_ADDRESSES: CCTPAddresses = {
  BASE: {
    TOKEN_MESSENGER: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    MESSAGE_TRANSMITTER: '0xAD09780d193884d503182aD4588450C416D6F9D4',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  POLYGON: {
    TOKEN_MESSENGER: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
    MESSAGE_TRANSMITTER: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
  ETHEREUM: {
    TOKEN_MESSENGER: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
    MESSAGE_TRANSMITTER: '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
};

// =============================================================================
// Bridge Configuration
// =============================================================================

export interface BridgeConfig {
  sourceRpcUrl: string;
  destRpcUrl: string;
  attestationApiUrl: string;
  bridgeFee: bigint;
  feeRecipient?: `0x${string}`;
  pollingInterval: number;
  maxPollingAttempts: number;
}

export const DEFAULT_BRIDGE_CONFIG: BridgeConfig = {
  sourceRpcUrl: 'https://mainnet.base.org',
  destRpcUrl: 'https://polygon-rpc.com',
  attestationApiUrl: 'https://iris-api.circle.com/attestations',
  bridgeFee: 100000n, // $0.10 in USDC (6 decimals)
  pollingInterval: 10000, // 10 seconds
  maxPollingAttempts: 180, // 30 minutes
};

// =============================================================================
// Bridge Request/Response Types
// =============================================================================

export interface BridgeRequest {
  amount: bigint;
  recipient?: `0x${string}`;
  destinationChain: 'POLYGON' | 'ETHEREUM';
  includeFee?: boolean;
}

export type BridgePhase =
  | 'initiated'
  | 'pending_attestation'
  | 'attested'
  | 'claiming'
  | 'completed'
  | 'failed'
  | 'abandoned';

export interface BridgeResult {
  success: boolean;
  txHash: `0x${string}`;
  status: BridgePhase;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  recipient: `0x${string}`;
  amount: bigint;
  netAmount?: bigint;
  messageHash?: string;
  message?: string;
  trackingId?: string;
  feeBreakdown?: {
    bridgeFee: bigint;
    totalFee: bigint;
    netAmount: bigint;
  };
}

export interface BridgeStatus {
  trackingId: string;
  phase: BridgePhase;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: bigint;
  sourceTxHash?: `0x${string}`;
  destTxHash?: `0x${string}`;
  messageHash?: string;
  attestation?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedCompletionTime?: Date;
  error?: string;
}

export interface AttestationResult {
  status: 'pending' | 'attested';
  attestation?: string;
  message?: string;
}

export interface ClaimRequest {
  message: string;
  attestation: string;
  destinationChain: 'POLYGON' | 'ETHEREUM';
}

export interface ClaimResult {
  success: boolean;
  txHash?: `0x${string}`;
  error?: string;
}

export interface AttestationOptions {
  pollingInterval?: number;
  maxAttempts?: number;
}

export interface BridgeTimeEstimate {
  minSeconds: number;
  maxSeconds: number;
  averageSeconds: number;
}

export interface BridgeProgressEvent {
  trackingId: string;
  phase: BridgePhase;
  txHash?: `0x${string}`;
  error?: string;
}

// =============================================================================
// Bridge Service Interface
// =============================================================================

export interface IBridgeService {
  // Wallet management
  initializeWallet(privateKey: `0x${string}`): Promise<void>;
  getWalletAddress(): `0x${string}` | null;

  // Bridge operations
  initiateBridge(request: BridgeRequest): Promise<BridgeResult>;
  waitForAttestation(
    messageHash: string,
    options?: AttestationOptions
  ): Promise<AttestationResult>;
  claimOnDestination(request: ClaimRequest): Promise<ClaimResult>;
  executeBridge(request: BridgeRequest): Promise<{
    success: boolean;
    sourceTxHash: `0x${string}`;
    destTxHash: `0x${string}`;
    trackingId: string;
  }>;

  // Status tracking
  getBridgeStatus(trackingId: string): BridgeStatus | null;
  updateBridgeStatus(
    trackingId: string,
    phase: BridgePhase,
    data?: Partial<BridgeStatus>
  ): void;
  getActiveBridges(): BridgeStatus[];
  markBridgeAbandoned(trackingId: string): void;

  // Utility methods
  calculateBridgeFee(amount: bigint): bigint;
  estimateBridgeTime(destinationChain: SupportedChain): BridgeTimeEstimate;

  // Events
  on(event: 'bridgeProgress', handler: (event: BridgeProgressEvent) => void): void;
  off(event: 'bridgeProgress', handler: (event: BridgeProgressEvent) => void): void;
}

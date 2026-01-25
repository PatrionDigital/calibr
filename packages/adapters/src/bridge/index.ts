/**
 * Bridge Module
 * Cross-chain USDC bridge infrastructure using Circle CCTP
 */

// Types
export type {
  SupportedChain,
  ChainAddresses,
  CCTPAddresses,
  CCTPDomain,
  BridgeConfig,
  BridgeRequest,
  BridgePhase,
  BridgeResult,
  BridgeStatus,
  AttestationResult,
  AttestationOptions,
  ClaimRequest,
  ClaimResult,
  BridgeTimeEstimate,
  BridgeProgressEvent,
  IBridgeService,
} from './types';

// Constants
export {
  CCTP_DOMAINS,
  CCTP_ADDRESSES,
  DEFAULT_BRIDGE_CONFIG,
} from './types';

// ABIs
export {
  TOKEN_MESSENGER_ABI,
  MESSAGE_TRANSMITTER_ABI,
  USDC_ABI,
  MESSAGE_SENT_EVENT_SIGNATURE,
} from './abi';

// Service
export {
  CCTPBridgeService,
  createBridgeService,
} from './cctp-service';

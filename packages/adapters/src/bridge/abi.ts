/**
 * CCTP Contract ABIs
 * ABI definitions for Circle CCTP contracts
 */

/**
 * TokenMessenger ABI (partial - bridge functions only)
 * Used for depositing USDC for cross-chain transfer
 */
export const TOKEN_MESSENGER_ABI = [
  // depositForBurn - Initiate cross-chain transfer
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
    ],
    name: 'depositForBurn',
    outputs: [{ name: 'nonce', type: 'uint64' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // depositForBurnWithCaller - Initiate with specific caller
  {
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
    ],
    name: 'depositForBurnWithCaller',
    outputs: [{ name: 'nonce', type: 'uint64' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Read functions
  {
    inputs: [],
    name: 'localMessageTransmitter',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'localDomain',
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * MessageTransmitter ABI (partial)
 * Used for receiving/claiming messages on destination chain
 */
export const MESSAGE_TRANSMITTER_ABI = [
  // receiveMessage - Claim minted tokens
  {
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    name: 'receiveMessage',
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Read functions
  {
    inputs: [],
    name: 'localDomain',
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'nonce', type: 'bytes32' }],
    name: 'usedNonces',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'message', type: 'bytes' },
    ],
    name: 'MessageSent',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'caller', type: 'address' },
      { indexed: false, name: 'sourceDomain', type: 'uint32' },
      { indexed: false, name: 'nonce', type: 'uint64' },
      { indexed: false, name: 'sender', type: 'bytes32' },
      { indexed: false, name: 'messageBody', type: 'bytes' },
    ],
    name: 'MessageReceived',
    type: 'event',
  },
] as const;

/**
 * ERC20 ABI (for USDC approval)
 */
export const USDC_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * MessageSent event signature for parsing logs
 */
export const MESSAGE_SENT_EVENT_SIGNATURE =
  '0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036';

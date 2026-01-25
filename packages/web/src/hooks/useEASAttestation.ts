/**
 * React Hook for EAS Attestations
 * Uses wagmi for wallet interaction
 * Supports on-chain, off-chain, and Merkle (private) attestation modes
 */

'use client';

import { useState, useCallback } from 'react';
import { useAccount, useChainId, useWriteContract, usePublicClient, useSignMessage } from 'wagmi';
import {
  EAS_ABI,
  SCHEMA_REGISTRY_ABI,
  FORECAST_SCHEMA,
  getEASConfig,
  getAttestationUrl,
  getForecastSchemaUid,
  SCHEMA_UIDS,
  type ForecastAttestationData,
  type AttestationResult,
} from '@/lib/eas';
import { encodeAbiParameters, parseAbiParameters, keccak256, type Address } from 'viem';
import type { AttestationMode } from '@/lib/stores/privacy-store';

// =============================================================================
// Types
// =============================================================================

export interface OffchainAttestationResult {
  uid: Address;
  signature: `0x${string}`;
  timestamp: number;
  data: ForecastAttestationData;
  ipfsCid?: string;
}

export interface MerkleAttestationResult {
  uid: Address;
  txHash?: Address;
  merkleRoot: `0x${string}`;
  leaves: MerkleLeaf[];
  proofs: Record<string, `0x${string}`[]>;
  easScanUrl?: string;
}

export interface MerkleLeaf {
  index: number;
  name: string;
  type: string;
  value: unknown;
  hash: `0x${string}`;
}

export interface SelectiveDisclosureProof {
  merkleRoot: `0x${string}`;
  revealedFields: Array<{
    name: string;
    value: unknown;
    proof: `0x${string}`[];
  }>;
}

export interface UseEASAttestationReturn {
  // State
  isLoading: boolean;
  error: string | null;
  lastAttestation: AttestationResult | null;
  lastOffchainAttestation: OffchainAttestationResult | null;
  lastMerkleAttestation: MerkleAttestationResult | null;

  // Schema registration
  schemaUid: Address | null;
  isSchemaRegistered: boolean;
  registerSchema: () => Promise<Address | null>;

  // On-chain attestation
  createForecastAttestation: (
    data: ForecastAttestationData,
    recipient?: Address
  ) => Promise<AttestationResult | null>;

  // Off-chain attestation
  createOffchainAttestation: (
    data: ForecastAttestationData,
    recipient?: Address
  ) => Promise<OffchainAttestationResult | null>;

  // Merkle (private) attestation
  createMerkleAttestation: (
    data: ForecastAttestationData,
    recipient?: Address
  ) => Promise<MerkleAttestationResult | null>;

  // Unified attestation (uses mode)
  createAttestation: (
    data: ForecastAttestationData,
    mode: AttestationMode,
    recipient?: Address
  ) => Promise<AttestationResult | OffchainAttestationResult | MerkleAttestationResult | null>;

  // Verification
  getAttestation: (uid: Address) => Promise<{
    uid: Address;
    schema: Address;
    time: bigint;
    expirationTime: bigint;
    revocationTime: bigint;
    refUID: Address;
    recipient: Address;
    attester: Address;
    revocable: boolean;
    data: `0x${string}`;
  } | null>;
  isAttestationValid: (uid: Address) => Promise<boolean>;

  // Selective disclosure
  generateProof: (
    attestation: MerkleAttestationResult,
    fieldsToReveal: string[]
  ) => SelectiveDisclosureProof | null;
  verifyProof: (proof: SelectiveDisclosureProof) => boolean;

  // Utilities
  checkSchemaExists: (uid: Address) => Promise<boolean>;
  reset: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useEASAttestation(): UseEASAttestationReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAttestation, setLastAttestation] = useState<AttestationResult | null>(null);
  const [lastOffchainAttestation, setLastOffchainAttestation] = useState<OffchainAttestationResult | null>(null);
  const [lastMerkleAttestation, setLastMerkleAttestation] = useState<MerkleAttestationResult | null>(null);

  // Get the deployed schema UID for the current chain
  const deployedSchemaUid = getForecastSchemaUid(chainId);
  const [schemaUid, setSchemaUid] = useState<Address | null>(deployedSchemaUid || null);
  const [isSchemaRegistered, setIsSchemaRegistered] = useState(!!deployedSchemaUid);

  // Get private data schema UID
  const privateDataSchemaUid = chainId === 84532
    ? SCHEMA_UIDS.baseSepolia.privateData
    : SCHEMA_UIDS.base.privateData;

  /**
   * Get EAS config for current chain
   */
  const getConfig = useCallback(() => {
    try {
      return getEASConfig(chainId);
    } catch {
      // Default to Base Sepolia for development
      return getEASConfig(84532);
    }
  }, [chainId]);

  /**
   * Check if a schema exists
   */
  const checkSchemaExists = useCallback(
    async (uid: Address): Promise<boolean> => {
      if (!publicClient) return false;

      const config = getConfig();

      try {
        const result = await publicClient.readContract({
          address: config.schemaRegistry,
          abi: SCHEMA_REGISTRY_ABI,
          functionName: 'getSchema',
          args: [uid],
        });

        // If uid is returned and not zero, schema exists
        return result.uid !== '0x0000000000000000000000000000000000000000000000000000000000000000';
      } catch {
        return false;
      }
    },
    [publicClient, getConfig]
  );

  /**
   * Register the forecast schema
   */
  const registerSchema = useCallback(async (): Promise<Address | null> => {
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const config = getConfig();

      // Register schema with no resolver and revocable=true
      const txHash = await writeContractAsync({
        address: config.schemaRegistry,
        abi: SCHEMA_REGISTRY_ABI,
        functionName: 'register',
        args: [
          FORECAST_SCHEMA,
          '0x0000000000000000000000000000000000000000' as Address, // No resolver
          true, // Revocable
        ],
      });

      // Wait for transaction and get the schema UID from logs
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        // The schema UID is the return value, which we can find in the transaction logs
        // For now, compute it deterministically
        const uid = receipt.logs[0]?.topics[1] as Address | undefined;

        if (uid) {
          setSchemaUid(uid);
          setIsSchemaRegistered(true);
          return uid;
        }
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register schema';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, getConfig, writeContractAsync, publicClient]);

  /**
   * Create a forecast attestation
   */
  const createForecastAttestation = useCallback(
    async (
      data: ForecastAttestationData,
      recipient?: Address
    ): Promise<AttestationResult | null> => {
      if (!isConnected || !address) {
        setError('Wallet not connected');
        return null;
      }

      // Use deployed schema UID or manually set one
      const activeSchemaUid = schemaUid || deployedSchemaUid;
      if (!activeSchemaUid) {
        setError('Schema not available for this chain. Please switch to Base Sepolia.');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const config = getConfig();
        const recipientAddress = recipient || address;

        // Encode the attestation data
        const encodedData = encodeAbiParameters(
          parseAbiParameters('uint256,string,string,uint256,string,bool'),
          [
            BigInt(data.probability),
            data.marketId,
            data.platform,
            BigInt(data.confidence),
            data.reasoning,
            data.isPublic,
          ]
        );

        // Create the attestation
        const txHash = await writeContractAsync({
          address: config.eas,
          abi: EAS_ABI,
          functionName: 'attest',
          args: [
            {
              schema: activeSchemaUid,
              data: {
                recipient: recipientAddress,
                expirationTime: 0n, // No expiration
                revocable: true,
                refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as Address,
                data: encodedData,
                value: 0n,
              },
            },
          ],
        });

        // Wait for transaction and get the attestation UID from logs
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

          // Find the Attested event log
          // Event: Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)
          const attestedLog = receipt.logs.find(
            (log) => log.topics[0] === '0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75685141b35'
          );

          // The UID is in the log data
          const uid = attestedLog?.data?.slice(0, 66) as Address | undefined;

          if (uid) {
            const result: AttestationResult = {
              uid,
              txHash: txHash as Address,
              easScanUrl: getAttestationUrl(uid, chainId),
            };

            setLastAttestation(result);
            return result;
          }
        }

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create attestation';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, address, schemaUid, deployedSchemaUid, getConfig, writeContractAsync, publicClient, chainId]
  );

  /**
   * Create an off-chain attestation (signed but not submitted to blockchain)
   */
  const createOffchainAttestation = useCallback(
    async (
      data: ForecastAttestationData,
      recipient?: Address
    ): Promise<OffchainAttestationResult | null> => {
      if (!isConnected || !address) {
        setError('Wallet not connected');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const recipientAddress = recipient || address;

        // Create attestation message to sign
        const message = JSON.stringify({
          schema: FORECAST_SCHEMA,
          recipient: recipientAddress,
          time: timestamp,
          expirationTime: 0,
          revocable: true,
          data: {
            probability: data.probability,
            marketId: data.marketId,
            platform: data.platform,
            confidence: data.confidence,
            reasoning: data.reasoning,
            isPublic: data.isPublic,
          },
        });

        // Sign the message
        const signature = await signMessageAsync({ message });

        // Generate a unique ID based on the signature
        const uid = keccak256(signature) as Address;

        const result: OffchainAttestationResult = {
          uid,
          signature,
          timestamp,
          data,
        };

        setLastOffchainAttestation(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create off-chain attestation';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, address, signMessageAsync]
  );

  /**
   * Create a Merkle tree attestation (private with selective disclosure)
   */
  const createMerkleAttestation = useCallback(
    async (
      data: ForecastAttestationData,
      recipient?: Address
    ): Promise<MerkleAttestationResult | null> => {
      if (!isConnected || !address) {
        setError('Wallet not connected');
        return null;
      }

      if (!privateDataSchemaUid) {
        setError('Private data schema not available for this chain');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const recipientAddress = recipient || address;

        // Create Merkle tree from forecast data
        const fields = [
          { name: 'probability', type: 'uint256', value: data.probability },
          { name: 'marketId', type: 'string', value: data.marketId },
          { name: 'platform', type: 'string', value: data.platform },
          { name: 'confidence', type: 'uint256', value: data.confidence },
          { name: 'reasoning', type: 'string', value: data.reasoning },
          { name: 'isPublic', type: 'bool', value: data.isPublic },
        ];

        // Create leaf hashes
        const leaves: MerkleLeaf[] = fields.map((field, index) => {
          const encoded = encodeAbiParameters(
            parseAbiParameters('string, string, bytes'),
            [field.name, field.type, encodeFieldValue(field.type, field.value)]
          );
          return {
            index,
            name: field.name,
            type: field.type,
            value: field.value,
            hash: keccak256(encoded),
          };
        });

        // Compute Merkle root
        const merkleRoot = computeMerkleRoot(leaves.map(l => l.hash));

        // Compute proofs for each leaf
        const proofs: Record<string, `0x${string}`[]> = {};
        leaves.forEach((leaf, index) => {
          proofs[leaf.name] = computeMerkleProof(leaves.map(l => l.hash), index);
        });

        // Encode private data attestation
        const encodedData = encodeAbiParameters(
          parseAbiParameters('bytes32, string, uint256'),
          [merkleRoot, 'FORECAST', BigInt(fields.length)]
        );

        const config = getConfig();

        // Create on-chain attestation with just the merkle root
        const txHash = await writeContractAsync({
          address: config.eas,
          abi: EAS_ABI,
          functionName: 'attest',
          args: [
            {
              schema: privateDataSchemaUid,
              data: {
                recipient: recipientAddress,
                expirationTime: 0n,
                revocable: true,
                refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as Address,
                data: encodedData,
                value: 0n,
              },
            },
          ],
        });

        // Wait for transaction
        let uid: Address | undefined;
        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
          const attestedLog = receipt.logs.find(
            (log) => log.topics[0] === '0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75685141b35'
          );
          uid = attestedLog?.data?.slice(0, 66) as Address | undefined;
        }

        const result: MerkleAttestationResult = {
          uid: uid || (keccak256(merkleRoot) as Address),
          txHash: txHash as Address,
          merkleRoot,
          leaves,
          proofs,
          easScanUrl: uid ? getAttestationUrl(uid, chainId) : undefined,
        };

        setLastMerkleAttestation(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create Merkle attestation';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, address, privateDataSchemaUid, getConfig, writeContractAsync, publicClient, chainId]
  );

  /**
   * Unified attestation creation based on mode
   */
  const createAttestation = useCallback(
    async (
      data: ForecastAttestationData,
      mode: AttestationMode,
      recipient?: Address
    ) => {
      switch (mode) {
        case 'ON_CHAIN':
          return createForecastAttestation(data, recipient);
        case 'OFF_CHAIN':
          return createOffchainAttestation(data, recipient);
        case 'PRIVATE':
          return createMerkleAttestation(data, recipient);
        default:
          return createForecastAttestation(data, recipient);
      }
    },
    [createForecastAttestation, createOffchainAttestation, createMerkleAttestation]
  );

  /**
   * Get an attestation by UID
   */
  const getAttestation = useCallback(
    async (uid: Address) => {
      if (!publicClient) return null;

      const config = getConfig();

      try {
        const result = await publicClient.readContract({
          address: config.eas,
          abi: EAS_ABI,
          functionName: 'getAttestation',
          args: [uid],
        });

        if (result.uid === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          return null;
        }

        return result;
      } catch {
        return null;
      }
    },
    [publicClient, getConfig]
  );

  /**
   * Check if an attestation is valid
   */
  const isAttestationValid = useCallback(
    async (uid: Address): Promise<boolean> => {
      if (!publicClient) return false;

      const config = getConfig();

      try {
        const result = await publicClient.readContract({
          address: config.eas,
          abi: EAS_ABI,
          functionName: 'isAttestationValid',
          args: [uid],
        });

        return result;
      } catch {
        return false;
      }
    },
    [publicClient, getConfig]
  );

  /**
   * Generate a selective disclosure proof
   */
  const generateProof = useCallback(
    (attestation: MerkleAttestationResult, fieldsToReveal: string[]): SelectiveDisclosureProof | null => {
      const revealedFields = fieldsToReveal.map(fieldName => {
        const leaf = attestation.leaves.find(l => l.name === fieldName);
        if (!leaf) return null;

        return {
          name: leaf.name,
          value: leaf.value,
          proof: attestation.proofs[fieldName] || [],
        };
      }).filter((f): f is NonNullable<typeof f> => f !== null);

      if (revealedFields.length === 0) return null;

      return {
        merkleRoot: attestation.merkleRoot,
        revealedFields,
      };
    },
    []
  );

  /**
   * Verify a selective disclosure proof
   */
  const verifyProof = useCallback(
    (proof: SelectiveDisclosureProof): boolean => {
      for (const field of proof.revealedFields) {
        // Reconstruct leaf hash
        const type = inferType(field.value);
        const encoded = encodeAbiParameters(
          parseAbiParameters('string, string, bytes'),
          [field.name, type, encodeFieldValue(type, field.value)]
        );
        const leafHash = keccak256(encoded);

        // Verify against root using proof
        let current = leafHash;
        for (const sibling of field.proof) {
          current = sortAndHash(current, sibling);
        }

        if (current !== proof.merkleRoot) {
          return false;
        }
      }

      return true;
    },
    []
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setError(null);
    setLastAttestation(null);
    setLastOffchainAttestation(null);
    setLastMerkleAttestation(null);
  }, []);

  return {
    isLoading,
    error,
    lastAttestation,
    lastOffchainAttestation,
    lastMerkleAttestation,
    schemaUid,
    isSchemaRegistered,
    registerSchema,
    createForecastAttestation,
    createOffchainAttestation,
    createMerkleAttestation,
    createAttestation,
    getAttestation,
    isAttestationValid,
    generateProof,
    verifyProof,
    checkSchemaExists,
    reset,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function encodeFieldValue(type: string, value: unknown): `0x${string}` {
  switch (type) {
    case 'uint256':
      return encodeAbiParameters(parseAbiParameters('uint256'), [BigInt(value as number)]);
    case 'string':
      return encodeAbiParameters(parseAbiParameters('string'), [value as string]);
    case 'bool':
      return encodeAbiParameters(parseAbiParameters('bool'), [value as boolean]);
    case 'bytes32':
      return value as `0x${string}`;
    case 'address':
      return encodeAbiParameters(parseAbiParameters('address'), [value as `0x${string}`]);
    default:
      return encodeAbiParameters(parseAbiParameters('string'), [String(value)]);
  }
}

function inferType(value: unknown): string {
  if (typeof value === 'string') {
    if (value.startsWith('0x') && value.length === 66) return 'bytes32';
    if (value.startsWith('0x') && value.length === 42) return 'address';
    return 'string';
  }
  if (typeof value === 'number' || typeof value === 'bigint') return 'uint256';
  if (typeof value === 'boolean') return 'bool';
  return 'string';
}

function computeMerkleRoot(hashes: `0x${string}`[]): `0x${string}` {
  if (hashes.length === 0) {
    throw new Error('Cannot compute root of empty tree');
  }

  if (hashes.length === 1) {
    return hashes[0]!;
  }

  // Pad to power of 2
  const paddedHashes = [...hashes];
  while (paddedHashes.length & (paddedHashes.length - 1)) {
    paddedHashes.push('0x0000000000000000000000000000000000000000000000000000000000000000');
  }

  let currentLevel = paddedHashes;
  while (currentLevel.length > 1) {
    const nextLevel: `0x${string}`[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = currentLevel[i + 1]!;
      nextLevel.push(sortAndHash(left, right));
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0]!;
}

function computeMerkleProof(hashes: `0x${string}`[], index: number): `0x${string}`[] {
  const proof: `0x${string}`[] = [];

  // Pad to power of 2
  const paddedHashes = [...hashes];
  while (paddedHashes.length & (paddedHashes.length - 1)) {
    paddedHashes.push('0x0000000000000000000000000000000000000000000000000000000000000000');
  }

  let currentLevel = paddedHashes;
  let currentIndex = index;

  while (currentLevel.length > 1) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    proof.push(currentLevel[siblingIndex]!);

    const nextLevel: `0x${string}`[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = currentLevel[i + 1]!;
      nextLevel.push(sortAndHash(left, right));
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

function sortAndHash(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  const sorted: [`0x${string}`, `0x${string}`] = a < b ? [a, b] : [b, a];
  return keccak256(
    encodeAbiParameters(parseAbiParameters('bytes32, bytes32'), sorted)
  );
}

/**
 * Privacy Utilities for EAS
 * Implements Merkle tree based private data attestations with selective disclosure
 */

import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { MerkleTreeData, MerkleLeaf, SelectiveDisclosureProof, RevealedField } from '../types/eas';

// =============================================================================
// Types
// =============================================================================

interface MerkleInput {
  name: string;
  type: string;
  value: unknown;
}

// =============================================================================
// Merkle Tree Implementation
// =============================================================================

/**
 * Create a Merkle tree from data fields
 * @param inputs Array of name/type/value objects
 * @returns MerkleTreeData with root, leaves, and depth
 */
export function createMerkleTree(inputs: MerkleInput[]): MerkleTreeData {
  if (inputs.length === 0) {
    throw new Error('Cannot create Merkle tree with no inputs');
  }

  // Create leaf hashes
  const leaves: MerkleLeaf[] = inputs.map((input, index) => {
    const hash = hashLeaf(input);
    return {
      index,
      name: input.name,
      type: input.type,
      value: input.value,
      hash,
    };
  });

  // Build tree and get root
  const hashes = leaves.map((l) => l.hash);
  const root = computeMerkleRoot(hashes);
  const depth = Math.ceil(Math.log2(leaves.length));

  return {
    root,
    leaves,
    depth,
  };
}

/**
 * Generate a proof for specific fields
 * @param tree The full Merkle tree data
 * @param fieldIndices Indices of fields to reveal
 * @returns SelectiveDisclosureProof
 */
export function generateMultiProof(
  tree: MerkleTreeData,
  fieldIndices: number[]
): SelectiveDisclosureProof {
  const revealedFields: RevealedField[] = fieldIndices.map((index) => {
    if (index < 0 || index >= tree.leaves.length) {
      throw new Error(`Invalid field index: ${index}`);
    }

    const leaf = tree.leaves[index];
    if (!leaf) {
      throw new Error(`Leaf at index ${index} not found`);
    }
    const proof = computeMerkleProof(
      tree.leaves.map((l) => l.hash),
      index
    );

    return {
      name: leaf.name,
      value: leaf.value,
      proof,
    };
  });

  return {
    merkleRoot: tree.root,
    revealedFields,
  };
}

/**
 * Verify a selective disclosure proof
 * @param proof The proof to verify
 * @returns boolean indicating if proof is valid
 */
export function verifySelectiveDisclosure(proof: SelectiveDisclosureProof): boolean {
  for (const field of proof.revealedFields) {
    // Reconstruct leaf hash
    const leafHash = hashLeafFromRevealed(field);

    // Verify against root using proof
    const computedRoot = computeRootFromProof(leafHash, field.proof);

    if (computedRoot !== proof.merkleRoot) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Hash a single leaf (name + type + value)
 */
function hashLeaf(input: MerkleInput): `0x${string}` {
  // Encode based on type
  const encodedValue = encodeValue(input.type, input.value);

  // Hash: keccak256(name || type || encodedValue)
  const combined = encodeAbiParameters(
    parseAbiParameters('string, string, bytes'),
    [input.name, input.type, encodedValue]
  );

  return keccak256(combined);
}

/**
 * Hash a revealed field for verification
 */
function hashLeafFromRevealed(field: RevealedField): `0x${string}` {
  // Need to determine type from value
  const type = inferType(field.value);
  const encodedValue = encodeValue(type, field.value);

  const combined = encodeAbiParameters(
    parseAbiParameters('string, string, bytes'),
    [field.name, type, encodedValue]
  );

  return keccak256(combined);
}

/**
 * Encode a value based on its type
 */
function encodeValue(type: string, value: unknown): `0x${string}` {
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
      throw new Error(`Unsupported type: ${type}`);
  }
}

/**
 * Infer type from value (for verification)
 */
function inferType(value: unknown): string {
  if (typeof value === 'string') {
    if (value.startsWith('0x') && value.length === 66) return 'bytes32';
    if (value.startsWith('0x') && value.length === 42) return 'address';
    return 'string';
  }
  if (typeof value === 'number' || typeof value === 'bigint') return 'uint256';
  if (typeof value === 'boolean') return 'bool';
  throw new Error(`Cannot infer type for value: ${value}`);
}

/**
 * Compute Merkle root from leaf hashes
 */
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

  // Build tree level by level
  let currentLevel = paddedHashes;
  while (currentLevel.length > 1) {
    const nextLevel: `0x${string}`[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = currentLevel[i + 1]!;
      const combined = sortAndHash(left, right);
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0]!;
}

/**
 * Compute Merkle proof for a leaf
 */
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

/**
 * Compute root from leaf hash and proof
 */
function computeRootFromProof(leafHash: `0x${string}`, proof: `0x${string}`[]): `0x${string}` {
  let current = leafHash;

  for (const sibling of proof) {
    current = sortAndHash(current, sibling);
  }

  return current;
}

/**
 * Sort two hashes and hash them together
 * This ensures consistent ordering regardless of position
 */
function sortAndHash(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  const sorted: [`0x${string}`, `0x${string}`] = a < b ? [a, b] : [b, a];
  return keccak256(
    encodeAbiParameters(parseAbiParameters('bytes32, bytes32'), sorted)
  );
}

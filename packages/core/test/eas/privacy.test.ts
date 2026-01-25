/**
 * EAS Privacy Utilities Tests
 * Tests for Merkle tree and selective disclosure functionality
 */

import { describe, it, expect } from 'vitest';
import {
  createMerkleTree,
  generateMultiProof,
  verifySelectiveDisclosure,
} from '../../src/eas/privacy';

describe('Merkle Tree Creation', () => {
  it('should create a merkle tree from inputs', () => {
    const inputs = [
      { name: 'probability', type: 'uint256', value: 75 },
      { name: 'marketId', type: 'string', value: 'market-123' },
      { name: 'isPublic', type: 'bool', value: true },
    ];

    const tree = createMerkleTree(inputs);

    expect(tree.root).toMatch(/^0x[a-f0-9]{64}$/);
    expect(tree.leaves).toHaveLength(3);
    expect(tree.depth).toBeGreaterThan(0);
  });

  it('should create deterministic merkle root', () => {
    const inputs = [
      { name: 'probability', type: 'uint256', value: 75 },
      { name: 'marketId', type: 'string', value: 'market-123' },
    ];

    const tree1 = createMerkleTree(inputs);
    const tree2 = createMerkleTree(inputs);

    expect(tree1.root).toBe(tree2.root);
  });

  it('should throw for empty inputs', () => {
    expect(() => createMerkleTree([])).toThrow();
  });

  it('should handle single leaf', () => {
    const inputs = [{ name: 'probability', type: 'uint256', value: 50 }];
    const tree = createMerkleTree(inputs);

    expect(tree.leaves).toHaveLength(1);
    expect(tree.root).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('should handle various data types', () => {
    const inputs = [
      { name: 'number', type: 'uint256', value: 12345 },
      { name: 'text', type: 'string', value: 'hello world' },
      { name: 'flag', type: 'bool', value: false },
      { name: 'hash', type: 'bytes32', value: '0x' + 'ab'.repeat(32) },
      { name: 'addr', type: 'address', value: '0x' + '12'.repeat(20) },
    ];

    const tree = createMerkleTree(inputs);

    expect(tree.leaves).toHaveLength(5);
    expect(tree.root).toMatch(/^0x[a-f0-9]{64}$/);
  });

  it('should create unique hashes for each leaf', () => {
    const inputs = [
      { name: 'a', type: 'uint256', value: 1 },
      { name: 'b', type: 'uint256', value: 2 },
      { name: 'c', type: 'uint256', value: 3 },
    ];

    const tree = createMerkleTree(inputs);
    const hashes = new Set(tree.leaves.map((l) => l.hash));

    expect(hashes.size).toBe(3);
  });
});

describe('Selective Disclosure Proof Generation', () => {
  it('should generate proof for single field', () => {
    const inputs = [
      { name: 'probability', type: 'uint256', value: 75 },
      { name: 'marketId', type: 'string', value: 'market-123' },
      { name: 'isPublic', type: 'bool', value: true },
    ];

    const tree = createMerkleTree(inputs);
    const proof = generateMultiProof(tree, [0]);

    expect(proof.merkleRoot).toBe(tree.root);
    expect(proof.revealedFields).toHaveLength(1);
    expect(proof.revealedFields[0]?.name).toBe('probability');
    expect(proof.revealedFields[0]?.value).toBe(75);
    expect(proof.revealedFields[0]?.proof.length).toBeGreaterThan(0);
  });

  it('should generate proof for multiple fields', () => {
    const inputs = [
      { name: 'a', type: 'uint256', value: 1 },
      { name: 'b', type: 'string', value: 'hello' },
      { name: 'c', type: 'bool', value: true },
      { name: 'd', type: 'uint256', value: 4 },
    ];

    const tree = createMerkleTree(inputs);
    const proof = generateMultiProof(tree, [0, 2]);

    expect(proof.revealedFields).toHaveLength(2);
    expect(proof.revealedFields[0]?.name).toBe('a');
    expect(proof.revealedFields[1]?.name).toBe('c');
  });

  it('should throw for invalid field index', () => {
    const inputs = [{ name: 'a', type: 'uint256', value: 1 }];
    const tree = createMerkleTree(inputs);

    expect(() => generateMultiProof(tree, [5])).toThrow();
    expect(() => generateMultiProof(tree, [-1])).toThrow();
  });
});

describe('Selective Disclosure Verification', () => {
  it('should verify valid proof for single field', () => {
    const inputs = [
      { name: 'probability', type: 'uint256', value: 75 },
      { name: 'marketId', type: 'string', value: 'market-123' },
      { name: 'isPublic', type: 'bool', value: true },
    ];

    const tree = createMerkleTree(inputs);
    const proof = generateMultiProof(tree, [1]);

    const isValid = verifySelectiveDisclosure(proof);
    expect(isValid).toBe(true);
  });

  it('should verify valid proof for multiple fields', () => {
    const inputs = [
      { name: 'a', type: 'uint256', value: 100 },
      { name: 'b', type: 'string', value: 'test' },
      { name: 'c', type: 'bool', value: false },
    ];

    const tree = createMerkleTree(inputs);
    const proof = generateMultiProof(tree, [0, 1, 2]);

    const isValid = verifySelectiveDisclosure(proof);
    expect(isValid).toBe(true);
  });

  it('should reject proof with tampered value', () => {
    const inputs = [
      { name: 'probability', type: 'uint256', value: 75 },
      { name: 'marketId', type: 'string', value: 'market-123' },
    ];

    const tree = createMerkleTree(inputs);
    const proof = generateMultiProof(tree, [0]);

    // Tamper with the value
    if (proof.revealedFields[0]) {
      proof.revealedFields[0].value = 99;
    }

    const isValid = verifySelectiveDisclosure(proof);
    expect(isValid).toBe(false);
  });

  it('should reject proof with wrong merkle root', () => {
    const inputs = [{ name: 'test', type: 'string', value: 'hello' }];

    const tree = createMerkleTree(inputs);
    const proof = generateMultiProof(tree, [0]);

    // Tamper with the root
    proof.merkleRoot = '0x' + '00'.repeat(32) as `0x${string}`;

    const isValid = verifySelectiveDisclosure(proof);
    expect(isValid).toBe(false);
  });
});

describe('Real-World Forecast Attestation Scenario', () => {
  it('should create and verify a private forecast attestation', () => {
    // Simulate a forecast with private data
    const forecastData = [
      { name: 'probability', type: 'uint256', value: 65 },
      { name: 'marketId', type: 'string', value: 'polymarket-election-2024' },
      { name: 'platform', type: 'string', value: 'POLYMARKET' },
      { name: 'confidence', type: 'uint256', value: 80 },
      { name: 'reasoning', type: 'string', value: 'Based on polling data and historical trends' },
      { name: 'isPublic', type: 'bool', value: false },
    ];

    // Create merkle tree for private storage
    const tree = createMerkleTree(forecastData);

    // User wants to reveal only probability and platform (for leaderboard)
    const proof = generateMultiProof(tree, [0, 2]);

    // Verify the proof
    expect(verifySelectiveDisclosure(proof)).toBe(true);

    // Check revealed data
    expect(proof.revealedFields).toHaveLength(2);
    expect(proof.revealedFields[0]?.name).toBe('probability');
    expect(proof.revealedFields[0]?.value).toBe(65);
    expect(proof.revealedFields[1]?.name).toBe('platform');
    expect(proof.revealedFields[1]?.value).toBe('POLYMARKET');
  });

  it('should create and verify a private identity attestation', () => {
    const identityData = [
      { name: 'platform', type: 'string', value: 'LIMITLESS' },
      { name: 'platformUserId', type: 'string', value: '0x1234567890abcdef' },
      { name: 'proofHash', type: 'bytes32', value: '0x' + 'ab'.repeat(32) },
      { name: 'verified', type: 'bool', value: true },
      { name: 'verifiedAt', type: 'uint256', value: 1700000000 },
    ];

    const tree = createMerkleTree(identityData);

    // Reveal only platform and verification status
    const proof = generateMultiProof(tree, [0, 3]);

    expect(verifySelectiveDisclosure(proof)).toBe(true);
    expect(proof.revealedFields[0]?.value).toBe('LIMITLESS');
    expect(proof.revealedFields[1]?.value).toBe(true);
  });
});

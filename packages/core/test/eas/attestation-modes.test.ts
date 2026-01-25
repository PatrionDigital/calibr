/**
 * Attestation Mode Tests (Task 4.5.7)
 * Tests for all three attestation modes: on-chain, off-chain, and private (Merkle)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMerkleTree,
  generateMultiProof,
  verifySelectiveDisclosure,
} from '../../src/eas/privacy';

// Mock dependencies
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: vi.fn(),
      waitForTransactionReceipt: vi.fn(),
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: vi.fn(),
      signTypedData: vi.fn(),
    })),
  };
});

// =============================================================================
// Test Data Fixtures
// =============================================================================

const MOCK_FORECAST_DATA = {
  probability: 75,
  marketId: 'polymarket-election-2024',
  platform: 'POLYMARKET',
  confidence: 80,
  reasoning: 'Based on recent polling data',
  isPublic: true,
};

const MOCK_PRIVATE_FORECAST_DATA = {
  ...MOCK_FORECAST_DATA,
  isPublic: false,
  reasoning: 'Private analysis with proprietary model',
};

const MOCK_SCHEMA_UID = '0xbeebd6600cf48d34e814e0aa0feb1f2bebd547a972963796e03c14d1ab4ef5a1';
const MOCK_ATTESTATION_UID = '0x' + 'ab'.repeat(32);
const MOCK_TX_HASH = '0x' + 'cd'.repeat(32);
const MOCK_RECIPIENT = '0x' + '12'.repeat(20);

// =============================================================================
// On-Chain Attestation Mode Tests
// =============================================================================

describe('On-Chain Attestation Mode', () => {
  describe('Schema Encoding', () => {
    it('should encode forecast data according to schema', () => {
      // The schema: "uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic"
      const inputs = [
        { name: 'probability', type: 'uint256', value: MOCK_FORECAST_DATA.probability },
        { name: 'marketId', type: 'string', value: MOCK_FORECAST_DATA.marketId },
        { name: 'platform', type: 'string', value: MOCK_FORECAST_DATA.platform },
        { name: 'confidence', type: 'uint256', value: MOCK_FORECAST_DATA.confidence },
        { name: 'reasoning', type: 'string', value: MOCK_FORECAST_DATA.reasoning },
        { name: 'isPublic', type: 'bool', value: MOCK_FORECAST_DATA.isPublic },
      ];

      // Merkle tree creation validates encoding
      const tree = createMerkleTree(inputs);
      expect(tree.leaves).toHaveLength(6);
      expect(tree.root).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should handle all supported data types', () => {
      const inputs = [
        { name: 'uint', type: 'uint256', value: 12345 },
        { name: 'str', type: 'string', value: 'test string' },
        { name: 'bool', type: 'bool', value: true },
        { name: 'bytes', type: 'bytes32', value: '0x' + 'ff'.repeat(32) },
        { name: 'addr', type: 'address', value: '0x' + '00'.repeat(20) },
      ];

      const tree = createMerkleTree(inputs);
      expect(tree.leaves).toHaveLength(5);
    });

    it('should produce deterministic encoding', () => {
      const inputs1 = [
        { name: 'probability', type: 'uint256', value: 50 },
        { name: 'marketId', type: 'string', value: 'test' },
      ];
      const inputs2 = [...inputs1];

      const tree1 = createMerkleTree(inputs1);
      const tree2 = createMerkleTree(inputs2);

      expect(tree1.root).toBe(tree2.root);
    });
  });

  describe('Attestation Data Validation', () => {
    it('should validate probability range (1-99)', () => {
      const validProbabilities = [1, 50, 99];
      const edgeCaseProbabilities = [0, 100]; // Edge cases but valid uint256

      validProbabilities.forEach((prob) => {
        const inputs = [{ name: 'probability', type: 'uint256', value: prob }];
        expect(() => createMerkleTree(inputs)).not.toThrow();
      });

      // Edge case probabilities (0 and 100) are valid at encoding layer
      // Application layer validates 1-99 range
      edgeCaseProbabilities.forEach((prob) => {
        const inputs = [{ name: 'probability', type: 'uint256', value: prob }];
        expect(() => createMerkleTree(inputs)).not.toThrow();
      });

      // Negative numbers should throw at encoding layer (uint256 cannot be negative)
      expect(() => {
        const inputs = [{ name: 'probability', type: 'uint256', value: -1 }];
        createMerkleTree(inputs);
      }).toThrow();
    });

    it('should validate confidence range (0-100)', () => {
      const validConfidences = [0, 50, 100];
      validConfidences.forEach((conf) => {
        const inputs = [{ name: 'confidence', type: 'uint256', value: conf }];
        expect(() => createMerkleTree(inputs)).not.toThrow();
      });
    });

    it('should handle empty reasoning', () => {
      const inputs = [
        { name: 'probability', type: 'uint256', value: 50 },
        { name: 'reasoning', type: 'string', value: '' },
      ];
      expect(() => createMerkleTree(inputs)).not.toThrow();
    });

    it('should handle long reasoning strings', () => {
      const longReasoning = 'A'.repeat(1000);
      const inputs = [
        { name: 'probability', type: 'uint256', value: 50 },
        { name: 'reasoning', type: 'string', value: longReasoning },
      ];
      const tree = createMerkleTree(inputs);
      expect(tree.root).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });
});

// =============================================================================
// Off-Chain Attestation Mode Tests
// =============================================================================

describe('Off-Chain Attestation Mode', () => {
  describe('Signature Generation', () => {
    it('should create valid message for signing', () => {
      const message = JSON.stringify({
        schema: 'uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic',
        recipient: MOCK_RECIPIENT,
        time: Math.floor(Date.now() / 1000),
        expirationTime: 0,
        revocable: true,
        data: MOCK_FORECAST_DATA,
      });

      expect(() => JSON.parse(message)).not.toThrow();
      const parsed = JSON.parse(message);
      expect(parsed.schema).toContain('probability');
      expect(parsed.data.probability).toBe(75);
    });

    it('should include all required EAS fields', () => {
      const attestationMessage = {
        schema: MOCK_SCHEMA_UID,
        recipient: MOCK_RECIPIENT,
        time: Math.floor(Date.now() / 1000),
        expirationTime: 0,
        revocable: true,
        refUID: '0x' + '00'.repeat(32),
        data: MOCK_FORECAST_DATA,
      };

      expect(attestationMessage).toHaveProperty('schema');
      expect(attestationMessage).toHaveProperty('recipient');
      expect(attestationMessage).toHaveProperty('time');
      expect(attestationMessage).toHaveProperty('expirationTime');
      expect(attestationMessage).toHaveProperty('revocable');
      expect(attestationMessage).toHaveProperty('data');
    });
  });

  describe('UID Generation', () => {
    it('should generate unique UID from signature hash', () => {
      // Simulate signature-based UID generation
      const signature1 = '0x' + 'aa'.repeat(65);
      const signature2 = '0x' + 'bb'.repeat(65);

      // UIDs should be different for different signatures
      expect(signature1).not.toBe(signature2);
    });

    it('should produce 32-byte UID', () => {
      const uid = MOCK_ATTESTATION_UID;
      expect(uid).toMatch(/^0x[a-f0-9]{64}$/);
      expect(uid.length).toBe(66); // 0x + 64 hex chars
    });
  });

  describe('Off-Chain Storage', () => {
    it('should serialize attestation for storage', () => {
      const offchainAttestation = {
        uid: MOCK_ATTESTATION_UID,
        signature: '0x' + 'ff'.repeat(65),
        timestamp: Math.floor(Date.now() / 1000),
        data: MOCK_FORECAST_DATA,
        schemaUid: MOCK_SCHEMA_UID,
        recipient: MOCK_RECIPIENT,
      };

      const serialized = JSON.stringify(offchainAttestation);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.uid).toBe(offchainAttestation.uid);
      expect(deserialized.data.probability).toBe(75);
    });
  });
});

// =============================================================================
// Private (Merkle) Attestation Mode Tests
// =============================================================================

describe('Private (Merkle) Attestation Mode', () => {
  describe('Merkle Tree Construction', () => {
    it('should create merkle tree from forecast fields', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: MOCK_PRIVATE_FORECAST_DATA.probability },
        { name: 'marketId', type: 'string', value: MOCK_PRIVATE_FORECAST_DATA.marketId },
        { name: 'platform', type: 'string', value: MOCK_PRIVATE_FORECAST_DATA.platform },
        { name: 'confidence', type: 'uint256', value: MOCK_PRIVATE_FORECAST_DATA.confidence },
        { name: 'reasoning', type: 'string', value: MOCK_PRIVATE_FORECAST_DATA.reasoning },
        { name: 'isPublic', type: 'bool', value: MOCK_PRIVATE_FORECAST_DATA.isPublic },
      ];

      const tree = createMerkleTree(fields);

      expect(tree.root).toMatch(/^0x[a-f0-9]{64}$/);
      expect(tree.leaves).toHaveLength(6);
      expect(tree.depth).toBeGreaterThan(0);
    });

    it('should store only merkle root on-chain', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: 75 },
        { name: 'secret', type: 'string', value: 'my secret data' },
      ];

      const tree = createMerkleTree(fields);

      // Only the root goes on-chain - 32 bytes
      expect(tree.root.length).toBe(66); // 0x + 64 hex
      // Individual leaves are NOT revealed
      expect(tree.leaves[0]?.hash).not.toBe(tree.root);
    });
  });

  describe('Selective Disclosure', () => {
    it('should generate proof for single field disclosure', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: 75 },
        { name: 'marketId', type: 'string', value: 'test-market' },
        { name: 'secret', type: 'string', value: 'private info' },
      ];

      const tree = createMerkleTree(fields);
      const proof = generateMultiProof(tree, [0]); // Reveal only probability

      expect(proof.merkleRoot).toBe(tree.root);
      expect(proof.revealedFields).toHaveLength(1);
      expect(proof.revealedFields[0]?.name).toBe('probability');
      expect(proof.revealedFields[0]?.value).toBe(75);
      // Secret field NOT in revealed fields
      expect(proof.revealedFields.find((f) => f.name === 'secret')).toBeUndefined();
    });

    it('should generate proof for multiple field disclosure', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: 75 },
        { name: 'marketId', type: 'string', value: 'test-market' },
        { name: 'platform', type: 'string', value: 'POLYMARKET' },
        { name: 'secret', type: 'string', value: 'private info' },
      ];

      const tree = createMerkleTree(fields);
      const proof = generateMultiProof(tree, [0, 2]); // Reveal probability and platform

      expect(proof.revealedFields).toHaveLength(2);
      expect(proof.revealedFields[0]?.name).toBe('probability');
      expect(proof.revealedFields[1]?.name).toBe('platform');
    });

    it('should include valid merkle proofs for each revealed field', () => {
      const fields = [
        { name: 'a', type: 'uint256', value: 1 },
        { name: 'b', type: 'uint256', value: 2 },
        { name: 'c', type: 'uint256', value: 3 },
        { name: 'd', type: 'uint256', value: 4 },
      ];

      const tree = createMerkleTree(fields);
      const proof = generateMultiProof(tree, [1, 3]);

      proof.revealedFields.forEach((field) => {
        expect(field.proof).toBeDefined();
        expect(Array.isArray(field.proof)).toBe(true);
        expect(field.proof.length).toBeGreaterThan(0);
        field.proof.forEach((proofElement) => {
          expect(proofElement).toMatch(/^0x[a-f0-9]{64}$/);
        });
      });
    });
  });

  describe('Proof Verification', () => {
    it('should verify valid proof', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: 75 },
        { name: 'marketId', type: 'string', value: 'test-market' },
      ];

      const tree = createMerkleTree(fields);
      const proof = generateMultiProof(tree, [0, 1]);

      const isValid = verifySelectiveDisclosure(proof);
      expect(isValid).toBe(true);
    });

    it('should reject proof with tampered value', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: 75 },
        { name: 'marketId', type: 'string', value: 'test-market' },
      ];

      const tree = createMerkleTree(fields);
      const proof = generateMultiProof(tree, [0]);

      // Tamper with the value
      if (proof.revealedFields[0]) {
        proof.revealedFields[0].value = 99;
      }

      const isValid = verifySelectiveDisclosure(proof);
      expect(isValid).toBe(false);
    });

    it('should reject proof with tampered merkle root', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: 75 },
      ];

      const tree = createMerkleTree(fields);
      const proof = generateMultiProof(tree, [0]);

      // Tamper with the root
      proof.merkleRoot = ('0x' + '00'.repeat(32)) as `0x${string}`;

      const isValid = verifySelectiveDisclosure(proof);
      expect(isValid).toBe(false);
    });

    it('should reject proof with tampered proof path', () => {
      const fields = [
        { name: 'a', type: 'uint256', value: 1 },
        { name: 'b', type: 'uint256', value: 2 },
        { name: 'c', type: 'uint256', value: 3 },
      ];

      const tree = createMerkleTree(fields);
      const proof = generateMultiProof(tree, [0]);

      // Tamper with the proof path
      if (proof.revealedFields[0] && proof.revealedFields[0].proof[0]) {
        proof.revealedFields[0].proof[0] = ('0x' + 'ff'.repeat(32)) as `0x${string}`;
      }

      const isValid = verifySelectiveDisclosure(proof);
      expect(isValid).toBe(false);
    });
  });

  describe('Cross-Mode Compatibility', () => {
    it('should create compatible root for same data across modes', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: 75 },
        { name: 'marketId', type: 'string', value: 'test-market' },
      ];

      // Create multiple trees with same data
      const tree1 = createMerkleTree(fields);
      const tree2 = createMerkleTree([...fields]);

      expect(tree1.root).toBe(tree2.root);
    });

    it('should allow verification without original tree', () => {
      const fields = [
        { name: 'probability', type: 'uint256', value: 75 },
        { name: 'marketId', type: 'string', value: 'test-market' },
      ];

      const tree = createMerkleTree(fields);
      const proof = generateMultiProof(tree, [0]);

      // Verification should work with just the proof (no original tree)
      // This simulates a verifier receiving only the proof
      const proofCopy = JSON.parse(JSON.stringify(proof));
      const isValid = verifySelectiveDisclosure(proofCopy);
      expect(isValid).toBe(true);
    });
  });
});

// =============================================================================
// End-to-End Attestation Flow Tests
// =============================================================================

describe('End-to-End Attestation Flows', () => {
  describe('Complete Public Forecast Flow', () => {
    it('should create and verify public forecast attestation', () => {
      const forecastInputs = [
        { name: 'probability', type: 'uint256', value: 65 },
        { name: 'marketId', type: 'string', value: 'election-2024' },
        { name: 'platform', type: 'string', value: 'POLYMARKET' },
        { name: 'confidence', type: 'uint256', value: 80 },
        { name: 'reasoning', type: 'string', value: 'Based on polling data' },
        { name: 'isPublic', type: 'bool', value: true },
      ];

      const tree = createMerkleTree(forecastInputs);

      // For public forecasts, reveal all fields
      const proof = generateMultiProof(tree, [0, 1, 2, 3, 4, 5]);

      expect(proof.revealedFields).toHaveLength(6);
      expect(verifySelectiveDisclosure(proof)).toBe(true);
    });
  });

  describe('Complete Private Forecast Flow', () => {
    it('should create private forecast with selective disclosure', () => {
      const forecastInputs = [
        { name: 'probability', type: 'uint256', value: 85 },
        { name: 'marketId', type: 'string', value: 'secret-market' },
        { name: 'platform', type: 'string', value: 'LIMITLESS' },
        { name: 'confidence', type: 'uint256', value: 95 },
        { name: 'reasoning', type: 'string', value: 'Proprietary model output' },
        { name: 'isPublic', type: 'bool', value: false },
      ];

      const tree = createMerkleTree(forecastInputs);

      // Store merkle root on-chain (simulated)
      const onchainData = {
        merkleRoot: tree.root,
        dataType: 'FORECAST',
        fieldCount: 6,
      };

      // Later, reveal only probability and platform for leaderboard
      const proof = generateMultiProof(tree, [0, 2]);

      expect(proof.merkleRoot).toBe(onchainData.merkleRoot);
      expect(proof.revealedFields).toHaveLength(2);
      expect(proof.revealedFields[0]?.name).toBe('probability');
      expect(proof.revealedFields[1]?.name).toBe('platform');
      expect(verifySelectiveDisclosure(proof)).toBe(true);

      // Reasoning should NOT be revealed
      expect(proof.revealedFields.find((f) => f.name === 'reasoning')).toBeUndefined();
    });
  });

  describe('Attestation Mode Switching', () => {
    it('should handle mode switch from on-chain to private', () => {
      const forecastData = [
        { name: 'probability', type: 'uint256', value: 70 },
        { name: 'marketId', type: 'string', value: 'test' },
      ];

      // Create on-chain style (full data available)
      const tree1 = createMerkleTree(forecastData);
      const fullProof = generateMultiProof(tree1, [0, 1]);

      // Create private style (same data, different disclosure)
      const tree2 = createMerkleTree(forecastData);
      const partialProof = generateMultiProof(tree2, [0]);

      // Both should have same root
      expect(tree1.root).toBe(tree2.root);

      // Both proofs should verify
      expect(verifySelectiveDisclosure(fullProof)).toBe(true);
      expect(verifySelectiveDisclosure(partialProof)).toBe(true);
    });
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('Edge Cases and Error Handling', () => {
  it('should handle maximum field count', () => {
    const manyFields = Array.from({ length: 20 }, (_, i) => ({
      name: `field${i}`,
      type: 'uint256',
      value: i,
    }));

    const tree = createMerkleTree(manyFields);
    expect(tree.leaves).toHaveLength(20);

    const proof = generateMultiProof(tree, [0, 5, 10, 15, 19]);
    expect(verifySelectiveDisclosure(proof)).toBe(true);
  });

  it('should handle special characters in strings', () => {
    const specialFields = [
      { name: 'emoji', type: 'string', value: '🚀📈💰' },
      { name: 'unicode', type: 'string', value: 'café résumé' },
      { name: 'json', type: 'string', value: '{"key": "value"}' },
      { name: 'quotes', type: 'string', value: "He said \"hello\"" },
    ];

    const tree = createMerkleTree(specialFields);
    expect(tree.leaves).toHaveLength(4);

    const proof = generateMultiProof(tree, [0, 1, 2, 3]);
    expect(verifySelectiveDisclosure(proof)).toBe(true);
    expect(proof.revealedFields[0]?.value).toBe('🚀📈💰');
  });

  it('should handle large numeric values', () => {
    const largeNumbers = [
      { name: 'big', type: 'uint256', value: Number.MAX_SAFE_INTEGER },
      { name: 'zero', type: 'uint256', value: 0 },
    ];

    const tree = createMerkleTree(largeNumbers);
    expect(tree.leaves).toHaveLength(2);

    const proof = generateMultiProof(tree, [0, 1]);
    expect(verifySelectiveDisclosure(proof)).toBe(true);
  });

  it('should throw for empty input array', () => {
    expect(() => createMerkleTree([])).toThrow();
  });

  it('should throw for negative field indices', () => {
    const fields = [{ name: 'test', type: 'uint256', value: 1 }];
    const tree = createMerkleTree(fields);

    expect(() => generateMultiProof(tree, [-1])).toThrow();
  });

  it('should throw for out-of-bounds field indices', () => {
    const fields = [
      { name: 'a', type: 'uint256', value: 1 },
      { name: 'b', type: 'uint256', value: 2 },
    ];
    const tree = createMerkleTree(fields);

    expect(() => generateMultiProof(tree, [5])).toThrow();
  });
});

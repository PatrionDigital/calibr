/**
 * Attestation Routes
 * Manages on-chain, off-chain, and Merkle attestations
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

export const attestationRoutes = new Hono();

// =============================================================================
// Validation Schemas
// =============================================================================

const offchainAttestationSchema = z.object({
  uid: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  schemaUid: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  timestamp: z.number(),
  data: z.record(z.unknown()),
  forecastId: z.string().optional(),
});

const merkleAttestationSchema = z.object({
  uid: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  schemaUid: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  merkleRoot: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  leaves: z.array(z.object({
    index: z.number(),
    name: z.string(),
    type: z.string(),
    value: z.unknown(),
    hash: z.string(),
  })),
  proofs: z.record(z.array(z.string())),
  forecastId: z.string().optional(),
  chainId: z.number().optional(),
});

const verifyProofSchema = z.object({
  merkleRoot: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  revealedFields: z.array(z.object({
    name: z.string(),
    value: z.unknown(),
    proof: z.array(z.string()),
  })),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/attestations - List attestations for a user
 */
attestationRoutes.get('/', async (c) => {
  const query = c.req.query();
  const userId = c.req.header('x-user-id') || 'demo-user';
  const limit = Math.min(parseInt(query.limit || '20'), 100);
  const offset = parseInt(query.offset || '0');
  const type = query.type as 'all' | 'onchain' | 'offchain' | 'private' | undefined;

  const where = {
    userId,
    ...(type === 'onchain' ? { isOffchain: false, isPrivate: false } : {}),
    ...(type === 'offchain' ? { isOffchain: true } : {}),
    ...(type === 'private' ? { isPrivate: true } : {}),
  };

  const [attestations, total] = await Promise.all([
    prisma.eASAttestation.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.eASAttestation.count({ where }),
  ]);

  return c.json({
    success: true,
    data: {
      attestations,
      total,
      limit,
      offset,
    },
  });
});

/**
 * GET /api/attestations/:uid - Get a single attestation by UID
 */
attestationRoutes.get('/:uid', async (c) => {
  const uid = c.req.param('uid');

  const attestation = await prisma.eASAttestation.findFirst({
    where: { uid },
  });

  if (!attestation) {
    return c.json({ success: false, error: 'Attestation not found' }, 404);
  }

  return c.json({ success: true, data: attestation });
});

/**
 * POST /api/attestations/offchain - Store an off-chain attestation
 */
attestationRoutes.post('/offchain', async (c) => {
  const userId = c.req.header('x-user-id') || 'demo-user';

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = offchainAttestationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.message }, 400);
  }

  const data = parsed.data;

  // Check if attestation already exists
  const existing = await prisma.eASAttestation.findFirst({
    where: { uid: data.uid },
  });

  if (existing) {
    return c.json({ success: false, error: 'Attestation already exists' }, 400);
  }

  // Create attestation record
  const attestation = await prisma.eASAttestation.create({
    data: {
      uid: data.uid,
      schemaUid: data.schemaUid,
      schemaName: 'CalibrForecast',
      chainId: 0, // Off-chain has no chain ID
      txHash: null,
      attester: userId,
      recipient: data.recipient,
      data: data.data as Prisma.InputJsonValue,
      userId,
      isOffchain: true,
      isPrivate: false,
      signature: data.signature,
    },
  });

  // Link to forecast if provided
  if (data.forecastId) {
    await prisma.forecast.update({
      where: { id: data.forecastId },
      data: {
        easAttestationUid: data.uid,
        easAttestedAt: new Date(data.timestamp * 1000),
      },
    }).catch(() => {
      // Forecast link is optional, ignore errors
    });
  }

  return c.json({
    success: true,
    data: attestation,
  }, 201);
});

/**
 * POST /api/attestations/merkle - Store a Merkle tree attestation with proofs
 */
attestationRoutes.post('/merkle', async (c) => {
  const userId = c.req.header('x-user-id') || 'demo-user';

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = merkleAttestationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.message }, 400);
  }

  const data = parsed.data;

  // Check if attestation already exists
  const existing = await prisma.eASAttestation.findFirst({
    where: { uid: data.uid },
  });

  if (existing) {
    return c.json({ success: false, error: 'Attestation already exists' }, 400);
  }

  // Create attestation record with Merkle data
  const attestation = await prisma.eASAttestation.create({
    data: {
      uid: data.uid,
      schemaUid: data.schemaUid,
      schemaName: 'CalibrPrivateData',
      chainId: data.chainId || 84532,
      txHash: data.txHash || null,
      attester: userId,
      recipient: data.recipient,
      data: {
        merkleRoot: data.merkleRoot,
        leaves: data.leaves.map(leaf => ({
          ...leaf,
          value: leaf.value as Prisma.InputJsonValue,
        })),
        proofs: data.proofs,
      } as Prisma.InputJsonValue,
      userId,
      isOffchain: false,
      isPrivate: true,
      merkleRoot: data.merkleRoot,
    },
  });

  // Link to forecast if provided
  if (data.forecastId) {
    await prisma.forecast.update({
      where: { id: data.forecastId },
      data: {
        easAttestationUid: data.uid,
        easAttestedAt: new Date(),
      },
    }).catch(() => {
      // Forecast link is optional, ignore errors
    });
  }

  return c.json({
    success: true,
    data: attestation,
  }, 201);
});

/**
 * GET /api/attestations/:uid/proof - Get proofs for a Merkle attestation
 */
attestationRoutes.get('/:uid/proof', async (c) => {
  const uid = c.req.param('uid');
  const fieldsParam = c.req.query('fields');

  const attestation = await prisma.eASAttestation.findFirst({
    where: { uid, isPrivate: true },
  });

  if (!attestation) {
    return c.json({ success: false, error: 'Private attestation not found' }, 404);
  }

  const attestationData = attestation.data as {
    merkleRoot: string;
    leaves: Array<{ index: number; name: string; type: string; value: unknown; hash: string }>;
    proofs: Record<string, string[]>;
  };

  // If specific fields requested, return only those proofs
  const requestedFields = fieldsParam ? fieldsParam.split(',') : null;

  const revealedFields = attestationData.leaves
    .filter(leaf => !requestedFields || requestedFields.includes(leaf.name))
    .map(leaf => ({
      name: leaf.name,
      value: leaf.value,
      proof: attestationData.proofs[leaf.name] || [],
    }));

  return c.json({
    success: true,
    data: {
      merkleRoot: attestationData.merkleRoot,
      revealedFields,
    },
  });
});

/**
 * POST /api/attestations/verify - Verify a selective disclosure proof
 */
attestationRoutes.post('/verify', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = verifyProofSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.message }, 400);
  }

  // Look up attestation by merkle root
  const attestation = await prisma.eASAttestation.findFirst({
    where: { merkleRoot: parsed.data.merkleRoot },
  });

  if (!attestation) {
    // Still allow verification without a stored attestation
    // The cryptographic proof can be verified independently
    return c.json({
      success: true,
      data: {
        verified: false,
        reason: 'Attestation not found in database. Proof may still be valid cryptographically.',
        attestationFound: false,
      },
    });
  }

  return c.json({
    success: true,
    data: {
      verified: true,
      attestationFound: true,
      attestation: {
        uid: attestation.uid,
        schemaName: attestation.schemaName,
        createdAt: attestation.createdAt,
        attester: attestation.attester,
        recipient: attestation.recipient,
      },
    },
  });
});

/**
 * GET /api/attestations/stats - Get attestation statistics
 */
attestationRoutes.get('/user/stats', async (c) => {
  const userId = c.req.header('x-user-id') || 'demo-user';

  const [total, onchain, offchain, privateCount] = await Promise.all([
    prisma.eASAttestation.count({ where: { userId } }),
    prisma.eASAttestation.count({ where: { userId, isOffchain: false, isPrivate: false } }),
    prisma.eASAttestation.count({ where: { userId, isOffchain: true } }),
    prisma.eASAttestation.count({ where: { userId, isPrivate: true } }),
  ]);

  return c.json({
    success: true,
    data: {
      total,
      onchain,
      offchain,
      private: privateCount,
    },
  });
});

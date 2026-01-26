/**
 * Bridge API Routes
 * Cross-chain USDC bridging via Circle CCTP
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createBridgeService, type BridgePhase } from '@calibr/adapters';
import { prisma } from '../lib/prisma';

export const bridgeRoutes = new Hono();

// =============================================================================
// Request Validation Schemas
// =============================================================================

const InitiateBridgeSchema = z.object({
  amount: z.string().regex(/^\d+$/, 'Amount must be a valid integer string (in USDC decimals)'),
  destinationChain: z.enum(['POLYGON', 'ETHEREUM']),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  userId: z.string().min(1, 'User ID required'),
  walletConnectionId: z.string().min(1, 'Wallet connection ID required'),
});

const ClaimBridgeSchema = z.object({
  message: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid message format'),
  attestation: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid attestation format'),
});

// =============================================================================
// In-Memory Bridge Service Instance
// =============================================================================

// Shared bridge service instance (stateless, wallet initialized per-request)
const bridgeService = createBridgeService({
  sourceRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  destRpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
});

// =============================================================================
// Helper Functions
// =============================================================================

function mapBridgePhaseToStepStatus(phase: BridgePhase): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' {
  switch (phase) {
    case 'initiated':
    case 'pending_attestation':
    case 'attested':
    case 'claiming':
      return 'IN_PROGRESS';
    case 'completed':
      return 'COMPLETED';
    case 'failed':
    case 'abandoned':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

function mapBridgePhaseToCrossChainStatus(phase: BridgePhase): 'PENDING' | 'BRIDGING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' {
  switch (phase) {
    case 'initiated':
    case 'pending_attestation':
    case 'attested':
    case 'claiming':
      return 'BRIDGING';
    case 'completed':
      return 'COMPLETED';
    case 'failed':
      return 'FAILED';
    case 'abandoned':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /bridge/initiate
 * Start a new USDC bridge from Base to Polygon/Ethereum
 */
bridgeRoutes.post('/initiate', async (c) => {
  try {
    const body = await c.req.json();
    const validated = InitiateBridgeSchema.parse(body);

    const amount = BigInt(validated.amount);

    // Calculate fees and estimates
    const bridgeFee = bridgeService.calculateBridgeFee(amount);
    const timeEstimate = bridgeService.estimateBridgeTime(validated.destinationChain);
    const netAmount = amount - bridgeFee;

    // Create tracking record in database
    const transaction = await prisma.crossChainTransaction.create({
      data: {
        status: 'BRIDGING',
        calibrAmount: 0, // Not swapping from CALIBR for direct bridge
        calibrPrice: 0,
        bridgeStatus: 'IN_PROGRESS',
        bridgeUsdcReceived: Number(netAmount) / 1e6, // Convert from 6 decimals
        marketId: 'bridge-only', // Placeholder for bridge-only transactions
        outcome: 'BRIDGE',
        targetShares: 0,
        bridgeFee: Number(bridgeFee) / 1e6,
        totalFees: Number(bridgeFee) / 1e6,
        userId: validated.userId,
        walletConnectionId: validated.walletConnectionId,
      },
    });

    // Return tracking info - actual bridge execution happens client-side
    // The wallet signs the transaction, so we can't execute server-side without private key
    return c.json({
      success: true,
      data: {
        trackingId: transaction.id,
        phase: 'pending_initiation' as const,
        sourceChain: 'BASE',
        destinationChain: validated.destinationChain,
        amount: validated.amount,
        netAmount: netAmount.toString(),
        recipient: validated.recipient || validated.walletAddress,
        feeBreakdown: {
          bridgeFee: bridgeFee.toString(),
          bridgeFeeUsd: (Number(bridgeFee) / 1e6).toFixed(2),
          netAmount: netAmount.toString(),
          netAmountUsd: (Number(netAmount) / 1e6).toFixed(2),
        },
        estimatedTime: {
          minSeconds: timeEstimate.minSeconds,
          maxSeconds: timeEstimate.maxSeconds,
          averageSeconds: timeEstimate.averageSeconds,
        },
        // Contract info for client-side execution
        contracts: {
          sourceChain: 'BASE',
          tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
          usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          destinationDomain: validated.destinationChain === 'POLYGON' ? 7 : 0,
        },
      },
    });
  } catch (error) {
    console.error('[Bridge] Initiate error:', error);

    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      }, 400);
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate bridge',
    }, 500);
  }
});

/**
 * POST /bridge/:id/update
 * Update bridge status with transaction details (called by frontend after tx confirmation)
 */
bridgeRoutes.post('/:id/update', async (c) => {
  try {
    const trackingId = c.req.param('id');
    const body = await c.req.json();

    const { phase, sourceTxHash, messageHash, attestation, destTxHash, error: txError } = body;

    const updateData: Record<string, unknown> = {
      bridgeStatus: mapBridgePhaseToStepStatus(phase),
      status: mapBridgePhaseToCrossChainStatus(phase),
    };

    if (sourceTxHash) {
      updateData.bridgeBurnTxHash = sourceTxHash;
    }
    if (messageHash) {
      updateData.bridgeMessageHash = messageHash;
    }
    if (attestation) {
      updateData.bridgeAttestation = attestation;
    }
    if (destTxHash) {
      updateData.bridgeMintTxHash = destTxHash;
    }
    if (txError) {
      updateData.bridgeError = txError;
    }
    if (phase === 'completed') {
      updateData.bridgeCompletedAt = new Date();
      updateData.completedAt = new Date();
    }

    const transaction = await prisma.crossChainTransaction.update({
      where: { id: trackingId },
      data: updateData,
    });

    return c.json({
      success: true,
      data: {
        trackingId: transaction.id,
        phase,
        status: transaction.status,
        bridgeStatus: transaction.bridgeStatus,
        sourceTxHash: transaction.bridgeBurnTxHash,
        destTxHash: transaction.bridgeMintTxHash,
        messageHash: transaction.bridgeMessageHash,
        updatedAt: transaction.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Bridge] Update error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update bridge status',
    }, 500);
  }
});

/**
 * GET /bridge/status/:id
 * Get bridge status by tracking ID
 */
bridgeRoutes.get('/status/:id', async (c) => {
  try {
    const trackingId = c.req.param('id');

    const transaction = await prisma.crossChainTransaction.findUnique({
      where: { id: trackingId },
    });

    if (!transaction) {
      return c.json({
        success: false,
        error: 'Bridge transaction not found',
      }, 404);
    }

    // Determine current phase from bridge status
    let phase: BridgePhase = 'initiated';
    if (transaction.bridgeStatus === 'COMPLETED') {
      phase = 'completed';
    } else if (transaction.bridgeStatus === 'FAILED') {
      phase = 'failed';
    } else if (transaction.status === 'CANCELLED') {
      phase = 'abandoned';
    } else if (transaction.bridgeMintTxHash) {
      phase = 'claiming';
    } else if (transaction.bridgeAttestation) {
      phase = 'attested';
    } else if (transaction.bridgeMessageHash) {
      phase = 'pending_attestation';
    } else if (transaction.bridgeBurnTxHash) {
      phase = 'initiated';
    }

    return c.json({
      success: true,
      data: {
        trackingId: transaction.id,
        phase,
        status: transaction.status,
        bridgeStatus: transaction.bridgeStatus,
        sourceTxHash: transaction.bridgeBurnTxHash,
        destTxHash: transaction.bridgeMintTxHash,
        messageHash: transaction.bridgeMessageHash,
        hasAttestation: !!transaction.bridgeAttestation,
        amount: transaction.bridgeUsdcReceived,
        bridgeFee: transaction.bridgeFee,
        error: transaction.bridgeError,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
        completedAt: transaction.bridgeCompletedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Bridge] Status error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get bridge status',
    }, 500);
  }
});

/**
 * GET /bridge/active
 * Get all active bridges for a user
 */
bridgeRoutes.get('/active', async (c) => {
  try {
    const userId = c.req.query('userId');
    const walletAddress = c.req.query('walletAddress');

    if (!userId && !walletAddress) {
      return c.json({
        success: false,
        error: 'userId or walletAddress required',
      }, 400);
    }

    const whereClause: Record<string, unknown> = {
      status: {
        in: ['PENDING', 'BRIDGING'],
      },
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const transactions = await prisma.crossChainTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return c.json({
      success: true,
      data: {
        bridges: transactions.map((tx) => {
          let phase: BridgePhase = 'initiated';
          if (tx.bridgeStatus === 'COMPLETED') {
            phase = 'completed';
          } else if (tx.bridgeStatus === 'FAILED') {
            phase = 'failed';
          } else if (tx.bridgeAttestation) {
            phase = 'attested';
          } else if (tx.bridgeMessageHash) {
            phase = 'pending_attestation';
          }

          return {
            trackingId: tx.id,
            phase,
            status: tx.status,
            sourceTxHash: tx.bridgeBurnTxHash,
            destTxHash: tx.bridgeMintTxHash,
            messageHash: tx.bridgeMessageHash,
            hasAttestation: !!tx.bridgeAttestation,
            amount: tx.bridgeUsdcReceived,
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
          };
        }),
      },
    });
  } catch (error) {
    console.error('[Bridge] Active error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get active bridges',
    }, 500);
  }
});

/**
 * POST /bridge/claim/:id
 * Claim bridged USDC on destination chain
 * Note: This returns the attestation data needed for client-side claiming
 */
bridgeRoutes.post('/claim/:id', async (c) => {
  try {
    const trackingId = c.req.param('id');
    const body = await c.req.json();
    const validated = ClaimBridgeSchema.parse(body);

    // Get transaction from DB
    const transaction = await prisma.crossChainTransaction.findUnique({
      where: { id: trackingId },
    });

    if (!transaction) {
      return c.json({
        success: false,
        error: 'Bridge transaction not found',
      }, 404);
    }

    // Update with attestation data
    await prisma.crossChainTransaction.update({
      where: { id: trackingId },
      data: {
        bridgeAttestation: validated.attestation,
        bridgeStatus: 'IN_PROGRESS', // Still in progress until mint confirmed
      },
    });

    // Return contract info for client-side claim execution
    return c.json({
      success: true,
      data: {
        trackingId,
        message: validated.message,
        attestation: validated.attestation,
        contracts: {
          // Polygon MessageTransmitter for receiving
          messageTransmitter: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
          destinationChain: 'POLYGON',
        },
        instructions: 'Call receiveMessage(message, attestation) on the MessageTransmitter contract',
      },
    });
  } catch (error) {
    console.error('[Bridge] Claim error:', error);

    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      }, 400);
    }

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare claim',
    }, 500);
  }
});

/**
 * DELETE /bridge/abandon/:id
 * Mark a bridge as abandoned (user gives up waiting)
 */
bridgeRoutes.delete('/abandon/:id', async (c) => {
  try {
    const trackingId = c.req.param('id');

    const transaction = await prisma.crossChainTransaction.update({
      where: { id: trackingId },
      data: {
        status: 'CANCELLED',
        bridgeStatus: 'FAILED',
        bridgeError: 'Abandoned by user',
      },
    });

    return c.json({
      success: true,
      data: {
        trackingId: transaction.id,
        status: transaction.status,
        message: 'Bridge marked as abandoned',
      },
    });
  } catch (error) {
    console.error('[Bridge] Abandon error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to abandon bridge',
    }, 500);
  }
});

/**
 * GET /bridge/estimate
 * Get fee and time estimates for bridging
 */
bridgeRoutes.get('/estimate', async (c) => {
  try {
    const amountStr = c.req.query('amount');
    const destinationChain = c.req.query('destinationChain') as 'POLYGON' | 'ETHEREUM' || 'POLYGON';

    const amount = amountStr ? BigInt(amountStr) : BigInt(0);
    const bridgeFee = bridgeService.calculateBridgeFee(amount);
    const timeEstimate = bridgeService.estimateBridgeTime(destinationChain);
    const netAmount = amount > bridgeFee ? amount - bridgeFee : BigInt(0);

    // Estimate gas costs (rough approximation)
    const estimatedGasBase = 0.0001; // ~0.0001 ETH for depositForBurn
    const estimatedGasPolygon = 0.01; // ~0.01 MATIC for receiveMessage

    return c.json({
      success: true,
      data: {
        sourceChain: 'BASE',
        destinationChain,
        inputAmount: amount.toString(),
        inputAmountUsd: (Number(amount) / 1e6).toFixed(2),
        fees: {
          bridgeFee: bridgeFee.toString(),
          bridgeFeeUsd: (Number(bridgeFee) / 1e6).toFixed(2),
          estimatedGasSource: `~${estimatedGasBase} ETH`,
          estimatedGasDest: destinationChain === 'POLYGON'
            ? `~${estimatedGasPolygon} MATIC`
            : `~0.001 ETH`,
        },
        output: {
          netAmount: netAmount.toString(),
          netAmountUsd: (Number(netAmount) / 1e6).toFixed(2),
        },
        timing: {
          minMinutes: Math.ceil(timeEstimate.minSeconds / 60),
          maxMinutes: Math.ceil(timeEstimate.maxSeconds / 60),
          averageMinutes: Math.ceil(timeEstimate.averageSeconds / 60),
          description: '15-30 minutes typical (attestation wait)',
        },
      },
    });
  } catch (error) {
    console.error('[Bridge] Estimate error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get estimate',
    }, 500);
  }
});

/**
 * GET /bridge/attestation/:messageHash
 * Check attestation status from Circle API
 */
bridgeRoutes.get('/attestation/:messageHash', async (c) => {
  try {
    const messageHash = c.req.param('messageHash');

    if (!messageHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      return c.json({
        success: false,
        error: 'Invalid message hash format',
      }, 400);
    }

    // Query Circle's attestation API
    const attestationUrl = `https://iris-api.circle.com/attestations/${messageHash}`;
    const response = await fetch(attestationUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return c.json({
        success: true,
        data: {
          status: 'pending',
          messageHash,
          message: 'Attestation not yet available',
        },
      });
    }

    const data = await response.json() as { status: string; attestation?: string };

    return c.json({
      success: true,
      data: {
        status: data.status,
        messageHash,
        attestation: data.attestation,
        ready: data.status === 'complete' && !!data.attestation,
      },
    });
  } catch (error) {
    console.error('[Bridge] Attestation check error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check attestation',
    }, 500);
  }
});

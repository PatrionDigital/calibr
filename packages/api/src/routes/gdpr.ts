/**
 * GDPR Compliance Routes (Phase 7.2)
 * Data export and deletion functionality
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  buildUserExport,
  validateDeletionRequest,
  canCreateDeletionRequest,
  createDeletionPlan,
  formatDeletionRequest,
  estimateDeletionTime,
  type DeletionType,
  type DeletionRequest,
} from '@calibr/core';

export const gdprRoutes = new Hono();

// =============================================================================
// Validation Schemas
// =============================================================================

const createDeletionRequestSchema = z.object({
  requestType: z.enum(['FULL_ACCOUNT', 'FORECASTS_ONLY', 'PII_ONLY']),
  reason: z.string().max(1000).optional(),
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get user ID from request header (temporary until auth is implemented)
 */
function getUserId(c: Context): string {
  return c.req.header('x-user-id') || 'demo-user';
}

// =============================================================================
// Data Export Routes
// =============================================================================

/**
 * GET /api/gdpr/export - Export all user data (GDPR Article 20)
 */
gdprRoutes.get('/export', async (c) => {
  const userId = getUserId(c);

  // Fetch all user data in parallel
  const [
    user,
    privacySettings,
    calibration,
    wallets,
    forecasts,
    positions,
    transactions,
    attestations,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
    }),
    prisma.userPrivacySettings.findUnique({
      where: { userId },
    }),
    prisma.userCalibration.findUnique({
      where: { userId },
    }),
    prisma.walletConnection.findMany({
      where: { userId },
    }),
    prisma.forecast.findMany({
      where: { userId },
      include: {
        unifiedMarket: {
          select: { question: true },
        },
      },
    }),
    prisma.position.findMany({
      where: { userId },
      include: {
        platformMarket: {
          select: { question: true },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        position: { userId },
      },
    }),
    prisma.eASAttestation.findMany({
      where: { attester: userId },
    }),
  ]);

  if (!user) {
    return c.json(
      { success: false, error: 'User not found' },
      404
    );
  }

  // Build export using core module
  const exportData = buildUserExport({
    user,
    privacySettings,
    calibration,
    wallets,
    forecasts,
    positions,
    transactions,
    attestations: attestations.map((a) => ({
      uid: a.uid,
      schemaName: a.schemaName,
      createdAt: a.createdAt,
      revoked: a.revoked,
      isOffchain: a.isOffchain,
      isPrivate: a.isPrivate,
    })),
  });

  return c.json({
    success: true,
    data: exportData,
  });
});

/**
 * GET /api/gdpr/export/download - Download export as JSON file
 */
gdprRoutes.get('/export/download', async (c) => {
  const userId = getUserId(c);

  // Reuse export logic
  const [
    user,
    privacySettings,
    calibration,
    wallets,
    forecasts,
    positions,
    transactions,
    attestations,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
    }),
    prisma.userPrivacySettings.findUnique({
      where: { userId },
    }),
    prisma.userCalibration.findUnique({
      where: { userId },
    }),
    prisma.walletConnection.findMany({
      where: { userId },
    }),
    prisma.forecast.findMany({
      where: { userId },
      include: {
        unifiedMarket: {
          select: { question: true },
        },
      },
    }),
    prisma.position.findMany({
      where: { userId },
      include: {
        platformMarket: {
          select: { question: true },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        position: { userId },
      },
    }),
    prisma.eASAttestation.findMany({
      where: { attester: userId },
    }),
  ]);

  if (!user) {
    return c.json(
      { success: false, error: 'User not found' },
      404
    );
  }

  const exportData = buildUserExport({
    user,
    privacySettings,
    calibration,
    wallets,
    forecasts,
    positions,
    transactions,
    attestations: attestations.map((a) => ({
      uid: a.uid,
      schemaName: a.schemaName,
      createdAt: a.createdAt,
      revoked: a.revoked,
      isOffchain: a.isOffchain,
      isPrivate: a.isPrivate,
    })),
  });

  // Return as downloadable JSON file
  const filename = `calibr-export-${userId}-${new Date().toISOString().split('T')[0]}.json`;

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// =============================================================================
// Data Deletion Routes
// =============================================================================

/**
 * GET /api/gdpr/delete-requests - List user's deletion requests
 */
gdprRoutes.get('/delete-requests', async (c) => {
  const userId = getUserId(c);

  const requests = await prisma.dataDeletionRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({
    success: true,
    data: requests.map((r) => formatDeletionRequest(r as unknown as DeletionRequest)),
  });
});

/**
 * GET /api/gdpr/delete-requests/:id - Get specific deletion request
 */
gdprRoutes.get('/delete-requests/:id', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('id');

  const request = await prisma.dataDeletionRequest.findFirst({
    where: {
      id: requestId,
      userId,
    },
  });

  if (!request) {
    return c.json(
      { success: false, error: 'Deletion request not found' },
      404
    );
  }

  return c.json({
    success: true,
    data: formatDeletionRequest(request as unknown as DeletionRequest),
  });
});

/**
 * POST /api/gdpr/delete-requests - Create deletion request (GDPR Article 17)
 */
gdprRoutes.post('/delete-requests', async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  // Validate request body
  const parseResult = createDeletionRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        success: false,
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      },
      400
    );
  }

  const { requestType, reason } = parseResult.data;

  // Validate using core module
  const validation = validateDeletionRequest({
    userId,
    requestType,
    reason,
  });

  if (!validation.valid) {
    return c.json(
      {
        success: false,
        error: 'Validation failed',
        details: validation.errors,
      },
      400
    );
  }

  // Check for existing pending/in-progress requests
  const existingRequests = await prisma.dataDeletionRequest.findMany({
    where: { userId },
  });

  const canCreate = canCreateDeletionRequest(
    existingRequests as unknown as DeletionRequest[]
  );

  if (!canCreate.allowed) {
    return c.json(
      {
        success: false,
        error: canCreate.reason || 'Cannot create deletion request',
      },
      409
    );
  }

  // Get item counts for estimation
  const [forecastCount, positionCount, txCount, attestationCount, walletCount] =
    await Promise.all([
      prisma.forecast.count({ where: { userId } }),
      prisma.position.count({ where: { userId } }),
      prisma.transaction.count({ where: { position: { userId } } }),
      prisma.eASAttestation.count({ where: { attester: userId } }),
      prisma.walletConnection.count({ where: { userId } }),
    ]);

  const counts = {
    forecasts: forecastCount,
    positions: positionCount,
    transactions: txCount,
    attestations: attestationCount,
    wallets: walletCount,
  };

  // Create deletion plan
  const plan = createDeletionPlan(userId, requestType as DeletionType, counts);
  const timeEstimate = estimateDeletionTime(counts);

  // Create the request in database
  const request = await prisma.dataDeletionRequest.create({
    data: {
      userId,
      requestType,
      reason: reason || null,
      status: 'PENDING',
    },
  });

  return c.json(
    {
      success: true,
      data: {
        request: formatDeletionRequest(request as unknown as DeletionRequest),
        plan: {
          steps: plan.steps,
          estimatedItems: plan.estimatedItems,
        },
        timeEstimate,
      },
    },
    201
  );
});

/**
 * DELETE /api/gdpr/delete-requests/:id - Cancel pending deletion request
 */
gdprRoutes.delete('/delete-requests/:id', async (c) => {
  const userId = getUserId(c);
  const requestId = c.req.param('id');

  const request = await prisma.dataDeletionRequest.findFirst({
    where: {
      id: requestId,
      userId,
    },
  });

  if (!request) {
    return c.json(
      { success: false, error: 'Deletion request not found' },
      404
    );
  }

  // Can only cancel pending requests
  if (request.status !== 'PENDING') {
    return c.json(
      {
        success: false,
        error: `Cannot cancel request with status: ${request.status}`,
      },
      409
    );
  }

  // Delete the pending request
  await prisma.dataDeletionRequest.delete({
    where: { id: requestId },
  });

  return c.json({
    success: true,
    message: 'Deletion request cancelled',
  });
});

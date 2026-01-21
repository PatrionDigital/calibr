/**
 * Sync API Routes
 * Endpoints for managing and monitoring sync operations
 */

import { Hono } from 'hono';
import { syncScheduler } from '../services/sync-scheduler';
import { polymarketSync } from '../services/polymarket-sync';

export const syncRoutes = new Hono();

// =============================================================================
// Scheduler Control
// =============================================================================

/**
 * GET /sync/status
 * Get current sync scheduler status
 */
syncRoutes.get('/status', async (c) => {
  const state = syncScheduler.getState();
  const health = await syncScheduler.getHealth();

  return c.json({
    success: true,
    data: {
      scheduler: state,
      health,
    },
  });
});

/**
 * POST /sync/start
 * Start the sync scheduler
 */
syncRoutes.post('/start', async (c) => {
  await syncScheduler.start();

  return c.json({
    success: true,
    message: 'Sync scheduler started',
    data: syncScheduler.getState(),
  });
});

/**
 * POST /sync/stop
 * Stop the sync scheduler
 */
syncRoutes.post('/stop', (c) => {
  syncScheduler.stop();

  return c.json({
    success: true,
    message: 'Sync scheduler stopped',
    data: syncScheduler.getState(),
  });
});

// =============================================================================
// Manual Sync Triggers
// =============================================================================

/**
 * POST /sync/markets
 * Trigger manual market sync
 */
syncRoutes.post('/markets', async (c) => {
  const state = syncScheduler.getState();

  if (state.marketSyncRunning) {
    return c.json(
      {
        success: false,
        error: 'Market sync already in progress',
      },
      409
    );
  }

  // Run sync in background (fire and forget)
  syncScheduler.runMarketSync();

  // Return immediately with accepted status
  return c.json({
    success: true,
    message: 'Market sync started',
    data: {
      status: 'running',
      checkStatusAt: '/api/sync/status',
    },
  });
});

/**
 * POST /sync/markets/await
 * Trigger manual market sync and wait for completion
 */
syncRoutes.post('/markets/await', async (c) => {
  const state = syncScheduler.getState();

  if (state.marketSyncRunning) {
    return c.json(
      {
        success: false,
        error: 'Market sync already in progress',
      },
      409
    );
  }

  const result = await syncScheduler.runMarketSync();

  if (!result) {
    return c.json(
      {
        success: false,
        error: 'Sync could not be started',
      },
      500
    );
  }

  return c.json({
    success: result.success,
    data: result,
  });
});

/**
 * POST /sync/prices
 * Trigger manual price sync
 */
syncRoutes.post('/prices', async (c) => {
  const result = await syncScheduler.runPriceSync();

  if (!result) {
    return c.json(
      {
        success: false,
        error: 'Price sync could not be started (already running)',
      },
      409
    );
  }

  return c.json({
    success: result.success,
    data: result,
  });
});

// =============================================================================
// Stats & Health
// =============================================================================

/**
 * GET /sync/stats
 * Get sync statistics
 */
syncRoutes.get('/stats', async (c) => {
  const stats = await polymarketSync.getStats();

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /sync/health
 * Health check for sync services
 */
syncRoutes.get('/health', async (c) => {
  const health = await polymarketSync.healthCheck();

  const status = health.healthy ? 200 : 503;

  return c.json(
    {
      success: health.healthy,
      data: health,
    },
    status
  );
});

/**
 * GET /sync/errors
 * Get recent sync errors
 */
syncRoutes.get('/errors', (c) => {
  const state = syncScheduler.getState();

  return c.json({
    success: true,
    data: {
      errors: state.errors,
      total: state.errors.length,
    },
  });
});

// =============================================================================
// Configuration
// =============================================================================

/**
 * PUT /sync/config
 * Update scheduler configuration
 */
syncRoutes.put('/config', async (c) => {
  try {
    const body = await c.req.json();

    const config: Record<string, unknown> = {};

    if (typeof body.marketSyncInterval === 'number' && body.marketSyncInterval >= 10000) {
      config.marketSyncInterval = body.marketSyncInterval;
    }

    if (typeof body.priceSyncInterval === 'number' && body.priceSyncInterval >= 5000) {
      config.priceSyncInterval = body.priceSyncInterval;
    }

    if (typeof body.syncOnStartup === 'boolean') {
      config.syncOnStartup = body.syncOnStartup;
    }

    syncScheduler.updateConfig(config);

    return c.json({
      success: true,
      message: 'Configuration updated',
    });
  } catch {
    return c.json(
      {
        success: false,
        error: 'Invalid request body',
      },
      400
    );
  }
});

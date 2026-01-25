/**
 * @calibr/api - Backend API services
 * Prediction Market Portfolio Manager
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { syncRoutes } from './routes/sync';
import { marketRoutes } from './routes/markets';
import { tradingRoutes } from './routes/trading';
import { portfolioRoutes } from './routes/portfolio';
import { forecastRoutes } from './routes/forecasts';
import { attestationRoutes } from './routes/attestations';
import { leaderboardRoutes } from './routes/leaderboard';
import { syncScheduler } from './services/sync-scheduler';
import { prisma } from './lib/prisma';

// =============================================================================
// App Setup
// =============================================================================

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
  })
);

// =============================================================================
// Routes
// =============================================================================

// Root
app.get('/', (c) => {
  return c.json({
    name: 'Calibr.xyz API',
    version: '0.1.0',
    status: 'ok',
    endpoints: {
      health: '/health',
      markets: '/api/markets',
      sync: '/api/sync',
      trading: '/api/trading',
      portfolio: '/api/portfolio',
      forecasts: '/api/forecasts',
      attestations: '/api/attestations',
      leaderboard: '/api/leaderboard',
    },
  });
});

// Health check
app.get('/health', async (c) => {
  const dbHealthy = await prisma.$queryRaw`SELECT 1`
    .then(() => true)
    .catch(() => false);

  const schedulerState = syncScheduler.getState();

  const healthy = dbHealthy;

  return c.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      checks: {
        database: dbHealthy,
        scheduler: schedulerState.isRunning,
      },
      timestamp: new Date().toISOString(),
    },
    healthy ? 200 : 503
  );
});

// API routes
app.route('/api/sync', syncRoutes);
app.route('/api/markets', marketRoutes);
app.route('/api/trading', tradingRoutes);
app.route('/api/portfolio', portfolioRoutes);
app.route('/api/forecasts', forecastRoutes);
app.route('/api/attestations', attestationRoutes);
app.route('/api/leaderboard', leaderboardRoutes);

// =============================================================================
// Error Handling
// =============================================================================

app.onError((err, c) => {
  console.error('[API Error]', err);

  return c.json(
    {
      success: false,
      error: err.message || 'Internal server error',
    },
    500
  );
});

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Not found',
    },
    404
  );
});

// =============================================================================
// Server Startup
// =============================================================================

const port = parseInt(process.env.PORT || '3001');

// Start sync scheduler when server starts
if (process.env.NODE_ENV !== 'test') {
  console.log('[API] Starting Calibr.xyz API server...');

  // Auto-start scheduler in production/development
  if (process.env.AUTO_START_SYNC !== 'false') {
    syncScheduler.start().catch((err) => {
      console.error('[API] Failed to start sync scheduler:', err);
    });
  }
}

// =============================================================================
// Exports
// =============================================================================

export default app;

export { app, syncScheduler, prisma };

// Export for Node.js server
export const server = {
  port,
  fetch: app.fetch,
};

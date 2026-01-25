/**
 * Server Entry Point
 * Starts the Hono API server with Node.js
 */

import { serve } from '@hono/node-server';
import app, { syncScheduler } from './index';

const port = parseInt(process.env.PORT || '3001');

console.log(`
╔═══════════════════════════════════════════════════════╗
║                   CALIBR.XYZ API                       ║
║         Prediction Market Portfolio Manager           ║
╠═══════════════════════════════════════════════════════╣
║  Port: ${port}                                          ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(38)}║
╚═══════════════════════════════════════════════════════╝
`);

// Graceful shutdown handler
const shutdown = async () => {
  console.log('\n[Server] Shutting down...');

  // Stop sync scheduler
  syncScheduler.stop();

  console.log('[Server] Goodbye!');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
serve({
  fetch: app.fetch,
  port,
});

console.log(`[Server] API server running at http://localhost:${port}`);
console.log('[Server] Endpoints:');
console.log(`  - Health:  http://localhost:${port}/health`);
console.log(`  - Markets: http://localhost:${port}/api/markets`);
console.log(`  - Sync:    http://localhost:${port}/api/sync/status`);
console.log(`  - Trading: http://localhost:${port}/api/trading/platforms`);

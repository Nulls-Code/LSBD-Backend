import app from './app';
import config, { validateConfig } from './config';
import prisma from './config/prisma';

/**
 * Server entry point.
 *
 * 1. Validates environment configuration (fails fast if misconfigured)
 * 2. Tests database connectivity
 * 3. Starts the HTTP server
 * 4. Handles graceful shutdown (closes DB connections on SIGTERM/SIGINT)
 */
async function main(): Promise<void> {
  try {
    // 1. Validate config
    validateConfig();
    console.log(`[CONFIG] Environment: ${config.env}`);

    // 2. Test database connection
    await prisma.$connect();
    console.log('[DATABASE] Connected to PostgreSQL');

    // 3. Start server
    const server = app.listen(config.port, () => {
      console.log(`[SERVER] Running on http://localhost:${config.port}`);
      console.log(`[SERVER] Health check: http://localhost:${config.port}/api/v1/health`);
    });

    // 4. Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[SERVER] ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('[DATABASE] Disconnected');
        console.log('[SERVER] Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('[SERVER] Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[FATAL]', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();

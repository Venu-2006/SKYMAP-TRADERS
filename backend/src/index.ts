import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.info(`🚀 SKYMAP TRADERS API on http://localhost:${env.PORT}  ·  docs: /api/docs`);
});

/** Graceful shutdown so in-flight requests finish and DB connections close cleanly. */
const shutdown = (signal: string) => {
  console.info(`${signal} received, shutting down…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

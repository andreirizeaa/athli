import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

async function bootstrap() {
  const app = await createApp();
  const server = http.createServer(app);
  const port = Number(env.PORT) || Number(process.env.PORT) || 3002;

  server.listen(port, '0.0.0.0', () => {
    logger.info({ port }, 'Server listening');
  });

  function shutdown(signal: string) {
    logger.info({ signal }, 'Received shutdown signal');
    server.close((err) => {
      if (err) {
        logger.error({ err }, 'Error during server close');
        process.exit(1);
      }
      logger.info('Server closed gracefully');
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to bootstrap application');
  process.exit(1);
});


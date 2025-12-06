import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { clerkMiddleware } from '@clerk/express';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { rateLimiter } from '../middlewares/rate-limit';
import { requestLogger } from '../middlewares/request-logger';
import { errorHandler } from '../middlewares/error-handler';
import { notFoundHandler } from '../middlewares/not-found-handler';
import { metricsRouter } from '../infrastructure/metrics/metrics';
import { swaggerSpec } from '../config/swagger';
import { v1Router } from '../api/v1/routes';

export function createExpressApp() {
  const app = express();

  // Trust proxy for reverse proxy setups (Nginx/HAProxy)
  app.set('trust proxy', 1);

  // Security
  app.disable('x-powered-by');
  app.use(helmet());
  
  // CORS configuration - must specify origin when using credentials
  const corsOptions = {
    origin: env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOptions));

  // Performance
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  app.use(requestLogger);

  // Clerk authentication middleware
  app.use(clerkMiddleware());

  // Rate limiting for basic DoS protection
  app.use('/api', rateLimiter);

  // Health & metrics
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   */
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/metrics', metricsRouter);

  // Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // API v1 routes
  app.use('/api/v1', v1Router);

  // 404 + error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}


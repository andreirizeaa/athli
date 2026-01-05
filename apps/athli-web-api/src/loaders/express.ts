import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import basicAuth from 'express-basic-auth';
import compression from 'compression';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-id', 'x-coach-id'],
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
      serializers: {
        req: (req) => {
          // Redact sensitive fields from body
          const sensitiveFields = ['password', 'newPassword', 'otp', 'token', 'credential'];
          let sanitizedBody = req.body;

          if (req.body && typeof req.body === 'object') {
            sanitizedBody = { ...req.body };
            for (const field of sensitiveFields) {
              if (sanitizedBody[field]) {
                sanitizedBody[field] = '[REDACTED]';
              }
            }
          }

          // Truncate body if too large
          let bodyLog: unknown = sanitizedBody;
          if (sanitizedBody) {
            const bodyStr = typeof sanitizedBody === 'string'
              ? sanitizedBody
              : JSON.stringify(sanitizedBody);

            if (bodyStr.length > 500) {
              bodyLog = `${bodyStr.substring(0, 500)}... [truncated ${bodyStr.length - 500} chars]`;
            }
          }

          return {
            id: req.id,
            method: req.method,
            url: req.url,
            path: req.path,
            query: req.query,
            headers: {
              host: req.headers.host,
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
              authorization: req.headers.authorization
                ? `${req.headers.authorization.substring(0, 20)}...`
                : undefined,
            },
            remoteAddress: req.remoteAddress,
            remotePort: req.remotePort,
            body: bodyLog,
          };
        },
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
      },
      customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'responseTime',
      },
    })
  );

  app.use(requestLogger);

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

  // Swagger documentation (protected in production)
  if (env.NODE_ENV === 'production' && env.SWAGGER_PASSWORD) {
    const swaggerAuth = basicAuth({
      users: { 'admin': env.SWAGGER_PASSWORD },
      challenge: true,
      realm: 'API Documentation',
    });
    app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  } else {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  // API v1 base route info
  app.get('/api/v1', (_req, res) => {
    res.status(200).json({
      message: 'Athli API v1',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        docs: '/api-docs',
        auth: '/api/v1/auth',
        intercom: '/api/v1/intercom',
      },
    });
  });

  // API v1 routes
  app.use('/api/v1', v1Router);

  // Debug: Log all 404s before handling
  app.use((req, res, next) => {
    if (!res.headersSent) {
      console.log(`[DEBUG] 404 Candidate: ${req.method} ${req.originalUrl}`);
    }
    next();
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}


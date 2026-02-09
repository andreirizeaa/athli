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
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true, // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    frameguard: { action: 'deny' },
  }));

  // CORS configuration - must specify origin when using credentials
  // Allow web app (localhost:3001) and mobile app (local network IPs) in development
  const allowedOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3001'];

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow local network IPs for Expo mobile app
      if (env.NODE_ENV === 'development') {
        const localNetworkPattern = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.0\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
        const expoPattern = /^exp:\/\//;

        if (localNetworkPattern.test(origin) || expoPattern.test(origin)) {
          return callback(null, true);
        }
      }

      // Origin not allowed
      logger.warn({ origin }, 'CORS: Origin not allowed');
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-id', 'x-coach-id', 'x-request-source'],
  };
  app.use(cors(corsOptions));

  // Performance with security limits
  app.use(compression());

  // Request timeout middleware - prevents slow loris attacks
  app.use((req, res, next) => {
    // Set timeout for all requests (30 seconds)
    req.setTimeout(30000, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: {
            message: 'Request timeout',
            code: 'REQUEST_TIMEOUT',
          },
        });
      }
    });
    next();
  });

  // Body parsing with size limits to prevent memory exhaustion
  // Route-specific limits must come BEFORE the general limit

  // Stripe webhook needs raw body for signature verification — must come before express.json()
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

  // Stricter limits for auth routes (they don't need large payloads)
  app.use('/api/v1/auth', express.json({ limit: '16kb' }));
  app.use('/api/v1/auth', express.urlencoded({ extended: true, limit: '16kb' }));

  // Higher limits for client forms routes (base64 encoded images can be large)
  app.use('/api/v1/client/forms', express.json({ limit: '50mb' }));
  app.use('/api/v1/client/forms', express.urlencoded({ extended: true, limit: '50mb' }));

  // Default limit for general API endpoints
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

  // Protect metrics endpoint in production
  if (env.NODE_ENV === 'production' && env.SWAGGER_PASSWORD) {
    const metricsAuth = basicAuth({
      users: { 'admin': env.SWAGGER_PASSWORD },
      challenge: true,
      realm: 'Metrics',
    });
    app.use('/metrics', metricsAuth, metricsRouter);
  } else {
    app.use('/metrics', metricsRouter);
  }

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
  // In production, don't expose version or endpoint details
  app.get('/api/v1', (_req, res) => {
    if (env.NODE_ENV === 'production') {
      res.status(200).json({
        status: 'ok',
      });
    } else {
      // In development, show helpful info for debugging
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
    }
  });

  // API v1 routes
  app.use('/api/v1', v1Router);

  // Debug: Log all 404s before handling (only in development)
  if (env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      if (!res.headersSent) {
        logger.debug({ method: req.method, url: req.originalUrl }, '404 Candidate');
      }
      next();
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}


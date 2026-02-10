import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env.local first (local overrides), then .env (defaults).
// dotenv won't overwrite existing values, so .env.local takes priority.
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  LOG_LEVEL: z.string().default('info'),
  // JWT
  JWT_SECRET: z.string().optional(),
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Google OAuth
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Intercom
  NEXT_PUBLIC_INTERCOM_SECRET_KEY: z.string().optional(),
  // CORS - comma-separated list of allowed origins
  // In development, local network IPs are automatically allowed for mobile apps
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  // Web app URL for OAuth redirect URIs
  WEB_APP_URL: z.string().default('http://localhost:3001'),
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_WEBHOOK_SECRET_ACCOUNT: z.string().optional(),
  // Swagger docs protection
  SWAGGER_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;


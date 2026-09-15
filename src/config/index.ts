import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Centralized configuration object.
 * All environment variables are read here and validated at startup.
 * No other file should read process.env directly.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  cors: {
    // SEC-09: comma-separated to support multiple origins (e.g. staging + prod frontend)
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3001')
      .split(',')
      .map((o) => o.trim()),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  publicRateLimit: {
    windowMs: parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.PUBLIC_RATE_LIMIT_MAX_REQUESTS || '30', 10),
  },

  isDevelopment(): boolean {
    return this.env === 'development';
  },

  isProduction(): boolean {
    return this.env === 'production';
  },
} as const;

/**
 * Validate that all required environment variables are present.
 * Called once at startup — fails fast if anything is missing.
 */
export function validateConfig(): void {
  const required: { key: string; value: string | undefined }[] = [
    { key: 'DATABASE_URL', value: config.db.url },
    { key: 'JWT_SECRET', value: config.jwt.secret },
    { key: 'JWT_REFRESH_SECRET', value: config.jwt.refreshSecret },
  ];

  const missing = required.filter((item) => !item.value);

  if (missing.length > 0) {
    const keys = missing.map((item) => item.key).join(', ');
    throw new Error(`Missing required environment variables: ${keys}`);
  }

  // SEC-11: Enforce minimum secret length in ALL non-development environments,
  // not just production. A dev .env accidentally used in staging would silently
  // issue weak tokens without this check.
  if (config.jwt.secret.length < 32 && !config.isDevelopment()) {
    throw new Error('JWT_SECRET must be at least 32 characters in non-development environments');
  }

  if (config.jwt.refreshSecret.length < 32 && !config.isDevelopment()) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters in non-development environments');
  }
}

export default config;

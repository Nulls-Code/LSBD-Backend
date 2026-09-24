import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { sendSuccess } from './lib/response';
import config from './config';
import prisma from './config/prisma';
import { authRoutes } from './modules/auth';
import { locationRoutes } from './modules/locations';
import { userRoutes } from './modules/users';
import { customerRoutes } from './modules/customers';
import { courierRequestRoutes } from './modules/courierRequests';
import { shipmentRoutes } from './modules/shipments';
import { publicTrackingRoutes } from './modules/tracking';

const app = express();

// Trust reverse proxy (e.g. Nginx, Cloudflare, Render, Railway) for accurate IP resolution
app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const allowed = config.cors.origin;
    // 1. Exact match from configured CORS_ORIGIN
    if (allowed.includes(origin) || allowed.includes('*')) {
      return callback(null, true);
    }
    // 2. Allow Vercel preview and production deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    // 3. Allow local development on any port (localhost / 127.0.0.1)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  credentials: true,
}));

// SEC-04: 50kb is generous for this text-only API (names, addresses, notes).
// The previous 10MB limit allowed a single request to exhaust server memory.
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

app.use(cookieParser());

app.use('/api', apiRateLimiter);
app.use(requestLogger);

app.get('/api/v1/health', async (_req, res) => {
  let dbStatus = 'untested';
  let dbError = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'disconnected';
    dbError = {
      message: err?.message,
      code: err?.code,
      name: err?.name,
    };
  }

  sendSuccess(res, {
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    database: {
      status: dbStatus,
      hasUrl: Boolean(config.db.url),
      error: dbError,
    },
    env: {
      nodeEnv: config.env,
      hasJwtSecret: Boolean(config.jwt.secret),
      hasJwtRefreshSecret: Boolean(config.jwt.refreshSecret),
    },
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/courier-requests', courierRequestRoutes);
app.use('/api/v1/shipments', shipmentRoutes);
app.use('/api/v1/tracking', publicTrackingRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

app.use(errorHandler);

export default app;

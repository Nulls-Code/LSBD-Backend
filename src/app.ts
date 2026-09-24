import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { sendSuccess } from './lib/response';
import config from './config';
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
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// SEC-04: 50kb is generous for this text-only API (names, addresses, notes).
// The previous 10MB limit allowed a single request to exhaust server memory.
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

app.use(cookieParser());

app.use('/api', apiRateLimiter);
app.use(requestLogger);

app.get('/api/v1/health', (_req, res) => {
  // SEC-10: Only expose what load balancers need; omit environment/version
  // to avoid leaking reconnaissance data to unauthenticated callers.
  sendSuccess(res, {
    status: 'healthy',
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

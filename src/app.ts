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

app.use(helmet());

app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use('/api', apiRateLimiter);
app.use(requestLogger);

app.get('/api/v1/health', (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '1.0.0',
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

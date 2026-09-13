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

const app = express();

// ========================
// Global Middleware
// ========================

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Rate limiting
app.use('/api', apiRateLimiter);

// Request logging
app.use(requestLogger);

// ========================
// Health Check
// ========================

app.get('/api/v1/health', (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '1.0.0',
  });
});

// ========================
// API Routes
// ========================

app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/users', userRoutes);
app.use('/api/v1/locations', locationRoutes);
// app.use('/api/v1/customers', customerRoutes);
// app.use('/api/v1/courier-requests', courierRequestRoutes);
// app.use('/api/v1/shipments', shipmentRoutes);
// app.use('/api/v1/tracking', trackingRoutes);

// ========================
// 404 Handler
// ========================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// ========================
// Error Handler (must be last)
// ========================

app.use(errorHandler);

export default app;

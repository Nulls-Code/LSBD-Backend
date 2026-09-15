import { Router } from 'express';
import { authenticate, authenticateOptional } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { intakeRateLimiter } from '../../middleware/rateLimiter';
import * as courierRequestController from './courierRequests.controller';
import {
  requestIdParamSchema,
  createCourierRequestSchema,
  queryCourierRequestsSchema,
  reviewCourierRequestSchema,
  cancelCourierRequestSchema,
} from './courierRequests.schemas';

const router = Router();

// Public / optionally-authenticated intake endpoint
// intakeRateLimiter throttles anonymous callers to prevent DB flooding (SEC-01)
router.post(
  '/',
  intakeRateLimiter,
  authenticateOptional,
  validate({ body: createCourierRequestSchema }),
  courierRequestController.createCourierRequest,
);

// All remaining routes require full authentication
router.get(
  '/',
  authenticate,
  authorize('request:read'),
  validate({ query: queryCourierRequestsSchema }),
  courierRequestController.getCourierRequests,
);

router.get(
  '/:id',
  authenticate,
  authorize('request:read'),
  validate({ params: requestIdParamSchema }),
  courierRequestController.getCourierRequestById,
);

router.post(
  '/:id/review',
  authenticate,
  authorize('request:review'),
  validate({ params: requestIdParamSchema, body: reviewCourierRequestSchema }),
  courierRequestController.reviewCourierRequest,
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize('request:cancel'),
  validate({ params: requestIdParamSchema, body: cancelCourierRequestSchema }),
  courierRequestController.cancelCourierRequest,
);

export default router;

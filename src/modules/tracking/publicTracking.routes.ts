import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { publicRateLimiter } from '../../middleware/rateLimiter';
import { getPublicTrackingSchema } from './tracking.schemas';
import { getPublicTrackingHandler } from './tracking.controller';

const router = Router();

router.get(
  '/:trackingNumber',
  publicRateLimiter,
  validate(getPublicTrackingSchema),
  getPublicTrackingHandler
);

export default router;

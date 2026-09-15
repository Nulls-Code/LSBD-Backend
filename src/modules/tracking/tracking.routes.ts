import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authorize } from '../../middleware/authorize';
import { addTrackingUpdateSchema, getTrackingHistorySchema } from './tracking.schemas';
import { addTrackingUpdateHandler, getTrackingHistoryHandler } from './tracking.controller';

const router = Router({ mergeParams: true });

router.post(
  '/',
  authorize('tracking:create'),
  validate(addTrackingUpdateSchema),
  addTrackingUpdateHandler
);

router.get(
  '/',
  authorize('tracking:read'),
  validate(getTrackingHistorySchema),
  getTrackingHistoryHandler
);

export default router;

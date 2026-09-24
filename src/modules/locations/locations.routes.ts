import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import * as locationController from './locations.controller';
import {
  createLocationSchema,
  updateLocationSchema,
  updateLocationStatusSchema,
  locationIdParamSchema,
  queryLocationsSchema,
} from './locations.schemas';

const router = Router();

// Public endpoint — no authentication required (used by the quote-request form)
router.get('/public', locationController.getPublicLocations);

// All remaining location routes require authentication
router.use(authenticate);

router.post(
  '/',
  authorize('location:create'),
  validate({ body: createLocationSchema }),
  locationController.createLocation,
);

router.get(
  '/',
  authorize('location:read'),
  validate({ query: queryLocationsSchema }),
  locationController.getLocations,
);

router.get(
  '/:id',
  authorize('location:read'),
  validate({ params: locationIdParamSchema }),
  locationController.getLocationById,
);

router.patch(
  '/:id',
  authorize('location:update'),
  validate({ params: locationIdParamSchema, body: updateLocationSchema }),
  locationController.updateLocation,
);

router.patch(
  '/:id/status',
  authorize('location:deactivate'),
  validate({ params: locationIdParamSchema, body: updateLocationStatusSchema }),
  locationController.updateLocationStatus,
);

export default router;

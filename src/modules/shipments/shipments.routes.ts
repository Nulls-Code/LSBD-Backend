import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { queryShipmentsSchema, updateShipmentSchema } from './shipments.schemas';
import { getShipmentsHandler, getShipmentByIdHandler, updateShipmentHandler } from './shipments.controller';
import { trackingRoutes } from '../tracking';

const router = Router();

router.use(authenticate);

// Mount tracking routes as a sub-router
router.use('/:id/tracking', trackingRoutes);

router.get(
  '/',
  authorize('shipment:read'),
  validate(queryShipmentsSchema),
  getShipmentsHandler,
);

router.get(
  '/:id',
  authorize('shipment:read'),
  getShipmentByIdHandler,
);

router.patch(
  '/:id',
  authorize('shipment:update'),
  validate(updateShipmentSchema),
  updateShipmentHandler,
);

export { router as shipmentRoutes };

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import * as customerController from './customers.controller';
import {
  customerIdParamSchema,
  queryCustomersSchema,
  createCustomerSchema,
  updateCustomerSchema,
} from './customers.schemas';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

router.get(
  '/',
  authorize('customer:read'),
  validate({ query: queryCustomersSchema }),
  customerController.getCustomers,
);

router.get(
  '/:id',
  authorize('customer:read'),
  validate({ params: customerIdParamSchema }),
  customerController.getCustomerById,
);

router.post(
  '/',
  authorize('customer:update'),
  validate({ body: createCustomerSchema }),
  customerController.createCustomer,
);

router.patch(
  '/:id',
  authorize('customer:update'),
  validate({ params: customerIdParamSchema, body: updateCustomerSchema }),
  customerController.updateCustomer,
);

export default router;

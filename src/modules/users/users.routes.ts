import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import * as userController from './users.controller';
import {
  userIdParamSchema,
  queryUsersSchema,
  updateUserSchema,
  updateUserStatusSchema,
  resetUserPasswordSchema,
} from './users.schemas';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

router.get(
  '/',
  authorize('user:read'),
  validate({ query: queryUsersSchema }),
  userController.getUsers,
);

router.get(
  '/:id',
  authorize('user:read'),
  validate({ params: userIdParamSchema }),
  userController.getUserById,
);

router.patch(
  '/:id',
  authorize('user:update'),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  userController.updateUser,
);

router.patch(
  '/:id/status',
  authorize('user:deactivate'),
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  userController.updateUserStatus,
);

router.post(
  '/:id/reset-password',
  authorize('user:update'),
  validate({ params: userIdParamSchema, body: resetUserPasswordSchema }),
  userController.resetUserPassword,
);

export default router;

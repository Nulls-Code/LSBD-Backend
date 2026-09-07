import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { authRateLimiter } from '../../middleware/rateLimiter';
import * as authController from './auth.controller';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from './auth.schemas';

const router = Router();

router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  authController.loginUser,
);

router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refreshToken,
);

router.post(
  '/logout',
  authController.logoutUser,
);

router.post(
  '/register',
  authenticate,
  authorize('user:create'),
  validate({ body: registerSchema }),
  authController.registerUser,
);

router.get(
  '/profile',
  authenticate,
  authController.getProfile,
);

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

export default router;

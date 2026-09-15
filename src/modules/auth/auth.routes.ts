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

// SEC-06: authRateLimiter prevents unlimited refresh token probing
router.post(
  '/refresh',
  authRateLimiter,
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

// SEC-07: authRateLimiter prevents brute-forcing `currentPassword` with a stolen token
router.post(
  '/change-password',
  authenticate,
  authRateLimiter,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);

export default router;

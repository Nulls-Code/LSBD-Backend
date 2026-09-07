import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';
import { Permission, ROLE_PERMISSIONS } from '../types';

/**
 * Authorization middleware factory.
 *
 * Checks whether the authenticated user's role has the required permission(s).
 * Must be used AFTER the `authenticate` middleware.
 *
 * Usage:
 *   router.post('/shipments', authenticate, authorize('shipment:create'), controller.create);
 *   router.delete('/users/:id', authenticate, authorize('user:deactivate'), controller.deactivate);
 *
 * Multiple permissions can be passed — the user must have ALL of them:
 *   authorize('shipment:read', 'tracking:read')
 */
export function authorize(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userPermissions = ROLE_PERMISSIONS[user.role];

    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAll) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
}

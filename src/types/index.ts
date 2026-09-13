import { UserRole } from '@prisma/client';

/**
 * Shared type definitions used across modules.
 */

/**
 * The shape of a JWT access token payload.
 * This is what we encode into the token and what we get back when verifying it.
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Extend Express Request to carry the authenticated user.
 * Populated by the `authenticate` middleware.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Permission strings for the RBAC system.
 * Format: "resource:action"
 */
export type Permission =
  // Users
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:deactivate'
  // Locations
  | 'location:create'
  | 'location:read'
  | 'location:update'
  | 'location:deactivate'
  // Customers
  | 'customer:read'
  | 'customer:update'
  // Courier Requests
  | 'request:create'
  | 'request:read'
  | 'request:review'
  | 'request:cancel'
  // Shipments
  | 'shipment:create'
  | 'shipment:read'
  | 'shipment:update'
  // Tracking
  | 'tracking:create'
  | 'tracking:read';

/**
 * Role-to-permissions map.
 * This is the single source of truth for what each role can do.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'user:create', 'user:read', 'user:update', 'user:deactivate',
    'location:create', 'location:read', 'location:update', 'location:deactivate',
    'customer:read', 'customer:update',
    'request:create', 'request:read', 'request:review', 'request:cancel',
    'shipment:create', 'shipment:read', 'shipment:update',
    'tracking:create', 'tracking:read',
  ],
  MANAGER: [
    'location:read',
    'customer:read', 'customer:update',
    'request:create', 'request:read', 'request:review', 'request:cancel',
    'shipment:create', 'shipment:read', 'shipment:update',
    'tracking:create', 'tracking:read',
  ],
  EMPLOYEE: [
    'location:read',
    'customer:read',
    'request:create', 'request:read',
    'shipment:read',
    'tracking:create', 'tracking:read',
  ],
};

/**
 * Standard pagination query parameters.
 */
export interface PaginationQuery {
  page: number;
  limit: number;
}

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { queryNotificationsSchema } from './notifications.schemas';
import {
  listNotifications,
  unreadCount,
  markOneRead,
  markAllRead,
  removeNotification,
} from './notifications.controller';

export const notificationRoutes = Router();

// All notification routes require authentication
notificationRoutes.use(authenticate);

/**
 * GET /api/v1/notifications
 * List paginated notifications for the calling user.
 */
notificationRoutes.get(
  '/',
  authorize('notification:read'),
  validate({ query: queryNotificationsSchema }),
  listNotifications,
);

/**
 * GET /api/v1/notifications/unread-count
 * Fast unread count for badge display.
 */
notificationRoutes.get(
  '/unread-count',
  authorize('notification:read'),
  unreadCount,
);

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all unread notifications as read.
 * Must be defined BEFORE /:id/read to avoid route conflict.
 */
notificationRoutes.patch(
  '/read-all',
  authorize('notification:update'),
  markAllRead,
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read.
 */
notificationRoutes.patch(
  '/:id/read',
  authorize('notification:update'),
  markOneRead,
);

/**
 * DELETE /api/v1/notifications/:id
 * Delete a single notification.
 */
notificationRoutes.delete(
  '/:id',
  authorize('notification:update'),
  removeNotification,
);

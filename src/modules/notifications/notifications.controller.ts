import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../lib/response';
import { UnauthorizedError } from '../../lib/errors';
import * as notificationService from './notifications.service';
import { QueryNotificationsInput } from './notifications.schemas';

/**
 * GET /api/v1/notifications
 * Returns paginated notifications for the authenticated user.
 */
export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) { throw new UnauthorizedError('Authentication required'); }
    const query = req.query as unknown as QueryNotificationsInput;
    const result = await notificationService.getNotifications(req.user.userId, query);
    sendSuccess(res, result.notifications, 200, undefined, result.meta);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 */
export async function unreadCount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) { throw new UnauthorizedError('Authentication required'); }
    const count = await notificationService.getUnreadCount(req.user.userId);
    sendSuccess(res, { count });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Marks a single notification as read.
 */
export async function markOneRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) { throw new UnauthorizedError('Authentication required'); }
    const { id } = req.params as { id: string };
    await notificationService.markAsRead(id, req.user.userId);
    sendSuccess(res, null, 200, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all unread notifications as read for the authenticated user.
 */
export async function markAllRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) { throw new UnauthorizedError('Authentication required'); }
    const result = await notificationService.markAllAsRead(req.user.userId);
    sendSuccess(res, result, 200, `${result.count} notification(s) marked as read`);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/notifications/:id
 * Deletes a single notification owned by the authenticated user.
 */
export async function removeNotification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) { throw new UnauthorizedError('Authentication required'); }
    const { id } = req.params as { id: string };
    await notificationService.deleteNotification(id, req.user.userId);
    sendSuccess(res, null, 200, 'Notification deleted');
  } catch (err) {
    next(err);
  }
}

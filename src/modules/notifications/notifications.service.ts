import { NotificationType, Prisma, UserRole } from '@prisma/client';
import prisma from '../../config/prisma';
import { NotFoundError, ForbiddenError } from '../../lib/errors';
import { QueryNotificationsInput } from './notifications.schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DispatchPayload {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  /** Fan-out to every active user who holds one of these roles. */
  targetRoles?: UserRole[];
  /** Fan-out to these specific user UUIDs (merged with role targets). */
  targetUserIds?: string[];
}

// ---------------------------------------------------------------------------
// Dispatch helper
// ---------------------------------------------------------------------------

/**
 * Create one Notification row per resolved recipient (fan-out on write).
 *
 * Accepts an optional Prisma transaction client (`tx`) so that callers inside
 * an existing transaction can keep notifications atomic with the parent write.
 * If no `tx` is supplied the operation runs against the global Prisma client.
 */
export async function dispatch(
  payload: DispatchPayload,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;

  const recipientIds = new Set<string>();

  // Resolve role-based recipients (only active users)
  if (payload.targetRoles && payload.targetRoles.length > 0) {
    const users = await client.user.findMany({
      where: { role: { in: payload.targetRoles }, isActive: true },
      select: { id: true },
    });
    users.forEach((u) => recipientIds.add(u.id));
  }

  // Merge in explicit user IDs
  if (payload.targetUserIds) {
    payload.targetUserIds.forEach((id) => recipientIds.add(id));
  }

  if (recipientIds.size === 0) return;

  await client.notification.createMany({
    data: Array.from(recipientIds).map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      metadata: (payload.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    })),
  });
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Return paginated notifications visible to the calling user.
 * A notification is visible if userId matches the authenticated user.
 */
export async function getNotifications(
  userId: string,
  query: QueryNotificationsInput,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = { userId };
  if (query.unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        metadata: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Return the number of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Mark a single notification as read.
 * Throws ForbiddenError if the notification does not belong to the caller.
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, isRead: true },
  });

  if (!notification) {
    throw new NotFoundError('Notification');
  }

  if (notification.userId !== userId) {
    throw new ForbiddenError('You do not have access to this notification');
  }

  if (notification.isRead) return; // already read — no-op

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * Mark every unread notification as read for the calling user.
 */
export async function markAllAsRead(userId: string): Promise<{ count: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return { count: result.count };
}

/**
 * Delete a single notification owned by the calling user.
 */
export async function deleteNotification(
  notificationId: string,
  userId: string,
): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification) {
    throw new NotFoundError('Notification');
  }

  if (notification.userId !== userId) {
    throw new ForbiddenError('You do not have access to this notification');
  }

  await prisma.notification.delete({ where: { id: notificationId } });
}

// ---------------------------------------------------------------------------
// Retention cleanup (called once daily from server.ts)
// ---------------------------------------------------------------------------

/**
 * Hard-delete notifications older than 15 days.
 * Designed to be called from a setInterval in server.ts.
 */
export async function purgeExpiredNotifications(): Promise<void> {
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const { count } = await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (count > 0) {
    console.log(
      JSON.stringify({
        event: 'NOTIFICATIONS_PURGED',
        count,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

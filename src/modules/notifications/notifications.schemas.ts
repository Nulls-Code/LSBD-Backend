import { z } from 'zod';

/**
 * Query parameters for listing notifications.
 */
export const queryNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.preprocess(
    (val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    },
    z.boolean().optional(),
  ),
});

export type QueryNotificationsInput = z.infer<typeof queryNotificationsSchema>;

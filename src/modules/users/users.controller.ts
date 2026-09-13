import { Request, Response, NextFunction } from 'express';
import * as userService from './users.service';
import { sendSuccess } from '../../lib/response';
import { UnauthorizedError } from '../../lib/errors';
import { QueryUsersInput } from './users.schemas';

/**
 * Controller for users management endpoints.
 */

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as QueryUsersInput;
    const result = await userService.getUsers(query);
    sendSuccess(res, result.users, 200, 'Users retrieved successfully', result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const user = await userService.getUserById(id);
    sendSuccess(res, user, 200, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const { id } = req.params as { id: string };
    const user = await userService.updateUser(id, req.body, req.user.userId);
    sendSuccess(res, user, 200, 'User updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const { id } = req.params as { id: string };
    const { isActive } = req.body as { isActive: boolean };
    const user = await userService.updateUserStatus(id, isActive, req.user.userId);
    sendSuccess(res, user, 200, 'User status updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function resetUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { newPassword } = req.body as { newPassword: string };
    const result = await userService.resetUserPassword(id, newPassword);
    sendSuccess(res, null, 200, result.message);
  } catch (error) {
    next(error);
  }
}

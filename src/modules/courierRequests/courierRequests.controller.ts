import { Request, Response, NextFunction } from 'express';
import * as courierRequestService from './courierRequests.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { UnauthorizedError } from '../../lib/errors';
import { QueryCourierRequestsInput } from './courierRequests.schemas';

/**
 * Controller for courier request endpoints.
 */

export async function createCourierRequest(req: Request, res: Response, next: NextFunction) {
  try {
    // currentUserId may be undefined for unauthenticated intake
    const currentUserId = req.user?.userId;
    const courierRequest = await courierRequestService.createCourierRequest(
      req.body,
      currentUserId,
    );
    sendCreated(res, courierRequest, 'Courier request created successfully');
  } catch (error) {
    next(error);
  }
}

export async function getCourierRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as QueryCourierRequestsInput;
    const result = await courierRequestService.getCourierRequests(query);
    sendSuccess(
      res,
      result.courierRequests,
      200,
      'Courier requests retrieved successfully',
      result.meta,
    );
  } catch (error) {
    next(error);
  }
}

export async function getCourierRequestById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const courierRequest = await courierRequestService.getCourierRequestById(id);
    sendSuccess(res, courierRequest, 200, 'Courier request retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function reviewCourierRequest(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const { id } = req.params as { id: string };
    const courierRequest = await courierRequestService.reviewCourierRequest(
      id,
      req.body,
      req.user.userId,
    );
    const action = req.body.action === 'APPROVE' ? 'approved' : 'rejected';
    sendSuccess(res, courierRequest, 200, `Courier request ${action} successfully`);
  } catch (error) {
    next(error);
  }
}

export async function cancelCourierRequest(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const { id } = req.params as { id: string };
    const courierRequest = await courierRequestService.cancelCourierRequest(
      id,
      req.body,
      req.user.userId,
    );
    sendSuccess(res, courierRequest, 200, 'Courier request cancelled successfully');
  } catch (error) {
    next(error);
  }
}

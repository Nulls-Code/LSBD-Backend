import { Request, Response, NextFunction } from 'express';
import * as trackingService from './tracking.service';
import { sendSuccess } from '../../lib/response';
import { UnauthorizedError } from '../../lib/errors';

export const addTrackingUpdateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipmentId = req.params.id as string;
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await trackingService.addTrackingUpdate(
      shipmentId,
      req.user.userId,
      req.user.role,
      req.body
    );

    sendSuccess(res, result, 201, 'Tracking update added successfully');
  } catch (error) {
    next(error);
  }
};

export const getTrackingHistoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipmentId = req.params.id as string;

    const history = await trackingService.getShipmentTrackingHistory(shipmentId);

    sendSuccess(res, history, 200, 'Tracking history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getPublicTrackingHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackingNumber = req.params.trackingNumber as string;

    const trackingInfo = await trackingService.getPublicTrackingInfo(trackingNumber);

    sendSuccess(res, trackingInfo, 200, 'Public tracking info retrieved successfully');
  } catch (error) {
    next(error);
  }
};

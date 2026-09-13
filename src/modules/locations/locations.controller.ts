import { Request, Response, NextFunction } from 'express';
import * as locationService from './locations.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { QueryLocationsInput } from './locations.schemas';

/**
 * Controller for locations endpoints.
 */

export async function createLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const location = await locationService.createLocation(req.body);
    sendCreated(res, location, 'Location created successfully');
  } catch (error) {
    next(error);
  }
}

export async function getLocations(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as QueryLocationsInput;
    const result = await locationService.getLocations(query);
    sendSuccess(res, result.locations, 200, 'Locations retrieved successfully', result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getLocationById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const location = await locationService.getLocationById(id);
    sendSuccess(res, location);
  } catch (error) {
    next(error);
  }
}

export async function updateLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const location = await locationService.updateLocation(id, req.body);
    sendSuccess(res, location, 200, 'Location updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateLocationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { isActive } = req.body as { isActive: boolean };
    const location = await locationService.updateLocationStatus(id, isActive);
    sendSuccess(res, location, 200, 'Location status updated successfully');
  } catch (error) {
    next(error);
  }
}

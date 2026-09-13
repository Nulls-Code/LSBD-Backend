import { Request, Response, NextFunction } from 'express';
import * as customerService from './customers.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { QueryCustomersInput } from './customers.schemas';

/**
 * Controller for customer management endpoints.
 */

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as QueryCustomersInput;
    const result = await customerService.getCustomers(query);
    sendSuccess(res, result.customers, 200, 'Customers retrieved successfully', result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const customer = await customerService.getCustomerById(id);
    sendSuccess(res, customer, 200, 'Customer retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.createCustomer(req.body);
    sendCreated(res, customer, 'Customer created successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const customer = await customerService.updateCustomer(id, req.body);
    sendSuccess(res, customer, 200, 'Customer updated successfully');
  } catch (error) {
    next(error);
  }
}

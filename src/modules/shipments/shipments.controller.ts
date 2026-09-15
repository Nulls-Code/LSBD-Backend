import { Request, Response } from 'express';
import { sendSuccess } from '../../lib/response';
import { getShipments, getShipmentById, updateShipment } from './shipments.service';
import { QueryShipmentsInput, UpdateShipmentInput } from './shipments.schemas';

export async function getShipmentsHandler(req: Request, res: Response) {
  const result = await getShipments(req.query as unknown as QueryShipmentsInput);
  return sendSuccess(res, result.shipments, 200, undefined, result.meta);
}

export async function getShipmentByIdHandler(req: Request, res: Response) {
  const shipment = await getShipmentById(req.params.id as string);
  return sendSuccess(res, shipment);
}

export async function updateShipmentHandler(req: Request, res: Response) {
  const updatedShipment = await updateShipment(req.params.id as string, req.body as UpdateShipmentInput);
  return sendSuccess(res, updatedShipment, 200, 'Shipment updated successfully');
}

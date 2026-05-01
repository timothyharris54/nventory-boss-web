import { apiFetch } from '../../lib/api/client';
import type { CreateAdjustmentRequest } from './adjustments-types';

export async function createInventoryAdjustment(
  payload: CreateAdjustmentRequest,
): Promise<unknown> {
  return apiFetch('/inventory/adjustments', {
    method: 'POST',
    body: payload,
  });
}
import { apiFetch } from '../../lib/api/client';
import type { CreateAdjustmentRequest } from './adjustments-types';
import type {
  CreateTransferRequest,
  CreateTransferResponse,
} from './transfer-types';

export async function createInventoryAdjustment(
  payload: CreateAdjustmentRequest,
): Promise<unknown> {
  return apiFetch('/inventory/adjustments', {
    method: 'POST',
    body: payload,
  });
}

export async function createInventoryTransfer(
  payload: CreateTransferRequest,
): Promise<CreateTransferResponse> {
  return apiFetch<CreateTransferResponse>('/inventory/transfers', {
    method: 'POST',
    body: payload,
  });
}

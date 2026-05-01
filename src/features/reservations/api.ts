import { apiFetch } from '../../lib/api/client';
import type {
  InventoryReservationFilters,
  InventoryReservationRow,
  CreateReservationRequest,
  ReleaseReservationRequest,
} from './types';

export async function getInventoryReservations(
  filters: InventoryReservationFilters,
): Promise<InventoryReservationRow[]> {
  const params = new URLSearchParams();

  if (filters.productId) {
    params.set('productId', filters.productId);
  }

  if (filters.locationCode) {
    params.set('locationCode', filters.locationCode);
  }

  if (typeof filters.take === 'number' && filters.take > 0) {
    params.set('take', String(filters.take));
  }

  if (typeof filters.skip === 'number' && filters.skip > 0) {
    params.set('skip', String(filters.skip));
  }

  const query = params.toString();

  return apiFetch(`/inventory/reservations${query ? `?${query}` : ''}`);
}

export async function createInventoryReservation(
  payload: CreateReservationRequest,
): Promise<InventoryReservationRow> {
  return apiFetch('/inventory/reservations', {
    method: 'POST',
    body: payload,
  });
}

export async function releaseInventoryReservation(
  payload: ReleaseReservationRequest,
): Promise<void> {
  return apiFetch('/inventory/reservations/release', {
    method: 'POST',
    body: payload,
  });
}
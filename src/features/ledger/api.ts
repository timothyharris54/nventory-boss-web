import { apiFetch } from '../../lib/api/client';
import type { InventoryLedgerFilters, InventoryLedgerRow } from './types';

export async function getInventoryLedger(
  filters: InventoryLedgerFilters,
): Promise<InventoryLedgerRow[]> {
  const params = new URLSearchParams();

  if (filters.productId) {
    params.set('productId', filters.productId);
  }

  if (filters.locationCode) {
    params.set('locationCode', filters.locationCode);
  }

  if (typeof filters.take === 'number') {
    params.set('take', String(filters.take));
  }

  if (typeof filters.skip === 'number') {
    params.set('skip', String(filters.skip));
  }

  const query = params.toString();

  return apiFetch(`/inventory/ledger${query ? `?${query}` : ''}`);
}
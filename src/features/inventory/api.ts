import { apiFetch } from '../../lib/api/client';
import type { InventoryBalanceRow, InventoryBalanceFilters } from './types';

export async function getInventoryBalances(
  filters: InventoryBalanceFilters,
): Promise<InventoryBalanceRow[]> {
  const params = new URLSearchParams();

  if (filters.productId) {
    params.set('productId', filters.productId);
  }

  if (filters.locationCode) {
    params.set('locationCode', filters.locationCode);
  }

  if (filters.locationCode) {
    params.set('locationCode', filters.locationCode);
  }

  if (filters.take) {
    params.set('take', filters.take.toString());
  }

  if (filters.skip) {
    params.set('skip', filters.skip.toString());
  }

  const query = params.toString();
  
  return apiFetch(`/inventory/balances${query ? `?${query}` : ''}`);
}
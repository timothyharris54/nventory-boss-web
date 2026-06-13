import { apiFetch } from '../../lib/api/client';
import type {
  SalesOrderDetail,
  SalesOrderSearchFilters,
  SalesOrderSearchResult,
} from './sales-order-types';

export async function searchSalesOrders(
  filters: SalesOrderSearchFilters = {},
): Promise<SalesOrderSearchResult> {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set('q', filters.q);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (typeof filters.take === 'number') {
    params.set('take', String(filters.take));
  }

  if (typeof filters.skip === 'number') {
    params.set('skip', String(filters.skip));
  }

  const query = params.toString();

  return apiFetch(`/sales/orders/search${query ? `?${query}` : ''}`);
}

export function getSalesOrderById(
  salesOrderId: string,
): Promise<SalesOrderDetail> {
  return apiFetch<SalesOrderDetail>(`/sales/orders/${salesOrderId}`);
}

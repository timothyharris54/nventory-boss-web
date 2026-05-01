import { apiFetch } from '../../lib/api/client';
import type { ProductLookupFilters, ProductLookupItem } from './product-types';

export async function getProducts(
  filters: ProductLookupFilters = {},
): Promise<ProductLookupItem[]> {
  const params = new URLSearchParams();

  if (typeof filters.take === 'number') {
    params.set('take', String(filters.take));
  }

  if (typeof filters.skip === 'number') {
    params.set('skip', String(filters.skip));
  }

  const query = params.toString();

  return apiFetch(`/products${query ? `?${query}` : ''}`);
}
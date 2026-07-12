import { apiFetch } from '../../lib/api/client';
import type {
  CreateProductDto,
  PublishProductRequest,
  PublishProductResponse,
  ProductLookupFilters,
  ProductLookupItem,
  ProductSearchResult,
  UpdateProductDto,
} from './product-types';

export async function getProducts(
  filters: ProductLookupFilters = {},
): Promise<ProductLookupItem[]> {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set('q', filters.q);
  }

  if (typeof filters.take === 'number') {
    params.set('take', String(filters.take));
  }

  if (typeof filters.skip === 'number') {
    params.set('skip', String(filters.skip));
  }

  const query = params.toString();

  return apiFetch(`/products${query ? `?${query}` : ''}`);
}

export async function searchProducts(
  filters: ProductLookupFilters = {},
): Promise<ProductSearchResult> {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set('q', filters.q);
  }

  if (typeof filters.take === 'number') {
    params.set('take', String(filters.take));
  }

  if (typeof filters.skip === 'number') {
    params.set('skip', String(filters.skip));
  }

  const query = params.toString();

  return apiFetch(`/products/search${query ? `?${query}` : ''}`);
}

export async function createProduct(
  body: CreateProductDto,
): Promise<ProductLookupItem> {
  return apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateProduct(
  productId: string,
  body: UpdateProductDto,
): Promise<ProductLookupItem> {
  return apiFetch(`/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function publishProduct(
  productId: string,
  body: PublishProductRequest,
): Promise<PublishProductResponse> {
  return apiFetch(`/products/${productId}/ecommerce/publish`, {
    method: 'POST',
    body,
  });
}

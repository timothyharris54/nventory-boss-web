import { apiFetch } from '../../lib/api/client';
import type {
  ProductCategory,
  ProductCategoryRequest,
  ReplenishmentDefaults,
  UpdateReplenishmentDefaultsRequest,
} from './types';

export function getReplenishmentDefaults(): Promise<ReplenishmentDefaults> {
  return apiFetch<ReplenishmentDefaults>('/planning/settings');
}

export function updateReplenishmentDefaults(
  body: UpdateReplenishmentDefaultsRequest,
): Promise<unknown> {
  return apiFetch('/planning/settings', { method: 'PATCH', body });
}

export function getProductCategories(): Promise<ProductCategory[]> {
  return apiFetch<ProductCategory[]>('/product-categories');
}

export function createProductCategory(
  body: ProductCategoryRequest,
): Promise<ProductCategory> {
  return apiFetch<ProductCategory>('/product-categories', {
    method: 'POST',
    body,
  });
}

export function updateProductCategory(
  categoryId: string,
  body: ProductCategoryRequest,
): Promise<ProductCategory> {
  return apiFetch<ProductCategory>(`/product-categories/${categoryId}`, {
    method: 'PATCH',
    body,
  });
}

export function deleteProductCategory(categoryId: string): Promise<void> {
  return apiFetch<void>(`/product-categories/${categoryId}`, {
    method: 'DELETE',
  });
}

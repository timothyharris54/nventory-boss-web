import { apiFetch } from '../../lib/api/client';
import type {
  CreateVendorProductDto,
  UpdateVendorProductDto,
  VendorProduct,
} from './vendor-product-types';

export function getVendorProducts(): Promise<VendorProduct[]> {
  return apiFetch<VendorProduct[]>('/vendor-products');
}

export function getVendorProductsByVendor(
  vendorId: string,
): Promise<VendorProduct[]> {
  return apiFetch<VendorProduct[]>(
    `/vendor-products/vendor/${vendorId}`,
  );
}

export function getVendorProductById(
  vendorProductId: string,
): Promise<VendorProduct> {
  return apiFetch<VendorProduct>(
    `/vendor-products/${vendorProductId}`,
  );
}

export function getVendorProductByProductId(
  productId: string,
): Promise<VendorProduct> {
  return apiFetch<VendorProduct>(
    `/vendor-products/product/${productId}`,
  );
}

export function createVendorProduct(
  body: CreateVendorProductDto,
): Promise<VendorProduct> {
  return apiFetch<VendorProduct>('/vendor-products', {
    method: 'POST',
    body,
  });
}

export function updateVendorProduct(
  vendorProductId: string,
  body: UpdateVendorProductDto,
): Promise<VendorProduct> {
  return apiFetch<VendorProduct>(
    `/vendor-product/${vendorProductId}`,
    {
      method: 'PATCH',
      body,
    },
  );
}

export function deleteVendorProduct(
  vendorProductId: string,
): Promise<VendorProduct> {
  return apiFetch<VendorProduct>(
    `/vendors/vendor-product/${vendorProductId}`,
    {
      method: 'DELETE',
    },
  );
}

import { apiFetch } from '../../lib/api/client';
import type {
  CreateVendorRequest,
  CreateVendorPlatformRequest,
  UpdateVendorRequest,
  UpdateVendorPlatformRequest,
  Vendor,
  VendorPlatform,
} from './vendor-types';

export function getVendors(): Promise<Vendor[]> {
  return apiFetch<Vendor[]>('/vendors/allVendors');
}

export function createVendor(body: CreateVendorRequest): Promise<Vendor> {
  return apiFetch<Vendor>('/vendors/vendor', {
    method: 'POST',
    body,
  });
}

export function updateVendor(
  vendorId: string,
  body: UpdateVendorRequest,
): Promise<Vendor> {
  return apiFetch<Vendor>(`/vendors/vendor/${vendorId}`, {
    method: 'PATCH',
    body,
  });
}

export function getVendorPlatforms(): Promise<VendorPlatform[]> {
  return apiFetch<VendorPlatform[]>('/vendors/platforms');
}

export function createVendorPlatform(
  body: CreateVendorPlatformRequest,
): Promise<VendorPlatform> {
  return apiFetch<VendorPlatform>('/vendors/platforms', {
    method: 'POST',
    body,
  });
}

export function updateVendorPlatform(
  platformId: string,
  body: UpdateVendorPlatformRequest,
): Promise<VendorPlatform> {
  return apiFetch<VendorPlatform>(`/vendors/platforms/${platformId}`, {
    method: 'PATCH',
    body,
  });
}

import { apiFetch } from '../../lib/api/client';
import type {
  CreateVendorRequest,
  UpdateVendorRequest,
  Vendor,
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

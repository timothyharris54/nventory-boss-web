import { apiFetch } from '../../lib/api/client';
import type { Address, AddressRequest, UpdateAddressRequest } from './types';

export function getAddresses(): Promise<Address[]> {
  return apiFetch<Address[]>('/addresses');
}

export function getAddress(addressId: string): Promise<Address> {
  return apiFetch<Address>(`/addresses/${addressId}`);
}

export function createAddress(body: AddressRequest): Promise<Address> {
  return apiFetch<Address>('/addresses', { method: 'POST', body });
}

export function updateAddress(
  addressId: string,
  body: UpdateAddressRequest,
): Promise<Address> {
  return apiFetch<Address>(`/addresses/${addressId}`, { method: 'PATCH', body });
}

export function deleteAddress(addressId: string): Promise<Address> {
  return apiFetch<Address>(`/addresses/${addressId}`, { method: 'DELETE' });
}

function adminAddressPath(accountId: string, addressId?: string) {
  const base = `/admin/accounts/${accountId}/addresses`;
  return addressId ? `${base}/${addressId}` : base;
}

export function getAdminAddresses(accountId: string): Promise<Address[]> {
  return apiFetch<Address[]>(adminAddressPath(accountId));
}

export function createAdminAddress(
  accountId: string,
  body: AddressRequest,
): Promise<Address> {
  return apiFetch<Address>(adminAddressPath(accountId), { method: 'POST', body });
}

export function updateAdminAddress(
  accountId: string,
  addressId: string,
  body: UpdateAddressRequest,
): Promise<Address> {
  return apiFetch<Address>(adminAddressPath(accountId, addressId), {
    method: 'PATCH',
    body,
  });
}

export function deleteAdminAddress(
  accountId: string,
  addressId: string,
): Promise<Address> {
  return apiFetch<Address>(adminAddressPath(accountId, addressId), {
    method: 'DELETE',
  });
}

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createAdminAddress,
  createAddress,
  deleteAdminAddress,
  deleteAddress,
  getAdminAddresses,
  getAddresses,
  updateAdminAddress,
  updateAddress,
} from './api';
import type { Address, AddressRequest } from './types';
import { getIdentity } from '../auth/auth-store';
import { getSubscriptionAccounts } from '../subscriptions/api';

type FormState = {
  addressTypeCode: string;
  label: string;
  recipientName: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
};

const emptyForm: FormState = {
  addressTypeCode: 'business',
  label: '',
  recipientName: '',
  companyName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  countryCode: 'US',
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed.';
}

function toForm(address: Address): FormState {
  return {
    addressTypeCode: address.addressTypeCode,
    label: address.label ?? '',
    recipientName: address.recipientName ?? '',
    companyName: address.companyName ?? '',
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? '',
    city: address.city,
    region: address.region ?? '',
    postalCode: address.postalCode ?? '',
    countryCode: address.countryCode,
  };
}

function payload(form: FormState): AddressRequest {
  const optional = (value: string) => value.trim() || null;
  return {
    addressTypeCode: form.addressTypeCode.trim(),
    label: optional(form.label),
    recipientName: optional(form.recipientName),
    companyName: optional(form.companyName),
    addressLine1: form.addressLine1.trim(),
    addressLine2: optional(form.addressLine2),
    city: form.city.trim(),
    region: optional(form.region),
    postalCode: optional(form.postalCode),
    countryCode: form.countryCode.trim().toUpperCase(),
  };
}

function displayType(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const identity = getIdentity();
  const isSystemAdmin = identity?.roleCode === 'system_admin';
  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Address | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  const accountsQuery = useQuery({
    queryKey: ['admin', 'accounts', 'address-maintenance'],
    queryFn: () => getSubscriptionAccounts({ skip: 0, take: 100 }),
    enabled: isSystemAdmin,
  });
  const effectiveAccountId = isSystemAdmin
    ? (selectedAccountId ?? accountsQuery.data?.items[0]?.id ?? null)
    : null;

  const addressQueryKey = isSystemAdmin
    ? ['admin', 'accounts', effectiveAccountId, 'addresses']
    : ['addresses'];
  const addressesQuery = useQuery({
    queryKey: addressQueryKey,
    queryFn: () =>
      isSystemAdmin ? getAdminAddresses(effectiveAccountId!) : getAddresses(),
    enabled: !isSystemAdmin || Boolean(effectiveAccountId),
  });

  const filteredAddresses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (addressesQuery.data ?? []).filter((address) =>
      !term ||
      [
        address.addressTypeCode,
        address.label,
        address.recipientName,
        address.companyName,
        address.addressLine1,
        address.addressLine2,
        address.city,
        address.region,
        address.postalCode,
        address.countryCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [addressesQuery.data, search]);

  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  const createMutation = useMutation({
    mutationFn: (body: AddressRequest) =>
      isSystemAdmin
        ? createAdminAddress(effectiveAccountId!, body)
        : createAddress(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      toast.success('Address created.');
      closeForm();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AddressRequest }) =>
      isSystemAdmin
        ? updateAdminAddress(effectiveAccountId!, id, body)
        : updateAddress(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      toast.success('Address updated.');
      closeForm();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (addressId: string) =>
      isSystemAdmin
        ? deleteAdminAddress(effectiveAccountId!, addressId)
        : deleteAddress(addressId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressQueryKey });
      toast.success('Address deleted.');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEdit(address: Address) {
    setEditing(address);
    setForm(toForm(address));
    setIsFormOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = payload(form);
    if (body.countryCode.length !== 2) {
      toast.error('Country code must contain exactly two letters.');
      return;
    }
    if (editing) updateMutation.mutate({ id: editing.id, body });
    else createMutation.mutate(body);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Address Maintenance</h1>
          <p className="mt-1 text-sm text-slate-600">
            Maintain account locations used for business, billing, and shipping.
          </p>
        </div>
        <button type="button" disabled={isSystemAdmin && !effectiveAccountId} onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
          Add Address
        </button>
      </div>

      {isSystemAdmin ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="addressAccount" className="block text-sm font-semibold text-slate-700">
            Account
          </label>
          <select
            id="addressAccount"
            value={effectiveAccountId ?? ''}
            disabled={accountsQuery.isLoading}
            onChange={(event) => {
              setSelectedAccountId(event.target.value || null);
              setSearch('');
              closeForm();
              setDeleteTarget(null);
            }}
            className="mt-1.5 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {!effectiveAccountId ? <option value="">Select an account</option> : null}
            {accountsQuery.data?.items.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          {accountsQuery.error ? (
            <p className="mt-2 text-sm text-red-700">{errorMessage(accountsQuery.error)}</p>
          ) : null}
          {(accountsQuery.data?.total ?? 0) > 100 ? (
            <p className="mt-2 text-xs text-slate-500">Showing the first 100 accounts.</p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="addressSearch" className="sr-only">Search addresses</label>
        <input id="addressSearch" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search addresses" className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      {addressesQuery.isLoading ? <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading addresses…</div> : null}
      {addressesQuery.error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errorMessage(addressesQuery.error)}</div> : null}

      {!addressesQuery.isLoading && !addressesQuery.error ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredAddresses.map((address) => (
            <article key={address.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{displayType(address.addressTypeCode)}</span>
                  <h2 className="mt-3 font-bold text-slate-900">{address.label || address.companyName || address.recipientName || 'Address'}</h2>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(address)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">Edit</button>
                  <button type="button" onClick={() => setDeleteTarget(address)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button>
                </div>
              </div>
              <address className="mt-4 not-italic text-sm leading-6 text-slate-600">
                {address.recipientName ? <span className="block">{address.recipientName}</span> : null}
                {address.companyName ? <span className="block">{address.companyName}</span> : null}
                <span className="block">{address.addressLine1}</span>
                {address.addressLine2 ? <span className="block">{address.addressLine2}</span> : null}
                <span className="block">{[address.city, address.region, address.postalCode].filter(Boolean).join(', ')}</span>
                <span className="block">{address.countryCode}</span>
              </address>
            </article>
          ))}
          {filteredAddresses.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 lg:col-span-2 2xl:col-span-3">No addresses match the current search.</div> : null}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button type="button" aria-label="Close address form" className="absolute inset-0" onClick={closeForm} />
          <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <form onSubmit={submit}>
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Address' : 'Add Address'}</h2>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Address type" value={form.addressTypeCode} onChange={(value) => setForm((current) => ({ ...current, addressTypeCode: value }))} required maxLength={50} />
                <Field label="Label" value={form.label} onChange={(value) => setForm((current) => ({ ...current, label: value }))} maxLength={100} />
                <Field label="Recipient name" value={form.recipientName} onChange={(value) => setForm((current) => ({ ...current, recipientName: value }))} maxLength={255} />
                <Field label="Company name" value={form.companyName} onChange={(value) => setForm((current) => ({ ...current, companyName: value }))} maxLength={255} />
                <div className="sm:col-span-2"><Field label="Address line 1" value={form.addressLine1} onChange={(value) => setForm((current) => ({ ...current, addressLine1: value }))} required maxLength={255} /></div>
                <div className="sm:col-span-2"><Field label="Address line 2" value={form.addressLine2} onChange={(value) => setForm((current) => ({ ...current, addressLine2: value }))} maxLength={255} /></div>
                <Field label="City" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} required maxLength={100} />
                <Field label="State / region" value={form.region} onChange={(value) => setForm((current) => ({ ...current, region: value }))} maxLength={100} />
                <Field label="Postal code" value={form.postalCode} onChange={(value) => setForm((current) => ({ ...current, postalCode: value }))} maxLength={20} />
                <Field label="Country code" value={form.countryCode} onChange={(value) => setForm((current) => ({ ...current, countryCode: value.toUpperCase() }))} required minLength={2} maxLength={2} />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{isSaving ? 'Saving…' : 'Save Address'}</button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Delete address?</h2>
            <p className="mt-2 text-sm text-slate-600">{deleteTarget.label || deleteTarget.addressLine1} will be permanently removed.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{deleteMutation.isPending ? 'Deleting…' : 'Delete Address'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange, required, minLength, maxLength }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; minLength?: number; maxLength?: number }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} required={required} minLength={minLength} maxLength={maxLength} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
    </label>
  );
}

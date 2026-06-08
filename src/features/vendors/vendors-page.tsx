import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createVendor, getVendors, updateVendor } from './api';
import type { Vendor } from './vendor-types';

type VendorFormMode = 'create' | 'edit';

type VendorFormState = {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  defaultLeadTimeDays: string;
  paymentTerms: string;
  isActive: boolean;
  notes: string;
};

const emptyForm: VendorFormState = {
  name: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  defaultLeadTimeDays: '',
  paymentTerms: '',
  isActive: true,
  notes: '',
};

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Request failed.';

  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(' ');
    if (parsed.message) return parsed.message;
  } catch {
    // Some responses are plain text.
  }

  return error.message;
}

function toOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function vendorToForm(vendor: Vendor): VendorFormState {
  return {
    name: vendor.name,
    contactName: vendor.contactName ?? '',
    contactEmail: vendor.contactEmail ?? '',
    contactPhone: vendor.contactPhone ?? '',
    defaultLeadTimeDays:
      vendor.defaultLeadTimeDays === null ? '' : String(vendor.defaultLeadTimeDays),
    paymentTerms: vendor.paymentTerms ?? '',
    isActive: vendor.isActive,
    notes: vendor.notes ?? '',
  };
}

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<VendorFormMode>('create');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorFormState>(emptyForm);

  const vendorsQuery = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors,
  });

  const filteredVendors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (vendorsQuery.data ?? [])
      .filter((vendor) => showInactive || vendor.isActive)
      .filter((vendor) => {
        if (!normalizedSearch) return true;

        return [
          vendor.name,
          vendor.contactName ?? '',
          vendor.contactEmail ?? '',
          vendor.contactPhone ?? '',
          vendor.paymentTerms ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [search, showInactive, vendorsQuery.data]);

  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor created.');
      closeForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ vendorId, body }: { vendorId: string; body: VendorFormState }) =>
      updateVendor(vendorId, buildPayload(body)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vendors'] });
      await queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success('Vendor updated.');
      closeForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const activeCount = (vendorsQuery.data ?? []).filter((vendor) => vendor.isActive).length;
  const inactiveCount = (vendorsQuery.data ?? []).length - activeCount;

  function buildPayload(input: VendorFormState) {
    return {
      name: input.name.trim(),
      contactName: toOptionalString(input.contactName),
      contactEmail: toOptionalString(input.contactEmail),
      contactPhone: toOptionalString(input.contactPhone),
      defaultLeadTimeDays: toOptionalNumber(input.defaultLeadTimeDays),
      paymentTerms: toOptionalString(input.paymentTerms),
      isActive: input.isActive,
      notes: toOptionalString(input.notes),
    };
  }

  function openCreateForm() {
    setFormMode('create');
    setEditingVendor(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEditForm(vendor: Vendor) {
    setFormMode('edit');
    setEditingVendor(vendor);
    setForm(vendorToForm(vendor));
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingVendor(null);
    setForm(emptyForm);
    createMutation.reset();
    updateMutation.reset();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildPayload(form);
    if (!payload.name) {
      toast.error('Vendor name is required.');
      return;
    }

    if (form.defaultLeadTimeDays.trim() && payload.defaultLeadTimeDays === undefined) {
      toast.error('Lead time must be a valid number.');
      return;
    }

    if (formMode === 'create') {
      createMutation.mutate(payload);
      return;
    }

    if (!editingVendor) return;
    updateMutation.mutate({ vendorId: editingVendor.id, body: form });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Maintenance</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create vendors, update contacts, and control vendor availability.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Create Vendor
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Total vendors</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {vendorsQuery.data?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Inactive</p>
          <p className="mt-1 text-2xl font-bold text-slate-500">{inactiveCount}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-md">
          <label htmlFor="vendorSearch" className="sr-only">
            Search vendors
          </label>
          <input
            id="vendorSearch"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by vendor, contact, email, or terms"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Show inactive vendors
        </label>
      </div>

      {vendorsQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading vendors...
        </div>
      ) : null}

      {vendorsQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(vendorsQuery.error)}
        </div>
      ) : null}

      {!vendorsQuery.isLoading && !vendorsQuery.isError ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Terms</th>
                  <th className="px-4 py-3 font-semibold">Lead Time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{vendor.name}</p>
                      {vendor.notes ? (
                        <p className="mt-1 max-w-md text-xs text-slate-500">{vendor.notes}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <p>{vendor.contactName || '-'}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {vendor.contactEmail || vendor.contactPhone || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{vendor.paymentTerms || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {vendor.defaultLeadTimeDays === null
                        ? '-'
                        : `${vendor.defaultLeadTimeDays} days`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                          vendor.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
                        ].join(' ')}
                      >
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEditForm(vendor)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredVendors.length === 0 ? (
            <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
              No vendors match the current filters.
            </div>
          ) : null}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button
            type="button"
            aria-label="Close vendor form"
            className="absolute inset-0"
            onClick={closeForm}
          />
          <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {formMode === 'create' ? 'Create Vendor' : 'Edit Vendor'}
                </h2>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                <div>
                  <label htmlFor="vendorName" className="mb-1 block text-sm font-medium text-slate-700">
                    Vendor name
                  </label>
                  <input
                    id="vendorName"
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="vendorContactName" className="mb-1 block text-sm font-medium text-slate-700">
                      Contact name
                    </label>
                    <input
                      id="vendorContactName"
                      type="text"
                      value={form.contactName}
                      onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="vendorContactEmail" className="mb-1 block text-sm font-medium text-slate-700">
                      Contact email
                    </label>
                    <input
                      id="vendorContactEmail"
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="vendorContactPhone" className="mb-1 block text-sm font-medium text-slate-700">
                      Phone
                    </label>
                    <input
                      id="vendorContactPhone"
                      type="text"
                      value={form.contactPhone}
                      onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="vendorLeadTime" className="mb-1 block text-sm font-medium text-slate-700">
                      Lead time days
                    </label>
                    <input
                      id="vendorLeadTime"
                      type="number"
                      min="0"
                      value={form.defaultLeadTimeDays}
                      onChange={(event) => setForm((current) => ({ ...current, defaultLeadTimeDays: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="vendorPaymentTerms" className="mb-1 block text-sm font-medium text-slate-700">
                      Payment terms
                    </label>
                    <input
                      id="vendorPaymentTerms"
                      type="text"
                      value={form.paymentTerms}
                      onChange={(event) => setForm((current) => ({ ...current, paymentTerms: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Active vendor
                </label>

                <div>
                  <label htmlFor="vendorNotes" className="mb-1 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    id="vendorNotes"
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

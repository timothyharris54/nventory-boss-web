import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductLookupItem } from '../inventory/product-types';
import { ProductLookupPanel } from '../inventory/product-lookup-panel';
import { LOCATION_OPTIONS } from '../inventory/locations';
import {
  createInventoryReservation,
  getInventoryReservations,
  releaseInventoryReservation,
} from './api';
import { RESERVATION_SOURCE_TYPE_OPTIONS } from './source-types';
import type { InventoryReservationFilters, CreateReservationRequest } from './types';
import { QuantityBadge } from '../../components/data-display/quantity-badge';
import { ProductIdentity } from '../../components/data-display/product-identity';
import { toast } from 'sonner';

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function ReservationsPage() {
  const queryClient = useQueryClient();

  const [selectedProduct, setSelectedProduct] = useState<ProductLookupItem | null>(null);
  const [locationCodeInput, setLocationCodeInput] = useState(
    LOCATION_OPTIONS[0]?.code ?? 'MAIN',
  );

  const [quantityInput, setQuantityInput] = useState('');
  const [sourceIdInput, setSourceIdInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [sourceTypeInput, setSourceTypeInput] = useState(
    RESERVATION_SOURCE_TYPE_OPTIONS[0]?.value ?? ''
  );

  const reservationFilters: InventoryReservationFilters | null =
    selectedProduct && locationCodeInput
      ? {
          productId: selectedProduct.id,
          locationCode: locationCodeInput,
          take: 50,
        }
      : null;

  const {
    data: reservations,
    isLoading: isReservationsLoading,
    isError: isReservationsError,
    error: reservationsError,
  } = useQuery({
    queryKey: ['inventory-reservations', reservationFilters],
    queryFn: () => getInventoryReservations(reservationFilters!),
    enabled: reservationFilters !== null,
  });

  const createMutation = useMutation({
    mutationFn: createInventoryReservation,
    onSuccess: () => {
      setQuantityInput('');
      setSourceTypeInput('');
      setSourceIdInput('');
      setNotesInput('');
      queryClient.invalidateQueries({ queryKey: ['inventory-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      toast.success(`Reservation created for ${selectedProduct?.name ?? 'product'}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create reservation.');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: releaseInventoryReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      toast.success('Reservation released successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to release reservation.');
    }
  });

  function handleCreateReservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) return;
    if (!locationCodeInput) return;
    if (!quantityInput.trim()) return;

    const payload: CreateReservationRequest = {
      productId: selectedProduct.id,
      locationCode: locationCodeInput,
      quantity: quantityInput.trim(),
      sourceType: sourceTypeInput,
      sourceId: sourceIdInput,
      notes: notesInput,
    };

    if (sourceTypeInput.trim()) {
      payload.sourceType = sourceTypeInput.trim();
    }

    if (sourceIdInput.trim()) {
      payload.sourceId = sourceIdInput.trim();
    }

    if (notesInput.trim()) {
      payload.notes = notesInput.trim();
    }

    createMutation.mutate(payload);
  }

  function handleReleaseReservation(reservationId: string) {
    releaseMutation.mutate({
      reservationId,
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reservations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage inventory commitments by product and location.
        </p>
      </div>

      <ProductLookupPanel
        selectedProduct={selectedProduct}
        onSelectProduct={setSelectedProduct}
        onClearProduct={() => {
          setSelectedProduct(null);
          setLocationCodeInput(LOCATION_OPTIONS[0]?.code ?? 'MAIN');
          setQuantityInput('');
          setSourceTypeInput('');
          setSourceIdInput('');
          setNotesInput('');
        }}
      />

      {selectedProduct && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Selected Product
              </p>
              <ProductIdentity
                name={selectedProduct.name}
                sku={selectedProduct.sku}
                imageUrl={selectedProduct.imageUrl}
                size="md"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedProduct(null);
                setLocationCodeInput(LOCATION_OPTIONS[0]?.code ?? 'MAIN');
                setQuantityInput('');
                setSourceTypeInput('');
                setSourceIdInput('');
                setNotesInput('');
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Reservation Filters</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="reservationProductId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Selected Product ID
            </label>
            <input
              id="reservationProductId"
              type="text"
              value={selectedProduct?.id ?? ''}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none"
              placeholder="Choose a product above"
            />
          </div>

          <div>
            <label
              htmlFor="reservationLocationCode"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Location Code <span className="text-red-500">*</span>
            </label>
            <select
              id="reservationLocationCode"
              value={locationCodeInput}
              onChange={(e) => setLocationCodeInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            >
              {LOCATION_OPTIONS.map((location) => (
                <option key={location.code} value={location.code}>
                  {location.code} — {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleCreateReservation}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-lg font-semibold">Create Reservation</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="reservationQuantity"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Quantity
            </label>
            <input
              id="reservationQuantity"
              type="text"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="e.g. 5"
            />
          </div>

          <div>
            <label
              htmlFor="reservationSourceType"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Source Type
            </label>
            <select
              id="reservationSourceType"
              value={sourceTypeInput}
              onChange={(e) => setSourceTypeInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            >
              {RESERVATION_SOURCE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reservationSourceId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Source ID
            </label>
            <input
              id="reservationSourceId"
              type="text"
              value={sourceIdInput}
              onChange={(e) => setSourceIdInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Optional"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="reservationNotes"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Notes
            </label>
            <textarea
              id="reservationNotes"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Optional notes"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            disabled={
              !selectedProduct ||
              !quantityInput.trim() ||
              !sourceTypeInput ||
              !notesInput ||
              createMutation.isPending
            }            
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Reservation'}
          </button>
        </div>
      </form>

      {!selectedProduct && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Select a product to load reservations automatically.
        </div>
      )}

      {isReservationsLoading && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          Loading reservations...
        </div>
      )}

      {isReservationsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {(reservationsError as Error).message}
        </div>
      )}

      {reservations && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    {row.product?.sku ?? selectedProduct?.sku ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ProductIdentity
                      name={row.product?.name ?? selectedProduct?.name}
                      sku={row.product?.sku ?? selectedProduct?.sku}
                      imageUrl={row.product?.imageUrl ?? selectedProduct?.imageUrl}
                      fallbackName="—"
                    />
                  </td>
                  <td className="px-4 py-3">{row.locationCode}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <QuantityBadge value={row.reservedQty} variant="delta" />
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">
                    {row.sourceType
                      ? `${row.sourceType}${row.sourceId ? `: ${row.sourceId}` : ''}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleReleaseReservation(row.id)}
                      disabled={releaseMutation.isPending}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Release
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getInventoryBalances } from '../inventory/api';
import { LOCATION_OPTIONS } from '../inventory/locations';
import type { ProductLookupItem } from '../inventory/product-types';
import { ProductLookupPanel } from '../inventory/product-lookup-panel';
import { createInventoryTransfer } from './api';
import type { CreateTransferRequest } from './transfer-types';
import { ProductIdentity } from '../../components/data-display/product-identity';

function toNumber(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatQuantity(value: string | null | undefined) {
  return toNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Request failed.';

  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(' ');
    if (parsed.message) return parsed.message;
  } catch {
    // Some errors are already plain text.
  }

  return error.message;
}

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<ProductLookupItem | null>(
    null,
  );
  const [fromLocationCode, setFromLocationCode] = useState(
    LOCATION_OPTIONS[0]?.code ?? 'MAIN',
  );
  const [toLocationCode, setToLocationCode] = useState(
    LOCATION_OPTIONS[1]?.code ?? LOCATION_OPTIONS[0]?.code ?? 'ORL',
  );
  const [quantityInput, setQuantityInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const sourceBalanceQuery = useQuery({
    queryKey: [
      'inventory-balances',
      {
        productId: selectedProduct?.id,
        locationCode: fromLocationCode,
      },
    ],
    queryFn: () =>
      getInventoryBalances({
        productId: selectedProduct!.id,
        locationCode: fromLocationCode,
        take: 1,
        skip: 0,
      }),
    enabled: Boolean(selectedProduct?.id && fromLocationCode),
  });

  const destinationBalanceQuery = useQuery({
    queryKey: [
      'inventory-balances',
      {
        productId: selectedProduct?.id,
        locationCode: toLocationCode,
      },
    ],
    queryFn: () =>
      getInventoryBalances({
        productId: selectedProduct!.id,
        locationCode: toLocationCode,
        take: 1,
        skip: 0,
      }),
    enabled: Boolean(selectedProduct?.id && toLocationCode),
  });

  const sourceBalance = sourceBalanceQuery.data?.[0];
  const destinationBalance = destinationBalanceQuery.data?.[0];
  const availableQuantity = toNumber(sourceBalance?.qtyAvailable);
  const requestedQuantity = toNumber(quantityInput);
  const isSameLocation = fromLocationCode === toLocationCode;
  const isQuantityAvailable =
    requestedQuantity > 0 && requestedQuantity <= availableQuantity;

  const createMutation = useMutation({
    mutationFn: createInventoryTransfer,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-ledger'] }),
      ]);

      toast.success(
        `Transferred ${result.quantity} units from ${result.fromLocationCode} to ${result.toLocationCode}.`,
      );
      setQuantityInput('');
      setNotesInput('');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function handleClearSelection() {
    setSelectedProduct(null);
    setFromLocationCode(LOCATION_OPTIONS[0]?.code ?? 'MAIN');
    setToLocationCode(LOCATION_OPTIONS[1]?.code ?? LOCATION_OPTIONS[0]?.code ?? 'ORL');
    setQuantityInput('');
    setNotesInput('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) {
      toast.error('Select a product before creating a transfer.');
      return;
    }

    if (isSameLocation) {
      toast.error('Source and destination locations must be different.');
      return;
    }

    if (requestedQuantity <= 0) {
      toast.error('Transfer quantity must be greater than zero.');
      return;
    }

    if (!isQuantityAvailable) {
      toast.error('Transfer quantity exceeds available source quantity.');
      return;
    }

    const payload: CreateTransferRequest = {
      productId: selectedProduct.id,
      fromLocationCode,
      toLocationCode,
      quantity: quantityInput.trim(),
      occurredAt: new Date().toISOString(),
    };

    if (notesInput.trim()) {
      payload.notes = notesInput.trim();
    }

    createMutation.mutate(payload);
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Transfers</h1>
        <p className="mt-1 text-sm text-slate-600">
          Move available inventory between warehouse locations.
        </p>
      </div>

      <ProductLookupPanel
        selectedProduct={selectedProduct}
        onSelectProduct={setSelectedProduct}
        onClearProduct={handleClearSelection}
        title="Product Lookup"
        description="Choose the item to transfer."
      />

      {selectedProduct ? (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Selected Product
          </p>
          <ProductIdentity
            name={selectedProduct.name}
            sku={selectedProduct.sku}
            imageUrl={selectedProduct.imageUrl}
            size="md"
          />
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Create Transfer
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="fromLocationCode"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              From Location
            </label>
            <select
              id="fromLocationCode"
              value={fromLocationCode}
              onChange={(event) => setFromLocationCode(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            >
              {LOCATION_OPTIONS.map((location) => (
                <option key={location.code} value={location.code}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="toLocationCode"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              To Location
            </label>
            <select
              id="toLocationCode"
              value={toLocationCode}
              onChange={(event) => setToLocationCode(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            >
              {LOCATION_OPTIONS.map((location) => (
                <option key={location.code} value={location.code}>
                  {location.code} - {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProduct ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Source Available
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {sourceBalanceQuery.isFetching
                  ? '...'
                  : formatQuantity(sourceBalance?.qtyAvailable)}
              </p>
              <p className="mt-1 text-sm text-slate-600">{fromLocationCode}</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Destination Available
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {destinationBalanceQuery.isFetching
                  ? '...'
                  : formatQuantity(destinationBalance?.qtyAvailable)}
              </p>
              <p className="mt-1 text-sm text-slate-600">{toLocationCode}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Select a product to preview source and destination balances.
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="transferQuantity"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Quantity
            </label>
            <input
              id="transferQuantity"
              type="text"
              inputMode="decimal"
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="e.g. 12"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="transferNotes"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Notes
            </label>
            <input
              id="transferNotes"
              type="text"
              value={notesInput}
              onChange={(event) => setNotesInput(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Optional transfer reason or reference"
            />
          </div>
        </div>

        {isSameLocation ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            Source and destination locations must be different.
          </div>
        ) : null}

        {requestedQuantity > availableQuantity && selectedProduct ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            Quantity exceeds available inventory at {fromLocationCode}.
          </div>
        ) : null}

        <div className="mt-5">
          <button
            type="submit"
            disabled={
              !selectedProduct ||
              isSameLocation ||
              !isQuantityAvailable ||
              sourceBalanceQuery.isFetching ||
              createMutation.isPending
            }
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createMutation.isPending ? 'Creating Transfer...' : 'Create Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProductLookupItem } from '../inventory/product-types';
import { ProductLookupPanel } from '../inventory/product-lookup-panel';
import { LOCATION_OPTIONS } from '../inventory/locations';
import { createInventoryAdjustment } from './api';
import type { CreateAdjustmentRequest } from './adjustments-types';
import { toast } from 'sonner';
import { ADJUSTMENT_REASON_CODE_OPTIONS } from './reason-code-types';

export default function AdjustmentsPage() {
  const queryClient = useQueryClient();

  const [selectedProduct, setSelectedProduct] = useState<ProductLookupItem | null>(null);
  const [locationCodeInput, setLocationCodeInput] = useState(
    LOCATION_OPTIONS[0]?.code ?? 'MAIN',
  );

  const [quantityInput, setQuantityInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [reasonCodeInput, setReasonCodeInput] = useState(
    ADJUSTMENT_REASON_CODE_OPTIONS[0]?.value ?? ''
  );

  /*
  const {
    data: Adjustments,
    isLoading: isAdjustmentsLoading,
    isError: isAdjustmentsError,
    error: AdjustmentsError,
  } = useQuery({
    queryKey: ['inventory-Adjustments', AdjustmentFilters],
    queryFn: () => getInventoryAdjustments(AdjustmentFilters!),
    enabled: AdjustmentFilters !== null,
  });
*/
  const createMutation = useMutation({
    mutationFn: createInventoryAdjustment,
    onSuccess: () => {
      setQuantityInput('');
      setReasonCodeInput('');
      setNotesInput('');
      queryClient.invalidateQueries({ queryKey: ['inventory-Adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      toast.success(`Adjustment created for ${selectedProduct?.name ?? 'product'}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create Adjustment.');
    },
  });

  function handleCreateAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) return;
    if (!locationCodeInput) return;
    if (!quantityInput.trim()) return;
    if (!reasonCodeInput) return;

    const payload: CreateAdjustmentRequest = {
      productId: selectedProduct.id,
      locationCode: locationCodeInput,
      quantityDelta: quantityInput.trim(),
      reasonCode: reasonCodeInput,
      notes: notesInput,
      occurredAt: new Date().toISOString(),
    };

    if (notesInput.trim()) {
      payload.notes = notesInput.trim();
    }

    createMutation.mutate(payload);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Adjustments</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage inventory adjustments by product and location.
        </p>
      </div>

      <ProductLookupPanel
        selectedProduct={selectedProduct}
        onSelectProduct={setSelectedProduct}
        onClearProduct={() => {
          setSelectedProduct(null);
          setLocationCodeInput(LOCATION_OPTIONS[0]?.code ?? 'MAIN');
          setQuantityInput('');
          setReasonCodeInput(ADJUSTMENT_REASON_CODE_OPTIONS[0]?.value ?? '');
          setNotesInput('');
        }}
      />

      {selectedProduct && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Selected Product
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {selectedProduct.name}
              </h2>
              <p className="text-sm text-slate-600">
                SKU: {selectedProduct.sku}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedProduct(null);
                setLocationCodeInput(LOCATION_OPTIONS[0]?.code ?? 'MAIN');
                setQuantityInput('');
                setReasonCodeInput(ADJUSTMENT_REASON_CODE_OPTIONS[0]?.value ?? '');
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
        <h2 className="mb-3 text-lg font-semibold">Adjustment Filters</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="AdjustmentProductId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Selected Product ID
            </label>
            <input
              id="AdjustmentProductId"
              type="text"
              value={selectedProduct?.id ?? ''}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none"
              placeholder="Choose a product above"
            />
          </div>

          <div>
            <label
              htmlFor="AdjustmentLocationCode"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Location Code <span className="text-red-500">*</span>
            </label>
            <select
              id="AdjustmentLocationCode"
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
        onSubmit={handleCreateAdjustment}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-lg font-semibold">Create Adjustment</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="AdjustmentQuantity"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Quantity
            </label>
            <input
              id="AdjustmentQuantity"
              type="text"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="e.g. 5"
            />
          </div>

          <div>
            <label
              htmlFor="AdjustmentReasonCode"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Reason Code <span className="text-red-500">*</span>     
            </label>
            <select
              id="AdjustmentReasonCode"
              value={reasonCodeInput}
              onChange={(e) => setReasonCodeInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            >
              {ADJUSTMENT_REASON_CODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="AdjustmentNotes"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="AdjustmentNotes"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Reqired notes"
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
              !reasonCodeInput ||
              !notesInput ||
              createMutation.isPending
            }            
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Adjustment'}
          </button>
        </div>
      </form>

    </div>
  );
}

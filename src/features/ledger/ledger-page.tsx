import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInventoryLedger } from './api';
import type { InventoryLedgerFilters } from './types';
import type { ProductLookupItem } from '../inventory/product-types';
import { ProductLookupPanel } from '../inventory/product-lookup-panel';
import { LOCATION_OPTIONS } from '../inventory/locations';
import { QuantityBadge } from '../../components/data-display/quantity-badge';
import { ProductIdentity } from '../../components/data-display/product-identity';
import { formatDate } from '../../lib/utils/format-date';

export default function LedgerPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductLookupItem | null>(null);
  const [locationCodeInput, setLocationCodeInput] = useState(
    LOCATION_OPTIONS[0]?.code ?? 'MAIN',
  );

  const ledgerFilters: InventoryLedgerFilters | null =
    selectedProduct && locationCodeInput
      ? {
          productId: selectedProduct.id,
          locationCode: locationCodeInput,
          take: 50,
        }
      : null;

  const {
    data: ledgerRows,
    isLoading: isLedgerLoading,
    isError: isLedgerError,
    error: ledgerError,
  } = useQuery({
    queryKey: ['inventory-ledger', ledgerFilters],
    queryFn: () => getInventoryLedger(ledgerFilters!),
    enabled: ledgerFilters !== null,
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ledger</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review inventory movement history by product and location.
        </p>
      </div>

      <ProductLookupPanel
        selectedProduct={selectedProduct}
        onSelectProduct={setSelectedProduct}
        onClearProduct={() => {
          setSelectedProduct(null);
          setLocationCodeInput(LOCATION_OPTIONS[0]?.code ?? 'MAIN');
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
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Ledger Filters</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="ledgerProductId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Selected Product ID
            </label>
            <input
              id="ledgerProductId"
              type="text"
              value={selectedProduct?.id ?? ''}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 outline-none"
              placeholder="Choose a product above"
            />
          </div>

          <div>
            <label
              htmlFor="ledgerLocationCode"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Location Code <span className="text-red-500">*</span>
            </label>
            <select
              id="ledgerLocationCode"
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

      {!selectedProduct && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Select a product to load ledger history automatically.
        </div>
      )}

      {isLedgerLoading && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          Loading ledger...
        </div>
      )}

      {isLedgerError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {(ledgerError as Error).message}
        </div>
      )}

      {ledgerRows && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Direction</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Event Type</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-200"
                >
                  <td className="px-4 py-3">
                    {formatDate(row.occurredAt ?? row.createdAt)}
                  </td>
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
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        row.movementDirection === 'in'
                          ? 'bg-green-100 text-green-700'
                          : row.movementDirection === 'out'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.movementDirection}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <QuantityBadge
                      value={row.quantityDelta}
                      variant="delta"
                    />
                  </td>
                  <td className="px-4 py-3">{row.eventType ?? '—'}</td>
                  <td className="px-4 py-3">
                    {row.referenceType
                      ? `${row.referenceType}${row.referenceId ? `: ${row.referenceId}` : ''}`
                      : '—'}
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

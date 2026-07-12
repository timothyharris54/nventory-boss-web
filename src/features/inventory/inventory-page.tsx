import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getInventoryBalances } from './api';
import { LOCATION_OPTIONS } from './locations';
import type { InventoryBalanceFilters } from './types';
import type { ProductLookupItem } from './product-types';
import { ProductLookupPanel } from './product-lookup-panel';
import { QuantityBadge } from '../../components/data-display/quantity-badge';
import { ProductIdentity } from '../../components/data-display/product-identity';
export default function InventoryPage() {
  const [selectedProduct, setSelectedProduct] = useState<ProductLookupItem | null>(null);
  const [locationCodeInput, setLocationCodeInput] = useState('MAIN');

  const inventoryFilters: InventoryBalanceFilters | null = 
      selectedProduct && locationCodeInput.trim() 
    ? {
        productId: selectedProduct.id,
        locationCode: locationCodeInput.trim() || 'MAIN',
        take: 25,
        skip: 0,
      }
    : null;

  const {
    data: inventoryResults,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError,
  } = useQuery({
    queryKey: ['inventory-balances', inventoryFilters],
    queryFn: () => getInventoryBalances(inventoryFilters!),
    enabled: inventoryFilters !== null,
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Inventory Balances</h1>
        <p className="mt-1 text-sm text-slate-600">
          Select a product, then load inventory balances.
        </p>
      </div>

      <ProductLookupPanel
        selectedProduct={selectedProduct}
        onSelectProduct={setSelectedProduct}
        onClearProduct={() => {
          setSelectedProduct(null);
          setLocationCodeInput('MAIN');
        }}
      />
      {
        selectedProduct && (
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
              onClick={() => {setSelectedProduct(null); setLocationCodeInput('MAIN');}}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">        
        <h2 className="mb-3 text-lg font-semibold">Inventory Filters</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="productId"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Selected Product ID
            </label>
            <input
              id="productId"
              type="text"
              value={selectedProduct?.id ?? ''}
              readOnly
              />
          </div>

          <div>
            <label
              htmlFor="locationCode"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Location Code <span className="text-red-500">*</span>
            </label>

            <select
              id="locationCode"
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
      {
        !selectedProduct && (
        <div className="rounded-xl border border-slate-200 bg-white mt-2 p-6 text-sm text-slate-600 shadow-sm">
          Select a product and confirm location to load inventory balances.
        </div>
      )}
      {
        isInventoryLoading && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          Loading inventory...
        </div>
      )}

      {
        isInventoryError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {(inventoryError as Error).message}
        </div>
      )}

      {
        inventoryResults && (
        <div className="overflow-hidden rounded-xl mt-2 border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">On Hand</th>
                <th className="px-4 py-3 font-semibold">Reserved</th>
                <th className="px-4 py-3 font-semibold">Incoming</th>
                <th className="px-4 py-3 font-semibold">Available</th>
              </tr>
            </thead>            
            <tbody>
              {inventoryResults.map((row) => (
                <tr
                  key={`${row.productId}-${row.locationCode}`}
                  className="border-t border-slate-200"
                >
                  <td className="px-4 py-3">{row.product.sku}</td>
                  <td className="px-4 py-3">
                    <ProductIdentity
                      name={row.product.name}
                      sku={row.product.sku}
                      imageUrl={row.product.imageUrl}
                    />
                  </td>
                  <td className="px-4 py-3">{row.locationCode}</td>
                  <td className="px-4 py-3 text-right">
                    <QuantityBadge value={row.qtyOnHand} variant="onHand" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <QuantityBadge value={row.qtyReserved} variant="reserved" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <QuantityBadge value={row.qtyIncoming} variant="incoming" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <QuantityBadge value={row.qtyAvailable} variant="available" />
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
  );
}

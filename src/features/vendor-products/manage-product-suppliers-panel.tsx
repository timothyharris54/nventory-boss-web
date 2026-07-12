import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createVendorProduct,
  deleteVendorProduct,
  getVendorProductsByProductId,
  updateVendorProduct,
} from './vendor-products-api';
import type { CreateVendorProductDto, VendorProduct } from './vendor-product-types';
import {
  getVendorProductRuleWarnings,
  productHasActivePrimaryVendor,
} from './vendor-product-validation';
import { ProductIdentity } from '../../components/data-display/product-identity';

type VendorOption = {
  id: string;
  name: string;
};

type Props = {
  productId: string;
  productName?: string;
  productSku?: string;
  productImageUrl?: string | null;
  vendors: VendorOption[];
  onClose: () => void;
};

function InlineWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {warnings.map((warning) => (
        <p
          key={warning}
          className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
        >
          {warning}
        </p>
      ))}
    </div>
  );
}

export function ManageProductSuppliersPanel({
  productId,
  productName,
  productSku,
  productImageUrl,
  vendors,
  onClose,
}: Props) {
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = useState('');
  const [vendorSku, setVendorSku] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [minOrderQty, setMinOrderQty] = useState('1');
  const [orderMultiple, setOrderMultiple] = useState('1');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [isPrimaryVendor, setIsPrimaryVendor] = useState(false);

  const { data: suppliers = [], isLoading } = useQuery<VendorProduct[]>({
    queryKey: ['product-id', productId],
    queryFn: () => getVendorProductsByProductId(productId),
  });

  const availableVendors = useMemo(() => {
    const configuredVendorIds = new Set(
      suppliers.map((supplier) => supplier.vendorId),
    );

    return vendors.filter((vendor) => !configuredVendorIds.has(vendor.id));
  }, [suppliers, vendors]);

  const addSupplierWarnings = useMemo(
    () =>
      getVendorProductRuleWarnings({
        minOrderQty,
        orderMultiple,
        leadTimeDays,
      }).map((warning) => warning.message),
    [leadTimeDays, minOrderQty, orderMultiple],
  );

  const hasPrimaryVendor = useMemo(
    () => productHasActivePrimaryVendor(suppliers, productId),
    [productId, suppliers],
  );

  const createMutation = useMutation({
    mutationFn: createVendorProduct,
    onSuccess: () => {
      toast.success('Supplier added.');
      queryClient.invalidateQueries({ queryKey: ['product-id', productId] });
      setVendorId('');
      setVendorSku('');
      setUnitCost('');
      setMinOrderQty('1');
      setOrderMultiple('1');
      setLeadTimeDays('');
      setIsPrimaryVendor(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to add supplier.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Partial<CreateVendorProductDto>;
    }) => updateVendorProduct(id, body),
    onSuccess: () => {
      toast.success('Supplier updated.');
      queryClient.invalidateQueries({ queryKey: ['product-id', productId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update vendor product.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendorProduct,
    onSuccess: () => {
      toast.success('Supplier removed.');
      queryClient.invalidateQueries({ queryKey: ['product-id', productId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to remove vendor product.');
    },
  });

  const handleAddSupplier = () => {
    if (!vendorId || !unitCost) {
      toast.error('Vendor and unit cost are required.');
      return;
    }

    if (!availableVendors.some((vendor) => vendor.id === vendorId)) {
      toast.error('This vendor is already configured for the product.');
      return;
    }

    createMutation.mutate({
      productId,
      vendorId,
      vendorSku: vendorSku.trim() || undefined,
      unitCost: String(unitCost),
      minOrderQty: minOrderQty || '1',
      orderMultiple: orderMultiple || '1',
      leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
      isPrimaryVendor,
      isActive: true,
    });
  };

  const handleSetPrimary = (vendorProduct: VendorProduct) => {
    updateMutation.mutate({
      id: vendorProduct.id,
      body: {
        isPrimaryVendor: true,
      },
    });
  };

  const handleToggleActive = (vendorProduct: VendorProduct) => {
    updateMutation.mutate({
      id: vendorProduct.id,
      body: {
        isActive: !vendorProduct.isActive,
      },
    });
  };

  const handleDelete = (vendorProduct: VendorProduct) => {
    const confirmed = window.confirm(
      `Remove ${vendorProduct.vendor?.name ?? 'this vendor'} from this product?`,
    );

    if (!confirmed) return;

    deleteMutation.mutate(vendorProduct.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <aside
        className="relative h-full w-full max-w-4xl overflow-y-auto bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Product Suppliers
              </p>
              <div className="mt-2">
                <ProductIdentity
                  name={productName}
                  sku={productSku}
                  imageUrl={productImageUrl}
                  fallbackName={`Product ${productId}`}
                  size="md"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Add Supplier</h3>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Vendor
                </label>
                <select
                  value={vendorId}
                  onChange={(event) => setVendorId(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Select vendor</option>
                  {availableVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                {!isLoading && availableVendors.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    All vendors are already configured for this product.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Vendor SKU
                </label>
                <input
                  value={vendorSku}
                  onChange={(event) => setVendorSku(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Unit Cost
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  MOQ
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minOrderQty}
                  onChange={(event) => setMinOrderQty(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
                <InlineWarnings
                  warnings={addSupplierWarnings.filter((warning) =>
                    warning.includes('MOQ') || warning.includes('multiple'),
                  )}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Order Multiple
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderMultiple}
                  onChange={(event) => setOrderMultiple(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Lead Time Days
                </label>
                <input
                  type="number"
                  min="0"
                  value={leadTimeDays}
                  onChange={(event) => setLeadTimeDays(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Optional"
                />
                <InlineWarnings
                  warnings={addSupplierWarnings.filter((warning) =>
                    warning.includes('lead time'),
                  )}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPrimaryVendor}
                  onChange={(event) => setIsPrimaryVendor(event.target.checked)}
                />
                Primary supplier
              </label>

              <button
                type="button"
                onClick={handleAddSupplier}
                disabled={createMutation.isPending}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Supplier'}
              </button>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold">Configured Suppliers</h3>

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading vendors...</p>
            ) : suppliers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No suppliers configured for this product yet.
              </p>
            ) : (
              <>
                {!hasPrimaryVendor && (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    Assign an active primary supplier for this product.
                  </div>
                )}

                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Vendor</th>
                        <th className="px-3 py-2">Vendor SKU</th>
                        <th className="px-3 py-2 text-right">Cost</th>
                        <th className="px-3 py-2 text-right">MOQ</th>
                        <th className="px-3 py-2 text-right">Multiple</th>
                        <th className="px-3 py-2 text-right">Lead Time</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {suppliers.map((supplier) => {
                        const supplierWarnings = getVendorProductRuleWarnings(
                          supplier,
                        ).map((warning) => warning.message);

                        return (
                          <tr key={supplier.id} className="border-t">
                            <td className="px-3 py-3">
                              <div className="font-medium">
                                {supplier.vendor?.name ?? supplier.vendorId}
                              </div>
                              {supplier.isPrimaryVendor && (
                                <div className="mt-1 text-xs font-medium text-green-700">
                                  Primary
                                </div>
                              )}
                              <InlineWarnings warnings={supplierWarnings} />
                            </td>

                            <td className="px-3 py-3">
                              {supplier.vendorSku ?? '—'}
                            </td>

                            <td className="px-3 py-3 text-right">
                              {supplier.unitCost ?? '—'}
                            </td>

                            <td className="px-3 py-3 text-right">
                              {supplier.minOrderQty ?? '—'}
                            </td>

                            <td className="px-3 py-3 text-right">
                              {supplier.orderMultiple ?? '—'}
                            </td>

                            <td className="px-3 py-3 text-right">
                              {supplier.leadTimeDays ?? '—'}
                            </td>

                            <td className="px-3 py-3">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  supplier.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {supplier.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            <td className="px-3 py-3">
                              <div className="flex justify-end gap-2">
                                {!supplier.isPrimaryVendor && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimary(supplier)}
                                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                                  >
                                    Set Primary
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(supplier)}
                                  className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                                >
                                  {supplier.isActive ? 'Deactivate' : 'Activate'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(supplier)}
                                  className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

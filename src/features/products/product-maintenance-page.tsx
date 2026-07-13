import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ProductIdentity } from '../../components/data-display/product-identity';
import { routes } from '../../lib/constants/routes';
import { getEcommerceConnections } from '../setup/api';
import { getVendors } from '../vendors/api';
import type { Vendor } from '../vendors/vendor-types';
import { ProductLookupPanel } from '../inventory/product-lookup-panel';
import {
  createProduct,
  publishProduct,
  updateProduct,
} from '../inventory/products-api';
import type {
  CreateProductDto,
  ProductLookupItem,
  UpdateProductDto,
} from '../inventory/product-types';
import {
  createVendorProduct,
  getVendorProductsByProductId,
  updateVendorProduct,
} from '../vendor-products/vendor-products-api';
import type { VendorProduct } from '../vendor-products/vendor-product-types';

type ProductFormState = {
  sku: string;
  name: string;
  imageUrl: string;
  excludeFromPlanning: boolean;
};

type VendorAssignmentState = {
  vendorId: string;
  vendorSku: string;
  unitCost: string;
  minOrderQty: string;
  orderMultiple: string;
  leadTimeDays: string;
  isPrimaryVendor: boolean;
};

const emptyProductForm: ProductFormState = {
  sku: '',
  name: '',
  imageUrl: '',
  excludeFromPlanning: false,
};

const emptyVendorAssignment: VendorAssignmentState = {
  vendorId: '',
  vendorSku: '',
  unitCost: '',
  minOrderQty: '1',
  orderMultiple: '1',
  leadTimeDays: '',
  isPrimaryVendor: false,
};

function toOptionalString(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toProductForm(product: ProductLookupItem): ProductFormState {
  return {
    sku: product.sku,
    name: product.name,
    imageUrl: product.imageUrl ?? '',
    excludeFromPlanning: product.excludeFromPlanning,
  };
}

function buildCreateProductPayload(form: ProductFormState): CreateProductDto {
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    imageUrl: toOptionalString(form.imageUrl),
    excludeFromPlanning: form.excludeFromPlanning,
  };
}

function buildUpdateProductPayload(form: ProductFormState): UpdateProductDto {
  return {
    sku: form.sku.trim(),
    name: form.name.trim(),
    imageUrl: toOptionalString(form.imageUrl) ?? null,
    excludeFromPlanning: form.excludeFromPlanning,
  };
}

function formatCurrency(value: string | null) {
  if (!value) return '-';

  const amount = Number(value);
  if (Number.isNaN(amount)) return value;

  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

function getPublishMessage(response: { message?: string }) {
  return response.message ?? 'Product publish request sent.';
}

export default function ProductMaintenancePage() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<ProductLookupItem | null>(
    null,
  );
  const [productForm, setProductForm] =
    useState<ProductFormState>(emptyProductForm);
  const [vendorForm, setVendorForm] =
    useState<VendorAssignmentState>(emptyVendorAssignment);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);

  const vendorsQuery = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: getVendors,
  });

  const connectionsQuery = useQuery({
    queryKey: ['ecommerce-connections'],
    queryFn: getEcommerceConnections,
  });

  const vendorProductsQuery = useQuery<VendorProduct[]>({
    queryKey: ['vendor-products', selectedProduct?.id],
    queryFn: () => getVendorProductsByProductId(selectedProduct!.id),
    enabled: Boolean(selectedProduct),
  });

  const activeVendors = useMemo(
    () =>
      (vendorsQuery.data ?? [])
        .filter((vendor) => vendor.isActive)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [vendorsQuery.data],
  );

  const activeConnections = useMemo(
    () =>
      (connectionsQuery.data ?? [])
        .filter((connection) => connection.isActive)
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [connectionsQuery.data],
  );

  const selectedVendorIds = useMemo(
    () =>
      new Set(
        (vendorProductsQuery.data ?? []).map((vendorProduct) => vendorProduct.vendorId),
      ),
    [vendorProductsQuery.data],
  );

  const availableVendors = useMemo(
    () => activeVendors.filter((vendor) => !selectedVendorIds.has(vendor.id)),
    [activeVendors, selectedVendorIds],
  );

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProduct(product);
      setProductForm(toProductForm(product));
      toast.success('Product created.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to create product.');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: UpdateProductDto }) =>
      updateProduct(productId, body),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProduct(product);
      setProductForm(toProductForm(product));
      toast.success('Product updated.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update product.');
    },
  });

  const assignVendorMutation = useMutation({
    mutationFn: createVendorProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendor-products', selectedProduct?.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      setVendorForm(emptyVendorAssignment);
      toast.success('Vendor assigned.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to assign vendor.');
    },
  });

  const primaryVendorMutation = useMutation({
    mutationFn: (vendorProduct: VendorProduct) =>
      updateVendorProduct(vendorProduct.id, { isPrimaryVendor: true, isActive: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['vendor-products', selectedProduct?.id],
      });
      await queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      toast.success('Primary vendor updated.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to update primary vendor.',
      );
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({
      productId,
      connectionIds,
    }: {
      productId: string;
      connectionIds: string[];
    }) => publishProduct(productId, { connectionIds }),
    onSuccess: (response) => {
      toast.success(getPublishMessage(response), {
        closeButton: true,
        duration: Infinity,
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to publish product.', {
        closeButton: true,
        duration: Infinity,
      });
    },
  });

  const canSaveProduct = productForm.sku.trim() && productForm.name.trim();
  const canAssignVendor =
    selectedProduct !== null && vendorForm.vendorId && vendorForm.unitCost.trim();
  const canPublish = selectedProduct !== null && selectedConnectionIds.length > 0;

  function handleCreateNew() {
    setSelectedProduct(null);
    setProductForm(emptyProductForm);
    setVendorForm(emptyVendorAssignment);
    setSelectedConnectionIds([]);
  }

  function handleSelectProduct(product: ProductLookupItem) {
    setSelectedProduct(product);
    setProductForm(toProductForm(product));
    setVendorForm(emptyVendorAssignment);
    setSelectedConnectionIds([]);
  }

  function handleSaveProduct() {
    if (!canSaveProduct) {
      toast.error('SKU and product name are required.');
      return;
    }

    if (selectedProduct) {
      updateProductMutation.mutate({
        productId: selectedProduct.id,
        body: buildUpdateProductPayload(productForm),
      });
      return;
    }

    createProductMutation.mutate(buildCreateProductPayload(productForm));
  }

  function handleAssignVendor() {
    if (!selectedProduct) {
      toast.error('Create or select a product before assigning a vendor.');
      return;
    }

    if (!canAssignVendor) {
      toast.error('Vendor and unit cost are required.');
      return;
    }

    assignVendorMutation.mutate({
      productId: selectedProduct.id,
      vendorId: vendorForm.vendorId,
      vendorSku: toOptionalString(vendorForm.vendorSku),
      unitCost: vendorForm.unitCost.trim(),
      minOrderQty: vendorForm.minOrderQty.trim() || '1',
      orderMultiple: vendorForm.orderMultiple.trim() || '1',
      leadTimeDays: vendorForm.leadTimeDays
        ? Number(vendorForm.leadTimeDays)
        : undefined,
      isPrimaryVendor: vendorForm.isPrimaryVendor,
      isActive: true,
    });
  }

  function toggleConnection(connectionId: string) {
    setSelectedConnectionIds((current) =>
      current.includes(connectionId)
        ? current.filter((id) => id !== connectionId)
        : [...current, connectionId],
    );
  }

  function handlePublish() {
    if (!selectedProduct) {
      toast.error('Select a product before publishing.');
      return;
    }

    if (selectedConnectionIds.length === 0) {
      toast.error('Select at least one ecommerce platform.');
      return;
    }

    publishMutation.mutate({
      productId: selectedProduct.id,
      connectionIds: selectedConnectionIds,
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold">Product Maintenance</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create products, assign vendor sourcing, and publish to ecommerce
            platforms.
          </p>
        </div>
      </div>

      <ProductLookupPanel
        selectedProduct={selectedProduct}
        onSelectProduct={handleSelectProduct}
        onClearProduct={handleCreateNew}
        title="Find Existing Product"
        description="Search by SKU or product name before creating a new record."
        showIdleState={false}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Product Details
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selectedProduct
                  ? 'Update the selected product record.'
                  : 'Add a product before assigning vendors or publishing.'}
              </p>
            </div>
            {selectedProduct ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
                {selectedProduct.status}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="productSku"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                id="productSku"
                type="text"
                value={productForm.sku}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    sku: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="productName"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                id="productName"
                type="text"
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="productImageUrl"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Image URL
              </label>
              <input
                id="productImageUrl"
                type="url"
                value={productForm.imageUrl}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    imageUrl: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 md:col-span-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={productForm.excludeFromPlanning}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      excludeFromPlanning: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-900">
                  Exclude from planning
                </span>
              </label>
              <span
                tabIndex={0}
                aria-label="More information about excluding a product from planning"
                aria-describedby="exclude-from-planning-tooltip"
                className="group relative inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-500 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                ?
                <span
                  id="exclude-from-planning-tooltip"
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
                >
                  Ignore this product during inventory planning, such as for a
                  one-time buy.
                </span>
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {selectedProduct ? (
              <ProductIdentity
                name={selectedProduct.name}
                sku={selectedProduct.sku}
                imageUrl={selectedProduct.imageUrl}
              />
            ) : (
              <p className="text-sm text-slate-500">No product selected.</p>
            )}

            <button
              type="button"
              onClick={handleSaveProduct}
              disabled={
                !canSaveProduct ||
                createProductMutation.isPending ||
                updateProductMutation.isPending
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectedProduct ? 'Save Product' : 'Create Product'}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Ecommerce Publishing
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Select the channels that should receive this product.
              </p>
            </div>
            <Link
              to={routes.ecommerceConnections}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Setup
            </Link>
          </div>

          {connectionsQuery.isLoading ? (
            <p className="text-sm text-slate-600">Loading ecommerce platforms...</p>
          ) : null}

          {!connectionsQuery.isLoading && activeConnections.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No active ecommerce platforms are configured.
            </div>
          ) : null}

          <div className="space-y-2">
            {activeConnections.map((connection) => (
              <label
                key={connection.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedConnectionIds.includes(connection.id)}
                  onChange={() => toggleConnection(connection.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block font-medium text-slate-900">
                    {connection.displayName}
                  </span>
                  <span className="mt-1 block text-xs uppercase text-slate-500">
                    {connection.provider}
                    {connection.storeUrl ? ` - ${connection.storeUrl}` : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePublish}
            disabled={!canPublish || publishMutation.isPending}
            className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Push to Selected Platforms
          </button>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Vendor Assignment
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Attach a vendor and purchasing details to the selected product.
            </p>
          </div>
          <Link
            to={routes.vendors}
            className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Manage Vendors
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-2">
            <label
              htmlFor="assignedVendor"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Vendor <span className="text-red-500">*</span>
            </label>
            <select
              id="assignedVendor"
              value={vendorForm.vendorId}
              onChange={(event) =>
                setVendorForm((current) => ({
                  ...current,
                  vendorId: event.target.value,
                }))
              }
              disabled={!selectedProduct || vendorsQuery.isLoading}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
            >
              <option value="">
                {vendorsQuery.isLoading ? 'Loading vendors...' : 'Select vendor'}
              </option>
              {availableVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="vendorSku"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Vendor SKU
            </label>
            <input
              id="vendorSku"
              type="text"
              value={vendorForm.vendorSku}
              onChange={(event) =>
                setVendorForm((current) => ({
                  ...current,
                  vendorSku: event.target.value,
                }))
              }
              disabled={!selectedProduct}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="unitCost"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Unit Cost <span className="text-red-500">*</span>
            </label>
            <input
              id="unitCost"
              type="number"
              min="0"
              step="0.01"
              value={vendorForm.unitCost}
              onChange={(event) =>
                setVendorForm((current) => ({
                  ...current,
                  unitCost: event.target.value,
                }))
              }
              disabled={!selectedProduct}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="minOrderQty"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Min Qty
            </label>
            <input
              id="minOrderQty"
              type="number"
              min="1"
              value={vendorForm.minOrderQty}
              onChange={(event) =>
                setVendorForm((current) => ({
                  ...current,
                  minOrderQty: event.target.value,
                }))
              }
              disabled={!selectedProduct}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="orderMultiple"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Multiple
            </label>
            <input
              id="orderMultiple"
              type="number"
              min="1"
              value={vendorForm.orderMultiple}
              onChange={(event) =>
                setVendorForm((current) => ({
                  ...current,
                  orderMultiple: event.target.value,
                }))
              }
              disabled={!selectedProduct}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="leadTimeDays"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Lead Days
            </label>
            <input
              id="leadTimeDays"
              type="number"
              min="0"
              value={vendorForm.leadTimeDays}
              onChange={(event) =>
                setVendorForm((current) => ({
                  ...current,
                  leadTimeDays: event.target.value,
                }))
              }
              disabled={!selectedProduct}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={vendorForm.isPrimaryVendor}
              onChange={(event) =>
                setVendorForm((current) => ({
                  ...current,
                  isPrimaryVendor: event.target.checked,
                }))
              }
              disabled={!selectedProduct}
              className="h-4 w-4 rounded border-slate-300"
            />
            Primary vendor
          </label>

          <button
            type="button"
            onClick={handleAssignVendor}
            disabled={!canAssignVendor || assignVendorMutation.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Assign Vendor
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Vendor SKU</th>
                  <th className="px-4 py-3 text-right font-semibold">Unit Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Lead Time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {(vendorProductsQuery.data ?? []).map((vendorProduct) => (
                  <tr key={vendorProduct.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {vendorProduct.vendor?.name ?? vendorProduct.vendorId}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {vendorProduct.vendorSku ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(vendorProduct.unitCost)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {vendorProduct.leadTimeDays === null
                        ? '-'
                        : `${vendorProduct.leadTimeDays} days`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'rounded-full px-2 py-1 text-xs font-semibold',
                          vendorProduct.isPrimaryVendor
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600',
                        ].join(' ')}
                      >
                        {vendorProduct.isPrimaryVendor ? 'Primary' : 'Alternate'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => primaryVendorMutation.mutate(vendorProduct)}
                        disabled={
                          vendorProduct.isPrimaryVendor ||
                          primaryVendorMutation.isPending
                        }
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Make Primary
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!selectedProduct ? (
            <div className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
              Select or create a product to manage vendor assignments.
            </div>
          ) : null}

          {selectedProduct &&
          !vendorProductsQuery.isLoading &&
          (vendorProductsQuery.data ?? []).length === 0 ? (
            <div className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
              No vendors are assigned to this product.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

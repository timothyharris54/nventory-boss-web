import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getProducts } from '../inventory/products-api';
import type { ProductLookupItem } from '../inventory/product-types';
import { getVendors } from '../procurement/api';
import type { ProcurementVendor } from '../procurement/types';
import { ManageProductSuppliersPanel } from './manage-product-suppliers-panel';
import {
  createVendorProduct,
  getVendorProducts,
  updateVendorProduct,
} from './vendor-products-api';
import type { UpdateVendorProductDto, VendorProduct } from './vendor-product-types';
import {
  getVendorProductRuleWarnings,
  productHasActivePrimaryVendor,
  productHasActiveSuppliers,
} from './vendor-product-validation';

type ProductGroupFilter =
  | 'all'
  | 'primary'
  | 'no-primary'
  | 'inactive-vendors'
  | 'warnings';
type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'vendor'
  | 'product'
  | 'vendorSku'
  | 'unitCost'
  | 'minOrderQty'
  | 'orderMultiple'
  | 'leadTimeDays'
  | 'status';

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

type SelectedProduct = {
  id: string;
  name?: string;
};

type ProductGroup = {
  productId: string;
  label: string;
  status?: string;
  rows: VendorProduct[];
  primaryVendor?: VendorProduct;
  activeCount: number;
  inactiveCount: number;
  warningCount: number;
  hasActivePrimary: boolean;
  hasInactiveVendor: boolean;
  isMissingPrimary: boolean;
};

function InlineWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 text-left">
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

function formatCurrency(value: string | null) {
  if (!value) return '-';

  const amount = Number(value);

  if (Number.isNaN(amount)) return value;

  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

function formatNumber(value: string | null | undefined) {
  if (!value) return '-';

  const amount = Number(value);

  if (Number.isNaN(amount)) return value;

  return amount.toLocaleString();
}

function getVendorName(row: VendorProduct) {
  return row.vendor?.name ?? row.vendorId;
}

function getProductLabel(row: VendorProduct) {
  if (row.product) {
    return `${row.product.sku} - ${row.product.name}`;
  }

  return row.productId;
}

function parseSortableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

function compareStrings(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? '').localeCompare(b ?? '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareNumbers(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
) {
  const first = parseSortableNumber(a);
  const second = parseSortableNumber(b);

  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;

  return first - second;
}

function compareVendorProducts(
  a: VendorProduct,
  b: VendorProduct,
  sort: SortState,
) {
  let result = 0;

  switch (sort.key) {
    case 'vendor':
      result = compareStrings(getVendorName(a), getVendorName(b));
      break;
    case 'product':
      result = compareStrings(getProductLabel(a), getProductLabel(b));
      break;
    case 'vendorSku':
      result = compareStrings(a.vendorSku, b.vendorSku);
      break;
    case 'unitCost':
      result = compareNumbers(a.unitCost, b.unitCost);
      break;
    case 'minOrderQty':
      result = compareNumbers(a.minOrderQty, b.minOrderQty);
      break;
    case 'orderMultiple':
      result = compareNumbers(a.orderMultiple, b.orderMultiple);
      break;
    case 'leadTimeDays':
      result = compareNumbers(a.leadTimeDays, b.leadTimeDays);
      break;
    case 'status':
      result = compareStrings(a.isActive ? 'Active' : 'Inactive', b.isActive ? 'Active' : 'Inactive');
      break;
  }

  if (result === 0) {
    result = compareStrings(getVendorName(a), getVendorName(b));
  }

  if (result === 0) {
    result = compareStrings(getProductLabel(a), getProductLabel(b));
  }

  return sort.direction === 'asc' ? result : -result;
}

export default function VendorProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<ProductGroupFilter>('all');
  const [sort, setSort] = useState<SortState>({
    key: 'vendor',
    direction: 'asc',
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendorSku, setVendorSku] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [minOrderQty, setMinOrderQty] = useState('1');
  const [orderMultiple, setOrderMultiple] = useState('1');
  const [leadTimeDays, setLeadTimeDays] = useState('');
  const [isPrimaryVendor, setIsPrimaryVendor] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(
    null,
  );
  const [editingVendorProduct, setEditingVendorProduct] =
    useState<VendorProduct | null>(null);
  const [editVendorSku, setEditVendorSku] = useState('');
  const [editUnitCost, setEditUnitCost] = useState('');
  const [editMinOrderQty, setEditMinOrderQty] = useState('1');
  const [editOrderMultiple, setEditOrderMultiple] = useState('1');
  const [editLeadTimeDays, setEditLeadTimeDays] = useState('');
  const [editIsPrimaryVendor, setEditIsPrimaryVendor] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);

  const {
    data: vendorProducts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<VendorProduct[]>({
    queryKey: ['vendor-products'],
    queryFn: getVendorProducts,
  });

  const { data: vendors = [], isLoading: isVendorsLoading } = useQuery<
    ProcurementVendor[]
  >({
    queryKey: ['vendors'],
    queryFn: getVendors,
  });

  const { data: products = [], isLoading: isProductsLoading } = useQuery<
    ProductLookupItem[]
  >({
    queryKey: ['products', { take: 100, skip: 0 }],
    queryFn: () => getProducts({ take: 100, skip: 0 }),
  });

  const vendorOptions = useMemo(
    () =>
      vendors
        .filter((vendor) => vendor.isActive)
        .map((vendor) => ({
          id: vendor.id,
          name: vendor.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [vendors],
  );

  const productOptions = useMemo(
    () =>
      products
        .filter((product) => product.status !== 'archived')
        .map((product) => ({
          id: product.id,
          label: `${product.sku} - ${product.name}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [products],
  );

  const resetCreateForm = () => {
    setProductId('');
    setVendorId('');
    setVendorSku('');
    setUnitCost('');
    setMinOrderQty('1');
    setOrderMultiple('1');
    setLeadTimeDays('');
    setIsPrimaryVendor(false);
  };

  const createMutation = useMutation({
    mutationFn: createVendorProduct,
    onSuccess: (_, variables) => {
      toast.success('Vendor product added.');
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-id', variables.productId] });
      resetCreateForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to add vendor product.',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (variables: {
      id: string;
      productId: string;
      body: UpdateVendorProductDto;
    }) => updateVendorProduct(variables.id, variables.body),
    onSuccess: (_, variables) => {
      toast.success('Vendor product updated.');
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-id', variables.productId] });
      setEditingVendorProduct(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to update vendor product.',
      );
    },
  });

  const searchedVendorProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return vendorProducts
      .filter((row) => {
        if (!normalizedSearch) return true;

        const searchableText = [
          row.vendor?.name,
          row.vendorId,
          row.product?.sku,
          row.product?.name,
          row.productId,
          row.vendorSku,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .sort((a, b) => compareVendorProducts(a, b, sort));
  }, [search, sort, vendorProducts]);

  const totalCount = vendorProducts.length;
  const activeCount = vendorProducts.filter((row) => row.isActive).length;
  const primaryCount = vendorProducts.filter((row) => row.isPrimaryVendor).length;
  const productsMissingPrimary = useMemo(() => {
    const productIds = new Set(vendorProducts.map((row) => row.productId));

    return new Set(
      [...productIds].filter(
        (currentProductId) =>
          productHasActiveSuppliers(vendorProducts, currentProductId) &&
          !productHasActivePrimaryVendor(vendorProducts, currentProductId),
      ),
    );
  }, [vendorProducts]);
  const ruleWarningCount = vendorProducts.reduce(
    (count, row) => count + getVendorProductRuleWarnings(row).length,
    0,
  );
  const warningCount = ruleWarningCount + productsMissingPrimary.size;
  const createWarnings = useMemo(
    () =>
      getVendorProductRuleWarnings({
        minOrderQty,
        orderMultiple,
        leadTimeDays,
      }),
    [leadTimeDays, minOrderQty, orderMultiple],
  );
  const editWarnings = useMemo(
    () =>
      getVendorProductRuleWarnings({
        minOrderQty: editMinOrderQty,
        orderMultiple: editOrderMultiple,
        leadTimeDays: editLeadTimeDays,
      }),
    [editLeadTimeDays, editMinOrderQty, editOrderMultiple],
  );
  const productGroups = useMemo<ProductGroup[]>(() => {
    const groups = new Map<string, VendorProduct[]>();

    searchedVendorProducts.forEach((row) => {
      const rows = groups.get(row.productId) ?? [];
      rows.push(row);
      groups.set(row.productId, rows);
    });

    return [...groups.entries()]
      .map(([currentProductId, rows]) => {
        const representative = rows.find((row) => row.product) ?? rows[0];
        const activeRows = rows.filter((row) => row.isActive);
        const inactiveRows = rows.filter((row) => !row.isActive);
        const primaryVendor = rows.find(
          (row) => row.isActive && row.isPrimaryVendor,
        );
        const warningTotal =
          rows.reduce(
            (count, row) => count + getVendorProductRuleWarnings(row).length,
            0,
          ) + (productsMissingPrimary.has(currentProductId) ? 1 : 0);

        return {
          productId: currentProductId,
          label: getProductLabel(representative),
          status: representative.product?.status,
          rows,
          primaryVendor,
          activeCount: activeRows.length,
          inactiveCount: inactiveRows.length,
          warningCount: warningTotal,
          hasActivePrimary: Boolean(primaryVendor),
          hasInactiveVendor: inactiveRows.length > 0,
          isMissingPrimary: productsMissingPrimary.has(currentProductId),
        };
      })
      .sort((a, b) => compareStrings(a.label, b.label));
  }, [productsMissingPrimary, searchedVendorProducts]);
  const filteredProductGroups = useMemo(
    () =>
      productGroups.filter((group) => {
        if (groupFilter === 'primary') return group.hasActivePrimary;
        if (groupFilter === 'no-primary') return group.isMissingPrimary;
        if (groupFilter === 'inactive-vendors') return group.hasInactiveVendor;
        if (groupFilter === 'warnings') return group.warningCount > 0;

        return true;
      }),
    [groupFilter, productGroups],
  );
  const groupFilterOptions: Array<{
    value: ProductGroupFilter;
    label: string;
    count: number;
  }> = [
    {
      value: 'all',
      label: 'All',
      count: productGroups.length,
    },
    {
      value: 'primary',
      label: 'Primary Vendors',
      count: productGroups.filter((group) => group.hasActivePrimary).length,
    },
    {
      value: 'no-primary',
      label: 'No Primary Vendors',
      count: productGroups.filter((group) => group.isMissingPrimary).length,
    },
    {
      value: 'inactive-vendors',
      label: 'Inactive Vendors',
      count: productGroups.filter((group) => group.hasInactiveVendor).length,
    },
    {
      value: 'warnings',
      label: 'Warnings',
      count: productGroups.filter((group) => group.warningCount > 0).length,
    },
  ];

  const handleCloseSupplierPanel = () => {
    setSelectedProduct(null);
    queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    resetCreateForm();
  };

  const handleOpenEdit = (vendorProduct: VendorProduct) => {
    setEditingVendorProduct(vendorProduct);
    setEditVendorSku(vendorProduct.vendorSku ?? '');
    setEditUnitCost(vendorProduct.unitCost ?? '');
    setEditMinOrderQty(vendorProduct.minOrderQty ?? '1');
    setEditOrderMultiple(vendorProduct.orderMultiple ?? '1');
    setEditLeadTimeDays(
      vendorProduct.leadTimeDays === null ? '' : String(vendorProduct.leadTimeDays),
    );
    setEditIsPrimaryVendor(vendorProduct.isPrimaryVendor);
    setEditIsActive(vendorProduct.isActive);
  };

  const handleCloseEdit = () => {
    setEditingVendorProduct(null);
  };

  const handleCreateVendorProduct = () => {
    if (!productId || !vendorId || !unitCost) {
      toast.error('Product, vendor, and unit cost are required.');
      return;
    }

    const alreadyConfigured = vendorProducts.some(
      (row) => row.productId === productId && row.vendorId === vendorId,
    );

    if (alreadyConfigured) {
      toast.error('This vendor is already configured for the selected product.');
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

  const handleSort = (key: SortKey) => {
    setSort((current) => {
      if (current.key !== key) {
        return { key, direction: 'asc' };
      }

      return {
        key,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  };

  const handleSaveEdit = () => {
    if (!editingVendorProduct) return;

    updateMutation.mutate({
      id: editingVendorProduct.id,
      productId: editingVendorProduct.productId,
      body: {
        vendorSku: editVendorSku.trim() || null,
        unitCost: editUnitCost.trim() || null,
        minOrderQty: editMinOrderQty || '1',
        orderMultiple: editOrderMultiple || '1',
        leadTimeDays: editLeadTimeDays ? Number(editLeadTimeDays) : null,
        isPrimaryVendor: editIsPrimaryVendor,
        isActive: editIsActive,
      },
    });
  };

  const renderSortLabel = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => {
    const isActive = sort.key === key;
    const directionLabel = sort.direction === 'asc' ? 'ascending' : 'descending';

    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={[
          'flex w-full items-center gap-1 font-semibold text-slate-800 hover:text-slate-950',
          align === 'right' ? 'justify-end' : 'justify-start',
        ].join(' ')}
        aria-sort={isActive ? directionLabel : 'none'}
      >
        <span>{label}</span>
        <span className="w-3 text-xs text-slate-500">
          {isActive ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
        </span>
      </button>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Products</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review product-to-vendor purchasing records, costs, and ordering rules.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="w-fit rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add Vendor Product
          </button>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Records
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {totalCount.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Active
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {activeCount.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Primary Vendors
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {primaryCount.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
            Warnings
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">
            {warningCount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4">
          <div>
            <label
              htmlFor="vendorProductSearch"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Search
            </label>
            <input
              id="vendorProductSearch"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Vendor, product, SKU, or ID"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {groupFilterOptions.map((option) => {
              const isSelected = groupFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGroupFilter(option.value)}
                  className={[
                    'rounded-lg border px-3 py-2 text-sm font-medium',
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {option.label}
                  <span
                    className={[
                      'ml-2 rounded-full px-2 py-0.5 text-xs',
                      isSelected
                        ? 'bg-white/15 text-white'
                        : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {option.count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Loading vendor products...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Unable to load vendor products.'}
        </div>
      )}

      {!isLoading && !isError && filteredProductGroups.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No product groups match the current filters.
        </div>
      )}

      {!isLoading && !isError && filteredProductGroups.length > 0 && (
        <div className="space-y-3">
          {filteredProductGroups.map((group, index) => (
            <details
              key={group.productId}
              open={index === 0}
              className="group rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 hover:bg-slate-50 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {group.label}
                    </span>
                    {group.status && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {group.status}
                      </span>
                    )}
                    {group.hasActivePrimary ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Primary Vendor
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                        No Primary Vendor
                      </span>
                    )}
                    {group.hasInactiveVendor && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        Inactive Vendor
                      </span>
                    )}
                    {group.warningCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                        {group.warningCount.toLocaleString()} warning
                        {group.warningCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    {group.primaryVendor
                      ? `Primary: ${getVendorName(group.primaryVendor)}`
                      : 'No active primary vendor assigned'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>{group.rows.length.toLocaleString()} vendors</span>
                  <span>{group.activeCount.toLocaleString()} active</span>
                  <span>{group.inactiveCount.toLocaleString()} inactive</span>
                  <span
                    title="Expand"
                    aria-label="Expand"
                    className="text-sm font-semibold text-slate-500 group-open:hidden"
                  >
                    ▼
                  </span>
                  <span
                    title="Collapse"
                    aria-label="Collapse"
                    className="hidden text-sm font-semibold text-slate-500 group-open:inline"
                  >
                    ▲
                  </span>
                </div>
              </summary>

              {group.isMissingPrimary && (
                <div className="mx-4 mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  Assign an active primary vendor for this product.
                </div>
              )}

              <div className="overflow-x-auto border-t border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left">
                    <tr>
                      <th className="px-4 py-3">
                        {renderSortLabel('vendor', 'Vendor')}
                      </th>
                      <th className="px-4 py-3">
                        {renderSortLabel('vendorSku', 'Vendor SKU')}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {renderSortLabel('unitCost', 'Unit Cost', 'right')}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {renderSortLabel('minOrderQty', 'MOQ', 'right')}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {renderSortLabel('orderMultiple', 'Multiple', 'right')}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {renderSortLabel('leadTimeDays', 'Lead Time', 'right')}
                      </th>
                      <th className="px-4 py-3">
                        {renderSortLabel('status', 'Status')}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => {
                      const rowWarnings = getVendorProductRuleWarnings(row).map(
                        (warning) => warning.message,
                      );

                      return (
                        <tr key={row.id} className="border-t border-slate-200">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {getVendorName(row)}
                            </div>
                            {row.isPrimaryVendor && (
                              <div className="mt-1 text-xs font-medium text-green-700">
                                Primary
                              </div>
                            )}
                            <InlineWarnings warnings={rowWarnings} />
                          </td>
                          <td className="px-4 py-3">{row.vendorSku ?? '-'}</td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(row.unitCost)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(row.minOrderQty)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(row.orderMultiple)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.leadTimeDays === null
                              ? '-'
                              : `${row.leadTimeDays} days`}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={[
                                'rounded-full px-2 py-1 text-xs font-medium',
                                row.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-600',
                              ].join(' ')}
                            >
                              {row.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(row)}
                                title="Edit vendor product"
                                aria-label={`Edit ${getVendorName(row)} vendor product`}
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                &#9998;
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedProduct({
                                    id: row.productId,
                                    name: row.product?.name ?? row.product?.sku,
                                  })
                                }
                                disabled={isVendorsLoading}
                                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isVendorsLoading
                                  ? 'Loading Vendors'
                                  : 'Manage Suppliers'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}

      {selectedProduct && (
        <ManageProductSuppliersPanel
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          vendors={vendorOptions}
          onClose={handleCloseSupplierPanel}
        />
      )}

      {editingVendorProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={handleCloseEdit} />

          <aside
            className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Vendor Product
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {getProductLabel(editingVendorProduct)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {getVendorName(editingVendorProduct)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              <section className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="editVendorProductSku"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Vendor SKU
                  </label>
                  <input
                    id="editVendorProductSku"
                    value={editVendorSku}
                    onChange={(event) => setEditVendorSku(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editVendorProductUnitCost"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Unit Cost
                  </label>
                  <input
                    id="editVendorProductUnitCost"
                    type="number"
                    min="0"
                    step="0.0001"
                    value={editUnitCost}
                    onChange={(event) => setEditUnitCost(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editVendorProductMoq"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    MOQ
                  </label>
                  <input
                    id="editVendorProductMoq"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editMinOrderQty}
                    onChange={(event) => setEditMinOrderQty(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                  <InlineWarnings
                    warnings={editWarnings
                      .filter(
                        (warning) =>
                          warning.code === 'moq-multiple-mismatch' ||
                          warning.code === 'order-multiple-invalid',
                      )
                      .map((warning) => warning.message)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="editVendorProductMultiple"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Order Multiple
                  </label>
                  <input
                    id="editVendorProductMultiple"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editOrderMultiple}
                    onChange={(event) => setEditOrderMultiple(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="editVendorProductLeadTime"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Lead Time Days
                  </label>
                  <input
                    id="editVendorProductLeadTime"
                    type="number"
                    min="0"
                    value={editLeadTimeDays}
                    onChange={(event) => setEditLeadTimeDays(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                  <InlineWarnings
                    warnings={editWarnings
                      .filter((warning) => warning.code === 'lead-time-missing')
                      .map((warning) => warning.message)}
                  />
                </div>
              </section>

              <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editIsPrimaryVendor}
                    onChange={(event) => setEditIsPrimaryVendor(event.target.checked)}
                  />
                  Primary vendor
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(event) => setEditIsActive(event.target.checked)}
                  />
                  Active
                </label>
              </section>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-6 py-4">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </aside>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={handleCloseCreate} />

          <section
            className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    New Purchasing Record
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Add Vendor Product
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleCloseCreate}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="newVendorProductProduct"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Product
                </label>
                <select
                  id="newVendorProductProduct"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  disabled={isProductsLoading}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {isProductsLoading ? 'Loading products...' : 'Select product'}
                  </option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="newVendorProductVendor"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Vendor
                </label>
                <select
                  id="newVendorProductVendor"
                  value={vendorId}
                  onChange={(event) => setVendorId(event.target.value)}
                  disabled={isVendorsLoading}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {isVendorsLoading ? 'Loading vendors...' : 'Select vendor'}
                  </option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="newVendorProductSku"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Vendor SKU
                </label>
                <input
                  id="newVendorProductSku"
                  value={vendorSku}
                  onChange={(event) => setVendorSku(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="newVendorProductUnitCost"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Unit Cost
                </label>
                <input
                  id="newVendorProductUnitCost"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="newVendorProductMoq"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  MOQ
                </label>
                <input
                  id="newVendorProductMoq"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minOrderQty}
                  onChange={(event) => setMinOrderQty(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <InlineWarnings
                  warnings={createWarnings
                    .filter(
                      (warning) =>
                        warning.code === 'moq-multiple-mismatch' ||
                        warning.code === 'order-multiple-invalid',
                    )
                    .map((warning) => warning.message)}
                />
              </div>

              <div>
                <label
                  htmlFor="newVendorProductMultiple"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Order Multiple
                </label>
                <input
                  id="newVendorProductMultiple"
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderMultiple}
                  onChange={(event) => setOrderMultiple(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="newVendorProductLeadTime"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Lead Time Days
                </label>
                <input
                  id="newVendorProductLeadTime"
                  type="number"
                  min="0"
                  value={leadTimeDays}
                  onChange={(event) => setLeadTimeDays(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <InlineWarnings
                  warnings={createWarnings
                    .filter((warning) => warning.code === 'lead-time-missing')
                    .map((warning) => warning.message)}
                />
              </div>

              <label className="flex items-center gap-2 self-end text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isPrimaryVendor}
                  onChange={(event) => setIsPrimaryVendor(event.target.checked)}
                />
                Primary vendor
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button
                type="button"
                onClick={handleCloseCreate}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateVendorProduct}
                disabled={createMutation.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Vendor Product'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

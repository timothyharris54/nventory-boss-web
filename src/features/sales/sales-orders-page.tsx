import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesOrderById, searchSalesOrders } from './api';
import type { SalesOrderLine, SalesOrderRow } from './sales-order-types';

const PAGE_SIZE = 25;
const MIN_SEARCH_LENGTH = 2;

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_fulfilled', label: 'Partially fulfilled' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'closed', label: 'Closed' },
];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
});

function formatDate(value?: string | null) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function formatMoney(
  value?: number | string | null,
  currencyCode?: string | null,
) {
  if (value === undefined || value === null || value === '') return 'N/A';

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;

  const normalizedCurrencyCode = currencyCode?.trim().toUpperCase();

  if (!normalizedCurrencyCode || normalizedCurrencyCode === 'USD') {
    return currencyFormatter.format(numberValue);
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: normalizedCurrencyCode,
    }).format(numberValue);
  } catch {
    return `${numberValue.toLocaleString()} ${currencyCode}`;
  }
}

function formatStatus(value?: string | null) {
  return value ? value.replaceAll('_', ' ') : 'N/A';
}

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{children}</div>
    </div>
  );
}

function SalesOrderDetailPanel({
  salesOrderId,
  onClose,
}: {
  salesOrderId: string;
  onClose: () => void;
}) {
  const {
    data: salesOrder,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['sales-order', salesOrderId],
    queryFn: () => getSalesOrderById(salesOrderId),
    enabled: !!salesOrderId,
  });
  const salesOrderLines: SalesOrderLine[] = Array.isArray(salesOrder?.lines)
    ? salesOrder.lines
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close sales order details"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <aside
        className="relative h-full w-full max-w-4xl overflow-y-auto bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sales Order
              </p>
              <h2 className="text-xl font-semibold text-slate-900">
                {salesOrder?.salesOrderNumber ?? 'Loading...'}
              </h2>
              {salesOrder ? (
                <p className="text-sm text-slate-500">
                  {salesOrder.customerName ?? 'No customer'} -{' '}
                  {formatStatus(salesOrder.status)}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5">
          {isLoading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Loading sales order...
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {(error as Error).message}
            </div>
          ) : null}

          {salesOrder ? (
            <>
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Summary
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailBlock label="Status">
                    <span className="capitalize">
                      {formatStatus(salesOrder.status)}
                    </span>
                  </DetailBlock>
                  <DetailBlock label="Location">
                    {salesOrder.locationCode ?? 'N/A'}
                  </DetailBlock>
                  <DetailBlock label="Ordered">
                    {formatDateTime(salesOrder.orderedAt)}
                  </DetailBlock>
                  <DetailBlock label="Requested Ship">
                    {formatDate(salesOrder.requestedShipAt)}
                  </DetailBlock>
                  <DetailBlock label="Promised">
                    {formatDate(salesOrder.promisedAt)}
                  </DetailBlock>
                  <DetailBlock label="Source">
                    {salesOrder.channel ?? 'N/A'}
                  </DetailBlock>
                  <DetailBlock label="External ID">
                    {salesOrder.salesOrderNumber ?? 'N/A'}
                  </DetailBlock>
                  <DetailBlock label="Total">
                    {formatMoney(
                      salesOrder.orderTotal,
                      salesOrder.currencyCode,
                    )}
                  </DetailBlock>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Customer
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailBlock label="Name">
                    {salesOrder.customerName ?? 'N/A'}
                  </DetailBlock>
                  <DetailBlock label="Email">
                    {salesOrder.customerEmail ?? 'N/A'}
                  </DetailBlock>
                  <DetailBlock label="Phone">
                    {salesOrder.customerPhone ?? 'N/A'}
                  </DetailBlock>
                  <DetailBlock label="Shipping Address">
                    <span className="whitespace-pre-line">
                      {salesOrder.shippingAddress ?? 'N/A'}
                    </span>
                  </DetailBlock>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Line Items
                </h3>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2 text-right">Ordered</th>
                          <th className="px-3 py-2 text-right">Reserved</th>
                          <th className="px-3 py-2 text-right">Fulfilled</th>
                          <th className="px-3 py-2 text-right">Unit Price</th>
                          <th className="px-3 py-2 text-right">Line Total</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesOrderLines.map((line) => (
                          <tr key={line.id} className="border-t border-slate-200">
                            <td className="px-3 py-3">
                              <div className="font-medium text-slate-900">
                                {line.productName ?? 'Unknown product'}
                              </div>
                              <div className="text-xs text-slate-500">
                                SKU: {line.sku ?? 'N/A'}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              {line.quantity ?? '0'}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {line.reservedQty ?? '0'}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {line.fulfilledQty ?? '0'}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {formatMoney(line.unitPrice, salesOrder.currencyCode)}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {formatMoney(line.lineTotal, salesOrder.currencyCode)}
                            </td>
                            <td className="px-3 py-3 capitalize">
                              {formatStatus(line.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {salesOrderLines.length === 0 ? (
                    <div className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
                      No line items found.
                    </div>
                  ) : null}
                </div>
              </section>

              {salesOrder.notes ? (
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">
                    Notes
                  </h3>
                  <p className="whitespace-pre-line text-sm text-slate-700">
                    {salesOrder.notes}
                  </p>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export default function SalesOrdersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [page, setPage] = useState(0);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string | null>(
    null,
  );

  const normalizedSearch = submittedSearch.trim();
  const canSearch = normalizedSearch.length >= MIN_SEARCH_LENGTH;

  const filters = useMemo(
    () => ({
      q: normalizedSearch,
      status: statusInput || undefined,
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    }),
    [normalizedSearch, page, statusInput],
  );

  const {
    data: result,
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['sales-orders', filters],
    queryFn: () => searchSalesOrders(filters),
    enabled: canSearch,
  });

  const orders = result?.items ?? [];
  const total = result?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPreviousPage = page > 0;
  const hasNextPage = page + 1 < pageCount;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedSearch(searchInput.trim());
    setPage(0);
  }

  function handleStatusChange(value: string) {
    setStatusInput(value);
    setPage(0);
  }

  function getRowKey(order: SalesOrderRow) {
    return order.id || order.salesOrderNumber || order.orderNumber;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sales Orders</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search imported sales orders and review customer, status, and line
          details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
          <div>
            <label
              htmlFor="salesOrderSearch"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Search
            </label>
            <input
              id="salesOrderSearch"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="Order number, customer, email, or SKU"
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter at least {MIN_SEARCH_LENGTH} characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="salesOrderStatus"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="salesOrderStatus"
              value={statusInput}
              onChange={(event) => handleStatusChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={searchInput.trim().length < MIN_SEARCH_LENGTH}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Search
          </button>
        </div>
      </form>

      {!canSearch ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Search by order number, customer, email, or SKU to load sales orders.
        </div>
      ) : null}

      {canSearch && (isLoading || isFetching) ? (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Loading sales orders...
        </div>
      ) : null}

      {canSearch && isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(error as Error).message}
        </div>
      ) : null}

      {canSearch && !isError ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Ordered</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={getRowKey(order)}
                    className="border-t border-slate-200 align-top"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {order.orderNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.channel ?? 'Imported'}
                        {order.salesOrderNumber
                          ? ` - ${order.salesOrderNumber}`
                          : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {order.customerName ?? 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.customerEmail ?? 'No email'}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {formatStatus(order.status)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(order.orderedAt)}
                    </td>
                    <td className="px-4 py-3">{order.locationCode ?? 'N/A'}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(order.orderTotal, order.currencyCode)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSalesOrderId(order.id)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 ? (
            <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
              No sales orders found.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Page {Math.min(page + 1, pageCount)} of {pageCount}
              {total ? ` - showing ${orders.length} of ${total} results` : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={!hasPreviousPage || isFetching}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!hasNextPage || isFetching}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedSalesOrderId ? (
        <SalesOrderDetailPanel
          salesOrderId={selectedSalesOrderId}
          onClose={() => setSelectedSalesOrderId(null)}
        />
      ) : null}
    </div>
  );
}

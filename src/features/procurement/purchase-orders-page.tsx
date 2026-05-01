import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import { getPurchaseOrders, submitPurchaseOrder } from './api';
import type { PurchaseOrderRow } from './purchase-order-types';
import { ReceivePurchaseOrderModal } from './receive-purchase-order-modal';
import { PurchaseOrderReceiptHistoryModal } from './purchase-order-receipt-history-modal';
import { PurchaseOrderDetailPanel } from './purchase-order-detail-panel';  
import { PurchaseOrderCard } from './purchase-order-card';
import { getPurchaseOrderHealth } from './shared/utils';

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();

  const [receivingPurchaseOrder, setReceivingPurchaseOrder] =
    useState<PurchaseOrderRow | null>(null);
  const [detailPurchaseOrderId, setDetailPurchaseOrderId] =
    useState<string | null>(null);
  const [historyPurchaseOrderId, setHistoryPurchaseOrderId] =
    useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'attention' | 'newest' | 'oldest' | 'expected_soon' | 'vendor'
  >('attention');
  const [selectedPurchaseOrderIds, setSelectedPurchaseOrderIds] = useState<string[]>([]);
  useEffect(() => {
    setSelectedPurchaseOrderIds([]);
  }, [statusFilter, searchText, sortBy]);   

  function getFilterCount(value: string) {
    if (value === 'all') return purchaseOrders?.length ?? 0;
    if (value === 'needs_attention') return attentionCount;

    return statusCounts[value] ?? 0;
  }  

  const {
    data: purchaseOrders,
    isLoading,
    isError,
    error,
  } = useQuery<PurchaseOrderRow[]>({
    queryKey: ['purchase-orders'],
    queryFn: () => getPurchaseOrders(),
  });

  const submitMutation = useMutation({
    mutationFn: submitPurchaseOrder,
    onSuccess: () => {
      toast.success('Purchase order submitted.');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit purchase order.',
      );
    },
  });

  const PO_STATUS_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Partially Received', value: 'partially_received' },
    { label: 'Received', value: 'received' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Needs Attention', value: 'needs_attention' }
  ];
      
  const normalizedSearch = searchText.trim().toLowerCase();

  const filteredPurchaseOrders = (purchaseOrders ?? []).filter((po) => {
    const health = getPurchaseOrderHealth(po);

    const matchesStatus =
      statusFilter === 'all' ||
      statusFilter === 'needs_attention' ||
      po.status === statusFilter;

    const matchesAttention =
      statusFilter !== 'needs_attention' ||
      health.isOverdue ||
      health.isDueSoon;

    const matchesSearch =
      !normalizedSearch ||
      po.poNumber.toLowerCase().includes(normalizedSearch) ||
      po.vendor?.name?.toLowerCase().includes(normalizedSearch) ||
      po.locationCode.toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesAttention && matchesSearch;
  });

  const toggleSelectedPurchaseOrder = (purchaseOrderId: string) => {
    setSelectedPurchaseOrderIds((current) =>
      current.includes(purchaseOrderId)
        ? current.filter((id) => id !== purchaseOrderId)
        : [...current, purchaseOrderId],
    );
  };  
  
  const sortedPurchaseOrders = [...filteredPurchaseOrders].sort((a, b) => {
    if (sortBy === 'attention') {
      const aHealth = getPurchaseOrderHealth(a);
      const bHealth = getPurchaseOrderHealth(b);

      if (aHealth.isOverdue && !bHealth.isOverdue) return -1;
      if (!aHealth.isOverdue && bHealth.isOverdue) return 1;

      if (aHealth.isDueSoon && !bHealth.isDueSoon) return -1;
      if (!aHealth.isDueSoon && bHealth.isDueSoon) return 1;
    }

    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    if (sortBy === 'expected_soon') {
      return (
        new Date(a.expectedAt ?? '9999-12-31').getTime() -
        new Date(b.expectedAt ?? '9999-12-31').getTime()
      );
    }

    if (sortBy === 'vendor') {
      return (a.vendor?.name ?? '').localeCompare(b.vendor?.name ?? '');
    }

    return 0;
  });

  const attentionCount = (purchaseOrders ?? []).filter((po) => {
    const health = getPurchaseOrderHealth(po);
    return health.isOverdue || health.isDueSoon;
  }).length;

  const statusCounts = (purchaseOrders ?? []).reduce<Record<string, number>>(
    (counts, po) => {
      counts[po.status] = (counts[po.status] ?? 0) + 1;
      return counts;
    },
    {},
  );  

  const hasActiveFilters =
    statusFilter !== 'all' || searchText.trim().length > 0 || sortBy !== 'attention';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review draft and submitted purchase orders created from replenishment.
        </p>
      </div>
      {purchaseOrders && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total POs</p>
              <p className="mt-1 text-2xl font-bold">{purchaseOrders.length}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Draft</p>
              <p className="mt-1 text-2xl font-bold">
                {purchaseOrders.filter((po) => po.status === 'draft').length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="mt-1 text-2xl font-bold">
                {purchaseOrders.filter((po) => po.status === 'submitted').length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Received / Partial</p>
              <p className="mt-1 text-2xl font-bold">
                {
                  purchaseOrders.filter(
                    (po) =>
                      po.status === 'received' ||
                      po.status === 'partially_received',
                  ).length
                }
              </p>
            </div>
          </div>

          <div className='mb-4 md:grid-cols-2 flex flex-col gap-4 md:flex-row md:items-center'>
            <div className="flex flex-wrap gap-2 pb-2">
              {PO_STATUS_OPTIONS.map((option) => {
                const isActive = statusFilter === option.value;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                    <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">
                      {getFilterCount(option.value)}
                    </span>
                  </button>
               );
              })}
            </div>
        
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm"
              >
                <option value="attention">Needs attention first</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="expected_soon">Expected soonest</option>
                <option value="vendor">Vendor A-Z</option>
              </select>              
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search POs, vendors, status, location..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm sm:max-w-md"
              />
            </div>            
          </div>
        </>
      )}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span>
            Showing {sortedPurchaseOrders.length} of {purchaseOrders?.length ?? 0}
            {' '}purchase orders
          </span>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSearchText('');
              setSortBy('attention');
            }}
            className="font-medium text-gray-900 hover:underline"
          >
            Reset filters
          </button>
        </div>
      )}      
      {isLoading && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          Loading purchase orders...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {(error as Error).message}
        </div>
      )}

      {!isLoading && filteredPurchaseOrders?.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <h3 className='text-sm font-semibold text-gray-900'>
            {statusFilter === 'needs_attention'
                  ? 'No purchase orders need attention'
                  : 'No purchase orders found'}
          </h3>
        </div>
      )}

      {purchaseOrders && purchaseOrders.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSelectedPurchaseOrderIds(
                  filteredPurchaseOrders.map((po) => String(po.id))
                )
              }
              className="text-gray-600 hover:text-gray-900"
            >
              Select all
            </button>

            <button
              type="button"
              onClick={() => setSelectedPurchaseOrderIds([])}
              className="text-gray-600 hover:text-gray-900"
            >
              Clear
            </button>
          </div>

          {selectedPurchaseOrderIds.length > 0 && (
            <span className="text-gray-500">
              {selectedPurchaseOrderIds.length} selected
            </span>
          )}
        </div>
      )}

      {!isLoading && filteredPurchaseOrders && filteredPurchaseOrders.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {selectedPurchaseOrderIds.length > 0 && (
            <div className="rounded-lg border bg-gray-50 px-4 py-3 text-sm">
              {selectedPurchaseOrderIds.length} purchase order
              {selectedPurchaseOrderIds.length === 1 ? '' : 's'} selected
            </div>
          )}                   
          <div className="grid gap-4 p-4">
            {sortedPurchaseOrders?.map((po) => (
              <PurchaseOrderCard
                key={po.id}
                po={po}
                isSelected={selectedPurchaseOrderIds.includes(String(po.id))}
                onToggleSelected={toggleSelectedPurchaseOrder}
                onViewDetails={() => setDetailPurchaseOrderId(po.id ? String(po.id) : null)}
                onReceive={() => setReceivingPurchaseOrder(po)}
                onSubmit={() => submitMutation.mutate({
                  id: po.id,
                  locationCode: po.locationCode,
                })}
                isSubmitting={submitMutation.isPending}
              />
            ))} 
          </div>
        </div>
      )}
      {receivingPurchaseOrder && (
        <ReceivePurchaseOrderModal
          purchaseOrder={receivingPurchaseOrder}
          onClose={() => setReceivingPurchaseOrder(null)}
        />
      )}
      {historyPurchaseOrderId && (
        <PurchaseOrderReceiptHistoryModal
          purchaseOrderId={historyPurchaseOrderId}
          onClose={() => setHistoryPurchaseOrderId(null)}
        />
      )}
      {detailPurchaseOrderId && (
        <PurchaseOrderDetailPanel
          purchaseOrderId={detailPurchaseOrderId}
          onClose={() => setDetailPurchaseOrderId(null)}
        />
      )}      
    </div>
  );
}
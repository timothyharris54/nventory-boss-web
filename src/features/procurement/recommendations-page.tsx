import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  getRecommendations,
  getAllRecommendations,  
  getVendorProducts,
  runReplenishment,
  reviewRecommendation,
  dismissRecommendation,
  convertRecommendationsToPurchaseOrders,
} from './api';

import type { ReorderRecommendationRow } from './types';
import type { VendorProduct } from '../vendor-products/vendor-product-types';
import { routes } from '../../lib/constants/routes';
import { ProductIdentity } from '../../components/data-display/product-identity';

/*  Helper Functions */
function getUrgency(days: string | null) {
  if (!days) return { label: '—', color: 'bg-slate-100 text-slate-600' };

  const d = Number(days);

  if (d <= 3) return { label: 'Critical', color: 'bg-red-100 text-red-800' };
  if (d <= 7) return { label: 'Soon', color: 'bg-amber-100 text-amber-800' };
  if (d <= 14) return { label: 'Watch', color: 'bg-yellow-100 text-yellow-800' };

  return { label: 'OK', color: 'bg-green-100 text-green-800' };
}
function getUniqueLatestOpenActionableRows(rows: ReorderRecommendationRow[]) {
  const latestByProductLocation = new Map<string, ReorderRecommendationRow>();

  for (const row of rows) {
    if (row.status !== 'open') continue;
    if (Number(row.recommendedQty) <= 0) continue;

    const key = `${row.productId}-${row.locationCode}`;
    const existing = latestByProductLocation.get(key);

    if (!existing) {
      latestByProductLocation.set(key, row);
      continue;
    }

    const existingDate = new Date(existing.calculatedAt).getTime();
    const rowDate = new Date(row.calculatedAt).getTime();

    if (rowDate > existingDate) {
      latestByProductLocation.set(key, row);
    }
  }

  return Array.from(latestByProductLocation.values()).sort((a, b) => {
    return Number(b.recommendedQty) - Number(a.recommendedQty);
  });
}

function formatNumber(val: string | null) {
  if (!val) return '—';
  return Number(val).toLocaleString();
}
/*  END Helper Functions */


export default function RecommendationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, string>>({});
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<string[]>([]);
  const [selectedVendorByRecommendationId, setSelectedVendorByRecommendationId] =
            useState<Record<string, string>>({});
  const [recommendationView, setRecommendationView] =
    useState<'needs_action' | 'history'>('needs_action');  

    const { data, isLoading } = useQuery<ReorderRecommendationRow[]>({
    queryKey: ['replenishment-recommendations', recommendationView],
    queryFn: () =>
      recommendationView === 'history'
        ? getAllRecommendations()
        : getRecommendations(),
  });

  const navigateToPurchaseOrder = (row: ReorderRecommendationRow) => {
    const purchaseOrderId = row.purchaseOrderId ?? row.purchaseOrder?.id;

    if (!purchaseOrderId) {
      toast.error('No purchase order is linked to this recommendation.');
      return;
    }

    navigate(
      `${routes.purchaseOrders}?purchaseOrderId=${encodeURIComponent(purchaseOrderId)}`,
    );
  };

  const { data: vendorProducts = [] } = useQuery<VendorProduct[]>({
    queryKey: ['vendor-products'],
    queryFn: getVendorProducts,
  });

  const toggleSelectedRecommendation = (recommendationId: string) => {
    setSelectedRecommendationIds((current) =>
      current.includes(recommendationId)
        ? current.filter((id) => id !== recommendationId)
        : [...current, recommendationId],
    );
  };

  const updateQty = (recommendationId: string, value: string) => {
    setQuantityOverrides((current) => ({
      ...current,
      [recommendationId]: value,
    }));
  };

  const runMutation = useMutation({
    mutationFn: runReplenishment,
    onSuccess: () => {
      toast.success('Replenishment run complete.');
      queryClient.invalidateQueries({ queryKey: ['replenishment-open'] });
    },
    onError: () => {
      toast.error('Failed to run replenishment.');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: reviewRecommendation,
    onSuccess: () => {
      toast.success('Recommendation marked reviewed.');
      queryClient.invalidateQueries({ queryKey: ['replenishment-open'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to review recommendation.',
      );
    },
  });

  const dismissMutation = useMutation({
    mutationFn: dismissRecommendation,
    onSuccess: () => {
      toast.success('Recommendation dismissed.');
      queryClient.invalidateQueries({ queryKey: ['replenishment-open'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to dismiss recommendation.',
      );
    },
  });
  const convertMutation = useMutation({
    mutationFn: convertRecommendationsToPurchaseOrders,
    onSuccess: () => {
      toast.success('Recommendations converted to purchase orders.');
      setSelectedRecommendationIds([]);
      setQuantityOverrides({});
      setSelectedVendorByRecommendationId({});
      queryClient.invalidateQueries({ queryKey: ['replenishment-open'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to convert recommendation.',
      );
    },
  });

  /* Transform Layer  */
  // get only the latest open recommendation for each product/location, 
  // and only those with actionable recommended qtys
  
  const rows = data ?? [];

  const actionableRows =
  recommendationView === 'needs_action'
    ? getUniqueLatestOpenActionableRows(rows)
    : rows.filter((row) =>
        ['converted', 'dismissed', 'superseded'].includes(row.status),
      );
        
  const selected = actionableRows.filter((r) =>
    selectedRecommendationIds.includes(String(r.id)),
  );

  const getVendorOptions = (row: ReorderRecommendationRow) => {
    const vendorsById = new Map<string, { id: string; name: string }>();

    for (const vendorProduct of vendorProducts) {
      if (vendorProduct.productId !== row.productId) continue;
      if (!vendorProduct.isActive) continue;
      if (!vendorProduct.vendor) continue;

      vendorsById.set(vendorProduct.vendorId, {
        id: vendorProduct.vendorId,
        name: vendorProduct.vendor.name,
      });
    }

    return Array.from(vendorsById.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  };

  const getSelectedVendorId = (row: ReorderRecommendationRow) => {
    const selectedVendorId = selectedVendorByRecommendationId[String(row.id)];
    const matchingVendorIds = new Set(
      getVendorOptions(row).map((vendor) => vendor.id),
    );

    if (selectedVendorId && matchingVendorIds.has(selectedVendorId)) {
      return selectedVendorId;
    }

    if (row.vendorId && matchingVendorIds.has(row.vendorId)) {
      return row.vendorId;
    }

    return '';
  };

  const selectedConvertibleRows = selected.filter((row) => getSelectedVendorId(row));

  const hasSelectedNonConvertibleRows =
    selected.length > selectedConvertibleRows.length;

  const canConvertSelected =
    selectedConvertibleRows.length > 0 && !convertMutation.isPending;

  const handleConvertSelected = () => {
    if (selectedConvertibleRows.length === 0) return;

    convertMutation.mutate({
      recommendations: selectedConvertibleRows.map((row) => ({
        recommendationId: row.id,
        vendorId: getSelectedVendorId(row),
        quantity: quantityOverrides[row.id] ?? row.recommendedQty,
      })),
    });
  };

  const handleConvertOne = (row: ReorderRecommendationRow) => {
    const vendorId = getSelectedVendorId(row);

    if (!vendorId) return;

    convertMutation.mutate({
      recommendations: [
        {
          recommendationId: row.id,
          vendorId,
          quantity: quantityOverrides[row.id] ?? row.recommendedQty,
        },
      ],
    });
  };

  function handleRun() {
    runMutation.mutate({
      locationCode: 'MAIN',
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Replenishment Recommendations</h1>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setRecommendationView('needs_action');
              setSelectedRecommendationIds([]);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              recommendationView === 'needs_action'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Needs Action
          </button>

          <button
            type="button"
            onClick={() => {
              setRecommendationView('history');
              setSelectedRecommendationIds([]);
            }}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              recommendationView === 'history'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            History
          </button>
        </div>        
        <div className="flex items-center gap-3">
          {hasSelectedNonConvertibleRows && (
            <span className="text-sm text-amber-700">
              Rows without vendors will be skipped.
            </span>
          )}

          {recommendationView === 'needs_action' && (
              <button
                type="button"
                disabled={!canConvertSelected}
                onClick={handleConvertSelected}
                className="bg-green-700 px-4 py-2 text-white rounded disabled:opacity-50"
              >
                {convertMutation.isPending
                  ? 'Converting...'
                  : `Convert selected (${selectedConvertibleRows.length})`}
              </button>
          )}
          <button
            type="button"
            onClick={handleRun}
            disabled={runMutation.isPending}
            className="bg-slate-900 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {runMutation.isPending ? 'Running...' : 'Run Replenishment'}
          </button>
        </div>
      </div>

      {isLoading && <div>Loading...</div>}
      {!isLoading && data && (
        <div className="overflow-x-auto border rounded-xl bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3 text-right">Available</th>
                <th className="px-4 py-3 text-right">Avg Daily</th>
                <th className="px-4 py-3 text-right">Reorder Pt</th>
                <th className="px-4 py-3 text-right">Recommended</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {actionableRows.map((row: ReorderRecommendationRow) => {
                const urgency = getUrgency(row.daysUntilStockout ?? null);
                const available = formatNumber(row.qtyAvailableSnapshot);
                const avgDaily = formatNumber(row.avgDailySales30);
                const reorderPoint = formatNumber(row.reorderPoint);
                const quantity = quantityOverrides[row.id] ?? row.recommendedQty;
                const vendorOptions = getVendorOptions(row);
                const hasVendorOptions = vendorOptions.length > 0;

                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">
                      { recommendationView === 'needs_action' && (
                        <input
                          type="checkbox"
                          checked={selectedRecommendationIds.includes(String(row.id))}
                          onChange={() => toggleSelectedRecommendation(String(row.id))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      )}
                    </td>

                    <td className="px-4 py-3">{row.product?.sku ?? '—'}</td>

                    <td className="px-4 py-3">
                      <ProductIdentity
                        name={row.product?.name}
                        sku={row.product?.sku}
                        imageUrl={row.product?.imageUrl}
                        fallbackName="—"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={getSelectedVendorId(row)}
                        onChange={(event) =>
                          setSelectedVendorByRecommendationId((current) => ({
                            ...current,
                            [String(row.id)]: event.target.value,
                          }))
                        }
                        disabled={!hasVendorOptions}
                        className="rounded-md border px-2 py-1 text-sm"
                      >
                        <option value="">
                          {hasVendorOptions
                            ? 'Select vendor'
                            : 'No matching vendors'}
                        </option>
                        {vendorOptions.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {available}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {avgDaily}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {reorderPoint}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {recommendationView === 'needs_action' ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={quantity}
                          onChange={(event) => updateQty(row.id, event.target.value)}
                          className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
                        />
                      ) : (
                        <span>{quantity}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${urgency.color}`}
                      >
                        {urgency.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 space-x-2">
                      {row.status !== 'converted' ? (
                      <>
                      <button
                        type="button"
                        onClick={() => reviewMutation.mutate(row.id)}
                        disabled={
                          reviewMutation.isPending ||
                          dismissMutation.isPending ||
                          convertMutation.isPending
                        }
                        className="text-blue-600 disabled:opacity-50"
                      >
                        Review
                      </button>

                      <button
                        type="button"
                        onClick={() => dismissMutation.mutate(row.id)}
                        disabled={
                          reviewMutation.isPending ||
                          dismissMutation.isPending ||
                          convertMutation.isPending
                        }
                        className="text-slate-500 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        disabled={!getSelectedVendorId(row) || convertMutation.isPending}
                        onClick={() => handleConvertOne(row)}
                        className="text-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                      Convert to PO
                      </button>
                      </>
                      ) : (
                      <button
                        type="button"
                        onClick={() => navigateToPurchaseOrder(row)}
                        className="text-sm font-medium text-gray-900 hover:underline"
                      >
                        View PO
                      </button>                      
                      )}
                  {recommendationView === 'history' &&
                    row.status === 'converted' &&
                    row.id && (
                      <div className="mt-2 text-sm text-green-700">
                        Converted to PO #{row.id}
                      </div>
                    )}                    

                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

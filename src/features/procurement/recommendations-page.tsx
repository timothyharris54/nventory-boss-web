import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getRecommendations,
  runReplenishment,
  reviewRecommendation,
  dismissRecommendation,
  convertRecommendationsToPurchaseOrders,
} from './api';

import type { ReorderRecommendationRow } from './types';
// Note: This page is intentionally basic and unstyled, as the replenishment engine 
// is still in early stages and the UI will likely undergo significant changes.
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
    // if (row.status !== 'open') continue;
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

  const { data, isLoading } = useQuery<ReorderRecommendationRow[]>({
    queryKey: ['replenishment-open'],
    queryFn: () => getRecommendations(),
  });

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
      toast.success('Recommendation converted to purchase order.');
      queryClient.invalidateQueries({ queryKey: ['replenishment-open'] });
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
  const actionableRows = data ? getUniqueLatestOpenActionableRows(data) : [];

  function handleRun() {
    runMutation.mutate({
      locationCode: 'MAIN',
    });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Replenishment Recommendations</h1>

        <button
          onClick={handleRun}
          disabled={runMutation.isPending}
          className="bg-slate-900 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {runMutation.isPending ? 'Running...' : 'Run Replenishment'}
        </button>
      </div>

      {isLoading && <div>Loading...</div>}
      {!isLoading && data && (
        <div className="overflow-x-auto border rounded-xl bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
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
                const recommendedQty = formatNumber(row.recommendedQty);

                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">{row.product?.sku ?? '—'}</td>

                    <td className="px-4 py-3">{row.product?.name ?? '—'}</td>

                    <td className="px-4 py-3">
                      {row.vendor?.name ?? '—'}
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

                    <td className="px-4 py-3 text-right font-semibold">
                      {recommendedQty}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${urgency.color}`}
                      >
                        {urgency.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 space-x-2">
                      <button
                        type="button"
                        onClick={() => reviewMutation.mutate(row.id)}
                        disabled={reviewMutation.isPending || dismissMutation.isPending}
                        className="text-blue-600 disabled:opacity-50"
                      >
                        Review
                      </button>

                      <button
                        type="button"
                        onClick={() => dismissMutation.mutate(row.id)}
                        disabled={reviewMutation.isPending || dismissMutation.isPending}
                        className="text-slate-500 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
              {row.vendorId && (
                      <button
                        type="button"
                        disabled={!row.vendorId || convertMutation.isPending}
                        onClick={() =>
                          convertMutation.mutate({
                            recommendationIds: [row.id],
                          })
                        }
                        className="text-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Convert to PO
                      </button>
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
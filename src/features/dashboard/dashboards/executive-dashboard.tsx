import { useQuery } from '@tanstack/react-query';
import { routes } from '../../../lib/constants/routes';
import { getPurchaseOrders, getRecommendations, getVendors } from '../../procurement/api';
import {
  ActionPanel,
  DashboardError,
  DashboardFrame,
  DashboardLoading,
  MetricGrid,
} from '../dashboard-ui';
import {
  formatCount,
  formatCurrency,
  getCriticalRecommendations,
  getOpenPurchaseOrders,
  getOpenRecommendations,
  getOverduePurchaseOrders,
  getPurchaseOrderValue,
} from '../dashboard-utils';

export function ExecutiveDashboard() {
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: getPurchaseOrders,
  });

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', { status: 'open', take: 50 }],
    queryFn: () => getRecommendations({ status: 'open', take: 50 }),
  });

  const vendorsQuery = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors,
  });

  const isLoading =
    purchaseOrdersQuery.isLoading ||
    recommendationsQuery.isLoading ||
    vendorsQuery.isLoading;
  const error =
    purchaseOrdersQuery.error ?? recommendationsQuery.error ?? vendorsQuery.error;
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const recommendations = recommendationsQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const openPurchaseOrders = getOpenPurchaseOrders(purchaseOrders);
  const overduePurchaseOrders = getOverduePurchaseOrders(purchaseOrders);
  const openRecommendations = getOpenRecommendations(recommendations);
  const criticalRecommendations = getCriticalRecommendations(recommendations);
  const openPurchaseOrderValue = openPurchaseOrders.reduce(
    (total, purchaseOrder) => total + getPurchaseOrderValue(purchaseOrder),
    0,
  );

  return (
    <DashboardFrame
      title="Executive Dashboard"
      subtitle="Procurement exposure, supplier readiness, and operating risk."
      showSalesRefreshPanel
    >
      {isLoading ? <DashboardLoading /> : null}
      {error ? <DashboardError message={(error as Error).message} /> : null}

      {!isLoading && !error ? (
        <div className="space-y-4">
          <MetricGrid
            metrics={[
              {
                label: 'Open PO exposure',
                value: formatCurrency(openPurchaseOrderValue),
                detail: `${openPurchaseOrders.length} open purchase orders`,
              },
              {
                label: 'Supplier count',
                value: formatCount(vendors.filter((vendor) => vendor.isActive).length),
                detail: 'Active vendors',
              },
              {
                label: 'Critical stockout risk',
                value: formatCount(criticalRecommendations.length),
                detail: 'Seven days or less',
                tone: criticalRecommendations.length ? 'danger' : 'good',
              },
              {
                label: 'Late inbound POs',
                value: formatCount(overduePurchaseOrders.length),
                detail: 'Expected date has passed',
                tone: overduePurchaseOrders.length ? 'danger' : 'good',
              },
            ]}
          />

          <ActionPanel
            title="Executive Exceptions"
            emptyMessage="No executive exceptions need attention."
            actions={[
              ...(criticalRecommendations.length
                ? [
                    {
                      label: `${criticalRecommendations.length} critical stockout risks`,
                      detail: 'Planning needs attention on constrained inventory.',
                      to: routes.recommendations,
                      tone: 'danger' as const,
                    },
                  ]
                : []),
              ...(overduePurchaseOrders.length
                ? [
                    {
                      label: `${overduePurchaseOrders.length} late inbound purchase orders`,
                      detail: 'Supplier performance or expedite decisions may be needed.',
                      to: routes.purchaseOrders,
                      tone: 'danger' as const,
                    },
                  ]
                : []),
              ...(openRecommendations.length
                ? [
                    {
                      label: `${openRecommendations.length} replenishment recommendations`,
                      detail: 'Open demand signals pending purchasing action.',
                      to: routes.recommendations,
                      tone: 'warning' as const,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ) : null}
    </DashboardFrame>
  );
}

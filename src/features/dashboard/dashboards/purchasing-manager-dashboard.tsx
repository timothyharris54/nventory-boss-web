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
  getOpenPurchaseOrders,
  getOpenRecommendations,
  getOverduePurchaseOrders,
  getPurchaseOrderValue,
} from '../dashboard-utils';

export function PurchasingManagerDashboard() {
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
  const activeVendors = vendors.filter((vendor) => vendor.isActive);
  const openPurchaseOrderValue = openPurchaseOrders.reduce(
    (total, purchaseOrder) => total + getPurchaseOrderValue(purchaseOrder),
    0,
  );

  return (
    <DashboardFrame
      title="Purchasing Manager Dashboard"
      subtitle="Purchasing workload, supplier coverage, and exception oversight."
      showSalesRefreshPanel
    >
      {isLoading ? <DashboardLoading /> : null}
      {error ? <DashboardError message={(error as Error).message} /> : null}

      {!isLoading && !error ? (
        <div className="space-y-4">
          <MetricGrid
            metrics={[
              {
                label: 'Open PO value',
                value: formatCurrency(openPurchaseOrderValue),
                detail: `${openPurchaseOrders.length} open purchase orders`,
              },
              {
                label: 'Late POs',
                value: formatCount(overduePurchaseOrders.length),
                detail: 'Needs vendor follow-up',
                tone: overduePurchaseOrders.length ? 'danger' : 'good',
              },
              {
                label: 'Open recommendations',
                value: formatCount(openRecommendations.length),
                detail: 'Buyer workload input',
                tone: openRecommendations.length ? 'warning' : 'good',
              },
              {
                label: 'Active vendors',
                value: formatCount(activeVendors.length),
                detail: `${vendors.length - activeVendors.length} inactive`,
              },
            ]}
          />

          <ActionPanel
            title="Manager Exceptions"
            emptyMessage="No purchasing exceptions need attention."
            actions={[
              ...(overduePurchaseOrders.length
                ? [
                    {
                      label: `${overduePurchaseOrders.length} late purchase orders`,
                      detail: 'Review supplier follow-up and expedite options.',
                      to: routes.purchaseOrders,
                      tone: 'danger' as const,
                    },
                  ]
                : []),
              ...(openRecommendations.length
                ? [
                    {
                      label: `${openRecommendations.length} recommendations waiting`,
                      detail: 'Review buyer workload and conversion queue.',
                      to: routes.recommendations,
                      tone: 'warning' as const,
                    },
                  ]
                : []),
              {
                label: 'Review vendor product coverage',
                detail: 'Confirm primary vendors, costs, lead times, and order rules.',
                to: routes.vendorProducts,
              },
            ]}
          />
        </div>
      ) : null}
    </DashboardFrame>
  );
}

import { useQuery } from '@tanstack/react-query';
import { routes } from '../../../lib/constants/routes';
import { getPurchaseOrders, getRecommendations } from '../../procurement/api';
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
  formatDate,
  getOpenPurchaseOrders,
  getOpenRecommendations,
  getOverduePurchaseOrders,
  getPurchaseOrderValue,
} from '../dashboard-utils';

export function BuyerDashboard() {
  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', { status: 'open', take: 25 }],
    queryFn: () => getRecommendations({ status: 'open', take: 25 }),
  });

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: getPurchaseOrders,
  });

  const isLoading = recommendationsQuery.isLoading || purchaseOrdersQuery.isLoading;
  const error = recommendationsQuery.error ?? purchaseOrdersQuery.error;
  const recommendations = recommendationsQuery.data ?? [];
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const openRecommendations = getOpenRecommendations(recommendations);
  const openPurchaseOrders = getOpenPurchaseOrders(purchaseOrders);
  const draftPurchaseOrders = purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.status === 'draft',
  );
  const overduePurchaseOrders = getOverduePurchaseOrders(purchaseOrders);
  const openPurchaseOrderValue = openPurchaseOrders.reduce(
    (total, purchaseOrder) => total + getPurchaseOrderValue(purchaseOrder),
    0,
  );

  return (
    <DashboardFrame
      title="Buyer Dashboard"
      subtitle="Purchasing work queue, supplier follow-up, and open PO exposure."
    >
      {isLoading ? <DashboardLoading /> : null}
      {error ? <DashboardError message={(error as Error).message} /> : null}

      {!isLoading && !error ? (
        <div className="space-y-4">
          <MetricGrid
            metrics={[
              {
                label: 'Open recommendations',
                value: formatCount(openRecommendations.length),
                detail: 'Ready for review or conversion',
                tone: openRecommendations.length ? 'warning' : 'good',
              },
              {
                label: 'Draft POs',
                value: formatCount(draftPurchaseOrders.length),
                detail: 'Need buyer action',
                tone: draftPurchaseOrders.length ? 'warning' : 'good',
              },
              {
                label: 'Open PO value',
                value: formatCurrency(openPurchaseOrderValue),
                detail: `${openPurchaseOrders.length} open orders`,
              },
              {
                label: 'Overdue POs',
                value: formatCount(overduePurchaseOrders.length),
                detail: 'Expected date has passed',
                tone: overduePurchaseOrders.length ? 'danger' : 'good',
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <ActionPanel
              title="Buyer Actions"
              emptyMessage="No buyer actions need attention."
              actions={[
                ...(openRecommendations.length
                  ? [
                      {
                        label: `${openRecommendations.length} replenishment recommendations`,
                        detail: 'Review demand signals and convert to purchase orders.',
                        to: routes.recommendations,
                        tone: 'warning' as const,
                      },
                    ]
                  : []),
                ...(draftPurchaseOrders.length
                  ? [
                      {
                        label: `${draftPurchaseOrders.length} draft purchase orders`,
                        detail: 'Submit or edit draft purchase orders.',
                        to: routes.purchaseOrders,
                        tone: 'warning' as const,
                      },
                    ]
                  : []),
                ...(overduePurchaseOrders.length
                  ? [
                      {
                        label: `${overduePurchaseOrders.length} overdue purchase orders`,
                        detail: 'Follow up with vendors on late inbound supply.',
                        to: routes.purchaseOrders,
                        tone: 'danger' as const,
                      },
                    ]
                  : []),
              ]}
            />

            <ActionPanel
              title="Upcoming Purchase Orders"
              emptyMessage="No open purchase orders."
              actions={openPurchaseOrders.slice(0, 5).map((purchaseOrder) => ({
                label: `${purchaseOrder.poNumber} - ${purchaseOrder.vendor.name}`,
                detail: `${purchaseOrder.status.replaceAll('_', ' ')} - expected ${formatDate(
                  purchaseOrder.expectedAt,
                )}`,
                to: routes.purchaseOrders,
                tone: overduePurchaseOrders.some((po) => po.id === purchaseOrder.id)
                  ? 'danger'
                  : 'neutral',
              }))}
            />
          </div>
        </div>
      ) : null}
    </DashboardFrame>
  );
}

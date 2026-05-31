import { useQuery } from '@tanstack/react-query';
import { routes } from '../../../lib/constants/routes';
import { getPurchaseOrders } from '../../procurement/api';
import {
  ActionPanel,
  DashboardError,
  DashboardFrame,
  DashboardLoading,
  MetricGrid,
} from '../dashboard-ui';
import {
  formatCount,
  formatDate,
  getOverduePurchaseOrders,
  getReceivablePurchaseOrders,
} from '../dashboard-utils';

export function WarehouseUserDashboard() {
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: getPurchaseOrders,
  });

  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const receivablePurchaseOrders = getReceivablePurchaseOrders(purchaseOrders);
  const partialPurchaseOrders = purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.status === 'partially_received',
  );
  const overduePurchaseOrders = getOverduePurchaseOrders(receivablePurchaseOrders);
  const receiptsRecorded = purchaseOrders.reduce(
    (total, purchaseOrder) => total + purchaseOrder.receipts.length,
    0,
  );

  return (
    <DashboardFrame
      title="Warehouse User Dashboard"
      subtitle="Inbound receiving work and inventory movement tasks."
    >
      {purchaseOrdersQuery.isLoading ? <DashboardLoading /> : null}
      {purchaseOrdersQuery.error ? (
        <DashboardError message={(purchaseOrdersQuery.error as Error).message} />
      ) : null}

      {!purchaseOrdersQuery.isLoading && !purchaseOrdersQuery.error ? (
        <div className="space-y-4">
          <MetricGrid
            metrics={[
              {
                label: 'Ready to receive',
                value: formatCount(receivablePurchaseOrders.length),
                detail: 'Submitted or partially received POs',
                tone: receivablePurchaseOrders.length ? 'warning' : 'good',
              },
              {
                label: 'Partial receipts',
                value: formatCount(partialPurchaseOrders.length),
                detail: 'Need remaining quantities closed out',
                tone: partialPurchaseOrders.length ? 'warning' : 'good',
              },
              {
                label: 'Late inbound',
                value: formatCount(overduePurchaseOrders.length),
                detail: 'Expected date has passed',
                tone: overduePurchaseOrders.length ? 'danger' : 'good',
              },
              {
                label: 'Receipts recorded',
                value: formatCount(receiptsRecorded),
                detail: 'Across purchase orders',
              },
            ]}
          />

          <ActionPanel
            title="Receiving Queue"
            emptyMessage="No purchase orders are ready to receive."
            actions={receivablePurchaseOrders.slice(0, 8).map((purchaseOrder) => ({
              label: `${purchaseOrder.poNumber} - ${purchaseOrder.vendor.name}`,
              detail: `${purchaseOrder.lines.length} lines - expected ${formatDate(
                purchaseOrder.expectedAt,
              )}`,
              to: routes.purchaseOrders,
              tone: overduePurchaseOrders.some((po) => po.id === purchaseOrder.id)
                ? 'danger'
                : purchaseOrder.status === 'partially_received'
                  ? 'warning'
                  : 'neutral',
            }))}
          />
        </div>
      ) : null}
    </DashboardFrame>
  );
}

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

export function WarehouseManagerDashboard() {
  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: getPurchaseOrders,
  });

  const isLoading = purchaseOrdersQuery.isLoading;
  const error = purchaseOrdersQuery.error;
  const purchaseOrders = purchaseOrdersQuery.data ?? [];
  const receivablePurchaseOrders = getReceivablePurchaseOrders(purchaseOrders);
  const overduePurchaseOrders = getOverduePurchaseOrders(receivablePurchaseOrders);
  const partialPurchaseOrders = purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.status === 'partially_received',
  );
  const submittedPurchaseOrders = purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.status === 'submitted',
  );
  const receivableLines = receivablePurchaseOrders.reduce(
    (total, purchaseOrder) => total + purchaseOrder.lines.length,
    0,
  );

  return (
    <DashboardFrame
      title="Warehouse Manager Dashboard"
      subtitle="Inbound flow, receiving exceptions, and warehouse inventory signals."
    >
      {isLoading ? <DashboardLoading /> : null}
      {error ? <DashboardError message={(error as Error).message} /> : null}

      {!isLoading && !error ? (
        <div className="space-y-4">
          <MetricGrid
            metrics={[
              {
                label: 'Inbound POs',
                value: formatCount(receivablePurchaseOrders.length),
                detail: 'Ready for warehouse action',
                tone: receivablePurchaseOrders.length ? 'warning' : 'good',
              },
              {
                label: 'Late inbound',
                value: formatCount(overduePurchaseOrders.length),
                detail: 'Expected date has passed',
                tone: overduePurchaseOrders.length ? 'danger' : 'good',
              },
              {
                label: 'Partial receipts',
                value: formatCount(partialPurchaseOrders.length),
                detail: 'Need remaining quantities resolved',
                tone: partialPurchaseOrders.length ? 'warning' : 'good',
              },
              {
                label: 'Receivable lines',
                value: formatCount(receivableLines),
                detail: 'Open inbound line workload',
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <ActionPanel
              title="Receiving Exceptions"
              emptyMessage="No receiving exceptions need attention."
              actions={overduePurchaseOrders.slice(0, 5).map((purchaseOrder) => ({
                label: `${purchaseOrder.poNumber} is late`,
                detail: `${purchaseOrder.vendor.name} - expected ${formatDate(
                  purchaseOrder.expectedAt,
                )}`,
                to: routes.purchaseOrders,
                tone: 'danger',
              }))}
            />

            <ActionPanel
              title="Inbound Workload"
              emptyMessage="No submitted purchase orders are waiting for receipt."
              actions={submittedPurchaseOrders.slice(0, 5).map((purchaseOrder) => ({
                label: `${purchaseOrder.poNumber} is ready to receive`,
                detail: `${purchaseOrder.lines.length} lines from ${purchaseOrder.vendor.name}`,
                to: routes.purchaseOrders,
                tone: 'neutral',
              }))}
            />
          </div>
        </div>
      ) : null}
    </DashboardFrame>
  );
}

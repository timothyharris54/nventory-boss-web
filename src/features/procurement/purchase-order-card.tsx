import type { PurchaseOrderRow } from './purchase-order-types';
import { getPurchaseOrderHealth } from './shared/utils';

type PurchaseOrderCardProps = {
  po: PurchaseOrderRow;
  isSelected: boolean;
  onToggleSelected: (purchaseOrderId: string) => void;
  onViewDetails: (purchaseOrderId: string) => void;
  onReceive: (po: PurchaseOrderRow) => void;
  onSubmit: (purchaseOrderId: string) => void;
  isSubmitting?: boolean;
};

function getPurchaseOrderMetrics(po: PurchaseOrderRow) {
  const totalOrdered = po.lines.reduce(
    (sum, line) => sum + Number(line.orderedQty),
    0,
  );

  const totalReceived = po.lines.reduce(
    (sum, line) => sum + Number(line.receivedQty ?? 0),
    0,
  );

  const remaining = totalOrdered - totalReceived;

  const percentReceived =
    totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  const daysSinceOrdered = Math.floor(
    (Date.now() - new Date(po.orderedAt ?? new Date()).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return {
    totalOrdered,
    totalReceived,
    remaining,
    percentReceived,
    daysSinceOrdered,
  };
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    partially_received: 'bg-yellow-100 text-yellow-800',
    received: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
        styles[status] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}

export function PurchaseOrderCard({
  po,
  isSelected,
  onToggleSelected,
  onViewDetails,
  onReceive,
  onSubmit,
  isSubmitting = false,
}: PurchaseOrderCardProps) {
  const metrics = getPurchaseOrderMetrics(po);
  const health = getPurchaseOrderHealth(po);

  const canSubmit = po.status === 'draft';
  const canReceive =
    po.status === 'submitted' || po.status === 'partially_received';

  return (
    <article   className={`rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        health.isOverdue
          ? 'border-red-300'
          : health.isDueSoon
            ? 'border-yellow-300'
            : ''
      }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelected(String(po.id))}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />            
            <h3 className="font-semibold">{po.poNumber}</h3>
            <StatusBadge status={po.status} />
              {health.isOverdue && (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                  Overdue
                </span>
              )}

              {health.isDueSoon && (
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                  Due Soon
                </span>
              )}          
          </div>

          <p className="mt-1 text-sm text-gray-500">
            {po.vendor?.name ?? 'Unknown vendor'} · {po.locationCode}
          </p>
        </div>

        <div className="text-right text-sm text-gray-500">
          <p>{metrics.daysSinceOrdered} days old</p>
          <p>
            {po.lines.length} line item
            {po.lines.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>
            {metrics.totalReceived} of {metrics.totalOrdered} received
          </span>
          <span>{metrics.percentReceived}%</span>
        </div>

        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-gray-900"
            style={{ width: `${metrics.percentReceived}%` }}
          />
        </div>

        {metrics.remaining > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {metrics.remaining} units remaining
          </p>
        )}
      </div>
  

        {po.notes && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-600">
            {po.notes}
        </p>
        )}
        
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(String(po.id))}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Details
        </button>

        {canSubmit && (
          <button
            type="button"
            onClick={() => onSubmit(String(po.id))}
            disabled={isSubmitting}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit PO'}
          </button>
        )}

        {canReceive && (
          <button
            type="button"
            onClick={() => onReceive(po)}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white"
          >
            Receive
          </button>
        )}
      </div>
    </article>
  );
}

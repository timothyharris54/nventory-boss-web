import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPurchaseOrderById } from './api';
import { cancelPurchaseOrder } from './api';
import { toast } from 'sonner';
import { useState, type ReactNode } from 'react';
import { EditPurchaseOrderModal } from './edit-purchase-order-modal';
import type { PurchaseOrderDetail } from './purchase-order-types';

type Props = {
  purchaseOrderId: string;
  onClose: () => void;
};

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function PurchaseOrderDetailPanel({
  purchaseOrderId,
  onClose,
}: Props) {
  const {
    data: purchaseOrder,
  } = useQuery({
    queryKey: ['purchase-order', purchaseOrderId],
    queryFn: () => getPurchaseOrderById(purchaseOrderId),
    enabled: !!purchaseOrderId,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const cancelPurchaseOrderMutation = useMutation({
    mutationFn: (id: string) => cancelPurchaseOrder(id),

    onSuccess: () => {
      toast.success('Purchase order cancelled.');

      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({
        queryKey: ['purchase-order', purchaseOrderId],
      });
      onClose(); // optional: close panel after cancel
    },

    onError: () => {
      toast.error('Unable to cancel purchase order.');
    },
  });
  const totalOrdered = purchaseOrder?.lines.reduce(
    (sum, line) => sum + Number(line.orderedQty),
    0,
  );

  const totalReceived = purchaseOrder?.lines.reduce(
    (sum, line) => sum + Number(line.receivedQty ?? 0),
    0,
  );
  
  const percentReceived =
    totalOrdered! > 0
      ? Math.round((totalReceived! / totalOrdered!) * 100)
      : 0;

  const handleCancel = () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this purchase order?'
    );

    if (!confirmed) return;

    if (purchaseOrder) {
      cancelPurchaseOrderMutation.mutate(purchaseOrder.id);
    }
  };
  return (
<div className="fixed inset-0 z-50 flex justify-end">
  <div
    className="absolute inset-0 bg-black/30"
    onClick={onClose}
  />

  <aside
    className="relative h-full w-full max-w-4xl animate-slide-in-right overflow-y-auto bg-white shadow-2xl"
    onClick={(event) => event.stopPropagation()}
  >
    <div className="sticky top-0 z-10 border-b bg-white px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Purchase Order
          </p>
          <h2 className="text-xl font-semibold">
            {purchaseOrder?.poNumber ?? 'Loading...'}
          </h2>
          {purchaseOrder && (
            <p className="text-sm text-gray-500">
              {purchaseOrder.vendor.name} · {purchaseOrder.locationCode}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
        {purchaseOrder?.status === 'draft' && (
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Edit Draft
          </button>
        )}          
        {(purchaseOrder?.status === 'draft' ||
            purchaseOrder?.status === 'submitted') && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelPurchaseOrderMutation.isPending}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              {cancelPurchaseOrderMutation.isPending ? 'Cancelling...' : 'Cancel PO'}
            </button>
          )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            Created from Replenishment Recommendation
          </span>
        </div>    
      </div>
    </div>

    <div className="space-y-5 px-6 py-5">
      <DetailSection title="Summary">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-medium capitalize">
              {purchaseOrder?.status?.replaceAll('_', ' ')}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Vendor</p>
            <p className="font-medium">{purchaseOrder?.vendor?.name}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="font-medium">{purchaseOrder?.locationCode}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Expected</p>
            <p className="font-medium">
              {purchaseOrder?.expectedAt
                ? new Date(purchaseOrder.expectedAt).toLocaleDateString()
                : '—'}
            </p>
          </div>
          <div className='w-full'>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="font-medium">{totalReceived ? totalReceived : 0}</span> of{' '}
                <span className="font-medium">{totalOrdered}</span> units received
              </p>

              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-gray-900"
                  style={{ width: `${percentReceived}%` }}
                />
              </div>
            </div>                      
          </div>
        </div>
      </DetailSection>
      <DetailSection title="Line Items">
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Ordered</th>
                <th className="px-3 py-2 text-right">Received</th>
                <th className="px-3 py-2 text-right">Remaining</th>
                <th className="px-3 py-2 text-right">Unit Cost</th>
              </tr>
            </thead>

            <tbody>
              {purchaseOrder?.lines.map((line) => {
                const ordered = Number(line.orderedQty);
                const received = Number(line.receivedQty);
                const remaining = ordered - received;

                return (
                  <tr key={line.id} className="border-t">
                    <td className="px-3 py-3">
                      <div className="font-medium">{line.product.name}</div>
                      <div className="text-xs text-gray-500">
                        SKU: {line.product.sku}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-right">{line.orderedQty}</td>
                    <td className="px-3 py-3 text-right">{line.receivedQty}</td>
                    <td className="px-3 py-3 text-right">{remaining}</td>
                    <td className="px-3 py-3 text-right">${line.unitCost}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DetailSection>
      <DetailSection title="Receipt History">
        {purchaseOrder?.receipts.length === 0 ? (
          <p className="text-sm text-gray-500">
            No receipts recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
          {purchaseOrder?.receipts.map((receipt) => {
            const receiptQty = receipt.lines.reduce(
              (sum, line) => sum + Number(line.receivedQty),
              0,
            );

            return (
              <div key={receipt.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {new Date(receipt.receivedAt).toLocaleString()}
                    </p>

                    <p className="text-sm text-gray-500">
                      Received {receiptQty} units · {receipt.lines.length} line
                      {receipt.lines.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <p className="text-xs text-gray-400">
                    Receipt #{receipt.id}
                  </p>
                </div>

                {receipt.notes && (
                  <p className="mb-3 text-sm text-gray-600">
                    {receipt.notes}
                  </p>
                )}

                <div className="rounded-md bg-gray-50 p-3">
                  {receipt.lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex justify-between py-1 text-sm"
                    >
                      <span>
                        {line.product?.name ?? `Product ${line.productId}`}
                      </span>

                      <span className="font-medium">
                        {line.receivedQty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </DetailSection>      
    </div>
    {isEditModalOpen && purchaseOrderId && EditPurchaseOrderModal && (
      <EditPurchaseOrderModal
        purchaseOrder={purchaseOrder as PurchaseOrderDetail}
        onClose={() => setIsEditModalOpen(false)}
      />
    )}    
  </aside>
</div>
  );
}

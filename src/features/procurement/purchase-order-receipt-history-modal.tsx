import { useQuery } from '@tanstack/react-query';
import { getPurchaseOrderById } from './api';

type Props = {
  purchaseOrderId: string;
  onClose: () => void;
};

export function PurchaseOrderReceiptHistoryModal({
  purchaseOrderId,
  onClose,
}: Props) {
  const {
    data: purchaseOrder,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['purchase-order', purchaseOrderId],
    queryFn: () => getPurchaseOrderById(purchaseOrderId),
    enabled: !!purchaseOrderId,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Receipt History</h2>
            <p className="text-sm text-gray-500">
              {purchaseOrder?.poNumber ?? 'Purchase Order'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-6 py-4">
          {isLoading && (
            <p className="text-sm text-gray-500">Loading receipt history...</p>
          )}

          {isError && (
            <p className="text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : 'Unable to load receipt history.'}
            </p>
          )}

          {!isLoading && !isError && purchaseOrder?.receipts?.length === 0 && (
            <p className="text-sm text-gray-500">
              No receipts recorded for this purchase order yet.
            </p>
          )}

          {!isLoading &&
            !isError &&
            purchaseOrder?.receipts?.map((receipt) => {
              const totalQty = receipt.lines.reduce(
                (sum, line) => sum + Number(line.receivedQty),
                0,
              );

              return (
                <div
                  key={receipt.id}
                  className="mb-4 rounded-lg border p-4 last:mb-0"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="font-medium">
                        {new Date(receipt.receivedAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {receipt.lines.length} line
                        {receipt.lines.length === 1 ? '' : 's'} received ·{' '}
                        {totalQty} units
                      </div> 
                    </div>
                  </div>

                  {receipt.notes && (
                    <p className="mb-3 text-sm text-gray-600">
                      {receipt.notes}
                    </p>
                  )}
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-xs uppercase text-gray-500">
                      <tr>
                        <th className="py-2">Product</th>
                        <th className="py-2 text-right">Received Qty</th>
                        <th className="py-2 text-right">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.lines.map((line) => (
                        <tr key={line.id} className="border-b last:border-b-0">
                          <td className="py-2">
                            {line.product?.name ?? `Product ${line.productId}`}
                            {line.product?.sku && (
                              <div className="text-xs text-gray-500">
                                SKU: {line.product.sku}
                              </div>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            {line.receivedQty}
                          </td>
                          <td className="py-2 text-right">
                            {line.unitCost ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
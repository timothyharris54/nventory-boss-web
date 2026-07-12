import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updatePurchaseOrder } from './api';
import type {
  PurchaseOrderDetail,
  UpdatePurchaseOrderDto,
} from './purchase-order-types';
import { ProductIdentity } from '../../components/data-display/product-identity';

type Props = {
  purchaseOrder: PurchaseOrderDetail;
  onClose: () => void;
};


export function EditPurchaseOrderModal({
  purchaseOrder,
  onClose,
}: Props) {
  const queryClient = useQueryClient();

  const [expectedAt, setExpectedAt] = useState(
    purchaseOrder.expectedAt ? purchaseOrder.expectedAt.slice(0, 10) : '',
  );

  const [notes, setNotes] = useState(purchaseOrder.notes ?? '');

  const [lines, setLines] = useState(
    purchaseOrder.lines.map((line) => ({
      purchaseOrderLineId: line.id,
      productName: line.product.name,
      sku: line.product.sku,
      imageUrl: line.product.imageUrl,
      orderedQty: line.orderedQty,
    })),
  );
  const originalExpectedAt = purchaseOrder.expectedAt
    ? purchaseOrder.expectedAt.slice(0, 10)
    : '';
  const originalNotes = purchaseOrder.notes ?? '';
  const originalLines = purchaseOrder.lines.map((line) => ({
    purchaseOrderLineId: line.id,
    orderedQty: String(line.orderedQty),
  }));

  const normalizedExpectedAt = expectedAt || '';
  const normalizedNotes = notes.trim();
  const normalizedLines = lines.map((line) => ({
    purchaseOrderLineId: line.purchaseOrderLineId,
    orderedQty: String(line.orderedQty),
  }));

  const updateMutation = useMutation({
    mutationFn: (body: UpdatePurchaseOrderDto) =>
      updatePurchaseOrder(purchaseOrder.id, body),

    onSuccess: () => {
      toast.success('Purchase order updated.');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({
        queryKey: ['purchase-order', purchaseOrder.id],
      });
      onClose();
    },

    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to update purchase order.',
      );
    },
  });

  const handleLineQtyChange = (
    purchaseOrderLineId: string,
    orderedQty: string,
  ) => {
    setLines((current) =>
      current.map((line) =>
        line.purchaseOrderLineId === purchaseOrderLineId
          ? { ...line, orderedQty }
          : line,
      ),
    );
  };
  const hasChanges =
    normalizedExpectedAt !== originalExpectedAt ||
    normalizedNotes !== originalNotes ||
    JSON.stringify(normalizedLines) !== JSON.stringify(originalLines);

  const handleSubmit = () => {
    const body: UpdatePurchaseOrderDto = {
      expectedAt: expectedAt ? new Date(expectedAt).toISOString() : null,
      notes: notes.trim() || null,
      lines: lines.map((line) => ({
        purchaseOrderLineId: line.purchaseOrderLineId,
        orderedQty: String(line.orderedQty),
      })),
    };

    updateMutation.mutate(body);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Edit Draft PO</h2>
          <p className="text-sm text-gray-500">{purchaseOrder.poNumber}</p>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Expected Date
            </label>
            <input
              type="date"
              value={expectedAt}
              onChange={(event) => setExpectedAt(event.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                normalizedExpectedAt !== originalExpectedAt
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-300'
              }`}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                  normalizedNotes !== originalNotes
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-300'
                }`}            
              />
          </div>

          <div className="rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Ordered Qty</th>
                </tr>
              </thead>

              <tbody>
                {lines.map((line) => {
                  const originalLine = originalLines.find(
                    (original) =>
                      original.purchaseOrderLineId === line.purchaseOrderLineId,
                  );

                  const lineChanged =
                    String(line.orderedQty) !== originalLine?.orderedQty;

                  return (
                    <tr key={line.purchaseOrderLineId} className="border-t">
                      <td className="px-3 py-3">
                        <ProductIdentity
                          name={line.productName}
                          sku={line.sku}
                          imageUrl={line.imageUrl}
                        />
                      </td>

                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.orderedQty}
                          onChange={(event) =>
                            handleLineQtyChange(
                              line.purchaseOrderLineId,
                              event.target.value,
                            )
                          }
                          className={`w-28 rounded-md border px-2 py-1 text-right ${
                            lineChanged
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-gray-300'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!hasChanges && (
            <p className="text-xs text-gray-500">
              No changes to save
            </p>
          )}            
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasChanges || updateMutation.isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

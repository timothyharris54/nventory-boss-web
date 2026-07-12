import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { receivePurchaseOrder } from './api';
import type { ReceivePurchaseOrderDto } from './purchase-order-types';
import { ProductIdentity } from '../../components/data-display/product-identity';

type PurchaseOrderLine = {
  id: string;
  productId: string;
  orderedQty: string;
  receivedQty?: string | null;
  unitCost?: string | null;
  product?: {
    name?: string | null;
    sku?: string | null;
    imageUrl?: string | null;
  } | null;
  vendorProduct?: {
    unitCost?: string | null;
  } | null;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  lines: PurchaseOrderLine[];
};

type ReceivePurchaseOrderModalProps = {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
};

function buildInitialReceiveRows(lines: PurchaseOrderLine[]) {
  return lines.map((line) => {
    const ordered = Number(line.orderedQty);
    const received = Number(line.receivedQty ?? 0);
    const remaining = Math.max(ordered - received, 0);

    return {
      purchaseOrderLineId: String(line.id),
      productId: String(line.productId),
      productName: line.product?.name ?? 'Unnamed product',
      orderedQty: ordered,
      receivedQty: received,
      remainingQty: remaining,
      receiveQty: remaining > 0 ? String(remaining) : '',
      sku: line.product?.sku ?? null,
      imageUrl: line.product?.imageUrl ?? null,
      unitCost:
        line.vendorProduct?.unitCost ??
        line.unitCost ??
        undefined,
    };
  });
}
export function ReceivePurchaseOrderModal({
  purchaseOrder,
  onClose,
}: ReceivePurchaseOrderModalProps) {
  const queryClient = useQueryClient();

  const initialRows = useMemo(
    () => buildInitialReceiveRows(purchaseOrder.lines),
    [purchaseOrder.lines],
  );

  const [rows, setRows] = useState(initialRows);
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: (body: ReceivePurchaseOrderDto) =>
      receivePurchaseOrder(purchaseOrder.id, body),

    onSuccess: () => {
      toast.success('Inventory received.');
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-ledger'] });
      onClose();
    },

    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to receive inventory.',
      );
    },
  });

  const updateReceiveQty = (purchaseOrderLineId: string, value: string) => {
    setRows((current) =>
      current.map((row) =>
        row.purchaseOrderLineId === purchaseOrderLineId
          ? { ...row, receiveQty: value }
          : row,
      ),
    );
  };

  const receivableRows = rows.filter((row) => Number(row.receiveQty) > 0);

  const hasInvalidRows = rows.some((row) => {
    const qty = Number(row.receiveQty);

    if (!row.receiveQty) return false;

    return Number.isNaN(qty) || qty < 0 || qty > row.remainingQty;
  });

  const canSubmit =
    receivableRows.length > 0 && !hasInvalidRows && !mutation.isPending;

  const handleSubmit = () => {
    const body: ReceivePurchaseOrderDto = {
      receivedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
      lines: receivableRows.map((row) => ({
        purchaseOrderLineId: row.purchaseOrderLineId,
        productId: row.productId,
        receivedQty: String(row.receiveQty),
        unitCost: row.unitCost ? String(row.unitCost) : undefined,
      })),
    };

    mutation.mutate(body);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            Receive Inventory
          </h2>
          <p className="text-sm text-gray-500">
            PO {purchaseOrder.poNumber}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-auto px-6 py-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Product</th>
                <th className="py-2 text-right">Ordered</th>
                <th className="py-2 text-right">Received</th>
                <th className="py-2 text-right">Remaining</th>
                <th className="py-2 text-right">Receive Qty</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const qty = Number(row.receiveQty);
                const isInvalid =
                  row.receiveQty !== '' &&
                  (Number.isNaN(qty) ||
                    qty < 0 ||
                    qty > row.remainingQty);

                return (
                  <tr
                    key={row.purchaseOrderLineId}
                    className="border-b last:border-b-0"
                  >
                    <td className="py-3">
                      <ProductIdentity
                        name={row.productName}
                        sku={row.sku}
                        imageUrl={row.imageUrl}
                      />
                    </td>

                    <td className="py-3 text-right">
                      {row.orderedQty}
                    </td>

                    <td className="py-3 text-right">
                      {row.receivedQty}
                    </td>

                    <td className="py-3 text-right">
                      {row.remainingQty}
                    </td>

                    <td className="py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        max={row.remainingQty}
                        step="0.01"
                        value={row.receiveQty}
                        disabled={row.remainingQty <= 0}
                        onChange={(event) =>
                          updateReceiveQty(
                            row.purchaseOrderLineId,
                            event.target.value,
                          )
                        }
                        className={`w-28 rounded-md border px-2 py-1 text-right ${
                          isInvalid
                            ? 'border-red-500'
                            : 'border-gray-300'
                        }`}
                      />
                      {isInvalid && (
                        <div className="mt-1 text-xs text-red-600">
                          Max {row.remainingQty}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Optional receiving notes"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? 'Receiving...' : 'Receive Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
}

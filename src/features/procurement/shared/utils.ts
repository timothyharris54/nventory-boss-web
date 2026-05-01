import type { PurchaseOrderRow } from "../purchase-order-types";

export function getPurchaseOrderHealth(po: PurchaseOrderRow) {
  const now = new Date();
  const expectedAt = po.expectedAt ? new Date(po.expectedAt) : null;

  const totalOrdered = po.lines.reduce(
    (sum, line) => sum + Number(line.orderedQty),
    0,
  );

  const totalReceived = po.lines.reduce(
    (sum, line) => sum + Number(line.receivedQty ?? 0),
    0,
  );

  const isComplete = totalOrdered > 0 && totalReceived >= totalOrdered;

  const daysUntilExpected = expectedAt
    ? Math.ceil(
        (expectedAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;

  const isOverdue =
    expectedAt !== null && daysUntilExpected !== null && daysUntilExpected < 0 && !isComplete;

  const isDueSoon =
    expectedAt !== null &&
    daysUntilExpected !== null &&
    daysUntilExpected >= 0 &&
    daysUntilExpected <= 3 &&
    !isComplete;

  return {
    isComplete,
    isOverdue,
    isDueSoon,
    daysUntilExpected,
  };
}

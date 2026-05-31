import type { PurchaseOrderRow } from '../procurement/purchase-order-types';
import type { ReorderRecommendationRow } from '../procurement/types';

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatCount(value: number) {
  return value.toLocaleString();
}

export function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'No date';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function getPurchaseOrderValue(purchaseOrder: PurchaseOrderRow) {
  return purchaseOrder.lines.reduce(
    (total, line) => total + toNumber(line.lineTotal),
    0,
  );
}

export function getOpenPurchaseOrders(purchaseOrders: PurchaseOrderRow[]) {
  return purchaseOrders.filter(
    (purchaseOrder) =>
      purchaseOrder.status !== 'received' && purchaseOrder.status !== 'cancelled',
  );
}

export function getReceivablePurchaseOrders(purchaseOrders: PurchaseOrderRow[]) {
  return purchaseOrders.filter(
    (purchaseOrder) =>
      purchaseOrder.status === 'submitted' ||
      purchaseOrder.status === 'partially_received',
  );
}

export function getOverduePurchaseOrders(purchaseOrders: PurchaseOrderRow[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getOpenPurchaseOrders(purchaseOrders).filter((purchaseOrder) => {
    if (!purchaseOrder.expectedAt) return false;
    return new Date(purchaseOrder.expectedAt) < today;
  });
}

export function getOpenRecommendations(
  recommendations: ReorderRecommendationRow[],
) {
  return recommendations.filter(
    (recommendation) => recommendation.status === 'open',
  );
}

export function getCriticalRecommendations(
  recommendations: ReorderRecommendationRow[],
) {
  return getOpenRecommendations(recommendations).filter(
    (recommendation) => toNumber(recommendation.daysUntilStockout) <= 7,
  );
}

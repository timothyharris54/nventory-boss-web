import { apiFetch } from '../../lib/api/client';
import type {
  ReorderRecommendationRow,
  RunReplenishmentRequest,
  RunReplenishmentResponse,
  RecommendationStatus,
  
} from './types';
import type { 
  PurchaseOrderDetail,
  PurchaseOrderRow, 
  ReceivePurchaseOrderDto 
} from './purchase-order-types';

export async function runReplenishment(
  payload: RunReplenishmentRequest,
): Promise<RunReplenishmentResponse> {
  return apiFetch('/planning/replenishment/run', {
    method: 'POST',
    body: payload,
  });
}

export async function getRecommendations(params?: {
  status?: RecommendationStatus;
  take?: number;
}): Promise<ReorderRecommendationRow[]> {
  const search = new URLSearchParams();

  if (params?.status) search.set('status', params.status);
  if (params?.take) search.set('take', String(params.take));

  const query = search.toString();

  return apiFetch(`/planning/recommendations/all/${query ? `?${query}` : ''}`);
}

export async function reviewRecommendation(id: string): Promise<void> {
  return apiFetch(`/planning/recommendations/${id}/review`, {
    method: 'PATCH',
  });
}

export async function dismissRecommendation(id: string): Promise<void> {
  return apiFetch(`/planning/recommendations/${id}/dismiss`, {
    method: 'PATCH',
  });
}

export function convertRecommendationsToPurchaseOrders(payload: {
  recommendationIds: string[];
}): Promise<unknown> {
  return apiFetch('/procurement/recommendations/convert', {
    method: 'POST',
    body: payload,
  });
}

export function getPurchaseOrders(): Promise<PurchaseOrderRow[]> {
  return apiFetch<PurchaseOrderRow[]>('/procurement/purchase-orders');
}

export function submitPurchaseOrder(payload: {
  id: string;
  locationCode: string;
}): Promise<PurchaseOrderRow> {
  return apiFetch<PurchaseOrderRow>(
    `/procurement/purchase-order/${payload.id}/submit`,
    {
      method: 'POST',
      body: {
        locationCode: payload.locationCode,
      },
    },
  );
}

export function getPurchaseOrderById(id: string): Promise<PurchaseOrderDetail> {
  return apiFetch<PurchaseOrderDetail>(`/procurement/purchase-order/${id}`);
}

export function receivePurchaseOrder(
  purchaseOrderId: string,
  body: ReceivePurchaseOrderDto,
) {
  return apiFetch(`/procurement/purchase-order/${purchaseOrderId}/receive`, {
    method: 'POST',
    body,
  });
}

export function cancelPurchaseOrder(purchaseOrderId: string) {
  return apiFetch(
    `/procurement/purchase-order/${purchaseOrderId}/cancel`,
    {
      method: 'POST',
    },
  );
}
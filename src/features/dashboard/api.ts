import { apiFetch } from '../../lib/api/client';

export type SalesRefreshRequest = {
  runReplenishment: boolean;
  dryRunReplenishment: boolean;
  locationCode: string;
  lookbackDays: number;
};

export type SalesRefreshResponse = {
  message?: string;
  summary?: unknown;
  [key: string]: unknown;
};

export function refreshSales(
  payload: SalesRefreshRequest,
): Promise<SalesRefreshResponse> {
  return apiFetch<SalesRefreshResponse>('/accounts/current/sales-refresh', {
    method: 'POST',
    body: payload,
  });
}

import { apiFetch } from '../../lib/api/client';
import type {
  AccountSubscriptionSummary,
  AdminAccountSubscriptionSummary,
  CreateAccountRequest,
  CreatedAccount,
  FeatureOverride,
  SubscriptionAccountList,
  SubscriptionPlan,
  UpsertAccountSubscriptionRequest,
  UpsertFeatureOverrideRequest,
} from './types';

export function createAccount(body: CreateAccountRequest): Promise<CreatedAccount> {
  return apiFetch<CreatedAccount>('/accounts', {
    method: 'POST',
    body,
  });
}

export function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return apiFetch<SubscriptionPlan[]>('/subscription-plans');
}

export function getCurrentSubscription(): Promise<AccountSubscriptionSummary> {
  return apiFetch<AccountSubscriptionSummary>('/accounts/current/subscription');
}

export function getSubscriptionAccounts(params: {
  search?: string;
  skip?: number;
  take?: number;
}): Promise<SubscriptionAccountList> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.skip !== undefined) query.set('skip', String(params.skip));
  if (params.take !== undefined) query.set('take', String(params.take));
  const suffix = query.size ? `?${query.toString()}` : '';
  return apiFetch<SubscriptionAccountList>(`/admin/accounts${suffix}`);
}

export function getAccountSubscription(
  accountId: string,
): Promise<AdminAccountSubscriptionSummary> {
  return apiFetch<AdminAccountSubscriptionSummary>(
    `/admin/accounts/${accountId}/subscription`,
  );
}

export function updateAccountSubscription(
  accountId: string,
  body: UpsertAccountSubscriptionRequest,
): Promise<AdminAccountSubscriptionSummary> {
  return apiFetch<AdminAccountSubscriptionSummary>(
    `/admin/accounts/${accountId}/subscription`,
    { method: 'PUT', body },
  );
}

export function updateFeatureOverride(
  accountId: string,
  featureCode: string,
  body: UpsertFeatureOverrideRequest,
): Promise<FeatureOverride> {
  return apiFetch<FeatureOverride>(
    `/admin/accounts/${accountId}/subscription/features/${encodeURIComponent(featureCode)}`,
    { method: 'PUT', body },
  );
}

export function deleteFeatureOverride(
  accountId: string,
  featureCode: string,
): Promise<void> {
  return apiFetch<void>(
    `/admin/accounts/${accountId}/subscription/features/${encodeURIComponent(featureCode)}`,
    { method: 'DELETE' },
  );
}

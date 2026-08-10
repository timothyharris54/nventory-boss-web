import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createAccount,
  deleteFeatureOverride,
  getAccountSubscription,
  getSubscriptionAccounts,
  getSubscriptionPlans,
  updateAccountSubscription,
  updateFeatureOverride,
} from './api';
import type {
  AdminAccountSubscriptionSummary,
  EffectiveEntitlement,
  FeatureOverride,
  SubscriptionPlan,
  SubscriptionStatus,
} from './types';

const PAGE_SIZE = 25;

function initialAccountForm() {
  return {
    name: '',
    nextPurchaseOrderNumber: '1000',
    initialAdmin: {
      fullName: '',
      email: '',
      password: '',
    },
  };
}

const statuses: Array<{ value: SubscriptionStatus; label: string }> = [
  { value: 'trialing', label: 'Trialing' },
  { value: 'active', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

function dateInputValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function apiDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed.';
}

function statusClasses(status: SubscriptionStatus) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-800';
  if (status === 'trialing') return 'bg-sky-100 text-sky-800';
  if (status === 'past_due') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-200 text-slate-700';
}

type SubscriptionFormState = {
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: string;
  currentPeriodStartsAt: string;
  currentPeriodEndsAt: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string;
};

function initialSubscriptionForm(
  detail: AdminAccountSubscriptionSummary,
): SubscriptionFormState {
  const subscription = detail.subscription;
  return {
    planCode: subscription?.plan.code ?? '',
    status: subscription?.status ?? 'trialing',
    trialEndsAt: dateInputValue(subscription?.trialEndsAt),
    currentPeriodStartsAt: dateInputValue(subscription?.currentPeriodStartsAt),
    currentPeriodEndsAt: dateInputValue(subscription?.currentPeriodEndsAt),
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    cancelledAt: dateInputValue(subscription?.cancelledAt),
  };
}

type OverrideFormState = {
  enabled: boolean;
  limit: string;
  reason: string;
  expiresAt: string;
};

function initialOverrideForm(
  entitlement: EffectiveEntitlement,
  override?: FeatureOverride,
): OverrideFormState {
  return {
    enabled: override?.enabled ?? entitlement.enabled,
    limit: (override?.limit ?? entitlement.limit)?.toString() ?? '',
    reason: override?.reason ?? '',
    expiresAt: dateInputValue(override?.expiresAt),
  };
}

function SubscriptionEditor({
  detail,
  plans,
}: {
  detail: AdminAccountSubscriptionSummary;
  plans: SubscriptionPlan[];
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => initialSubscriptionForm(detail));
  const [editingFeatureCode, setEditingFeatureCode] = useState<string | null>(
    null,
  );
  const [overrideForm, setOverrideForm] = useState<OverrideFormState | null>(
    null,
  );

  const detailKey = ['admin', 'accounts', detail.account.id, 'subscription'];
  const selectedPlan = plans.find((plan) => plan.code === form.planCode);
  const isActivePlanSelected = Boolean(selectedPlan);
  const planByFeature = new Map(
    selectedPlan?.entitlements.map((item) => [item.code, item]) ?? [],
  );

  const saveSubscription = useMutation({
    mutationFn: () =>
      updateAccountSubscription(detail.account.id, {
        planCode: form.planCode,
        status: form.status,
        trialEndsAt: apiDate(form.trialEndsAt),
        currentPeriodStartsAt: apiDate(form.currentPeriodStartsAt),
        currentPeriodEndsAt: apiDate(form.currentPeriodEndsAt),
        cancelAtPeriodEnd: form.cancelAtPeriodEnd,
        cancelledAt: apiDate(form.cancelledAt),
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(detailKey, updated);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] });
      toast.success('Subscription updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const saveOverride = useMutation({
    mutationFn: ({ featureCode }: { featureCode: string }) => {
      if (!overrideForm) throw new Error('Override details are missing.');
      const parsedLimit = overrideForm.limit.trim()
        ? Number(overrideForm.limit)
        : null;
      if (
        parsedLimit !== null &&
        (!Number.isInteger(parsedLimit) || parsedLimit < 0)
      ) {
        throw new Error('Limit must be a whole number of zero or greater.');
      }
      return updateFeatureOverride(detail.account.id, featureCode, {
        enabled: overrideForm.enabled,
        limit: parsedLimit,
        reason: overrideForm.reason.trim() || null,
        expiresAt: apiDate(overrideForm.expiresAt),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] }),
      ]);
      setEditingFeatureCode(null);
      setOverrideForm(null);
      toast.success('Feature override saved.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const removeOverride = useMutation({
    mutationFn: (featureCode: string) =>
      deleteFeatureOverride(detail.account.id, featureCode),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: detailKey }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] }),
      ]);
      setEditingFeatureCode(null);
      setOverrideForm(null);
      toast.success('Feature override removed.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  function submitSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.planCode) {
      toast.error('Select a subscription plan.');
      return;
    }
    saveSubscription.mutate();
  }

  function openOverride(entitlement: EffectiveEntitlement) {
    const existing = detail.featureOverrides.find(
      (item) => item.feature.code === entitlement.code,
    );
    setEditingFeatureCode(entitlement.code);
    setOverrideForm(initialOverrideForm(entitlement, existing));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Account #{detail.account.id}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            {detail.account.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(detail.subscription?.status ?? 'expired')}`}
          >
            {detail.subscription?.status.replaceAll('_', ' ') ?? 'Unassigned'}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {detail.entitled ? 'Access enabled' : 'Access disabled'}
          </span>
        </div>
      </div>

      <form
        onSubmit={submitSubscription}
        className="rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Manual subscription</h3>
          <p className="mt-1 text-sm text-slate-500">
            Saving replaces provider linkage with a manual plan assignment.
          </p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Plan
            <select
              value={form.planCode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  planCode: event.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            >
              <option value="">Select a plan</option>
              {form.planCode && !isActivePlanSelected ? (
                <option value={form.planCode} disabled>
                  {detail.subscription?.plan.displayName ?? form.planCode}{' '}
                  (current legacy plan)
                </option>
              ) : null}
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as SubscriptionStatus,
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">Billing provider</p>
            <p className="mt-1 text-slate-500">
              {detail.subscription?.billingProvider ?? 'Not assigned'} → manual
            </p>
          </div>
          <DateField
            label="Trial ends"
            value={form.trialEndsAt}
            onChange={(trialEndsAt) =>
              setForm((current) => ({ ...current, trialEndsAt }))
            }
          />
          <DateField
            label="Period starts"
            value={form.currentPeriodStartsAt}
            onChange={(currentPeriodStartsAt) =>
              setForm((current) => ({ ...current, currentPeriodStartsAt }))
            }
          />
          <DateField
            label="Period ends"
            value={form.currentPeriodEndsAt}
            onChange={(currentPeriodEndsAt) =>
              setForm((current) => ({ ...current, currentPeriodEndsAt }))
            }
          />
          {form.status === 'cancelled' ? (
            <DateField
              label="Cancelled on"
              value={form.cancelledAt}
              onChange={(cancelledAt) =>
                setForm((current) => ({ ...current, cancelledAt }))
              }
            />
          ) : null}
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm md:col-span-2 xl:col-span-1">
            <input
              type="checkbox"
              checked={form.cancelAtPeriodEnd}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  cancelAtPeriodEnd: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            Cancel at period end
          </label>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <button
            type="submit"
            disabled={saveSubscription.isPending || !isActivePlanSelected}
            title={
              isActivePlanSelected
                ? undefined
                : 'Select an active subscription plan before saving.'
            }
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {saveSubscription.isPending ? 'Saving…' : 'Save Subscription'}
          </button>
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Feature entitlements</h3>
          <p className="mt-1 text-sm text-slate-500">
            Effective access combines the selected plan with account overrides.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {detail.entitlements.map((entitlement) => {
            const override = detail.featureOverrides.find(
              (item) => item.feature.code === entitlement.code,
            );
            const planEntitlement = planByFeature.get(entitlement.code);
            const isEditing = editingFeatureCode === entitlement.code;

            return (
              <div key={entitlement.code} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {entitlement.displayName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Plan:{' '}
                      {selectedPlan
                        ? planEntitlement?.enabled
                          ? 'enabled'
                          : 'disabled'
                        : 'current legacy assignment'}
                      {planEntitlement?.limit !== null &&
                      planEntitlement?.limit !== undefined
                        ? ` · limit ${planEntitlement.limit}`
                        : ''}
                      {override ? ' · override active' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        entitlement.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {entitlement.enabled ? 'Enabled' : 'Disabled'}
                      {entitlement.limit !== null
                        ? ` · ${entitlement.limit.toLocaleString()}`
                        : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => openOverride(entitlement)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {override ? 'Edit override' : 'Add override'}
                    </button>
                  </div>
                </div>

                {isEditing && overrideForm ? (
                  <div className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={overrideForm.enabled}
                        onChange={(event) =>
                          setOverrideForm((current) =>
                            current
                              ? { ...current, enabled: event.target.checked }
                              : current,
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Feature enabled
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Limit
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={overrideForm.limit}
                        onChange={(event) =>
                          setOverrideForm((current) =>
                            current
                              ? { ...current, limit: event.target.value }
                              : current,
                          )
                        }
                        placeholder="Unlimited"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      Expires
                      <input
                        type="date"
                        value={overrideForm.expiresAt}
                        onChange={(event) =>
                          setOverrideForm((current) =>
                            current
                              ? { ...current, expiresAt: event.target.value }
                              : current,
                          )
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700 md:col-span-2">
                      Reason
                      <input
                        maxLength={500}
                        value={overrideForm.reason}
                        onChange={(event) =>
                          setOverrideForm((current) =>
                            current
                              ? { ...current, reason: event.target.value }
                              : current,
                          )
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                      />
                    </label>
                    <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                      {override ? (
                        <button
                          type="button"
                          disabled={removeOverride.isPending}
                          onClick={() =>
                            removeOverride.mutate(entitlement.code)
                          }
                          className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Remove override
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFeatureCode(null);
                          setOverrideForm(null);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saveOverride.isPending}
                        onClick={() =>
                          saveOverride.mutate({ featureCode: entitlement.code })
                        }
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        Save override
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
      />
    </label>
  );
}

export default function SubscriptionMaintenancePage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [accountForm, setAccountForm] = useState(initialAccountForm);

  const createAccountMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: async (account) => {
      setSearch('');
      setSearchInput('');
      setSkip(0);
      setSelectedId(account.id);
      setIsCreateOpen(false);
      setAccountForm(initialAccountForm());
      await queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] });
      toast.success('Account created. You can now assign its subscription.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const plansQuery = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: getSubscriptionPlans,
  });
  const accountsQuery = useQuery({
    queryKey: ['admin', 'accounts', { search, skip, take: PAGE_SIZE }],
    queryFn: () => getSubscriptionAccounts({ search, skip, take: PAGE_SIZE }),
  });
  const effectiveSelectedId =
    selectedId &&
    accountsQuery.data?.items.some((item) => item.id === selectedId)
      ? selectedId
      : (accountsQuery.data?.items[0]?.id ?? null);
  const detailQuery = useQuery({
    queryKey: ['admin', 'accounts', effectiveSelectedId, 'subscription'],
    queryFn: () => getAccountSubscription(effectiveSelectedId!),
    enabled: Boolean(effectiveSelectedId),
  });

  const total = accountsQuery.data?.total ?? 0;
  const pageEnd = Math.min(skip + PAGE_SIZE, total);
  const pageError = plansQuery.error ?? accountsQuery.error;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setSkip(0);
    setSelectedId(null);
  }

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPurchaseOrderNumber = Number(accountForm.nextPurchaseOrderNumber);
    if (!Number.isInteger(nextPurchaseOrderNumber) || nextPurchaseOrderNumber < 0) {
      toast.error('Starting purchase order number must be zero or greater.');
      return;
    }
    createAccountMutation.mutate({
      name: accountForm.name.trim(),
      nextPurchaseOrderNumber,
      initialAdmin: {
        fullName: accountForm.initialAdmin.fullName.trim(),
        email: accountForm.initialAdmin.email.trim(),
        password: accountForm.initialAdmin.password,
      },
    });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Admin Tools
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Subscription Maintenance
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create accounts, assign plans, and maintain feature-specific exceptions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add Account
        </button>
      </div>

      {pageError ? (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {errorMessage(pageError)}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="self-start rounded-xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6">
          <div className="border-b border-slate-200 p-4">
            <form onSubmit={submitSearch} className="flex gap-2">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search accounts"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Search
              </button>
            </form>
          </div>

          <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {accountsQuery.isLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading accounts…</p>
            ) : null}
            {accountsQuery.data?.items.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedId(account.id)}
                className={`w-full px-4 py-3 text-left transition ${
                  effectiveSelectedId === account.id
                    ? 'bg-slate-900 text-white'
                    : 'hover:bg-slate-50'
                }`}
              >
                <span className="block truncate text-sm font-semibold">
                  {account.name}
                </span>
                <span
                  className={`mt-1 block text-xs ${
                    effectiveSelectedId === account.id
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}
                >
                  {account.subscription?.plan.displayName ?? 'No plan'} ·{' '}
                  {account.featureOverrideCount} override
                  {account.featureOverrideCount === 1 ? '' : 's'}
                </span>
              </button>
            ))}
            {!accountsQuery.isLoading && !accountsQuery.data?.items.length ? (
              <p className="p-4 text-sm text-slate-500">No accounts found.</p>
            ) : null}
          </div>

          {total > PAGE_SIZE ? (
            <div className="flex items-center justify-between border-t border-slate-200 p-3 text-xs text-slate-500">
              <button
                type="button"
                disabled={skip === 0}
                onClick={() => {
                  setSkip(Math.max(0, skip - PAGE_SIZE));
                  setSelectedId(null);
                }}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                {skip + 1}–{pageEnd} of {total}
              </span>
              <button
                type="button"
                disabled={pageEnd >= total}
                onClick={() => {
                  setSkip(skip + PAGE_SIZE);
                  setSelectedId(null);
                }}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </aside>

        <main className="min-w-0">
          {detailQuery.isLoading || plansQuery.isLoading ? (
            <div className="h-96 animate-pulse rounded-xl bg-slate-200" />
          ) : null}
          {detailQuery.error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {errorMessage(detailQuery.error)}
            </div>
          ) : null}
          {detailQuery.data && plansQuery.data ? (
            <SubscriptionEditor
              key={detailQuery.data.account.id}
              detail={detailQuery.data}
              plans={plansQuery.data}
            />
          ) : null}
          {!effectiveSelectedId && !accountsQuery.isLoading ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
              Select an account to maintain its subscription.
            </div>
          ) : null}
        </main>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <button
            type="button"
            aria-label="Close account form"
            className="absolute inset-0"
            onClick={() => setIsCreateOpen(false)}
          />
          <form
            onSubmit={submitAccount}
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Add Account</h2>
              <p className="mt-1 text-sm text-slate-600">
                Create an organization, then assign its subscription.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-sm font-medium text-slate-700">
                Organization name
                <input
                  required
                  autoFocus
                  value={accountForm.name}
                  onChange={(event) =>
                    setAccountForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Starting purchase order number
                <input
                  required
                  min="0"
                  step="1"
                  type="number"
                  value={accountForm.nextPurchaseOrderNumber}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      nextPurchaseOrderNumber: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
                <span className="mt-1 block text-xs text-slate-500">
                  New purchase orders for this account begin with this number.
                </span>
              </label>
            </div>
            <div className="space-y-4 p-5">
              <h3>Create Initial Admin User</h3>
              <label className="block text-sm font-medium text-slate-700">
                User Full Name
                <input
                  required
                  type="text"
                  autoComplete="name"
                  value={accountForm.initialAdmin.fullName}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      initialAdmin: {
                        ...current.initialAdmin,
                        fullName: event.target.value,
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                User Email Address
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={accountForm.initialAdmin.email}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      initialAdmin: {
                        ...current.initialAdmin,
                        email: event.target.value,
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Temporary Password
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={accountForm.initialAdmin.password}
                  onChange={(event) =>
                    setAccountForm((current) => ({
                      ...current,
                      initialAdmin: {
                        ...current.initialAdmin,
                        password: event.target.value,
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAccountMutation.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {createAccountMutation.isPending ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

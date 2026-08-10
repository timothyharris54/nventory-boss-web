import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getEcommerceConnections } from '../setup/api';
import type { SalesRefreshResponse } from './api';
import { refreshSales } from './api';

const DEFAULT_SALES_REFRESH_PAYLOAD = {
  runReplenishment: true,
  dryRunReplenishment: false,
  locationCode: 'MAIN',
  lookbackDays: 120,
};

const REFRESHED_QUERY_KEYS = [
  ['products'],
  ['sales-orders'],
  ['recommendations'],
  ['replenishment-open'],
  ['purchase-orders'],
  ['inventory-balances'],
  ['inventory-ledger'],
  ['inventory-reservations'],
];

type RefreshFeedback = {
  tone: 'success' | 'warning' | 'error';
  message: string;
};

const feedbackClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to synchronize channel data.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeKey(key: string) {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function findNumberByKey(source: unknown, keys: string[]) {
  const normalizedKeys = new Set(keys.map(normalizeKey));
  const queue: unknown[] = [source];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!isRecord(current)) continue;

    for (const [key, value] of Object.entries(current)) {
      if (normalizedKeys.has(normalizeKey(key))) {
        const count = toFiniteNumber(value);
        if (count !== null) return count;
      }

      if (isRecord(value)) queue.push(value);
    }
  }

  return null;
}

function formatCount(count: number, singularLabel: string, pluralLabel: string) {
  const label = count === 1 ? singularLabel : pluralLabel;
  return `${count.toLocaleString()} ${label}`;
}

function getSalesRefreshResultMessage(
  response: SalesRefreshResponse,
  channelName: string,
) {
  const source = response.summary ?? response;
  const orderCount = findNumberByKey(source, [
    'ordersProcessed',
    'salesOrdersProcessed',
    'salesOrderCount',
    'ordersImported',
    'importedOrders',
    'orderCount',
  ]);
  const recommendationCount = findNumberByKey(source, [
    'recommendationsCreated',
    'createdRecommendations',
    'recommendationCount',
    'recommendations',
  ]);
  const purchaseOrderCount = findNumberByKey(source, [
    'purchaseOrdersCreated',
    'createdPurchaseOrders',
    'purchaseOrderCount',
    'purchaseOrders',
  ]);

  const counts = [
    orderCount !== null
      ? formatCount(orderCount, 'sales order processed', 'sales orders processed')
      : null,
    recommendationCount !== null
      ? formatCount(
          recommendationCount,
          'recommendation updated',
          'recommendations updated',
        )
      : null,
    purchaseOrderCount !== null
      ? formatCount(
          purchaseOrderCount,
          'purchase order affected',
          'purchase orders affected',
        )
      : null,
  ].filter(Boolean);

  if (counts.length > 0) {
    return `${channelName} synchronization complete: ${counts.join(', ')}.`;
  }
  return (
    response.message ??
    `${channelName} products and orders synchronized and replenishment updated.`
  );
}

export function SalesRefreshPanel() {
  const queryClient = useQueryClient();
  const [refreshFeedback, setRefreshFeedback] =
    useState<RefreshFeedback | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectionsQuery = useQuery({
    queryKey: ['ecommerce-connections'],
    queryFn: getEcommerceConnections,
  });
  const configuredChannels = (connectionsQuery.data ?? []).filter(
    (connection) => connection.isActive,
  );
  const selectedChannel = configuredChannels.find(
    (connection) => connection.id === selectedConnectionId,
  );

  const refreshMutation = useMutation({
    mutationFn: (connectionId: string) => {
      const connection = configuredChannels.find((item) => item.id === connectionId);
      return refreshSales({
        ...DEFAULT_SALES_REFRESH_PAYLOAD,
        connectionId,
        locationCode: connection?.defaultLocationCode || 'MAIN',
      });
    },
    onMutate: () => {
      setRefreshFeedback(null);
      setElapsedSeconds(0);
    },
    onSuccess: async (response) => {
      const results = await Promise.allSettled(
        REFRESHED_QUERY_KEYS.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }, { throwOnError: true }),
        ),
      );
      const channelName = selectedChannel?.displayName ?? 'Channel';
      const message = getSalesRefreshResultMessage(response, channelName);
      const failedReloadCount = results.filter(
        (result) => result.status === 'rejected',
      ).length;

      if (failedReloadCount > 0) {
        const warningMessage =
          failedReloadCount === 1
            ? `${message} One dashboard section failed to reload, so the dashboard may be out of date.`
            : `${message} ${failedReloadCount} dashboard sections failed to reload, so the dashboard may be out of date.`;

        setRefreshFeedback({
          tone: 'warning',
          message: warningMessage,
        });
        toast.warning(
          `${channelName} synchronized, but dashboard data did not fully reload.`,
          {
            closeButton: true,
            duration: Infinity,
          },
        );
        return;
      }

      setRefreshFeedback({
        tone: 'success',
        message,
      });
      toast.success(message, {
        closeButton: true,
        duration: Infinity,
      });
    },
    onError: (error) => {
      const message = getErrorMessage(error);

      setRefreshFeedback({
        tone: 'error',
        message,
      });
      toast.error(message, {
        closeButton: true,
        duration: Infinity,
      });
    },
    onSettled: () => setSelectedConnectionId(''),
  });

  useEffect(() => {
    if (!refreshMutation.isPending) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshMutation.isPending]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Channel Synchronization</h2>
          <p className="mt-1 text-sm text-slate-600">
            Select a configured channel to pull its latest products and orders,
            rebuild demand history, and update replenishment.
          </p>
        </div>

        <label className="text-sm font-semibold text-slate-700">
          <span className="sr-only">Synchronize channel</span>
          <select
            aria-label="Select a channel to synchronize"
            value={selectedConnectionId}
            disabled={refreshMutation.isPending || connectionsQuery.isLoading}
            onChange={(event) => {
              const connectionId = event.target.value;
              if (!connectionId) return;
              setSelectedConnectionId(connectionId);
              refreshMutation.mutate(connectionId);
            }}
            className="min-h-10 min-w-56 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="">
              {connectionsQuery.isLoading
                ? 'Loading channels…'
                : configuredChannels.length
                  ? 'Synchronize a channel…'
                  : 'No active channels configured'}
            </option>
            {configuredChannels.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.displayName} ({connection.provider})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Uses the channel's default location (or MAIN) and a 120-day lookback.
      </p>
      {connectionsQuery.error ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Unable to load configured channels: {getErrorMessage(connectionsQuery.error)}
        </p>
      ) : null}
      {refreshMutation.isPending ? (
        <div className="mt-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-slate-800">
          <p className="font-medium text-sky-900">
            Synchronizing {selectedChannel?.displayName ?? 'channel'} products,
            orders, and dashboard data...
          </p>
          <p className="mt-1 text-xs text-slate-600">
            This may take up to a minute. Elapsed: {elapsedSeconds}s.
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-full animate-pulse rounded-full bg-sky-500/80" />
          </div>
        </div>
      ) : null}
      {refreshFeedback ? (
        <p
          className={[
            'mt-2 rounded-md border px-3 py-2 text-sm',
            feedbackClasses[refreshFeedback.tone],
          ].join(' ')}
        >
          {refreshFeedback.message}
        </p>
      ) : null}
    </div>
  );
}

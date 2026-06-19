import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createEcommerceConnection,
  getEcommerceConnections,
  testWoocommerceConnection,
  updateEcommerceConnection,
} from './api';
import type {
  CreateEcommerceConnectionRequest,
  EcommerceAuthType,
  EcommerceConnection,
  EcommerceConnectionStatus,
  EcommerceConnectionTestResponse,
  EcommerceProvider,
} from './ecommerce-connection-types';

type FieldType = 'text' | 'password' | 'url' | 'select';

type FieldOption = {
  value: string;
  label: string;
};

type ConfigField = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
};

type ProviderConfig = {
  provider: EcommerceProvider;
  label: string;
  channelKey: string;
  authType: EcommerceAuthType;
  storeUrlLabel: string;
  externalStoreIdLabel: string;
  credentialFields: ConfigField[];
  settingFields: ConfigField[];
};

type ConnectionFormMode = 'create' | 'edit';

type ConnectionFormState = {
  provider: EcommerceProvider;
  channelKey: string;
  displayName: string;
  storeUrl: string;
  externalStoreId: string;
  authType: EcommerceAuthType;
  defaultLocationCode: string;
  currencyCode: string;
  isActive: boolean;
  credentials: Record<string, string>;
  settings: Record<string, string | boolean>;
};

const syncModeOptions: FieldOption[] = [
  { value: 'orders_and_inventory', label: 'Orders and inventory' },
  { value: 'orders_only', label: 'Orders only' },
  { value: 'inventory_only', label: 'Inventory only' },
];

const providerConfigs: ProviderConfig[] = [
  {
    provider: 'shopify',
    label: 'Shopify',
    channelKey: 'shopify',
    authType: 'api_key',
    storeUrlLabel: 'Shop domain',
    externalStoreIdLabel: 'Shop ID',
    credentialFields: [
      {
        key: 'accessToken',
        label: 'Admin API access token',
        type: 'password',
        required: true,
      },
      {
        key: 'webhookSecret',
        label: 'Webhook secret',
        type: 'password',
      },
    ],
    settingFields: [
      {
        key: 'apiVersion',
        label: 'API version',
        placeholder: '2026-01',
      },
      {
        key: 'syncMode',
        label: 'Sync mode',
        type: 'select',
        options: syncModeOptions,
      },
    ],
  },
  {
    provider: 'woocommerce',
    label: 'WooCommerce',
    channelKey: 'woocommerce',
    authType: 'api_key',
    storeUrlLabel: 'Store URL',
    externalStoreIdLabel: 'Store ID',
    credentialFields: [
      {
        key: 'consumerKey',
        label: 'Consumer key',
        required: true,
      },
      {
        key: 'consumerSecret',
        label: 'Consumer secret',
        type: 'password',
        required: true,
      },
      {
        key: 'webhookSecret',
        label: 'Webhook secret',
        type: 'password',
      },
    ],
    settingFields: [
      {
        key: 'syncMode',
        label: 'Sync mode',
        type: 'select',
        options: syncModeOptions,
      },
    ],
  },
];

const authTypeOptions: FieldOption[] = [
  { value: 'api_key', label: 'API key' },
  { value: 'oauth', label: 'OAuth' },
  { value: 'basic', label: 'Basic auth' },
  { value: 'none', label: 'None' },
];

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Request failed.';

  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(' ');
    if (parsed.message) return parsed.message;
  } catch {
    // Some API responses are plain text.
  }

  return error.message;
}

function getProviderConfig(provider: EcommerceProvider) {
  return (
    providerConfigs.find((config) => config.provider === provider) ??
    providerConfigs[0]
  );
}

function providerLabel(provider: EcommerceProvider) {
  return getProviderConfig(provider).label;
}

function authTypeLabel(authType?: EcommerceAuthType | null) {
  return (
    authTypeOptions.find((option) => option.value === authType)?.label ?? '-'
  );
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function objectFromValues(values: Record<string, string | boolean>) {
  return Object.entries(values).reduce<Record<string, unknown>>(
    (result, [key, value]) => {
      if (typeof value === 'boolean') {
        result[key] = value;
        return result;
      }

      const trimmed = value.trim();
      if (trimmed) result[key] = trimmed;
      return result;
    },
    {},
  );
}

function getConnectionStatus(
  connection: EcommerceConnection,
): EcommerceConnectionStatus {
  if (!connection.isActive) return 'inactive';
  if (connection.lastConnectionStatus === 'failed') {
    return 'needs_configuration';
  }
  if (connection.lastConnectionStatus === 'passed' || connection.hasCredentials) {
    return 'connected';
  }
  return 'needs_configuration';
}

function getStatusStyles(status: EcommerceConnectionStatus) {
  if (status === 'connected') {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }

  if (status === 'needs_configuration') {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }

  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
}

function getStatusLabel(status: EcommerceConnectionStatus) {
  if (status === 'connected') return 'Connected';
  if (status === 'needs_configuration') return 'Needs configuration';
  return 'Inactive';
}

function getConnectionTestMessage(result: EcommerceConnectionTestResponse) {
  if (result.message) return result.message;
  if (typeof result.sampleCount === 'number') {
    return `Connection test passed. Sample products: ${result.sampleCount}.`;
  }

  return result.ok ? 'Connection test passed.' : 'Connection test completed.';
}

function emptyFormForProvider(
  provider: EcommerceProvider = 'shopify',
): ConnectionFormState {
  const config = getProviderConfig(provider);

  return {
    provider,
    channelKey: config.channelKey,
    displayName: config.label,
    storeUrl: '',
    externalStoreId: '',
    authType: config.authType,
    defaultLocationCode: '',
    currencyCode: 'USD',
    isActive: true,
    credentials: {},
    settings: {
      syncOrders: true,
      syncInventory: true,
      syncMode: 'orders_and_inventory',
    },
  };
}

function connectionToForm(
  connection: EcommerceConnection,
): ConnectionFormState {
  const config = getProviderConfig(connection.provider);
  const settings = connection.settings ?? {};

  return {
    provider: connection.provider,
    channelKey: connection.channelKey ?? config.channelKey,
    displayName: connection.displayName,
    storeUrl: connection.storeUrl ?? '',
    externalStoreId: connection.externalStoreId ?? '',
    authType: connection.authType ?? config.authType,
    defaultLocationCode: connection.defaultLocationCode ?? '',
    currencyCode: connection.currencyCode ?? 'USD',
    isActive: connection.isActive,
    credentials: {},
    settings: {
      syncOrders:
        typeof settings.syncOrders === 'boolean' ? settings.syncOrders : true,
      syncInventory:
        typeof settings.syncInventory === 'boolean'
          ? settings.syncInventory
          : true,
      syncMode:
        typeof settings.syncMode === 'string'
          ? settings.syncMode
          : 'orders_and_inventory',
      ...Object.fromEntries(
        Object.entries(settings)
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => [key, value as string]),
      ),
    },
  };
}

function formatDate(value?: string) {
  if (!value) return '-';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function EcommerceConnectionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [formMode, setFormMode] = useState<ConnectionFormMode>('create');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<EcommerceConnection | null>(null);
  const [form, setForm] = useState<ConnectionFormState>(emptyFormForProvider());

  const connectionsQuery = useQuery({
    queryKey: ['ecommerce-connections'],
    queryFn: getEcommerceConnections,
  });

  const filteredConnections = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (connectionsQuery.data ?? [])
      .filter((connection) => showInactive || connection.isActive)
      .filter((connection) => {
        if (!normalizedSearch) return true;

        return [
          connection.displayName,
          providerLabel(connection.provider),
          connection.channelKey ?? '',
          connection.storeUrl ?? '',
          connection.externalStoreId ?? '',
          connection.defaultLocationCode ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [connectionsQuery.data, search, showInactive]);

  const createMutation = useMutation({
    mutationFn: createEcommerceConnection,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['ecommerce-connections'],
      });
      toast.success('Ecommerce connection created.');
      closeForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      connectionId,
      body,
    }: {
      connectionId: string;
      body: CreateEcommerceConnectionRequest;
    }) => updateEcommerceConnection(connectionId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['ecommerce-connections'],
      });
      toast.success('Ecommerce connection updated.');
      closeForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const testMutation = useMutation({
    mutationFn: testWoocommerceConnection,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: ['ecommerce-connections'],
      });
      toast.success(getConnectionTestMessage(result));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const activeCount = (connectionsQuery.data ?? []).filter(
    (connection) => connection.isActive,
  ).length;
  const configuredCount = (connectionsQuery.data ?? []).filter(
    (connection) => getConnectionStatus(connection) === 'connected',
  ).length;
  const needsConfigurationCount = (connectionsQuery.data ?? []).filter(
    (connection) => getConnectionStatus(connection) === 'needs_configuration',
  ).length;
  const selectedConfig = getProviderConfig(form.provider);

  function buildPayload(input: ConnectionFormState) {
    const credentials = objectFromValues(input.credentials);
    const settings = objectFromValues(input.settings);

    return {
      provider: input.provider,
      channelKey: optionalString(input.channelKey),
      displayName: input.displayName.trim(),
      storeUrl: optionalString(input.storeUrl),
      externalStoreId: optionalString(input.externalStoreId),
      authType: input.authType,
      credentials:
        Object.keys(credentials).length > 0 ? credentials : undefined,
      settings: Object.keys(settings).length > 0 ? settings : undefined,
      defaultLocationCode: optionalString(input.defaultLocationCode),
      currencyCode: optionalString(input.currencyCode.toUpperCase()),
      isActive: input.isActive,
    };
  }

  function openCreateForm(provider?: EcommerceProvider) {
    setFormMode('create');
    setEditingConnection(null);
    setForm(emptyFormForProvider(provider));
    setIsFormOpen(true);
  }

  function openEditForm(connection: EcommerceConnection) {
    setFormMode('edit');
    setEditingConnection(connection);
    setForm(connectionToForm(connection));
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingConnection(null);
    setForm(emptyFormForProvider());
    createMutation.reset();
    updateMutation.reset();
  }

  function updateProvider(provider: EcommerceProvider) {
    setForm((current) => ({
      ...emptyFormForProvider(provider),
      displayName:
        current.displayName === providerLabel(current.provider)
          ? providerLabel(provider)
          : current.displayName,
      currencyCode: current.currencyCode,
      defaultLocationCode: current.defaultLocationCode,
      isActive: current.isActive,
    }));
  }

  function updateCredential(key: string, value: string) {
    setForm((current) => ({
      ...current,
      credentials: {
        ...current.credentials,
        [key]: value,
      },
    }));
  }

  function updateSetting(key: string, value: string | boolean) {
    setForm((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value,
      },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildPayload(form);
    if (!payload.displayName) {
      toast.error('Display name is required.');
      return;
    }

    if (payload.currencyCode && payload.currencyCode.length !== 3) {
      toast.error('Currency code must be 3 characters.');
      return;
    }

    const missingFields = selectedConfig.credentialFields.filter((field) => {
      if (!field.required) return false;
      if (formMode === 'edit') return false;
      return !form.credentials[field.key]?.trim();
    });

    if (missingFields.length > 0) {
      toast.error(`${missingFields[0].label} is required.`);
      return;
    }

    if (formMode === 'create') {
      createMutation.mutate(payload);
      return;
    }

    if (!editingConnection) return;
    updateMutation.mutate({
      connectionId: editingConnection.id,
      body: payload,
    });
  }

  function renderTextField(field: ConfigField) {
    return (
      <div key={field.key}>
        <label
          htmlFor={`credential-${field.key}`}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {field.label}
        </label>
        <input
          id={`credential-${field.key}`}
          type={field.type ?? 'text'}
          value={form.credentials[field.key] ?? ''}
          onChange={(event) => updateCredential(field.key, event.target.value)}
          placeholder={
            formMode === 'edit' && field.type === 'password'
              ? 'Leave blank to keep current value'
              : field.placeholder
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          required={formMode === 'create' && field.required}
        />
      </div>
    );
  }

  function renderSettingField(field: ConfigField) {
    const value = form.settings[field.key];

    if (field.type === 'select') {
      return (
        <div key={field.key}>
          <label
            htmlFor={`setting-${field.key}`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {field.label}
          </label>
          <select
            id={`setting-${field.key}`}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => updateSetting(field.key, event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="">Use default</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label
          htmlFor={`setting-${field.key}`}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {field.label}
        </label>
        <input
          id={`setting-${field.key}`}
          type={field.type ?? 'text'}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => updateSetting(field.key, event.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Ecommerce Channel Setup
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure marketplace and storefront connections for order and
            inventory communication.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateForm()}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Connection
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Connections
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {connectionsQuery.data?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Active
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {activeCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Connected
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {configuredCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">
            Needs setup
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {needsConfigurationCount}
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="connectionSearch" className="sr-only">
            Search ecommerce connections
          </label>
          <input
            id="connectionSearch"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by channel, provider, store, location, or ID"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex items-center rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Show inactive
          </label>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {providerConfigs.slice(0, 4).map((config) => (
          <button
            key={config.provider}
            type="button"
            onClick={() => openCreateForm(config.provider)}
            className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            <span className="block text-sm font-semibold text-slate-900">
              {config.label}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {authTypeLabel(config.authType)}
            </span>
          </button>
        ))}
      </div>

      {connectionsQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading ecommerce connections...
        </div>
      ) : null}

      {connectionsQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(connectionsQuery.error)}
        </div>
      ) : null}

      {!connectionsQuery.isLoading && !connectionsQuery.isError ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Channel</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Store</th>
                  <th className="px-4 py-3 font-semibold">Defaults</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredConnections.map((connection) => {
                  const status = getConnectionStatus(connection);
                  return (
                    <tr
                      key={connection.id}
                      className="border-t border-slate-200 align-top"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {connection.displayName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {connection.channelKey || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {providerLabel(connection.provider)}
                        <p className="mt-1 text-xs text-slate-500">
                          {authTypeLabel(connection.authType)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{connection.storeUrl || '-'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {connection.externalStoreId || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>{connection.defaultLocationCode || '-'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {connection.currencyCode || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                            getStatusStyles(status),
                          ].join(' ')}
                        >
                          {getStatusLabel(status)}
                        </span>
                        {connection.lastConnectionTestedAt ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Tested {formatDate(connection.lastConnectionTestedAt)}
                          </p>
                        ) : null}
                        {connection.lastConnectionError ? (
                          <p className="mt-1 max-w-48 text-xs text-red-600">
                            {connection.lastConnectionError}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(connection.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(connection)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => testMutation.mutate()}
                            disabled={
                              connection.provider !== 'woocommerce' ||
                              !connection.isActive ||
                              testMutation.isPending
                            }
                            className="rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Test
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredConnections.length === 0 ? (
            <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
              No ecommerce connections match the current filters.
            </div>
          ) : null}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button
            type="button"
            aria-label="Close ecommerce connection form"
            className="absolute inset-0"
            onClick={closeForm}
          />
          <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-xl">
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {formMode === 'create'
                    ? 'Add Ecommerce Connection'
                    : 'Edit Ecommerce Connection'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedConfig.label} communication settings
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-4">
                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Channel
                  </h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="provider"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Provider
                      </label>
                      <select
                        id="provider"
                        value={form.provider}
                        onChange={(event) =>
                          updateProvider(
                            event.target.value as EcommerceProvider,
                          )
                        }
                        disabled={formMode === 'edit'}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                      >
                        {providerConfigs.map((config) => (
                          <option key={config.provider} value={config.provider}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="authType"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Auth type
                      </label>
                      <select
                        id="authType"
                        value={form.authType}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            authType: event.target.value as EcommerceAuthType,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      >
                        {authTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="displayName"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Display name
                      </label>
                      <input
                        id="displayName"
                        type="text"
                        value={form.displayName}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            displayName: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                        required
                        maxLength={255}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="channelKey"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Channel key
                      </label>
                      <input
                        id="channelKey"
                        type="text"
                        value={form.channelKey}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            channelKey: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                        maxLength={100}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Store
                  </h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="storeUrl"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        {selectedConfig.storeUrlLabel}
                      </label>
                      <input
                        id="storeUrl"
                        type="url"
                        value={form.storeUrl}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            storeUrl: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                        maxLength={2048}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="externalStoreId"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        {selectedConfig.externalStoreIdLabel}
                      </label>
                      <input
                        id="externalStoreId"
                        type="text"
                        value={form.externalStoreId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            externalStoreId: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                        maxLength={255}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Credentials
                  </h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {selectedConfig.credentialFields.map(renderTextField)}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Sync Settings
                  </h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {selectedConfig.settingFields.map(renderSettingField)}
                    <div>
                      <label
                        htmlFor="defaultLocationCode"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Default location code
                      </label>
                      <input
                        id="defaultLocationCode"
                        type="text"
                        value={form.defaultLocationCode}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            defaultLocationCode: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-slate-500"
                        maxLength={50}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="currencyCode"
                        className="mb-1 block text-sm font-medium text-slate-700"
                      >
                        Currency code
                      </label>
                      <input
                        id="currencyCode"
                        type="text"
                        value={form.currencyCode}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            currencyCode: event.target.value.toUpperCase(),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-slate-500"
                        maxLength={3}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(form.settings.syncOrders)}
                        onChange={(event) =>
                          updateSetting('syncOrders', event.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Sync orders
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(form.settings.syncInventory)}
                        onChange={(event) =>
                          updateSetting('syncInventory', event.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Sync inventory
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            isActive: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Active connection
                    </label>
                  </div>
                </section>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'Save Connection'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

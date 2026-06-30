import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createUser,
  disableUser,
  getUserRoles,
  getUsers,
  updateUser,
} from './api';
import type {
  UserMaintenanceItem,
  UserRole,
  UserRoleCode,
} from './user-types';

type UserFormMode = 'create' | 'edit';

type UserFormState = {
  email: string;
  fullName: string;
  temporaryPassword: string;
  isActive: boolean;
  roleCodes: UserRoleCode[];
};

const emptyForm: UserFormState = {
  email: '',
  fullName: '',
  temporaryPassword: '',
  isActive: true,
  roleCodes: [],
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Request failed.';

  try {
    const parsed = JSON.parse(error.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join(' ');
    if (parsed.message) return parsed.message;
  } catch {
    // The API client returns plain text for some failures.
  }

  return error.message;
}

function roleLabel(role: UserRole) {
  return role.displayName || role.code.replaceAll('_', ' ');
}

function getSelectedRoleCountLabel(count: number) {
  if (count === 1) return '1 role selected';
  return `${count} roles selected`;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [formMode, setFormMode] = useState<UserFormMode>('create');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserMaintenanceItem | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [disableTarget, setDisableTarget] = useState<UserMaintenanceItem | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const rolesQuery = useQuery({
    queryKey: ['users', 'roles'],
    queryFn: getUserRoles,
  });

  const roles = useMemo(
    () => [...(rolesQuery.data ?? [])].sort((a, b) => roleLabel(a).localeCompare(roleLabel(b))),
    [rolesQuery.data],
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (usersQuery.data ?? [])
      .filter((user) => showInactive || user.isActive)
      .filter((user) => {
        if (!normalizedSearch) return true;

        const roleText = user.roles.map(roleLabel).join(' ');
        return [user.email, user.fullName ?? '', roleText]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
      });
  }, [search, showInactive, usersQuery.data]);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created.');
      closeForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UserFormState }) =>
      updateUser(userId, {
        email: body.email,
        fullName: body.fullName.trim() || null,
        isActive: body.isActive,
        roleCodes: body.roleCodes,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated.');
      closeForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const disableMutation = useMutation({
    mutationFn: disableUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User disabled.');
      setDisableTarget(null);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreateForm() {
    setFormMode('create');
    setEditingUser(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEditForm(user: UserMaintenanceItem) {
    setFormMode('edit');
    setEditingUser(user);
    setForm({
      email: user.email,
      fullName: user.fullName ?? '',
      temporaryPassword: '',
      isActive: user.isActive,
      roleCodes: user.roles.map((role) => role.code),
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
    createMutation.reset();
    updateMutation.reset();
  }

  function toggleRole(roleCode: UserRoleCode) {
    setForm((current) => {
      const isSelected = current.roleCodes.includes(roleCode);
      return {
        ...current,
        roleCodes: isSelected
          ? current.roleCodes.filter((code) => code !== roleCode)
          : [...current.roleCodes, roleCode],
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: UserFormState = {
      ...form,
      email: form.email.trim(),
      fullName: form.fullName.trim(),
    };

    if (payload.roleCodes.length === 0) {
      toast.error('Select at least one role.');
      return;
    }

    if (formMode === 'create') {
      createMutation.mutate({
        email: payload.email,
        fullName: payload.fullName || undefined,
        temporaryPassword: payload.temporaryPassword,
        isActive: payload.isActive,
        roleCodes: payload.roleCodes,
      });
      return;
    }

    if (!editingUser) return;

    updateMutation.mutate({ userId: editingUser.id, body: payload });
  }

  const activeCount = (usersQuery.data ?? []).filter((user) => user.isActive).length;
  const inactiveCount = (usersQuery.data ?? []).length - activeCount;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Maintenance</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage account users, active status, and role access.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Create User
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Total users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{usersQuery.data?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-500">Inactive</p>
          <p className="mt-1 text-2xl font-bold text-slate-500">{inactiveCount}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-md">
          <label htmlFor="userSearch" className="sr-only">Search users</label>
          <input
            id="userSearch"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or role"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Show inactive users
        </label>
      </div>

      {usersQuery.isLoading || rolesQuery.isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading users...
        </div>
      ) : null}

      {usersQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(usersQuery.error)}
        </div>
      ) : null}

      {rolesQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {getErrorMessage(rolesQuery.error)}
        </div>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Roles</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{user.fullName || 'Unnamed user'}</p>
                      <p className="mt-1 text-slate-600">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
                        ].join(' ')}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-xl flex-wrap gap-2">
                        {user.roles.map((role) => (
                          <span
                            key={role.code}
                            className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200"
                          >
                            {roleLabel(role)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(user.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(user)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDisableTarget(user)}
                          disabled={!user.isActive}
                          className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
              No users match the current filters.
            </div>
          ) : null}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button
            type="button"
            aria-label="Close user form"
            className="absolute inset-0"
            onClick={closeForm}
          />
          <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {formMode === 'create' ? 'Create User' : 'Edit User'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {getSelectedRoleCountLabel(form.roleCodes.length)}
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                <div>
                  <label htmlFor="userEmail" className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="userEmail"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                {formMode === 'create' ? (
                  <div>
                    <label
                      htmlFor="temporaryPassword"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Temporary password
                    </label>
                    <input
                      id="temporaryPassword"
                      type="password"
                      value={form.temporaryPassword}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        temporaryPassword: event.target.value,
                      }))}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Share this securely with the user so they can sign in.
                    </p>
                  </div>
                ) : null}

                {formMode === 'edit' ? (
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Active user
                  </label>
                ) : null}

                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-slate-800">Roles</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roles.map((role) => {
                      const isSelected = form.roleCodes.includes(role.code);
                      return (
                        <label
                          key={role.code}
                          className={[
                            'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm transition',
                            isSelected
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRole(role.code)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300"
                          />
                          <span>
                            <span className="block font-semibold text-slate-900">{roleLabel(role)}</span>
                            {role.description ? (
                              <span className="mt-1 block text-xs leading-5 text-slate-600">{role.description}</span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
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
                  {isSaving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {disableTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Disable user?</h2>
            <p className="mt-2 text-sm text-slate-600">
              {disableTarget.email} will no longer be able to sign in. Existing history remains intact.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisableTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={disableMutation.isPending}
                onClick={() => disableMutation.mutate(disableTarget.id)}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {disableMutation.isPending ? 'Disabling...' : 'Disable User'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

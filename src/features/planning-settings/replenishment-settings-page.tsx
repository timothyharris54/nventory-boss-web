import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createProductCategory,
  deleteProductCategory,
  getProductCategories,
  getReplenishmentDefaults,
  updateProductCategory,
  updateReplenishmentDefaults,
} from './api';
import type {
  ProductCategory,
  ProductCategoryRequest,
  ReplenishmentDefaults,
} from './types';

type DefaultsForm = {
  safetyStock: string;
  targetDaysOfCover: string;
  leadTimeDays: string;
  minReorderQty: string;
  locationCode: string;
};

type CategoryForm = DefaultsForm & {
  name: string;
  description: string;
};

const emptyCategoryForm: CategoryForm = {
  name: '',
  description: '',
  safetyStock: '',
  targetDaysOfCover: '',
  leadTimeDays: '',
  minReorderQty: '',
  locationCode: '',
};

const decimalPattern = /^\d+(\.\d{1,2})?$/;
const wholeNumberPattern = /^\d+$/;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed.';
}

function defaultsToForm(defaults: ReplenishmentDefaults): DefaultsForm {
  return {
    safetyStock: String(defaults.safetyStock),
    targetDaysOfCover: String(defaults.targetDaysOfCover),
    leadTimeDays: String(defaults.leadTimeDays),
    minReorderQty: String(defaults.minReorderQty),
    locationCode: defaults.locationCode,
  };
}

function categoryToForm(category: ProductCategory): CategoryForm {
  return {
    name: category.name,
    description: category.description ?? '',
    safetyStock: category.safetyStock ?? '',
    targetDaysOfCover:
      category.targetDaysOfCover === null
        ? ''
        : String(category.targetDaysOfCover),
    leadTimeDays:
      category.leadTimeDays === null ? '' : String(category.leadTimeDays),
    minReorderQty: category.minReorderQty ?? '',
    locationCode: category.locationCode ?? '',
  };
}

function validateDecimal(value: string, label: string, required = false) {
  const normalized = value.trim();
  if (!normalized && !required) return null;
  if (!decimalPattern.test(normalized)) {
    return `${label} must be zero or greater with no more than two decimal places.`;
  }
  return null;
}

function validateWholeNumber(value: string, label: string, required = false) {
  const normalized = value.trim();
  if (!normalized && !required) return null;
  if (!wholeNumberPattern.test(normalized)) {
    return `${label} must be a whole number of zero or greater.`;
  }
  return null;
}

function validateRuleForm(form: DefaultsForm, required: boolean) {
  return (
    validateDecimal(form.safetyStock, 'Safety stock', required) ??
    validateWholeNumber(
      form.targetDaysOfCover,
      'Target days of cover',
      required,
    ) ??
    validateWholeNumber(form.leadTimeDays, 'Lead time', required) ??
    validateDecimal(form.minReorderQty, 'Minimum reorder quantity', required) ??
    ((!form.locationCode.trim() && required) || form.locationCode.length > 50
      ? 'Location code is required and must be 50 characters or fewer.'
      : null)
  );
}

function optionalDecimal(value: string) {
  return value.trim() || null;
}

function optionalInteger(value: string) {
  return value.trim() ? Number(value) : null;
}

function categoryPayload(form: CategoryForm): ProductCategoryRequest {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    safetyStock: optionalDecimal(form.safetyStock),
    targetDaysOfCover: optionalInteger(form.targetDaysOfCover),
    leadTimeDays: optionalInteger(form.leadTimeDays),
    minReorderQty: optionalDecimal(form.minReorderQty),
    locationCode: form.locationCode.trim() || null,
  };
}

function displayNumber(value: string | number) {
  const number = Number(value);
  return Number.isNaN(number) ? value : number.toLocaleString();
}

function resolvedValue(
  value: string | number | null,
  fallback: string | number,
) {
  return value === null ? fallback : value;
}

export default function ReplenishmentSettingsPage() {
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] =
    useState<ProductCategory | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(emptyCategoryForm);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);

  const defaultsQuery = useQuery({
    queryKey: ['planning-settings'],
    queryFn: getReplenishmentDefaults,
  });
  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: getProductCategories,
  });

  const categories = useMemo(
    () =>
      [...(categoriesQuery.data ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [categoriesQuery.data],
  );

  function closeCategoryForm() {
    setIsCategoryFormOpen(false);
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
  }

  const createMutation = useMutation({
    mutationFn: createProductCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success('Category created.');
      closeCategoryForm();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProductCategoryRequest }) =>
      updateProductCategory(id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      toast.success('Category updated.');
      closeCategoryForm();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product-categories'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      toast.success('Category deleted.');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  function openCreateCategory() {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setIsCategoryFormOpen(true);
  }

  function openEditCategory(category: ProductCategory) {
    setEditingCategory(category);
    setCategoryForm(categoryToForm(category));
    setIsCategoryFormOpen(true);
  }

  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    const validationError = validateRuleForm(categoryForm, false);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const body = categoryPayload(categoryForm);
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const isSavingCategory =
    createMutation.isPending || updateMutation.isPending;
  const isLoading = defaultsQuery.isLoading || categoriesQuery.isLoading;
  const loadError = defaultsQuery.error ?? categoriesQuery.error;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Replenishment Settings
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Set account-wide planning defaults and override them for individual
            product categories.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateCategory}
          disabled={!defaultsQuery.data}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading replenishment settings…
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage(loadError)}
        </div>
      ) : null}

      {!isLoading && !loadError && defaultsQuery.data ? (
        <div className="space-y-6">
          <AccountDefaultsEditor
            key={[
              defaultsQuery.data.safetyStock,
              defaultsQuery.data.targetDaysOfCover,
              defaultsQuery.data.leadTimeDays,
              defaultsQuery.data.minReorderQty,
              defaultsQuery.data.locationCode,
            ].join(':')}
            defaults={defaultsQuery.data}
          />

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Category Overrides
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Blank category values inherit the account default shown
                    above.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {categories.length}{' '}
                  {categories.length === 1 ? 'category' : 'categories'}
                </span>
              </div>
            </div>

            {categories.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-slate-800">
                  No category overrides yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Products without a category use the account defaults.
                </p>
                <button
                  type="button"
                  onClick={openCreateCategory}
                  className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Create First Category
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Products</th>
                      <th className="px-4 py-3 font-semibold">Safety stock</th>
                      <th className="px-4 py-3 font-semibold">Days of cover</th>
                      <th className="px-4 py-3 font-semibold">Lead time</th>
                      <th className="px-4 py-3 font-semibold">Min reorder</th>
                      <th className="px-4 py-3 font-semibold">Location</th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {categories.map((category) => (
                      <CategoryRow
                        key={category.id}
                        category={category}
                        defaults={defaultsQuery.data}
                        onEdit={() => openEditCategory(category)}
                        onDelete={() => setDeleteTarget(category)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isCategoryFormOpen && defaultsQuery.data ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button
            type="button"
            aria-label="Close category form"
            className="absolute inset-0"
            onClick={closeCategoryForm}
          />
          <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl">
            <form onSubmit={submitCategory}>
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Leave a planning value blank to inherit its account default.
                </p>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Category name
                  <input
                    required
                    maxLength={200}
                    value={categoryForm.name}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Description
                  <textarea
                    maxLength={1000}
                    rows={3}
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </label>
                <RuleFields
                  form={categoryForm}
                  defaults={defaultsQuery.data}
                  onChange={(field, value) =>
                    setCategoryForm((current) => ({
                      ...current,
                      [field]: value,
                    }))
                  }
                  inherited
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={closeCategoryForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isSavingCategory ? 'Saving…' : 'Save Category'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Delete {deleteTarget.name}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This removes the category and its overrides. Its{' '}
              {deleteTarget._count?.products ?? 0} assigned{' '}
              {(deleteTarget._count?.products ?? 0) === 1 ? 'product' : 'products'}{' '}
              will become uncategorized and use account defaults.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountDefaultsEditor({ defaults }: { defaults: ReplenishmentDefaults }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DefaultsForm>(() => defaultsToForm(defaults));

  const saveMutation = useMutation({
    mutationFn: () =>
      updateReplenishmentDefaults({
        defaultSafetyStock: form.safetyStock.trim(),
        defaultTargetDaysOfCover: Number(form.targetDaysOfCover),
        defaultLeadTimeDays: Number(form.leadTimeDays),
        defaultMinReorderQty: form.minReorderQty.trim(),
        defaultLocationCode: form.locationCode.trim(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['planning-settings'] });
      toast.success('Account defaults updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateRuleForm(form, true);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    saveMutation.mutate();
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Account Defaults
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          These values apply when a product has no product-specific or category
          override.
        </p>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-5">
        <RuleFields
          form={form}
          defaults={defaults}
          onChange={(field, value) =>
            setForm((current) => ({ ...current, [field]: value }))
          }
        />
      </div>
      <div className="flex justify-end border-t border-slate-200 px-5 py-4">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Account Defaults'}
        </button>
      </div>
    </form>
  );
}

function RuleFields({
  form,
  defaults,
  onChange,
  inherited = false,
}: {
  form: DefaultsForm;
  defaults: ReplenishmentDefaults;
  onChange: (field: keyof DefaultsForm, value: string) => void;
  inherited?: boolean;
}) {
  return (
    <>
      <NumberField
        label="Safety stock"
        value={form.safetyStock}
        onChange={(value) => onChange('safetyStock', value)}
        step="0.01"
        placeholder={inherited ? String(defaults.safetyStock) : undefined}
        hint={inherited ? `Account: ${displayNumber(defaults.safetyStock)}` : 'Units held above forecast demand'}
        required={!inherited}
      />
      <NumberField
        label="Target days of cover"
        value={form.targetDaysOfCover}
        onChange={(value) => onChange('targetDaysOfCover', value)}
        step="1"
        placeholder={inherited ? String(defaults.targetDaysOfCover) : undefined}
        hint={inherited ? `Account: ${defaults.targetDaysOfCover} days` : 'Inventory coverage after replenishment'}
        required={!inherited}
      />
      <NumberField
        label="Lead time"
        value={form.leadTimeDays}
        onChange={(value) => onChange('leadTimeDays', value)}
        step="1"
        placeholder={inherited ? String(defaults.leadTimeDays) : undefined}
        hint={inherited ? `Account: ${defaults.leadTimeDays} days` : 'Expected supplier lead time in days'}
        required={!inherited}
      />
      <NumberField
        label="Minimum reorder quantity"
        value={form.minReorderQty}
        onChange={(value) => onChange('minReorderQty', value)}
        step="0.01"
        placeholder={inherited ? String(defaults.minReorderQty) : undefined}
        hint={inherited ? `Account: ${displayNumber(defaults.minReorderQty)}` : 'Smallest suggested replenishment'}
        required={!inherited}
      />
      <label className="block text-sm font-medium text-slate-700">
        Location code
        <input
          value={form.locationCode}
          required={!inherited}
          maxLength={50}
          placeholder={inherited ? defaults.locationCode : undefined}
          onChange={(event) => onChange('locationCode', event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {inherited
            ? `Account: ${defaults.locationCode}`
            : 'Inventory location used for planning'}
        </span>
      </label>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  placeholder,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: string;
  placeholder?: string;
  hint: string;
  required: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type="number"
        min="0"
        step={step}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
      />
      <span className="mt-1 block text-xs font-normal text-slate-500">
        {hint}
      </span>
    </label>
  );
}

function CategoryRow({
  category,
  defaults,
  onEdit,
  onDelete,
}: {
  category: ProductCategory;
  defaults: ReplenishmentDefaults;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const inheritedCount = [
    category.safetyStock,
    category.targetDaysOfCover,
    category.leadTimeDays,
    category.minReorderQty,
    category.locationCode,
  ].filter((value) => value === null).length;

  return (
    <tr className="align-top text-slate-700 hover:bg-slate-50">
      <td className="px-5 py-4">
        <p className="font-semibold text-slate-900">{category.name}</p>
        {category.description ? (
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            {category.description}
          </p>
        ) : null}
        {inheritedCount > 0 ? (
          <p className="mt-1 text-xs font-medium text-blue-700">
            {inheritedCount} inherited
          </p>
        ) : null}
      </td>
      <td className="px-4 py-4">{category._count?.products ?? 0}</td>
      <EffectiveCell
        value={category.safetyStock}
        fallback={defaults.safetyStock}
      />
      <EffectiveCell
        value={category.targetDaysOfCover}
        fallback={defaults.targetDaysOfCover}
        suffix=" days"
      />
      <EffectiveCell
        value={category.leadTimeDays}
        fallback={defaults.leadTimeDays}
        suffix=" days"
      />
      <EffectiveCell
        value={category.minReorderQty}
        fallback={defaults.minReorderQty}
      />
      <EffectiveCell
        value={category.locationCode}
        fallback={defaults.locationCode}
        numeric={false}
      />
      <td className="whitespace-nowrap px-5 py-4 text-right">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="ml-2 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function EffectiveCell({
  value,
  fallback,
  suffix = '',
  numeric = true,
}: {
  value: string | number | null;
  fallback: string | number;
  suffix?: string;
  numeric?: boolean;
}) {
  const effective = resolvedValue(value, fallback);
  return (
    <td className="whitespace-nowrap px-4 py-4">
      <span className={value === null ? 'text-slate-500' : 'text-slate-900'}>
        {numeric ? displayNumber(effective) : effective}
        {suffix}
      </span>
      {value === null ? (
        <span className="mt-0.5 block text-[11px] text-slate-400">
          inherited
        </span>
      ) : null}
    </td>
  );
}

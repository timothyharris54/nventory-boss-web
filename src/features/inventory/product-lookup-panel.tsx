import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProductIdentity } from '../../components/data-display/product-identity';
import { searchProducts } from './products-api';
import type { ProductLookupItem } from './product-types';

type ProductLookupPanelProps = {
  selectedProduct: ProductLookupItem | null;
  onSelectProduct: (product: ProductLookupItem) => void;
  onClearProduct?: () => void;
  title?: string;
  description?: string;
  showIdleState?: boolean;
};

const PAGE_SIZE = 10;
const MIN_SEARCH_LENGTH = 2;

export function ProductLookupPanel({
  selectedProduct,
  onSelectProduct,
  onClearProduct,
  title = 'Product Lookup',
  description = 'Search by SKU or product name.',
  showIdleState = true,
}: ProductLookupPanelProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const normalizedSearch = search.trim();
  const canSearch = normalizedSearch.length >= MIN_SEARCH_LENGTH;

  const {
    data: result,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: [
      'products',
      {
        q: normalizedSearch,
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      },
    ],
    queryFn: () =>
      searchProducts({
        q: normalizedSearch,
        take: PAGE_SIZE,
        skip: page * PAGE_SIZE,
      }),
    enabled: canSearch,
  });

  const products = result?.items ?? [];
  const total = result?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPreviousPage = page > 0;
  const hasNextPage = page + 1 < pageCount;

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(0);
    setIsResultsOpen(value.trim().length >= MIN_SEARCH_LENGTH);
  }

  function handleSelectProduct(product: ProductLookupItem) {
    onSelectProduct(product);
    setIsResultsOpen(false);
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>

        {selectedProduct && onClearProduct ? (
          <button
            type="button"
            onClick={onClearProduct}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear Selection
          </button>
        ) : null}
      </div>

      <div className="mb-4">
        <label htmlFor="productLookupSearch" className="sr-only">
          Search products
        </label>
        <input
          id="productLookupSearch"
          type="search"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search SKU or product name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          Enter at least {MIN_SEARCH_LENGTH} characters to search products.
        </p>
      </div>

      {canSearch ? (
        <button
          type="button"
          onClick={() => setIsResultsOpen((current) => !current)}
          className="mb-3 inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {isResultsOpen ? 'Hide Results' : 'Show Results'}
        </button>
      ) : null}

      {!canSearch && showIdleState ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          Search by SKU or product name to load results.
        </div>
      ) : null}

      {canSearch && isResultsOpen && (isLoading || isFetching) ? (
        <div className="mb-3 text-sm text-slate-600">Loading products...</div>
      ) : null}

      {canSearch && isResultsOpen && isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(error as Error).message}
        </div>
      ) : null}

      {canSearch && isResultsOpen && !isError ? (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;

                  return (
                    <tr
                      key={product.id}
                      className={[
                        'border-t border-slate-200',
                        isSelected ? 'bg-slate-50' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3">
                        <ProductIdentity
                          name={product.name}
                          sku={product.sku}
                          imageUrl={product.imageUrl}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{product.status}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {isSelected ? 'Selected' : 'Use Product'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {products.length === 0 ? (
            <div className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
              No products found.
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">
              Page {Math.min(page + 1, pageCount)} of {pageCount}
              {total ? ` - showing ${products.length} of ${total} results` : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={!hasPreviousPage || isFetching}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!hasNextPage || isFetching}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

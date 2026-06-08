export type ProductLookupItem = {
  id: string;
  accountId: string;
  sku: string;
  name: string;
  status: string;
  isVariant: boolean;
  parentProductId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductLookupFilters = {
  q?: string;
  take?: number;
  skip?: number;
};

export type ProductSearchResult = {
  items: ProductLookupItem[];
  total: number;
  take: number;
  skip: number;
};

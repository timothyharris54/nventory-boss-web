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
  take?: number;
  skip?: number;
};
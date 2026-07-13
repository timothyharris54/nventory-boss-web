export type ProductLookupItem = {
  id: string;
  accountId: string;
  sku: string;
  name: string;
  imageUrl: string | null;
  status: string;
  excludeFromPlanning: boolean;
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

export type CreateProductDto = {
  sku: string;
  name: string;
  imageUrl?: string | null;
  parentProductId?: string | null;
  excludeFromPlanning?: boolean;
};

export type UpdateProductDto = Partial<CreateProductDto>;

export type PublishProductRequest = {
  connectionIds: string[];
};

export type PublishProductResponse = {
  message?: string;
  productId?: string;
  connectionIds?: string[];
  results?: unknown;
};

export type ProductSearchResult = {
  items: ProductLookupItem[];
  total: number;
  take: number;
  skip: number;
};

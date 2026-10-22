export type ReplenishmentDefaults = {
  safetyStock: number;
  targetDaysOfCover: number;
  leadTimeDays: number;
  minReorderQty: number;
  locationCode: string;
};

export type UpdateReplenishmentDefaultsRequest = {
  defaultSafetyStock: string;
  defaultTargetDaysOfCover: number;
  defaultLeadTimeDays: number;
  defaultMinReorderQty: string;
  defaultLocationCode: string;
};

export type ProductCategory = {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  safetyStock: string | null;
  targetDaysOfCover: number | null;
  leadTimeDays: number | null;
  minReorderQty: string | null;
  locationCode: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number };
};

export type ProductCategoryRequest = {
  name: string;
  description?: string;
  safetyStock?: string | null;
  targetDaysOfCover?: number | null;
  leadTimeDays?: number | null;
  minReorderQty?: string | null;
  locationCode?: string | null;
};

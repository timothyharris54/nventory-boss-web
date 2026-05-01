export type InventoryAdjustmentFilters = {
  productId?: string;
  locationCode?: string;
  take?: number;
  skip?: number;
};
export type CreateAdjustmentRequest = {
  productId: string;
  locationCode: string;
  quantityDelta: string;
  reasonCode: string;
  notes?: string;
  occurredAt: string;
};


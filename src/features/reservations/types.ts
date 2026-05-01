export type InventoryReservationFilters = {
  productId?: string;
  locationCode?: string;
  take?: number;
  skip?: number;
};

export type InventoryReservationRow = {
  id: string;
  productId: string;
  locationCode: string;
  sourceType: string | null;
  sourceId: string | null;
  reservedQty: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  consumedAt?: string;
  notes?: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
};

export type CreateReservationRequest = {
  productId: string;
  locationCode: string;
  quantity: string;
  sourceType?: string;
  sourceId?: string;
  notes?: string;
};

export type ReleaseReservationRequest = {
  reservationId: string;
};
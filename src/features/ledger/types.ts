export type InventoryLedgerFilters = {
  productId?: string;
  locationCode?: string;
  take?: number;
  skip?: number;
};

export type InventoryLedgerRow = {
  id: string;
  productId: string;
  locationCode: string;
  quantityDelta: string;
  movementDirection: 'inbound' | 'outbound' | string;
  eventType?: string;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt?: string;
  occurredAt?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
};
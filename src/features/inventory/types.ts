export type InventoryBalanceFilters = {
  productId?: string;
  locationCode?: string;
  take?: number;
  skip?: number;
};

export type InventoryBalanceRow = {
  productId: string;
  locationCode: string;
  qtyOnHand: string;
  qtyReserved: string;
  qtyIncoming: string;
  qtyAvailable: string;
  product: {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string | null;
  };
};

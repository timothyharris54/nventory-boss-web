export type RecommendationStatus =
  | 'open'
  | 'reviewed'
  | 'converted'
  | 'dismissed'
  | 'superseded';

export type ReorderRecommendationRow = {
  id: string;
  productId: string;
  vendorId?: string | null;
  vendorProductId?: string | null;
  locationCode: string;

  recommendedQty: string;
  daysUntilStockout?: string | null;
  reorderPoint: string;
  targetStock: string;
  avgDailySales30: string;

  qtyOnHandSnapshot: string;
  qtyReservedSnapshot?: string;
  qtyIncomingSnapshot: string;
  qtyAvailableSnapshot: string;

  status: RecommendationStatus;
  calculatedAt: string;
  createdAt: string;

  product?: {
    id: string;
    sku: string;
    name: string;
  };

  vendor?: {
    id: string;
    name: string;
  };
};

export type RunReplenishmentRequest = {
  locationCode: string;
  dryRun?: boolean;
};

export type RunReplenishmentResponse = {
  createdRecommendations?: number;
  recommendations?: ReorderRecommendationRow[];
};

export type ConvertRecommendationsDto = {
  recommendations: {
    recommendationId: string;
    vendorId?: string;
    quantity: string;
  }[];
};

export type ProcurementVendor = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  defaultLeadTimeDays: number | null;
  paymentTerms: string | null;
  isActive: boolean;
  isPreferred?: boolean;
  notes: string | null;
};

export type UpdatePurchaseOrderDto = {
  expectedAt?: string | null;
  notes?: string | null;
  lines?: {
    purchaseOrderLineId: string;
    orderedQty: string;
    vendorId?: string;
  }[];
};

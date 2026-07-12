export type SalesOrderStatus =
  | 'open'
  | 'pending'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'cancelled'
  | 'closed'
  | string;

export type SalesOrderSearchFilters = {
  q?: string;
  status?: string;
  take?: number;
  skip?: number;
};

export type SalesOrderSearchResult = {
  items: SalesOrderRow[];
  total: number;
};

export type SalesOrderRow = {
  id: string;
  orderNumber: string;
  salesOrderNumber: string | null;
  channel: string | null;
  customerName: string | null;
  customerEmail: string | null;
  status: SalesOrderStatus;
  locationCode: string | null;
  orderedAt: string | null;
  requestedShipAt: string | null;
  promisedAt: string | null;
  orderTotal: string | null;
  currencyCode: string | null;
  lineCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SalesOrderDetail = SalesOrderRow & {
  customerPhone: string | null;
  shippingAddress: string | null;
  billingAddress: string | null;
  notes: string | null;
  lines: SalesOrderLine[];
};

export type SalesOrderLine = {
  id: string;
  lineNumber: string | null;
  productId: string | null;
  sku: string | null;
  productName: string | null;
  imageUrl?: string | null;
  quantity: string;
  reservedQty: string | null;
  fulfilledQty: string | null;
  unitPrice: string | null;
  lineTotal: string | null;
  status: string | null;
};

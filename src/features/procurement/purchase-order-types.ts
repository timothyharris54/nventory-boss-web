export type PurchaseOrderStatus =
  | 'draft'
  | 'submitted'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export type PurchaseOrderRow = {
  id: string;
  accountId: string;
  vendorId: string;
  poNumber: string;
  locationCode: string;
  status: PurchaseOrderStatus;
  orderedAt: string | null;
  expectedAt: string | null;
  submittedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  vendor: {
    id: string;
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    defaultLeadTimeDays: number | null;
    paymentTerms: string | null;
    isActive: boolean;
    isPreferred: boolean;
  };

  lines: Array<{
    id: string;
    productId: string;
    vendorProductId: string | null;
    orderedQty: string;
    receivedQty: string;
    unitCost: string;
    lineTotal: string;
    product: {
      id: string;
      sku: string;
      name: string;
      status: string;
    };
    vendorProduct?: {
      id: string;
      vendorSku: string | null;
      unitCost: string;
      minOrderQty: string;
      orderMultiple: string;
      leadTimeDays: number | null;
      isPrimaryVendor: boolean;
      isActive: boolean;
    } | null;
  }>;
  receipts: Array<{
    id: string;
    receivedAt: string;
    notes: string | null;
  }>;
};

export type ReceivePurchaseOrderDto = {
  receivedAt: string;
  notes?: string;
  lines: {
    purchaseOrderLineId: string;
    productId: string;
    receivedQty: string;
    unitCost?: string;
  }[];
};

export type PurchaseOrderDetail = {
  id: string;
  accountId: string;
  vendorId: string;
  poNumber: string;
  locationCode: string;
  status: string;
  orderedAt: string;
  expectedAt: string | null;
  submittedAt: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  vendor: PurchaseOrderVendor;
  lines: PurchaseOrderLine[];
  receipts: PurchaseOrderReceipt[];
};

export type PurchaseOrderVendor = {
  id: string;
  accountId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  defaultLeadTimeDays: number | null;
  paymentTerms: string | null;
  isActive: boolean;
  isPreferred: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderLine = {
  id: string;
  accountId: string;
  purchaseOrderId: string;
  productId: string;
  vendorProductId: string | null;
  orderedQty: string;
  receivedQty: string;
  unitCost: string;
  lineTotal: string;
  createdAt: string;
  updatedAt: string;

  product: PurchaseOrderProduct;
  vendorProduct: VendorProduct | null;
};

export type PurchaseOrderProduct = {
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

export type VendorProduct = {
  id: string;
  accountId: string;
  vendorId: string;
  productId: string;
  vendorSku: string | null;
  unitCost: string;
  minOrderQty: string;
  orderMultiple: string;
  leadTimeDays: number | null;
  isPrimaryVendor: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderReceipt = {
  id: string;
  accountId: string;
  purchaseOrderId: string;
  locationCode: string;
  receivedAt: string;
  notes: string | null;
  createdAt: string;
  lines: PurchaseOrderReceiptLine[];
};

export type PurchaseOrderReceiptLine = {
  id: string;
  purchaseOrderLineId: string;
  productId: string;
  receivedQty: string;
  unitCost: string | null;
  product: {
    id: string;
    sku: string;
    name: string;
  } | null;
  vendorProduct: {
    id: string;
    vendorSku: string | null;
    unitCost: string;
    minOrderQty: string;
    orderMultiple: string;
    leadTimeDays: number | null;
    isPrimaryVendor: boolean;
    isActive: boolean;
  } | null;
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
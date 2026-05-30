export type VendorProduct = {
  id: string;
  accountId: string;
  vendorId: string;
  productId: string;
  vendorSku: string | null;
  unitCost: string | null;
  minOrderQty: string;
  orderMultiple: string;
  leadTimeDays: number | null;
  isPrimaryVendor: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  vendor?: {
    id: string;
    name: string;
  };
  product?: {
    id: string;
    sku: string;
    name: string;
    status: string;
  };
};

export type CreateVendorProductDto = {
  vendorId: string;
  productId: string;
  vendorSku?: string;
  unitCost?: string;
  minOrderQty?: string;
  orderMultiple?: string;
  leadTimeDays?: number;
  isPrimaryVendor?: boolean;
  isActive?: boolean;
};

export type UpdateVendorProductDto = Partial<
  Omit<CreateVendorProductDto, 'vendorSku' | 'unitCost' | 'leadTimeDays'>
> & {
  vendorSku?: string | null;
  unitCost?: string | null;
  leadTimeDays?: number | null;
};

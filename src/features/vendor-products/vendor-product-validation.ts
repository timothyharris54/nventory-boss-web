import type { VendorProduct } from './vendor-product-types';

export type VendorProductWarning = {
  code: 'lead-time-missing' | 'order-multiple-invalid' | 'moq-multiple-mismatch';
  message: string;
};

export function parseVendorProductNumber(
  value: number | string | null | undefined,
) {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getVendorProductRuleWarnings(input: {
  minOrderQty: number | string | null | undefined;
  orderMultiple: number | string | null | undefined;
  leadTimeDays: number | string | null | undefined;
}): VendorProductWarning[] {
  const warnings: VendorProductWarning[] = [];
  const minOrderQty = parseVendorProductNumber(input.minOrderQty);
  const orderMultiple = parseVendorProductNumber(input.orderMultiple);
  const leadTimeDays = parseVendorProductNumber(input.leadTimeDays);

  if (leadTimeDays === null) {
    warnings.push({
      code: 'lead-time-missing',
      message: 'Add lead time so replenishment dates can be planned.',
    });
  }

  if (orderMultiple === null || orderMultiple <= 0) {
    warnings.push({
      code: 'order-multiple-invalid',
      message: 'Use an order multiple greater than 0.',
    });
  }

  if (
    minOrderQty !== null &&
    minOrderQty > 0 &&
    orderMultiple !== null &&
    orderMultiple > 0
  ) {
    const nearestIncrement = Math.round(minOrderQty / orderMultiple);
    const remainder = Math.abs(minOrderQty - nearestIncrement * orderMultiple);

    if (remainder > 0.000001) {
      warnings.push({
        code: 'moq-multiple-mismatch',
        message: 'MOQ should align to the order multiple.',
      });
    }
  }

  return warnings;
}

export function productHasActivePrimaryVendor(
  vendorProducts: VendorProduct[],
  productId: string,
) {
  return vendorProducts.some(
    (row) => row.productId === productId && row.isActive && row.isPrimaryVendor,
  );
}

export function productHasActiveSuppliers(
  vendorProducts: VendorProduct[],
  productId: string,
) {
  return vendorProducts.some((row) => row.productId === productId && row.isActive);
}


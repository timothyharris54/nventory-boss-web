export type ReservationSourceTypeOption = {
  value: string;
  label: string;
};

export const RESERVATION_SOURCE_TYPE_OPTIONS: ReservationSourceTypeOption[] = [
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'manual', label: 'Manual' },
  { value: 'sales_order_line', label: 'Sales Order Line' },
];
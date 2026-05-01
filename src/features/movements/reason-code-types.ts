export type AdjustmentReasonCodeOption = {
  value: string;
  label: string;
};

export const ADJUSTMENT_REASON_CODE_OPTIONS: AdjustmentReasonCodeOption[] = [
  { value: 'cycle_count', label: 'Cycle Count' },
  { value: 'damage', label: 'Damage' },
  { value: 'expired', label: 'Expired' },
  { value: 'shrinkage', label: 'Shrinkage' },
  { value: 'opening_balance', label: 'Opening Balance' },
  { value: 'manual_correction', label: 'Manual Correction' },

];
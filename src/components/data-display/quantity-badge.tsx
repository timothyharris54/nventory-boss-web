import { formatQty, toNumber } from '../../lib/utils/quantity.js';

type Props = {
  value: string | number;
  variant?: 'onHand' | 'reserved' | 'incoming' | 'available' | 'delta';
};

export function QuantityBadge({ value, variant = 'available' }: Props) {
  const numericValue = toNumber(value);
  const isNegative = numericValue < 0;

  const base = 'inline-flex rounded-full px-2.5 py-1 text-xs';

  const emphasis =
    variant === 'available' ? 'font-bold text-sm px-3 py-1.5' : 'font-semibold';
  const shouldPulse = variant === 'available' && isNegative;
  const color =
    variant === 'reserved'
      ? 'bg-amber-100 text-amber-800'
      : variant === 'incoming'
        ? 'bg-blue-100 text-blue-800'
        : variant === 'delta'
          ? numericValue < 0
            ? 'bg-red-100 text-red-800 '
            : 'bg-green-100 text-green-800'
          : numericValue < 0
            ? 'bg-red-100 text-red-800'
            : numericValue === 0
              ? 'bg-slate-100 text-slate-700'
              : 'bg-green-100 text-green-800';

    const prefix = variant === 'delta' && numericValue > 0 ? '+' : '';

  return (
    <span 
      className={`${base} ${emphasis} ${color}
        ${shouldPulse ? 'animate-pulse-soft ring-1 ring-red-300' : ''}`}>
      {prefix}
      {formatQty(value)}
    </span>
  );
}
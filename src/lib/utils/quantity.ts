export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatQty(value: string | number | null | undefined): string {
  const num = toNumber(value);
  return num.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}
import { ProductThumbnail } from './product-thumbnail';

type ProductIdentityProps = {
  name?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  fallbackName?: string;
  size?: 'sm' | 'md';
};

export function ProductIdentity({
  name,
  sku,
  imageUrl,
  fallbackName = 'Unknown product',
  size = 'sm',
}: ProductIdentityProps) {
  const displayName = name || fallbackName;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductThumbnail imageUrl={imageUrl} name={displayName} size={size} />
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-900">{displayName}</div>
        {sku ? (
          <div className="truncate text-xs text-slate-500">SKU: {sku}</div>
        ) : null}
      </div>
    </div>
  );
}

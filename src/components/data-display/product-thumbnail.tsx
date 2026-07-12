type ProductThumbnailProps = {
  imageUrl?: string | null;
  name?: string | null;
  size?: 'sm' | 'md';
};

const sizeClasses = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
};

export function ProductThumbnail({
  imageUrl,
  name,
  size = 'sm',
}: ProductThumbnailProps) {
  const trimmedUrl = imageUrl?.trim();
  const fallbackText = name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className={[
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 font-semibold text-slate-500',
        sizeClasses[size],
      ].join(' ')}
      aria-hidden="true"
    >
      <span>{fallbackText}</span>
      {trimmedUrl ? (
        <img
          src={trimmedUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </div>
  );
}

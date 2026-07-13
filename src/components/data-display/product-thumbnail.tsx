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
  const productName = name?.trim() || 'Product';
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasImageError = failedImageUrl === trimmedUrl;

  useEffect(() => {
    if (!isPreviewOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPreviewOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPreviewOpen]);

  const thumbnail = (
    <div
      className={[
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 font-semibold text-slate-500',
        sizeClasses[size],
      ].join(' ')}
    >
      <span aria-hidden="true">{fallbackText}</span>
      {trimmedUrl && !hasImageError ? (
        <img
          src={trimmedUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedImageUrl(trimmedUrl)}
        />
      ) : null}
    </div>
  );

  return (
    <>
      {trimmedUrl && !hasImageError ? (
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="shrink-0 cursor-zoom-in rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label={`View larger image of ${productName}`}
        >
          {thumbnail}
        </button>
      ) : (
        thumbnail
      )}

      {isPreviewOpen && trimmedUrl
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
              role="dialog"
              aria-modal="true"
              aria-label={`${productName} image preview`}
              onClick={() => setIsPreviewOpen(false)}
            >
              <div
                className="relative flex max-h-[90vh] max-w-[95vw] items-center justify-center rounded-lg bg-white p-2 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={trimmedUrl}
                  alt={productName}
                  className="max-h-[85vh] max-w-[90vw] object-contain"
                />
                <button
                  type="button"
                  autoFocus
                  onClick={() => setIsPreviewOpen(false)}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-xl leading-none text-white shadow hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Close image preview"
                >
                  ×
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

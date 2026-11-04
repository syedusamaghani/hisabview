import { useEffect, useId, type ReactNode } from 'react';

// A panel that slides up from the bottom over a dimmed screen (for a short message).
// Tap outside it, press Back/Escape, or use the button inside to close it.
type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

export function Sheet({ open, onClose, title, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-app animate-slideUp rounded-t-[28px] bg-surface px-gutter pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-6 shadow-dock"
      >
        <h2 id={titleId} className="mb-3 text-center text-title font-extrabold text-ink">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

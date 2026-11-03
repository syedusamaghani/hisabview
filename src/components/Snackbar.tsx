import { useEffect } from 'react';

// A short message that slides up from the bottom, with an optional button ("Wapas lo" = undo).
// It sits just above the bottom bar and closes by itself after a few seconds.
type Props = {
  open: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  duration?: number; // milliseconds
};

export function Snackbar({ open, message, actionLabel, onAction, onClose, duration = 7000 }: Props) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(id);
  }, [open, message, duration, onClose]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-40 px-gutter"
      style={{ bottom: 'calc(max(var(--bar-h, 0px), env(safe-area-inset-bottom, 0px)) + 12px)' }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-app animate-slideUp items-center gap-2 rounded-card bg-ink ps-4 text-primaryInk shadow-snack">
        <p className="flex-1 py-3 text-body font-semibold">{message}</p>
        {actionLabel && (
          <button
            type="button"
            onClick={() => {
              onAction?.();
              onClose();
            }}
            className="min-h-tap shrink-0 rounded-button px-4 text-body font-extrabold text-accent focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

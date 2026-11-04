import { useEffect } from 'react';

// A short message that slides up from the bottom, with an optional button ("Wapas lo" = undo)
// and an optional second button ("WhatsApp"). It sits just above the bottom bar and closes by
// itself after a few seconds. With two buttons they go on their own row, so nothing is squeezed.
type Props = {
  open: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void; // does not close the message, so "Wapas lo" stays available
  onClose: () => void;
  duration?: number; // milliseconds
};

const buttonClass =
  'min-h-tap shrink-0 rounded-button px-4 text-body font-extrabold text-accent focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent';

export function Snackbar({ open, message, actionLabel, onAction, secondaryLabel, onSecondary, onClose, duration = 7000 }: Props) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(id);
  }, [open, message, duration, onClose]);

  if (!open) return null;

  const action = actionLabel && (
    <button
      type="button"
      onClick={() => {
        onAction?.();
        onClose();
      }}
      className={buttonClass}
    >
      {actionLabel}
    </button>
  );
  const secondary = secondaryLabel && (
    <button type="button" onClick={onSecondary} className={buttonClass}>
      {secondaryLabel}
    </button>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-40 px-gutter"
      style={{ bottom: 'calc(max(var(--bar-h, 0px), env(safe-area-inset-bottom, 0px)) + 12px)' }}
    >
      <div className="pointer-events-auto mx-auto max-w-app animate-slideUp rounded-card bg-ink text-primaryInk shadow-snack">
        {secondary ? (
          <>
            <p className="px-4 pt-3 text-body font-semibold">{message}</p>
            <div className="flex items-center justify-end gap-1 px-2 pb-1">
              {secondary}
              {action}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 ps-4">
            <p className="flex-1 py-3 text-body font-semibold">{message}</p>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { successFeedback } from '../lib/feedback';

// "It was saved": a tick that draws itself, a short vibration and a short chime.
// The picture (not green: green means money) closes itself and calls onDone.
// With "reduce motion" on, the tick simply appears. Vibration and sound still happen.
type Props = {
  show: boolean;
  label: string;
  onDone: () => void;
  duration?: number; // milliseconds
};

// The brown circle with the marigold tick. Also used on the "shop is ready" screen.
export function TickBadge({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="12" className="fill-primary" />
      <path
        d="M7 12.5l3.2 3.2L17 9"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="16"
        className="animate-tick stroke-accent"
      />
    </svg>
  );
}

export function SaveSuccess({ show, label, onDone, duration = 1400 }: Props) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!show) return;
    successFeedback();
    const id = window.setTimeout(() => done.current(), duration);
    return () => window.clearTimeout(id);
  }, [show, duration]);

  if (!show) return null;

  return (
    <div role="status" className="fixed inset-0 z-50 grid place-items-center bg-scrim px-gutter">
      <div className="flex animate-pop flex-col items-center gap-4 rounded-card bg-surface px-10 py-8 shadow-card">
        <TickBadge />
        <p className="text-title font-extrabold text-ink">{label}</p>
      </div>
    </div>
  );
}

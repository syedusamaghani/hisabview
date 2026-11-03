import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';
import { Icon } from './Icon';

// The big round microphone in the middle of the bottom bar.
// listening = true shows a ring that pulses (no pulse if the phone has "reduce motion" on).
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string;
  listening?: boolean;
};

export function MicButton({ label, listening = false, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={listening}
      className={cx(
        'relative z-10 grid size-mic place-items-center rounded-full bg-accent text-accentInk',
        'transition-transform duration-fast active:scale-95',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-primary',
        listening ? 'shadow-micOn' : 'shadow-mic',
        className,
      )}
      {...rest}
    >
      {listening && <span aria-hidden="true" className="absolute inset-0 animate-listen rounded-full border-4 border-primary" />}
      <Icon name="mic" size={40} />
    </button>
  );
}

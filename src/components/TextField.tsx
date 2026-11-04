import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../lib/cx';

// A big text box with its label above it. At least 56px tall.
// size="lg" is for the one important question on a screen (for example the shop name).
// "right" is for a small button inside the box (for example "pick from contacts").
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  hint?: string;
  size?: 'md' | 'lg';
  right?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function TextField({ label, hint, size = 'md', right, className, id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-label font-bold text-inkSoft">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          dir="auto"
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          className={cx(
            'w-full rounded-button border-[1.5px] border-line bg-surface px-4 font-semibold text-ink shadow-card',
            'placeholder:font-normal placeholder:text-inkSoft/70',
            'focus:border-primary focus:outline focus:outline-[3px] focus:outline-accent',
            size === 'lg' ? 'min-h-tapLg text-title' : 'min-h-tap text-body',
            right ? 'pe-16' : undefined,
          )}
          {...rest}
        />
        {right && <div className="absolute inset-y-0 end-1 flex items-center">{right}</div>}
      </div>
      {hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-label text-inkSoft">
          {hint}
        </p>
      )}
    </div>
  );
}

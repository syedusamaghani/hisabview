import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

// A small rounded button that fills in a suggestion when tapped (still 56px tall).
export function Chip({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx(
        'min-h-tap rounded-full border-[1.5px] border-line bg-surface px-4 text-body font-bold text-primary',
        'transition-colors duration-fast active:bg-primarySoft',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      {...rest}
    />
  );
}

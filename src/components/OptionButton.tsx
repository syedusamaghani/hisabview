import type { ReactNode } from 'react';
import { cx } from '../lib/cx';

// One big answer to tap when the app asks a question ("Rs 500" or "Rs 600").
// At least 76px tall. For customers use PartyRow; this is for plain answers.
type Props = {
  title: ReactNode;
  subtitle?: string;
  right?: ReactNode;
  center?: boolean; // centre the title (for a plain amount)
  onClick: () => void;
  className?: string;
};

export function OptionButton({ title, subtitle, right, center, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex min-h-[76px] w-full items-center gap-3 rounded-card border-2 border-primary bg-surface px-4 py-3 text-start shadow-card',
        'transition-transform duration-fast active:scale-[0.99]',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
      <span className={cx('min-w-0 flex-1', center && 'text-center')}>
        <span dir="auto" className="block truncate text-title font-extrabold text-ink">{title}</span>
        {subtitle && <span dir="auto" className="block truncate text-label text-inkSoft">{subtitle}</span>}
      </span>
      {right}
    </button>
  );
}

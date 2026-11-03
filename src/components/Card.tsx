import type { HTMLAttributes } from 'react';
import { cx } from '../lib/cx';

// A white rounded box that groups things. tone="soft" gives it a warm tint,
// pattern adds the very light jali lattice (use rarely, e.g. a transcript).
type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: 'plain' | 'soft';
  pattern?: boolean;
};

export function Card({ tone = 'plain', pattern, className, ...rest }: Props) {
  return (
    <div
      className={cx(
        'rounded-card border-[1.5px] border-line p-4 shadow-card',
        tone === 'soft' ? 'bg-primarySoft' : 'bg-surface',
        pattern && 'bg-jaliSoft',
        className,
      )}
      {...rest}
    />
  );
}

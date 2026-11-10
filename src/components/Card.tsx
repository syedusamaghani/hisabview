import type { HTMLAttributes } from 'react';
import { cx } from '../lib/cx';

// A white rounded box that groups things. tone="soft" gives it a warm tint,
// pattern adds the very light jali lattice (use rarely, e.g. a transcript).
type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: 'plain' | 'soft';
  pattern?: boolean;
  stripe?: boolean; // a thick accent edge on the start side (Home: Aaj ka hisaab)
};

export function Card({ tone = 'plain', pattern, stripe, className, ...rest }: Props) {
  return (
    <div
      className={cx(
        'rounded-card border-[1.5px] border-line p-4 shadow-card',
        tone === 'soft' ? 'bg-primarySoft' : 'bg-surface',
        pattern && 'bg-jaliSoft',
        stripe && 'border-s-[6px] border-s-accent',
        className,
      )}
      {...rest}
    />
  );
}

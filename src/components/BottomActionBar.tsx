import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cx } from '../lib/cx';

// The bar fixed to the bottom of the screen, where the thumb reaches (Diye, mic, Mile, Theek hai).
// Keeps clear of the phone's bottom edge (safe area). It also tells the page how tall it is,
// through --bar-h, so a page can add  pb-[var(--bar-h)]  and nothing hides behind the bar.
export function BottomActionBar({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => document.documentElement.style.setProperty('--bar-h', `${el.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--bar-h', '0px');
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cx(
        'scallop fixed inset-x-0 bottom-0 z-30 bg-surface shadow-dock',
        'px-gutter pb-[calc(14px+env(safe-area-inset-bottom,0px))] pt-[22px]',
      )}
    >
      <div className={cx('mx-auto max-w-app', className)}>{children}</div>
    </div>
  );
}

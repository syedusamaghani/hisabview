import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { useT } from '../i18n/i18n';
import { IconButton } from './IconButton';

// The top of a screen: title, optional small line under it, optional back button,
// and an optional slot on the far side (for example the hide-amounts eye).
// variant "brand" = brown with the light jali pattern. "plain" = no background.
type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  variant?: 'brand' | 'plain';
  children?: ReactNode; // extra content under the title (for example total cards)
  className?: string;
};

export function ScreenHeader({ title, subtitle, onBack, right, variant = 'brand', children, className }: Props) {
  const { t } = useT();
  const brand = variant === 'brand';

  return (
    <header
      className={cx(
        'px-gutter pb-4 pt-[calc(env(safe-area-inset-top,0px)+8px)]',
        brand ? 'rounded-b-[28px] bg-primary bg-jali text-primaryInk' : 'text-ink',
        className,
      )}
    >
      <div className="flex min-h-[64px] items-center gap-2">
        {onBack && <IconButton icon="back" flip label={t('back')} tone={brand ? 'onBrand' : 'onPage'} onClick={onBack} />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-title font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className={cx('truncate text-label', brand ? 'text-primarySoft' : 'text-inkSoft')}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </header>
  );
}

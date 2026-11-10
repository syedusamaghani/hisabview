import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';
import { useT } from '../i18n/i18n';
import { usePrivacy } from '../state/privacy';
import { Icon, type IconName } from './Icon';

// A round 56px button with only a picture. It MUST have a label (read out by screen readers).
type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  icon: IconName;
  label: string;
  tone?: 'onBrand' | 'header' | 'onPage'; // onBrand = on a full primary-colour page, header = inside the top bar
  flip?: boolean; // mirror the picture in Urdu (arrows)
};

export function IconButton({ icon, label, tone = 'onPage', flip, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        'grid size-tap shrink-0 place-items-center rounded-full transition-transform duration-fast active:scale-95',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
        tone === 'onBrand' ? 'bg-white/10 text-accent' : tone === 'header' ? 'bg-chipBg text-chipInk' : 'text-primary',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={28} className={flip ? 'rtl:-scale-x-100' : undefined} />
    </button>
  );
}

// The eye button that hides or shows every amount in the app.
export function HideAmountsButton({ tone }: { tone?: 'onBrand' | 'header' | 'onPage' }) {
  const { hidden, toggle } = usePrivacy();
  const { t } = useT();
  return (
    <IconButton
      tone={tone}
      icon={hidden ? 'eyeOff' : 'eye'}
      label={hidden ? t('showAmounts') : t('hideAmounts')}
      aria-pressed={hidden}
      onClick={toggle}
    />
  );
}

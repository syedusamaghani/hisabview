import { useT } from '../i18n/i18n';
import { usePrivacy } from '../state/privacy';
import { Icon } from './Icon';

// Shown while amounts are hidden. It explains how to show them again, and one tap does it.
// Renders nothing when amounts are visible.
export function HideBanner() {
  const { hidden, toggle } = usePrivacy();
  const { t } = useT();
  if (!hidden) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      className={
        'flex min-h-tap w-full items-center gap-3 rounded-card bg-accent px-4 py-2 text-start text-body font-extrabold text-accentInk shadow-btn ' +
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary'
      }
    >
      <Icon name="eyeOff" size={28} />
      <span className="flex-1 leading-snug">{t('hiddenBanner')}</span>
    </button>
  );
}

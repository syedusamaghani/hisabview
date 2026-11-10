import { isTesting, stopTesting } from '../data';
import { useT } from '../i18n/i18n';
import { Icon } from './Icon';

// Shown on every screen while Testing mode is on, so nobody mistakes it for the real khata.
// One tap goes back to the real khata.
export function TestBanner() {
  const { t } = useT();
  if (!isTesting()) return null;
  return (
    <button
      type="button"
      onClick={stopTesting}
      className={
        'sticky top-0 z-50 flex min-h-tap w-full items-center gap-3 bg-accent px-4 py-2 text-start text-label font-extrabold text-accentInk ' +
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-primary'
      }
    >
      <Icon name="undo" size={24} />
      <span className="flex-1 leading-snug">{t('testBanner')}</span>
    </button>
  );
}

import { useT } from '../i18n/i18n';
import { cx } from '../lib/cx';
import { METHODS, METHOD_TEXT, type Method } from '../lib/methods';

// "Paisa kaise?": Cash is already chosen; one tap picks JazzCash, Easypaisa or Bank. Never red or green (those mean money).
export function MethodPicker({ value, onChange }: { value: Method; onChange: (next: Method) => void }) {
  const { t } = useT();
  return (
    <div>
      <p className="mb-2 text-label font-bold text-inkSoft">{t('methodTitle')}</p>
      <div role="radiogroup" aria-label={t('methodTitle')} className="grid grid-cols-2 gap-2">
        {METHODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value === m}
            onClick={() => onChange(m)}
            className={cx(
              'min-h-tap rounded-button border-2 px-3 text-body font-extrabold transition-colors duration-fast',
              'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
              value === m ? 'border-primary bg-primarySoft text-primary' : 'border-line bg-surface text-ink',
            )}
          >
            {t(METHOD_TEXT[m])}
          </button>
        ))}
      </div>
    </div>
  );
}

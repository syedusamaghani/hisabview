import { cx } from '../lib/cx';
import { useT } from '../i18n/i18n';
import { Icon } from './Icon';

// Big number keys for typing an amount (whole rupees). The screen owns the number;
// this only reports the new number through onChange.
type Props = {
  value: number;
  onChange: (next: number) => void;
  maxDigits?: number;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'] as const;

const keyClass = cx(
  'grid h-16 place-items-center rounded-button border-[1.5px] border-line bg-surface text-display font-extrabold text-ink',
  'transition-colors duration-fast active:bg-primarySoft',
  'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent',
);

export function NumberKeypad({ value, onChange, maxDigits = 9 }: Props) {
  const { t } = useT();

  const press = (key: (typeof KEYS)[number]) => {
    if (key === 'back') {
      onChange(Math.floor(value / 10));
      return;
    }
    const typed = `${value === 0 ? '' : value}${key}`;
    if (typed.replace(/^0+/, '').length > maxDigits) return;
    onChange(Number(typed));
  };

  return (
    <div role="group" aria-label={t('amountKeypad')} className="grid grid-cols-3 gap-2" dir="ltr">
      {KEYS.map((key) =>
        key === 'back' ? (
          <button key={key} type="button" aria-label={t('backspace')} onClick={() => press(key)} className={cx(keyClass, 'bg-primarySoft text-primary')}>
            <Icon name="backspace" size={32} />
          </button>
        ) : (
          <button key={key} type="button" onClick={() => press(key)} className={cx(keyClass, 'latin')}>
            {key}
          </button>
        ),
      )}
    </div>
  );
}

import { useT } from '../i18n/i18n';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

// The search box at the top of a list. Shows a clear button once something is typed.
type Props = { value: string; onChange: (next: string) => void; placeholder: string };

export function SearchBar({ value, onChange, placeholder }: Props) {
  const { t } = useT();
  return (
    <div className="relative">
      <Icon name="search" size={26} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-inkSoft" />
      <input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        dir={value ? 'auto' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={t('searchLabel')}
        className={
          'min-h-tap w-full rounded-button border-[1.5px] border-line bg-surface pe-14 ps-14 text-body font-semibold text-ink shadow-card ' +
          'placeholder:font-normal placeholder:text-inkSoft/90 focus:border-primary focus:outline focus:outline-[3px] focus:outline-accent'
        }
      />
      {value && <IconButton icon="close" label={t('searchClear')} className="absolute end-0 top-0" onClick={() => onChange('')} />}
    </div>
  );
}

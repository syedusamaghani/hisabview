import { useT } from '../i18n/i18n';
import { AmountText } from './AmountText';

// One person in the list: first letter, name, pehchaan and what is owed.
//  balance above 0 = they owe me, in red ("Lene hain")
//  balance below 0 = I owe them, in dark ("Dene hain")
type Props = { name: string; identifier: string | null; balance: number; onClick: () => void };

export function PartyRow({ name, identifier, balance, onClick }: Props) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex min-h-[76px] w-full items-center gap-3 rounded-card border-[1.5px] border-line bg-surface p-3 text-start shadow-card ' +
        'transition-transform duration-fast active:scale-[0.99] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent'
      }
    >
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-primarySoft text-title font-extrabold text-primary">
        {Array.from(name.trim())[0]?.toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span dir="auto" className="block truncate text-body font-extrabold text-ink">{name}</span>
        {identifier && <span dir="auto" className="block truncate text-label text-inkSoft">{identifier}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        {balance === 0 ? (
          <span className="text-label font-bold text-inkSoft">{t('settled')}</span>
        ) : (
          <>
            <AmountText amount={Math.abs(balance)} tone={balance > 0 ? 'out' : 'neutral'} room="120px" />
            <span className="text-caption font-semibold text-inkSoft">{balance > 0 ? t('leneHain') : t('deneHain')}</span>
          </>
        )}
      </span>
    </button>
  );
}

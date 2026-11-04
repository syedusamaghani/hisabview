import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { Icon } from '../../components/Icon';
import { SaveSuccess } from '../../components/SaveSuccess';
import { ScreenHeader } from '../../components/ScreenHeader';
import type { Party } from '../../data';
import { useT } from '../../i18n/i18n';
import { cx } from '../../lib/cx';
import { formatDay } from '../../lib/dates';
import type { ParsedEntry } from '../../voice';

// "Did I understand you?" Name, Diye or Mile, the amount in huge text, the new balance.
// "Theek hai" saves it. "Badlo" opens the normal screen with the amount already typed.
type Props = {
  entry: ParsedEntry;
  party: Party;
  transcript: string;
  balance: number; // balance after this entry
  saving: boolean;
  failed: boolean;
  saved: boolean;
  onSave: () => void;
  onChange: () => void;
  onBack: () => void;
  onSavedDone: () => void;
};

export function ConfirmView({ entry, party, transcript, balance, saving, failed, saved, onSave, onChange, onBack, onSavedDone }: Props) {
  const { t, lang } = useT();
  const out = entry.kind === 'diye';
  const unsure = entry.confidence < 0.8;
  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('confirmQuestion')} onBack={onBack} />
      <div className="flex flex-col gap-4 px-gutter pt-5">
        <Card pattern className="flex flex-col gap-1">
          <p className="text-caption font-bold text-inkSoft">{t('heard')}</p>
          <p dir="auto" className="text-body font-bold text-ink">“{transcript}”</p>
        </Card>

        {unsure && (
          <div role="note" className="rounded-card bg-accent px-4 py-3 text-body font-extrabold text-accentInk">
            {t('checkCarefully')}
          </div>
        )}

        <Card className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="min-w-0 max-w-full">
            <p dir="auto" className="truncate text-title font-extrabold">{party.name}</p>
            {party.identifier && <p dir="auto" className="truncate text-label text-inkSoft">{party.identifier}</p>}
          </div>
          <span
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-4 py-1 text-body font-extrabold',
              out ? 'bg-moneyOutSoft text-moneyOut' : 'bg-moneyInSoft text-moneyIn',
            )}
          >
            <Icon name={out ? 'up' : 'down'} size={22} />
            {t(entry.kind === 'diye' ? 'diye' : 'mile')}
          </span>
          <AmountText amount={entry.amount} size="xl" tone={out ? 'out' : 'in'} reveal />
          <div className="flex items-baseline gap-2 text-inkSoft">
            <span className="text-label font-semibold">{t('newBalance')}:</span>
            <AmountText amount={Math.abs(balance)} size="s" tone={balance > 0 ? 'out' : 'neutral'} room="140px" />
          </div>
          {entry.promise_date && (
            <p className="text-body font-bold text-inkSoft">
              {t('promiseOn').replace('{day}', formatDay(`${entry.promise_date}T12:00:00+05:00`, lang))}
            </p>
          )}
        </Card>

        {failed && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('errorGeneric')}</p>
          </Card>
        )}
      </div>

      <BottomActionBar>
        <div className="grid grid-cols-[1fr_1.4fr] gap-3">
          <BigButton size="lg" variant="ghost" icon="edit" onClick={onChange} disabled={saving}>{t('badlo')}</BigButton>
          <BigButton size="lg" onClick={onSave} disabled={saving}>{t('theekHai')}</BigButton>
        </div>
      </BottomActionBar>
      <SaveSuccess show={saved} label={t('saved')} duration={900} onDone={onSavedDone} />
    </main>
  );
}

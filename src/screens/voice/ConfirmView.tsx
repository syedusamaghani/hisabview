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
import { formatRs } from '../../lib/money';
import type { ParsedEntry } from '../../voice';

// "Did I understand you?" Name, Diye or Mile, the amount in huge text, the new balance.
// "Theek hai" saves it. "Badlo" opens the normal screen with the amount already typed.
type Props = {
  entry: ParsedEntry;
  party: Party | null; // null for a sale or a kharcha
  transcript: string;
  balance: number; // balance after this entry
  saving: boolean;
  failed: boolean;
  saved: boolean;
  creditLimit?: number | null; // the udhaar goes above the customer's limit (the limit): a warning is shown, pressing save again saves it anyway
  duplicate?: boolean; // the same entry was saved a moment ago: a warning is shown, pressing save again saves it anyway
  kindPending?: boolean; // only a name and an amount were said: the two buttons below say Diye or Mile AND save
  onSave: (kind?: 'diye' | 'mile') => void;
  onEditParty: () => void;
  onToggleKind: () => void;
  onEditAmount: () => void;
  onChange: () => void;
  onBack: () => void;
  onSavedDone: () => void;
};

export function ConfirmView({ entry, party, transcript, balance, saving, failed, saved, kindPending, duplicate, creditLimit, onSave, onEditParty, onToggleKind, onEditAmount, onChange, onBack, onSavedDone }: Props) {
  const { t, lang } = useT();
  // Red = money went out (diye, kharcha). Green = money came in (mile, sale).
  const out = !kindPending && (entry.kind === 'diye' || entry.kind === 'kharcha');
  const kindLabel = t(entry.kind === 'diye' ? 'diye' : entry.kind === 'mile' ? 'mile' : entry.kind === 'cash_sale' ? 'saleLabel' : 'kharchaLabel');
  const unsure = entry.confidence < 0.8;
  // Diye can be turned into Mile and back. A sale or a kharcha has no other side.
  const canToggleKind = entry.kind === 'diye' || entry.kind === 'mile';
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
          {/* Each part can be corrected with one tap, so a wrongly heard word never has to be saved */}
          {party && (
            <button type="button" onClick={onEditParty} disabled={saving} className="flex min-h-tap min-w-0 max-w-full items-center gap-2 rounded-button px-3">
              <span className="min-w-0">
                <span dir="auto" className="block truncate text-title font-extrabold">{party.name}</span>
                {party.identifier && <span dir="auto" className="block truncate text-label text-inkSoft">{party.identifier}</span>}
              </span>
              <Icon name="edit" size={22} className="shrink-0 text-inkSoft" />
            </button>
          )}
          {!kindPending && (
          <button
            type="button"
            onClick={onToggleKind}
            disabled={saving || !canToggleKind}
            className={cx(
              'inline-flex min-h-tap items-center gap-1 rounded-full px-4 text-body font-extrabold',
              out ? 'bg-moneyOutSoft text-moneyOut' : 'bg-moneyInSoft text-moneyIn',
            )}
          >
            <Icon name={out ? 'up' : 'down'} size={22} />
            {kindLabel}
            {canToggleKind && <Icon name="edit" size={20} />}
          </button>
          )}
          <button type="button" onClick={onEditAmount} disabled={saving} className="flex min-h-tap max-w-full items-center justify-center gap-2 rounded-button px-3">
            <AmountText amount={entry.amount} size="xl" tone={kindPending ? 'neutral' : out ? 'out' : 'in'} reveal />
            <Icon name="edit" size={26} className="shrink-0 text-inkSoft" />
          </button>
          {party && !kindPending && (
            <div className="flex items-baseline gap-2 text-inkSoft">
              <span className="text-label font-semibold">{t('newBalance')}:</span>
              <AmountText amount={Math.abs(balance)} size="s" tone={balance > 0 ? 'out' : 'neutral'} room="140px" />
            </div>
          )}
          {entry.promise_date && (
            <p className="text-body font-bold text-inkSoft">
              {t('promiseOn').replace('{day}', formatDay(`${entry.promise_date}T12:00:00+05:00`, lang))}
            </p>
          )}
        </Card>

        <p className="text-center text-label font-semibold text-inkSoft">{kindPending ? t('qKind') : t('tapToChange')}</p>

        {creditLimit ? (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('creditWarn').replace('{limit}', formatRs(creditLimit))}</p>
          </Card>
        ) : null}
        {duplicate && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('duplicateWarn')}</p>
          </Card>
        )}
        {failed && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('errorGeneric')}</p>
          </Card>
        )}
      </div>

      <BottomActionBar>
        {kindPending ? (
          <div className="grid grid-cols-2 gap-3">
            <BigButton size="lg" variant="diye" icon="up" onClick={() => onSave('diye')} disabled={saving}>{t('diye')}</BigButton>
            <BigButton size="lg" variant="mile" icon="down" onClick={() => onSave('mile')} disabled={saving}>{t('mile')}</BigButton>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <BigButton size="lg" variant="ghost" icon="edit" onClick={onChange} disabled={saving}>{t('badlo')}</BigButton>
            <BigButton size="lg" onClick={() => onSave()} disabled={saving}>{t('theekHai')}</BigButton>
          </div>
        )}
      </BottomActionBar>
      <SaveSuccess show={saved} label={t('saved')} duration={900} onDone={onSavedDone} />
    </main>
  );
}

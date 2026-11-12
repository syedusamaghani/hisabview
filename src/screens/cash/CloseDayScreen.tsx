import { useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { NumberKeypad } from '../../components/NumberKeypad';
import { SaveSuccess } from '../../components/SaveSuccess';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import { cashRepo, useLive, useRole } from '../../data';
import { useT } from '../../i18n/i18n';
import { cashDifference } from '../../lib/cashbook';
import { formatDay } from '../../lib/dates';
import { cx } from '../../lib/cx';
import { formatRs } from '../../lib/money';
import { canManageCash } from '../../lib/permissions';
import { goBack, navigate } from '../../lib/router';
import { dayFromAddress } from './CashbookScreen';

// Din band karo: the shopkeeper counts the drawer, the app shows what it expected and the difference, and the
// closing is saved (add-only, with a diary line). Counting again the same day adds a newer closing.
export function CloseDayScreen() {
  const { t, lang } = useT();
  const role = useRole() ?? 'cashier';
  const [day] = useState(dayFromAddress);
  const view = useLive(() => cashRepo.cashbookFor(day), [day]);
  const [typedOpening, setTypedOpening] = useState(0); // asked only the first time, when no earlier closing exists
  const [openingDone, setOpeningDone] = useState(false);
  const [counted, setCounted] = useState(0);
  const [touched, setTouched] = useState(false);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const back = () => goBack(`/cashbook?day=${day}`);
  const header = (title: string, onBack = back) => <ScreenHeader title={title} subtitle={formatDay(`${day}T12:00:00+05:00`, lang)} onBack={onBack} />;

  if (!canManageCash(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        {header(t('cashCountTitle'))}
        <p className="px-gutter pt-6 text-body font-bold">{t('cashAskManager')}</p>
      </main>
    );
  }
  if (!view) return <main className="mx-auto min-h-screen max-w-app" />;

  // The first closing ever: ask what was in the drawer this morning
  if (!view.openingKnown && !openingDone) {
    return (
      <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
        {header(t('cashOpeningTap'))}
        <div className="flex flex-col gap-4 px-gutter pt-5">
          <p className="text-center text-title font-extrabold text-ink">{t('cashOpeningAsk')}</p>
          <div className="text-center">
            <AmountText amount={typedOpening} size="xl" tone="neutral" reveal />
          </div>
          <NumberKeypad value={typedOpening} onChange={setTypedOpening} />
        </div>
        <BottomActionBar>
          <BigButton full size="lg" onClick={() => setOpeningDone(true)}>{t('next')}</BigButton>
        </BottomActionBar>
      </main>
    );
  }

  const opening = view.openingKnown ? view.day.opening : typedOpening;
  const expected = opening + view.day.cashIn - view.day.cashOut;
  const difference = cashDifference(counted, expected);

  const save = async () => {
    if (saving || !touched) return;
    setSaving(true);
    setFailed(false);
    try {
      await cashRepo.close({ day, opening_cash: opening, expected_cash: expected, counted_cash: counted, note });
      setSaved(true);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      {header(t('cashCountTitle'), !view.openingKnown ? () => setOpeningDone(false) : back)}
      <div className="flex flex-col gap-4 px-gutter pt-5">
        <Card tone="soft">
          <p className="text-label font-semibold text-inkSoft">{t('cashExpected')}</p>
          <AmountText amount={expected} size="l" tone="neutral" />
        </Card>

        <p className="text-center text-body font-extrabold text-ink">{t('cashCountedLabel')}</p>
        <div className="text-center">
          <AmountText amount={counted} size="xl" tone="neutral" reveal />
        </div>
        {touched && (
          <p
            role="status"
            className={cx(
              'rounded-button px-3 py-2 text-center text-body font-extrabold',
              difference < 0 ? 'bg-moneyOutSoft text-moneyOut' : difference > 0 ? 'bg-moneyInSoft text-moneyIn' : 'bg-primarySoft text-primary',
            )}
          >
            {difference < 0 ? t('cashShort').replace('{amount}', formatRs(-difference)) : difference > 0 ? t('cashExtra').replace('{amount}', formatRs(difference)) : t('cashMatch')}
          </p>
        )}
        <NumberKeypad value={counted} onChange={(n) => { setCounted(n); setTouched(true); }} />

        {noteOpen ? (
          <TextField label={t('cashNote')} value={note} maxLength={300} autoFocus onChange={(e) => setNote(e.target.value)} />
        ) : (
          <Chip onClick={() => setNoteOpen(true)}>{t('addNote')}</Chip>
        )}
        {failed && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('errorGeneric')}</p>
          </Card>
        )}
      </div>
      <BottomActionBar>
        <BigButton full size="lg" onClick={save} disabled={saving || !touched}>{t('cashSaveClose')}</BigButton>
      </BottomActionBar>
      <SaveSuccess show={saved} label={t('cashClosedSaved')} duration={900} onDone={() => navigate(`/cashbook?day=${day}`, { replace: true })} />
    </main>
  );
}

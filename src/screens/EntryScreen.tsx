import { useState } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Chip } from '../components/Chip';
import { Icon } from '../components/Icon';
import { NumberKeypad } from '../components/NumberKeypad';
import { SaveSuccess } from '../components/SaveSuccess';
import { ScreenHeader } from '../components/ScreenHeader';
import { entriesRepo, partiesRepo, useLive } from '../data';
import { useT } from '../i18n/i18n';
import { partyBalance } from '../lib/balance';
import { cx } from '../lib/cx';
import { TextField } from '../components/TextField';
import { finishFlow, goBack, navigate, setFlash } from '../lib/router';

// Write a Diye (I gave) or Mile (I received) for one customer.
// Step 1: type the amount. Step 2: check it, then "Theek hai" saves it. Wapas lo comes after.
export function EntryScreen({ partyId, kind }: { partyId: string; kind: 'diye' | 'mile' }) {
  const { t } = useT();
  const data = useLive(
    async () => ({ party: (await partiesRepo.get(partyId)) ?? null, entries: await entriesRepo.listForParty(partyId) }),
    [partyId],
  );
  // "Badlo" on the voice screen opens this with the spoken amount already typed (?amount=500)
  const [amount, setAmount] = useState(() => {
    const typed = Number(new URLSearchParams(window.location.search).get('amount'));
    return Number.isInteger(typed) && typed > 0 && typed <= 999_999_999 ? typed : 0;
  });
  const [step, setStep] = useState<'amount' | 'confirm'>('amount');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);

  const back = () => goBack(`/party/${partyId}`);
  if (data === undefined) return <main className="mx-auto min-h-screen max-w-app" />;
  const { party, entries } = data;
  if (!party) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('appName')} onBack={() => goBack('/')} />
        <EmptyState title={t('partyNotFound')} body="" buttonLabel={t('goHome')} onButton={() => navigate('/', { replace: true })} />
      </main>
    );
  }

  const out = kind === 'diye';
  const newBalance = partyBalance(party, entries) + (out ? amount : -amount);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const entry = await entriesRepo.create({ kind, party_id: party.id, amount, note });
      setFlash({ kind: 'undoEntry', entryId: entry.id });
      setSaved(true);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  if (step === 'confirm') {
    return (
      <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
        <ScreenHeader title={t('confirmQuestion')} onBack={() => setStep('amount')} />
        <div className="px-gutter pt-5">
          <Card className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="min-w-0">
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
              {t(kind)}
            </span>
            <AmountText amount={amount} size="xl" tone={out ? 'out' : 'in'} reveal />
            <div className="flex items-baseline gap-2 text-inkSoft">
              <span className="text-label font-semibold">{t('newBalance')}:</span>
              <AmountText amount={Math.abs(newBalance)} size="s" tone={newBalance > 0 ? 'out' : 'neutral'} room="140px" />
            </div>
          </Card>
          <div className="mt-4">
            {noteOpen ? (
              <TextField label={t('noteLabel')} placeholder={t('notePlaceholder')} value={note} maxLength={300} autoFocus onChange={(e) => setNote(e.target.value)} />
            ) : (
              <Chip onClick={() => setNoteOpen(true)}>{t('addNote')}</Chip>
            )}
          </div>
          {failed && (
            <Card tone="soft" className="mt-4" role="alert">
              <p className="text-body font-bold">{t('errorGeneric')}</p>
            </Card>
          )}
        </div>
        <BottomActionBar>
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <BigButton size="lg" variant="ghost" icon="edit" onClick={() => setStep('amount')} disabled={saving}>{t('badlo')}</BigButton>
            <BigButton size="lg" onClick={save} disabled={saving}>{t('theekHai')}</BigButton>
          </div>
        </BottomActionBar>
        <SaveSuccess show={saved} label={t('saved')} duration={900} onDone={() => finishFlow(`/party/${partyId}`)} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t(kind)} subtitle={party.name} onBack={back} />
      <div className="flex flex-col gap-4 px-gutter pt-5">
        <div className="text-center">
          <AmountText amount={amount} size="xl" tone={out ? 'out' : 'in'} reveal />
        </div>
        <NumberKeypad value={amount} onChange={setAmount} />
      </div>
      <BottomActionBar>
        <BigButton full size="lg" disabled={amount <= 0} onClick={() => setStep('confirm')}>{t('next')}</BigButton>
      </BottomActionBar>
    </main>
  );
}

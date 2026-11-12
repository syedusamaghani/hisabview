import { useRef, useState } from 'react';
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
import type { TextKey } from '../i18n/translations';
import { partyBalance } from '../lib/balance';
import { cx } from '../lib/cx';
import { TextField } from '../components/TextField';
import { goBack, navigate, setFlash } from '../lib/router';
import { finishEntryFlow } from '../lib/phoneAsk';

// "Badlo" on a saved entry: the same entry screen with the amount and note already filled in.
// Saving writes the new entry and then cancels the old one (both are kept in the diary, nothing is deleted).
export function changeEntryPath(entry: { id: string; kind: string; party_id: string | null; amount: number; note: string | null }): string | null {
  const q = `?amount=${entry.amount}&from=${entry.id}${entry.note ? `&note=${encodeURIComponent(entry.note)}` : ''}`;
  if ((entry.kind === 'diye' || entry.kind === 'mile') && entry.party_id) return `/party/${entry.party_id}/${entry.kind}${q}`;
  if (entry.kind === 'cash_sale') return `/today/sale${q}`;
  if (entry.kind === 'kharcha') return `/today/kharcha${q}`;
  return null;
}

export type EntryKind = 'diye' | 'mile' | 'cash_sale' | 'kharcha';

const KIND_TEXT: Record<EntryKind, TextKey> = { diye: 'diye', mile: 'mile', cash_sale: 'saleLabel', kharcha: 'kharchaLabel' };

// Write a Diye (I gave), Mile (I received), a cash Sale or a Kharcha (money spent).
// Diye and Mile are for one customer (partyId). Sale and Kharcha have no customer.
// Step 1: type the amount. Step 2: check it, then "Theek hai" saves it. Wapas lo comes after.
export function EntryScreen({ partyId, kind }: { partyId?: string; kind: EntryKind }) {
  const { t } = useT();
  const data = useLive(
    async () => (partyId ? { party: (await partiesRepo.get(partyId)) ?? null, entries: await entriesRepo.listForParty(partyId) } : { party: null, entries: [] }),
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
  const query = new URLSearchParams(window.location.search);
  const changing = query.get('from'); // the saved entry being replaced
  const [note, setNote] = useState(() => (changing ? (query.get('note') ?? '') : ''));
  const [noteOpen, setNoteOpen] = useState(() => !!(changing && query.get('note')));
  const newId = useRef<string | null>(null);
  const [duplicate, setDuplicate] = useState(false); // the same entry was saved a moment ago: warned once, the next tap saves

  const home = partyId ? `/party/${partyId}` : '/today';
  const back = () => goBack(home);
  if (data === undefined) return <main className="mx-auto min-h-screen max-w-app" />;
  const { party, entries } = data;
  if (partyId && !party) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('appName')} onBack={() => goBack('/')} />
        <EmptyState title={t('partyNotFound')} body="" buttonLabel={t('goHome')} onButton={() => navigate('/', { replace: true })} />
      </main>
    );
  }

  // Red = money went out (diye, kharcha). Green = money came in (mile, sale).
  const out = kind === 'diye' || kind === 'kharcha';
  const label = t(KIND_TEXT[kind]);
  const newBalance = party ? partyBalance(party, entries) + (kind === 'diye' ? amount : kind === 'mile' ? -amount : 0) : 0;

  const save = async () => {
    if (saving) return;
    setFailed(false);
    // The same entry two minutes ago (a double tap, or the customer repeated it)? Warn once; pressing again saves it.
    if (!duplicate && !newId.current && !changing && (await entriesRepo.findRecentDuplicate({ kind, party_id: party?.id ?? null, amount }))) {
      setDuplicate(true);
      return;
    }
    setSaving(true);
    try {
      // On a retry the new entry already exists: only the cancel is left to do
      if (!newId.current) newId.current = (await entriesRepo.create({ kind, party_id: party?.id ?? null, amount, note })).id;
      if (changing) await entriesRepo.cancel(changing, 'changed').catch((e) => { if (!/already cancelled/.test(String(e))) throw e; });
      setFlash({ kind: 'undoEntry', entryId: newId.current });
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
            {party && (
              <div className="min-w-0">
                <p dir="auto" className="truncate text-title font-extrabold">{party.name}</p>
                {party.identifier && <p dir="auto" className="truncate text-label text-inkSoft">{party.identifier}</p>}
              </div>
            )}
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-full px-4 py-1 text-body font-extrabold',
                out ? 'bg-moneyOutSoft text-moneyOut' : 'bg-moneyInSoft text-moneyIn',
              )}
            >
              <Icon name={out ? 'up' : 'down'} size={22} />
              {label}
            </span>
            <AmountText amount={amount} size="xl" tone={out ? 'out' : 'in'} reveal />
            {party && (
              <div className="flex items-baseline gap-2 text-inkSoft">
                <span className="text-label font-semibold">{t('newBalance')}:</span>
                <AmountText amount={Math.abs(newBalance)} size="s" tone={newBalance > 0 ? 'out' : 'neutral'} room="140px" />
              </div>
            )}
          </Card>
          <div className="mt-4">
            {noteOpen ? (
              <TextField label={t('noteLabel')} placeholder={t('notePlaceholder')} value={note} maxLength={300} autoFocus onChange={(e) => setNote(e.target.value)} />
            ) : (
              <Chip onClick={() => setNoteOpen(true)}>{t('addNote')}</Chip>
            )}
          </div>
          {duplicate && (
            <Card tone="soft" className="mt-4" role="alert">
              <p className="text-body font-bold">{t('duplicateWarn')}</p>
            </Card>
          )}
          {failed && (
            <Card tone="soft" className="mt-4" role="alert">
              <p className="text-body font-bold">{t('errorGeneric')}</p>
            </Card>
          )}
        </div>
        <BottomActionBar>
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <BigButton size="lg" variant="ghost" icon="edit" onClick={() => { setDuplicate(false); setStep('amount'); }} disabled={saving}>{t('badlo')}</BigButton>
            <BigButton size="lg" onClick={save} disabled={saving}>{t('theekHai')}</BigButton>
          </div>
        </BottomActionBar>
        <SaveSuccess show={saved} label={t('saved')} duration={900} onDone={() => finishEntryFlow(party, home)} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={label} subtitle={party?.name} onBack={back} />
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

import { useRef, useState } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { ChoiceCard } from '../components/ChoiceCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { MAX_AMOUNT, partiesRepo, type OpeningBalance } from '../data';
import { useT } from '../i18n/i18n';
import { contactPickerSupported, pickContact } from '../lib/contacts';
import { successFeedback } from '../lib/feedback';

type Direction = OpeningBalance['direction'];
type Added = { id: string; name: string; amount: number; direction: Direction };

// Optional step: write down old balances. Name, (pehchaan), amount, and who owes whom.
// "Baad mein" is always at the bottom, so nobody feels stuck.
export function OldBalancesScreen({ onFinish }: { onFinish: () => void }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [direction, setDirection] = useState<Direction>('theyOweMe');
  const [added, setAdded] = useState<Added[]>([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const ready = name.trim().length > 0 && amount > 0;

  const pick = async () => {
    const contact = await pickContact();
    if (!contact) return;
    if (contact.name) setName(contact.name);
    setPhone(contact.phone);
  };

  const add = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const { party } = await partiesRepo.create({ name, identifier, phone, opening: { amount, direction } });
      successFeedback();
      setAdded((list) => [...list, { id: party.id, name: party.name, amount, direction }]);
      setName('');
      setIdentifier('');
      setPhone(null);
      setAmount(0);
      nameRef.current?.focus();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('oldTitle')} />
      <div className="flex flex-col gap-4 px-gutter pt-5">
        <p className="text-body text-inkSoft">{t('oldBody')}</p>
        {added.length > 0 && (
          <Card tone="soft" aria-live="polite">
            <p className="mb-2 text-label font-bold text-inkSoft">{t('addedSoFar')}</p>
            <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
              {added.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <span dir="auto" className="min-w-0 truncate text-body font-bold">{a.name}</span>
                  <AmountText amount={a.amount} size="s" tone={a.direction === 'theyOweMe' ? 'out' : 'neutral'} room="140px" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {contactPickerSupported() && (
          <BigButton full variant="ghost" icon="userPlus" onClick={pick}>{t('pickContact')}</BigButton>
        )}

        <TextField ref={nameRef} label={t('nameLabel')} placeholder={t('namePlaceholder')} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <TextField
          label={t('identifierLabel')}
          placeholder={t('identifierPlaceholder')}
          value={identifier}
          maxLength={80}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <TextField
          label={t('amountLabel')}
          placeholder="0"
          inputMode="numeric"
          dir="ltr"
          size="lg"
          value={amount === 0 ? '' : amount.toLocaleString('en-US')}
          onChange={(e) => setAmount(Math.min(MAX_AMOUNT, Number(e.target.value.replace(/\D/g, '')) || 0))}
        />

        <div role="radiogroup" aria-label={t('whoOwesLabel')} className="flex flex-col gap-3">
          <ChoiceCard title={t('theyOweMe')} icon="up" className="!min-h-tap" selected={direction === 'theyOweMe'} onSelect={() => setDirection('theyOweMe')} />
          <ChoiceCard title={t('iOweThem')} icon="down" className="!min-h-tap" selected={direction === 'iOweThem'} onSelect={() => setDirection('iOweThem')} />
        </div>

        {failed && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t('errorGeneric')}</p>
          </Card>
        )}
      </div>

      <BottomActionBar>
        <div className="grid grid-cols-2 gap-3">
          <BigButton size="lg" variant="ghost" onClick={onFinish}>{added.length > 0 ? t('allDone') : t('later')}</BigButton>
          <BigButton size="lg" icon="plus" onClick={add} disabled={!ready || saving}>{t('addPerson')}</BigButton>
        </div>
      </BottomActionBar>
    </main>
  );
}

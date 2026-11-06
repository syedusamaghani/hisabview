import { useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { NumberKeypad } from '../../components/NumberKeypad';
import { OptionButton } from '../../components/OptionButton';
import { PartyRow } from '../../components/PartyRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import type { Party } from '../../data';
import { useT } from '../../i18n/i18n';
import { questionText, type ParseQuestion, type ParsedKind } from '../../voice';

// One short question with big answers to tap. There is no typing box:
// the amount uses the same big number keys as the normal entry screen.
type Props = {
  question: ParseQuestion;
  parties: Party[]; // everyone, so options can show their balance
  balances: Record<string, number>;
  recent: Party[]; // people dealt with lately (for "who?")
  onKind: (kind: 'diye' | 'mile') => void;
  onAmount: (amount: number) => void;
  onParty: (party: Party) => void;
  onAddParty: () => void;
  onNoParty: () => void;
  onOtherParty: () => void;
  onRetry: () => void;
  onBack: () => void;
};

export function QuestionView(p: Props) {
  const { t, lang } = useT();
  const { question: q } = p;
  // When the amount is being corrected from the check card, start from the amount that was heard
  const [typed, setTyped] = useState(q.question === 'amount' ? (q.partial.amount ?? 0) : 0);
  const byId = new Map(p.parties.map((x) => [x.id, x]));
  const known = q.partial;

  const kindName = (k: ParsedKind) => (k === 'diye' ? t('diye') : k === 'mile' ? t('mile') : '');
  const bar = q.question === 'kind' || q.question === 'new_party' || q.question === 'amount';

  return (
    <main className={bar ? 'mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+16px)]' : 'mx-auto min-h-screen max-w-app pb-8'}>
      <ScreenHeader title={t('voiceTitle')} onBack={p.onBack} />
      <div className="flex flex-col gap-4 px-gutter pt-5">
        {/* The question is the main thing on this screen: big, and never cut short */}
        <h2 role="heading" aria-level={2} className="text-display font-extrabold leading-tight text-ink">{questionText(q, lang)}</h2>

        {(known.party || known.amount || known.kind) && (
          <Card pattern className="flex flex-col gap-1">
            <p className="text-caption font-bold text-inkSoft">{t('understood')}</p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {known.party && <span dir="auto" className="text-body font-extrabold text-ink">{known.party.name}</span>}
              {known.kind && <span className="text-body font-bold text-inkSoft">{kindName(known.kind)}</span>}
              {known.amount && <AmountText amount={known.amount} size="s" tone={known.kind === 'mile' ? 'in' : known.kind === 'diye' ? 'out' : 'neutral'} reveal room="160px" />}
            </div>
          </Card>
        )}

        {q.question === 'which_party' && (
          <ul className="flex flex-col gap-3">
            {q.options?.map((o) => {
              const party = byId.get(o.value);
              if (!party) return null;
              return (
                <li key={o.value}>
                  <PartyRow name={party.name} identifier={party.identifier} balance={p.balances[party.id] ?? 0} onClick={() => p.onParty(party)} />
                </li>
              );
            })}
          </ul>
        )}

        {q.question === 'who' && (
          <ul className="flex flex-col gap-3">
            {p.recent.map((party) => (
              <li key={party.id}>
                <PartyRow name={party.name} identifier={party.identifier} balance={p.balances[party.id] ?? 0} onClick={() => p.onParty(party)} />
              </li>
            ))}
            <li>
              <OptionButton title={t('anotherCustomer')} onClick={p.onOtherParty} />
            </li>
          </ul>
        )}

        {q.question === 'which_amount' && (
          <ul className="flex flex-col gap-3">
            {q.options?.map((o) => (
              <li key={o.value}>
                <OptionButton
                  center
                  title={<AmountText amount={Number(o.value)} size="l" tone={known.kind === 'mile' ? 'in' : known.kind === 'diye' ? 'out' : 'neutral'} reveal />}
                  onClick={() => p.onAmount(Number(o.value))}
                />
              </li>
            ))}
          </ul>
        )}

        {q.question === 'new_party' && (
          <Card className="py-8 text-center">
            <p dir="auto" className="break-words text-display font-extrabold text-ink">{q.name}</p>
          </Card>
        )}

        {q.question === 'amount' && (
          <>
            <div className="text-center">
              <AmountText amount={typed} size="xl" tone="neutral" reveal />
            </div>
            <NumberKeypad value={typed} onChange={setTyped} />
          </>
        )}

        <BigButton full variant="ghost" icon="mic" onClick={p.onRetry}>{t('voiceRetry')}</BigButton>
      </div>

      {q.question === 'kind' && (
        <BottomActionBar>
          <div className="grid grid-cols-2 gap-3">
            <BigButton size="lg" variant="diye" icon="up" onClick={() => p.onKind('diye')}>{t('diye')}</BigButton>
            <BigButton size="lg" variant="mile" icon="down" onClick={() => p.onKind('mile')}>{t('mile')}</BigButton>
          </div>
        </BottomActionBar>
      )}
      {q.question === 'new_party' && (
        <BottomActionBar>
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <BigButton size="lg" variant="ghost" onClick={p.onNoParty}>{t('no')}</BigButton>
            <BigButton size="lg" onClick={p.onAddParty}>{t('yesAddParty')}</BigButton>
          </div>
        </BottomActionBar>
      )}
      {q.question === 'amount' && (
        <BottomActionBar>
          <BigButton full size="lg" disabled={typed <= 0} onClick={() => p.onAmount(typed)}>{t('next')}</BigButton>
        </BottomActionBar>
      )}
    </main>
  );
}

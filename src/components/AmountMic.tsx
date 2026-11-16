import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/i18n';
import type { TextKey } from '../i18n/translations';
import { formatRs } from '../lib/money';
import { listen, preferredLangs, speechSupported, type Listener } from '../voice/speech';
import { Icon } from './Icon';

// The small mic of the amount step: say only a number ("paanch sau") and it is typed for you.
// It never saves anything; the amount still goes through the check card. Hidden on a phone that cannot listen.
export function AmountMic({ onAmount }: { onAmount: (amount: number) => void }) {
  const { t } = useT();
  const [state, setState] = useState<'idle' | 'listening' | 'working'>('idle');
  const [note, setNote] = useState('');
  const listener = useRef<Listener | null>(null);
  useEffect(() => () => listener.current?.abort(), []);
  if (!speechSupported()) return null;

  const tap = () => {
    if (state === 'listening') {
      listener.current?.stop();
      return;
    }
    if (state === 'working') return;
    setNote('');
    setState('listening');
    listener.current = listen({
      lang: preferredLangs()[0],
      silenceMs: 900,
      waitMs: 6000,
      onText: () => undefined,
      onEnd: (text) => {
        setState('working');
        void import('../voice/amount')
          .then(({ parseAmount }) => parseAmount(text))
          .then((amount) => {
            if (amount) {
              onAmount(amount);
              setNote(t('amountHeard').replace('{amount}', formatRs(amount)));
            } else setNote(t('amountNotHeard'));
          })
          .catch(() => setNote(t('amountNotHeard')))
          .finally(() => setState('idle'));
      },
      onProblem: (problem) => {
        setState('idle');
        const words: Record<string, TextKey> = { denied: 'amountMicDenied', offline: 'amountMicOffline', unsupported: 'amountMicDenied' };
        setNote(t(words[problem] ?? 'amountNotHeard'));
      },
    });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={tap}
        aria-pressed={state === 'listening'}
        className="inline-flex min-h-tap items-center gap-2 rounded-full bg-primarySoft px-5 text-body font-extrabold text-primary focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Icon name="mic" size={24} />
        {state === 'listening' ? t('amountListening') : state === 'working' ? t('amountWorking') : t('amountMic')}
      </button>
      {note && <p role="status" className="text-label text-inkSoft">{note}</p>}
    </div>
  );
}

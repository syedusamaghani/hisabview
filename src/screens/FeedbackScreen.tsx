import { useState } from 'react';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { ChoiceCard } from '../components/ChoiceCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { TickBadge } from '../components/SaveSuccess';
import { sync } from '../data';
import { useT } from '../i18n/i18n';
import type { TextKey } from '../i18n/translations';
import { outbox } from '../lib/outbox';
import { APP_VERSION } from '../lib/report';
import { goBack } from '../lib/router';

// "Hamein batayein": a masla, an idea or a thank-you, in a few words. It is kept on the phone and goes to
// us as soon as there is internet, so it works offline too. Read in the Supabase dashboard (table feedback).
const KINDS: { kind: 'problem' | 'idea' | 'thanks'; label: TextKey }[] = [
  { kind: 'problem', label: 'kindProblem' },
  { kind: 'idea', label: 'kindIdea' },
  { kind: 'thanks', label: 'kindThanks' },
];

export function FeedbackScreen() {
  const { t } = useT();
  const [kind, setKind] = useState<'problem' | 'idea' | 'thanks'>('problem');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const ready = message.trim().length > 0;

  const send = () => {
    if (!ready) return;
    outbox.add('feedback', { kind, message: message.trim().slice(0, 1000), app_version: APP_VERSION, created_at: new Date().toISOString() });
    void sync.flushOutbox(); // goes now if there is internet, else later
    setSent(true);
  };

  if (sent) {
    return (
      <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
        <ScreenHeader title={t('feedbackTitle')} onBack={() => goBack('/settings')} />
        <div className="flex flex-col items-center gap-5 px-gutter pt-12 text-center">
          <TickBadge size={96} />
          <Card className="w-full" role="status">
            <p className="text-title font-extrabold text-ink">{t('feedbackSent')}</p>
            {!navigator.onLine && <p className="mt-1 text-body text-inkSoft">{t('feedbackQueued')}</p>}
          </Card>
        </div>
        <BottomActionBar>
          <BigButton full size="lg" onClick={() => goBack('/settings')}>{t('theekHai')}</BigButton>
        </BottomActionBar>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('feedbackTitle')} onBack={() => goBack('/settings')} />
      <div className="flex flex-col gap-4 px-gutter pt-5">
        <p className="text-body text-inkSoft">{t('feedbackHint')}</p>
        <div role="radiogroup" aria-label={t('feedbackTitle')} className="flex flex-col gap-3">
          {KINDS.map((k) => (
            <ChoiceCard key={k.kind} title={t(k.label)} selected={kind === k.kind} onSelect={() => setKind(k.kind)} className="!min-h-tap" />
          ))}
        </div>
        <textarea
          dir={message ? 'auto' : undefined}
          value={message}
          maxLength={1000}
          rows={5}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('feedbackPlaceholder')}
          aria-label={t('feedbackTitle')}
          className="min-h-[140px] w-full rounded-button border-[1.5px] border-line bg-surface p-4 text-body font-semibold text-ink shadow-card placeholder:font-normal placeholder:text-inkSoft/90 focus:border-primary focus:outline focus:outline-[3px] focus:outline-accent"
        />
      </div>
      <BottomActionBar>
        <BigButton full size="lg" disabled={!ready} onClick={send}>{t('feedbackSend')}</BigButton>
      </BottomActionBar>
    </main>
  );
}

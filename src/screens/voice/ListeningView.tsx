import { BigButton } from '../../components/BigButton';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { ListeningMic } from '../../components/ListeningMic';
import { useT } from '../../i18n/i18n';

// The screen while the phone listens. Everything fits on one screen with NO scrolling (even on a small
// phone with the browser bars showing): a mic, what is heard so far, and one big "Ruko" button at the bottom.
// It stops by itself when you stop talking (or right after you say the amount). Ruko always works:
// while listening it stops listening, while the sentence is being read it goes back.
type Props = { heard: string; working: boolean; onStop: () => void; onType: () => void; onBack: () => void };

export function ListeningView({ heard, working, onStop, onType, onBack }: Props) {
  const { t } = useT();
  return (
    <main className="mx-auto flex h-[100dvh] max-w-app flex-col overflow-hidden bg-primary text-primaryInk">
      <header className="flex min-h-[64px] shrink-0 items-center gap-2 px-gutter pt-[calc(env(safe-area-inset-top,0px)+8px)]">
        <IconButton icon="back" flip label={t('back')} tone="onBrand" onClick={onBack} />
        <h1 className="flex-1 truncate text-title font-extrabold">{t('voiceTitle')}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-gutter">
        <div className="p-4">
          <ListeningMic active={!working} label={t('mic')} size={96} />
        </div>
        <p role="status" className="min-h-[32px] text-title font-extrabold text-accent">{working ? '' : t('listening')}</p>
        <div aria-live="polite" className="flex max-h-[28vh] min-h-[72px] w-full items-center justify-center overflow-y-auto rounded-card bg-surface p-4 text-center">
          <p dir="auto" className={heard ? 'text-title font-extrabold leading-snug text-ink' : 'text-body text-inkSoft'}>
            {heard || t('voiceHint')}
          </p>
        </div>
        <button
          type="button"
          onClick={onType}
          className="inline-flex min-h-tap items-center gap-2 rounded-button px-4 text-body font-extrabold text-primaryInk underline decoration-2 underline-offset-4"
        >
          <Icon name="edit" size={22} />
          {t('typeInstead')}
        </button>
      </div>

      <div className="shrink-0 px-gutter pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3">
        <BigButton full size="lg" variant="accent" icon="stop" onClick={working ? onBack : onStop}>
          {t('ruko')}
        </BigButton>
      </div>
    </main>
  );
}

import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Icon } from '../../components/Icon';
import { IconButton } from '../../components/IconButton';
import { ListeningMic } from '../../components/ListeningMic';
import { useT } from '../../i18n/i18n';

// The screen while the phone listens: brown, a big mic with spreading rings, what is heard so far
// in large text, and one big "Ruko" button. It stops by itself when you stop talking.
type Props = { heard: string; working: boolean; onStop: () => void; onType: () => void; onBack: () => void };

export function ListeningView({ heard, working, onStop, onType, onBack }: Props) {
  const { t } = useT();
  return (
    <main className="mx-auto flex min-h-screen max-w-app flex-col bg-primary pb-[var(--bar-h)] text-primaryInk">
      <header className="flex min-h-[64px] items-center gap-2 bg-jali px-gutter pt-[calc(env(safe-area-inset-top,0px)+8px)]">
        <IconButton icon="back" flip label={t('back')} tone="onBrand" onClick={onBack} />
        <h1 className="flex-1 truncate text-title font-extrabold">{t('voiceTitle')}</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-gutter py-6">
        <div className="p-8">
          <ListeningMic active={!working} label={t('mic')} />
        </div>
        <p role="status" className="text-title font-extrabold text-accent">{working ? '' : t('listening')}</p>
        {!heard && <p className="text-center text-body text-primarySoft">{t('voiceHint')}</p>}
        <button
          type="button"
          onClick={onType}
          disabled={working}
          className="inline-flex min-h-tap items-center gap-2 rounded-button px-4 text-body font-extrabold text-primaryInk underline decoration-2 underline-offset-4 disabled:opacity-50"
        >
          <Icon name="edit" size={22} />
          {t('typeInstead')}
        </button>
      </div>

      <div className="px-gutter pb-4">
        <div
          aria-live="polite"
          className="flex min-h-[132px] items-center justify-center rounded-card bg-surface bg-jaliSoft p-4 text-center shadow-card"
        >
          <p dir="auto" className={heard ? 'text-title font-extrabold leading-snug text-ink' : 'text-title text-inkSoft/60'}>
            {heard || '...'}
          </p>
        </div>
      </div>

      <BottomActionBar>
        <BigButton full size="lg" variant="accent" icon="stop" disabled={working} onClick={onStop}>
          {t('ruko')}
        </BigButton>
      </BottomActionBar>
    </main>
  );
}

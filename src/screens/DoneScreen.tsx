import { useEffect } from 'react';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { TickBadge } from '../components/SaveSuccess';
import { ScreenHeader } from '../components/ScreenHeader';
import { useT } from '../i18n/i18n';
import { successFeedback } from '../lib/feedback';

// "Your shop is ready." Offers the optional step of writing old balances, or skipping it.
export function DoneScreen({ shopName, onOld, onSkip }: { shopName: string; onOld: () => void; onSkip: () => void }) {
  const { t } = useT();

  useEffect(() => {
    successFeedback();
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      <div className="flex flex-col items-center gap-4 px-gutter pt-12 text-center">
        <div className="animate-pop">
          <TickBadge size={112} />
        </div>
        <h2 className="text-title font-extrabold text-ink">{t('doneTitle')}</h2>
        <p dir="auto" className="max-w-full truncate text-body font-bold text-primary">{shopName}</p>
        <p className="max-w-[30ch] text-body text-inkSoft">{t('doneBody')}</p>
      </div>
      <BottomActionBar>
        <div className="flex flex-col gap-3">
          <BigButton full size="lg" icon="note" onClick={onOld}>{t('oldStart')}</BigButton>
          <BigButton full variant="ghost" onClick={onSkip}>{t('later')}</BigButton>
        </div>
      </BottomActionBar>
    </main>
  );
}

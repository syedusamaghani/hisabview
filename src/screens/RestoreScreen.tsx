import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../state/auth';
import { useT } from '../i18n/i18n';

// A login that already has a shop on the internet (a new phone, or the app was cleared):
// the khata is brought back before anything else, so no second shop is made by mistake.
export function RestoreScreen({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const { t } = useT();
  const { signOut } = useAuth();
  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      <div className="flex flex-col items-center gap-5 px-gutter pt-12 text-center">
        <span aria-hidden="true" className={`grid size-24 place-items-center rounded-full bg-primarySoft text-primary ${failed ? '' : 'animate-pulse'}`}>
          <Icon name="cloud" size={52} />
        </span>
        <Card className="w-full" role={failed ? 'alert' : 'status'}>
          <p className="text-title font-extrabold leading-snug text-ink">{failed ? t('restoreFailed') : t('restoreTitle')}</p>
          {!failed && <p className="mt-1 text-body text-inkSoft">{t('restoreWait')}</p>}
        </Card>
      </div>
      {failed && (
        <BottomActionBar>
          <div className="flex flex-col gap-3">
            <BigButton full size="lg" onClick={onRetry}>{t('restoreRetry')}</BigButton>
            <BigButton full variant="ghost" onClick={signOut}>{t('logout')}</BigButton>
          </div>
        </BottomActionBar>
      )}
    </main>
  );
}

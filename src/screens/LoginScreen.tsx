import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { useT } from '../i18n/i18n';
import { useAuth } from '../state/auth';

// One screen, one button: log in with Google.
export function LoginScreen() {
  const { t } = useT();
  const { status, failed, signInWithGoogle } = useAuth();
  const notReady = status === 'unavailable';

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      <div className="px-gutter pt-6">
        <Card pattern className="flex flex-col gap-2">
          <h1 className="text-title font-extrabold">{t('loginTitle')}</h1>
          <p className="text-body text-inkSoft">{t('loginBody')}</p>
        </Card>
        {(failed || notReady) && (
          <Card tone="soft" className="mt-4" role="alert">
            <p className="text-body font-bold">{notReady ? t('loginNotReady') : t('loginError')}</p>
          </Card>
        )}
      </div>
      <BottomActionBar>
        <BigButton full size="lg" icon="person" disabled={notReady || status === 'loading'} onClick={signInWithGoogle}>
          {t('loginGoogle')}
        </BigButton>
      </BottomActionBar>
    </main>
  );
}

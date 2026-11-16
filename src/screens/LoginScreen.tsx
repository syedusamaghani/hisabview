import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { ScreenHeader } from '../components/ScreenHeader';
import { useT } from '../i18n/i18n';
import { useAuth } from '../state/auth';

// One screen, one button: log in with Google.
export function LoginScreen() {
  const { t } = useT();
  const { status, failed, signInWithGoogle, continueAsGuest } = useAuth();
  const notReady = status === 'unavailable';

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      <div className="px-gutter pt-6">
        <Logo size={96} className="mx-auto mb-5" />
        <Card pattern className="flex flex-col gap-2">
          <h1 className="text-title font-extrabold">{t('loginTitle')}</h1>
          <p className="text-body text-inkSoft">{t('loginBody')}</p>
        </Card>
        {failed && (
          <Card tone="soft" className="mt-4" role="alert">
            <p className="text-body font-bold">{t('loginError')}</p>
          </Card>
        )}
        <a href="/privacy" className="mt-4 flex min-h-tap items-center justify-center text-label font-bold text-primary underline">
          {t('privacyLink')}
        </a>
      </div>
      <BottomActionBar>
        <div className="flex flex-col gap-3">
          <BigButton full size="lg" onClick={continueAsGuest}>
            {t('loginGuest')}
          </BigButton>
          <p className="text-center text-label text-inkSoft">{t('loginGuestHint')}</p>
          <BigButton full variant="ghost" icon="person" disabled={notReady || status === 'loading'} onClick={signInWithGoogle}>
            {t('loginGoogle')}
          </BigButton>
        </div>
      </BottomActionBar>
    </main>
  );
}

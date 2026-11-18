import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { Logo } from '../components/Logo';
import { useT } from '../i18n/i18n';
import { useAuth } from '../state/auth';

// First screen: a clean centred welcome. Start now (no login), or log in with Google. Nothing is fixed to the bottom.
export function LoginScreen() {
  const { t } = useT();
  const { status, failed, signInWithGoogle, continueAsGuest } = useAuth();
  const notReady = status === 'unavailable';

  return (
    <main className="mx-auto flex min-h-screen max-w-app flex-col items-center justify-center gap-6 px-gutter py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo size={88} />
        <h1 className="text-display font-extrabold text-ink">{t('appName')}</h1>
        <p className="text-body text-inkSoft">{t('tagline')}</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <BigButton full size="lg" onClick={continueAsGuest}>
          {t('loginGuest')}
        </BigButton>
        <p className="text-label text-inkSoft">{t('loginGuestHint')}</p>
        <div className="my-1 flex items-center gap-3 text-caption text-inkSoft" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span>{t('loginOr')}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <BigButton full variant="ghost" icon="person" disabled={notReady || status === 'loading'} onClick={signInWithGoogle}>
          {t('loginGoogle')}
        </BigButton>
      </div>

      {failed && (
        <Card tone="soft" className="w-full" role="alert">
          <p className="text-body font-bold">{t('loginError')}</p>
        </Card>
      )}
      <a href="/privacy" className="flex min-h-tap items-center justify-center text-label font-bold text-primary underline">
        {t('privacyLink')}
      </a>
    </main>
  );
}

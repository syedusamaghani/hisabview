import { BigButton } from './components/BigButton';
import { Card } from './components/Card';
import { EmptyState } from './components/EmptyState';
import { HideAmountsButton } from './components/IconButton';
import { ScreenHeader } from './components/ScreenHeader';
import { useT } from './i18n/i18n';
import { LoginScreen } from './screens/LoginScreen';
import { useAuth } from './state/auth';

// Temporary home screen. The real screens come in the next chunk.
export function App() {
  const { t } = useT();
  const { status, email, signOut } = useAuth();

  if (status === 'loading') {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      </main>
    );
  }
  if (status !== 'signedIn') return <LoginScreen />;

  return (
    <main className="mx-auto min-h-screen max-w-app">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} right={<HideAmountsButton tone="onBrand" />} />
      <div className="px-gutter pt-4">
        <Card className="flex flex-col gap-3">
          <p className="text-label font-semibold text-inkSoft">{t('signedInAs')}</p>
          <p className="latin break-all text-body font-bold rtl:text-right" dir="ltr">{email}</p>
          <BigButton full variant="ghost" onClick={signOut}>{t('logout')}</BigButton>
        </Card>
      </div>
      <EmptyState title={t('emptyTitle')} body={t('emptyBody')} buttonLabel={t('emptyButton')} onButton={() => undefined} />
    </main>
  );
}

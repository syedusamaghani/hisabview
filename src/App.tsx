import { Suspense, lazy } from 'react';
import { ScreenHeader } from './components/ScreenHeader';
import { useT } from './i18n/i18n';
import { LanguageScreen } from './screens/LanguageScreen';
import { LoginScreen } from './screens/LoginScreen';
import { useAuth } from './state/auth';

// The logged-in part (with the phone's database) is loaded only after login
const SignedInApp = lazy(() => import('./SignedInApp'));

function Splash() {
  const { t } = useT();
  return (
    <main className="mx-auto min-h-screen max-w-app">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
    </main>
  );
}

// First launch: language -> Google login -> (shop name -> done -> old balances) -> home.
// Next launches skip straight to home.
export function App() {
  const { langChosen } = useT();
  const { status } = useAuth();

  if (!langChosen) return <LanguageScreen />;
  if (status === 'loading') return <Splash />;
  if (status !== 'signedIn') return <LoginScreen />;
  return (
    <Suspense fallback={<Splash />}>
      <SignedInApp />
    </Suspense>
  );
}

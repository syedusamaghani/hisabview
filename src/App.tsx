import { Suspense, lazy } from 'react';
import { Logo } from './components/Logo';
import { useT } from './i18n/i18n';
import { LanguageScreen } from './screens/LanguageScreen';
import { LoginScreen } from './screens/LoginScreen';
import { useAuth } from './state/auth';

// The logged-in part (with the phone's database) is loaded only after login
const SignedInApp = lazy(() => import('./SignedInApp'));

function Splash() {
  const { t } = useT();
  return (
    <main className="mx-auto grid min-h-screen max-w-app place-items-center bg-primary bg-jali px-gutter">
      <div className="flex animate-pop flex-col items-center gap-4 text-center">
        <Logo size={112} />
        <div>
          <h1 className="text-display font-extrabold text-primaryInk">{t('appName')}</h1>
          <p className="text-body text-primarySoft">{t('tagline')}</p>
        </div>
      </div>
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

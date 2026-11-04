import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initInstall } from './lib/install';
import { installErrorReporting } from './lib/report';
import { LangProvider } from './i18n/i18n';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { AuthProvider } from './state/auth';
import { PrivacyProvider } from './state/privacy';

// The component gallery (/dev/components) and the voice test page (/dev/voice) are only loaded
// when someone opens them, so they add nothing to the size of the real app.
const ComponentGallery = lazy(() => import('./dev/ComponentGallery'));
const VoiceTest = lazy(() => import('./dev/VoiceTest'));
const devPath = window.location.pathname.replace(/\/$/, '');
const showGallery = devPath === '/dev/components';
const showVoiceTest = devPath === '/dev/voice';
// The privacy policy is public: it opens with no login (Google and new visitors must be able to read it)
const showPrivacy = devPath === '/privacy';
// Hidden test page: breaks on purpose, to see the "Kuch gadbad ho gayi" screen
const showCrash = devPath === '/dev/crash';
function Crash(): never {
  throw new Error('Test crash (/dev/crash)');
}

// Catch the browser's "install" offer early; it fires only once
initInstall();
installErrorReporting();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <PrivacyProvider>
        <ErrorBoundary>
        <Suspense fallback={null}>
          {showGallery ? (
            <ComponentGallery />
          ) : showCrash ? (
            <Crash />
          ) : showPrivacy ? (
            <PrivacyScreen onBack={() => window.location.assign('/')} />
          ) : showVoiceTest ? (
            <VoiceTest />
          ) : (
            <AuthProvider>
              <App />
            </AuthProvider>
          )}
        </Suspense>
        </ErrorBoundary>
      </PrivacyProvider>
    </LangProvider>
  </StrictMode>,
);

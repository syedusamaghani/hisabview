import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { initInstall } from './lib/install';
import { LangProvider } from './i18n/i18n';
import { AuthProvider } from './state/auth';
import { PrivacyProvider } from './state/privacy';

// The component gallery (/dev/components) and the voice test page (/dev/voice) are only loaded
// when someone opens them, so they add nothing to the size of the real app.
const ComponentGallery = lazy(() => import('./dev/ComponentGallery'));
const VoiceTest = lazy(() => import('./dev/VoiceTest'));
const devPath = window.location.pathname.replace(/\/$/, '');
const showGallery = devPath === '/dev/components';
const showVoiceTest = devPath === '/dev/voice';

// Catch the browser's "install" offer early; it fires only once
initInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <PrivacyProvider>
        <Suspense fallback={null}>
          {showGallery ? (
            <ComponentGallery />
          ) : showVoiceTest ? (
            <VoiceTest />
          ) : (
            <AuthProvider>
              <App />
            </AuthProvider>
          )}
        </Suspense>
      </PrivacyProvider>
    </LangProvider>
  </StrictMode>,
);

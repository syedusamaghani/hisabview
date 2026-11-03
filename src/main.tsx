import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { LangProvider } from './i18n/i18n';
import { PrivacyProvider } from './state/privacy';

// The component gallery is only loaded when someone opens /dev/components,
// so it adds nothing to the size of the real app.
const ComponentGallery = lazy(() => import('./dev/ComponentGallery'));
const showGallery = window.location.pathname.replace(/\/$/, '') === '/dev/components';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <PrivacyProvider>
        <Suspense fallback={null}>{showGallery ? <ComponentGallery /> : <App />}</Suspense>
      </PrivacyProvider>
    </LangProvider>
  </StrictMode>,
);

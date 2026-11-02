import { t } from './i18n/translations';

// Temporary home screen. The real screens come in Phase 1.
export function App() {
  return (
    <main className="min-h-full flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="w-24 h-24 rounded-card bg-brand shadow-card flex items-center justify-center">
        <span className="text-white text-title font-bold">H</span>
      </div>
      <h1 className="text-title font-bold text-ink">{t('appName')}</h1>
      <p className="text-body text-inkSoft">{t('tagline')}</p>
    </main>
  );
}

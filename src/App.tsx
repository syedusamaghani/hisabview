import { EmptyState } from './components/EmptyState';
import { HideAmountsButton } from './components/IconButton';
import { ScreenHeader } from './components/ScreenHeader';
import { useT } from './i18n/i18n';

// Temporary home screen. The real screens come in the next phase.
export function App() {
  const { t } = useT();
  return (
    <main className="mx-auto min-h-screen max-w-app">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} right={<HideAmountsButton tone="onBrand" />} />
      <EmptyState title={t('emptyTitle')} body={t('emptyBody')} buttonLabel={t('emptyButton')} onButton={() => undefined} />
    </main>
  );
}

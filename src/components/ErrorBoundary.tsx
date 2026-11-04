import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useT } from '../i18n/i18n';
import { reportError } from '../lib/report';
import { BigButton } from './BigButton';
import { Card } from './Card';
import { Logo } from './Logo';

// If a screen ever crashes, the shopkeeper sees a kind message instead of a white page.
// The problem is reported to us (see lib/report.ts). Their khata is on the phone and is not affected.
function Fallback() {
  const { t } = useT();
  return (
    <main className="mx-auto flex min-h-screen max-w-app flex-col items-center justify-center gap-5 px-gutter text-center">
      <Logo size={84} />
      <Card className="w-full" role="alert">
        <h1 className="text-title font-extrabold text-ink">{t('errTitle')}</h1>
        <p className="mt-1 text-body text-inkSoft">{t('errBody')}</p>
      </Card>
      <BigButton full size="lg" onClick={() => window.location.assign('/')}>{t('errReload')}</BigButton>
    </main>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, `screen (${(info.componentStack ?? '').trim().split('\n')[0] ?? ''})`);
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

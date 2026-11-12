import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { useT } from '../i18n/i18n';
import { useAuth } from '../state/auth';

// The owner switched this login off. Nothing can be written any more (the database refuses it); the khata
// itself is untouched. The person can only log out.
export function AccessOffScreen() {
  const { t } = useT();
  const { signOut } = useAuth();
  return (
    <main className="mx-auto min-h-screen max-w-app pb-[var(--bar-h)]">
      <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      <div className="flex flex-col items-center gap-5 px-gutter pt-12 text-center">
        <span aria-hidden="true" className="grid size-24 place-items-center rounded-full bg-primarySoft text-primary">
          <Icon name="person" size={52} />
        </span>
        <Card className="w-full" role="alert">
          <p className="text-title font-extrabold leading-snug text-ink">{t('accessOffTitle')}</p>
          <p className="mt-1 text-body text-inkSoft">{t('accessOffBody')}</p>
        </Card>
      </div>
      <BottomActionBar>
        <BigButton full variant="ghost" onClick={signOut}>{t('logout')}</BigButton>
      </BottomActionBar>
    </main>
  );
}

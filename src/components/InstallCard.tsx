import { useState } from 'react';
import { useT } from '../i18n/i18n';
import { installAskLater, installAskedRecently, promptInstall, useInstall } from '../lib/install';
import { BigButton } from './BigButton';
import { Card } from './Card';
import { Icon } from './Icon';

// "Put the app on your phone". Shows only where installing is possible, never once installed,
// and after "Baad mein" it stays away for a week. One card, one button.
export function InstallCard() {
  const { t } = useT();
  const { canPrompt, iosSteps } = useInstall();
  const [hidden, setHidden] = useState(installAskedRecently);

  if (hidden || (!canPrompt && !iosSteps)) return null;

  const later = () => {
    installAskLater();
    setHidden(true);
  };

  return (
    <Card tone="soft" className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-accent">
          <Icon name="home" size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-extrabold text-ink">{t('installTitle')}</p>
          <p className="text-label text-inkSoft">{canPrompt ? t('installBody') : t('installIos')}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {canPrompt && (
          <BigButton
            full
            icon="plus"
            onClick={async () => {
              const result = await promptInstall();
              if (result === 'dismissed') later();
            }}
          >
            {t('installButton')}
          </BigButton>
        )}
        <BigButton full variant="ghost" onClick={later}>{t('installLater')}</BigButton>
      </div>
    </Card>
  );
}

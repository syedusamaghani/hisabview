import { useState } from 'react';
import { BigButton } from '../components/BigButton';
import { Sheet } from '../components/Sheet';
import { entryCount, useLive } from '../data';
import { useT } from '../i18n/i18n';
import { markSaveAsked, SAVE_ASK_AFTER, saveAlreadyAsked } from '../lib/guest';
import { useAuth } from '../state/auth';

// For a person using the app without a login: once, after the 10th entry, "Apna hisaab mehfooz karein".
// Asked one time only ("Baad mein" is remembered). The other way to get here is the Backup card in Settings.
export function SavePrompt() {
  const { t } = useT();
  const { signInWithGoogle } = useAuth();
  const [asked, setAsked] = useState(saveAlreadyAsked);
  const count = useLive(() => entryCount(), []);
  const open = !asked && (count ?? 0) >= SAVE_ASK_AFTER;
  const later = () => {
    markSaveAsked();
    setAsked(true);
  };
  return (
    <Sheet open={open} onClose={later} title={t('saveAskTitle')}>
      <div className="flex flex-col gap-3">
        <p className="text-body text-inkSoft">{t('saveAskBody')}</p>
        <BigButton
          full
          size="lg"
          icon="cloud"
          onClick={() => {
            markSaveAsked();
            void signInWithGoogle();
          }}
        >
          {t('saveAskYes')}
        </BigButton>
        <BigButton full variant="ghost" onClick={later}>{t('saveAskLater')}</BigButton>
      </div>
    </Sheet>
  );
}

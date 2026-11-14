import { useEffect, useState } from 'react';
import { describeSync, isTesting, useSyncState } from '../data';
import { useT } from '../i18n/i18n';
import { navigate } from '../lib/router';
import { Icon } from './Icon';

// A thin bar at the top of EVERY screen, only when something needs the shopkeeper to know:
//  - no internet (work goes on; it is saved on the phone and sent later)
//  - the server refused something (tap to see it in Settings)
// When all is well it is not there at all, so the screens stay clean. The calm "Save ho gaya" line is on Home and Settings.
export function ConnectionBar() {
  const { t } = useT();
  const sync = useSyncState();
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  if (isTesting()) return null;

  if (describeSync(sync) === 'problem') {
    return (
      <button type="button" role="alert" onClick={() => navigate('/settings')} className="sticky top-0 z-40 flex min-h-tap w-full items-center gap-2 bg-accent px-4 text-start text-label font-extrabold text-accentInk">
        <Icon name="cloud" size={20} />
        <span className="flex-1 leading-snug">{t('connProblem')}</span>
      </button>
    );
  }
  if (!online || sync.phase === 'offline') {
    return (
      <p role="status" className="sticky top-0 z-40 flex min-h-[40px] items-center gap-2 bg-accent px-4 py-1 text-label font-extrabold text-accentInk">
        <Icon name="cloud" size={20} />
        <span className="flex-1 leading-snug">
          {t('connOffline')}
          {sync.pending > 0 && <> · <bdi>{t('connWaiting').replace('{n}', String(sync.pending))}</bdi></>}
        </span>
      </p>
    );
  }
  return null;
}

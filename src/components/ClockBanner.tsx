import { useSyncState } from '../data';
import { useT } from '../i18n/i18n';
import { Icon } from './Icon';

// A wrong date or time on the phone puts entries on the wrong day (and "Aaj ka hisaab" goes wrong).
// The sync engine measures the phone against the server; more than 10 minutes apart shows this note. Nothing otherwise.
const LIMIT_MS = 10 * 60_000;

export function ClockBanner() {
  const { clockOffsetMs } = useSyncState();
  const { t } = useT();
  if (clockOffsetMs === null || Math.abs(clockOffsetMs) <= LIMIT_MS) return null;
  return (
    <div role="alert" className="flex items-center gap-3 rounded-card bg-accent px-4 py-3 text-body font-extrabold text-accentInk shadow-btn">
      <Icon name="bell" size={28} />
      <span className="flex-1 leading-snug">{t('clockWarn')}</span>
    </div>
  );
}

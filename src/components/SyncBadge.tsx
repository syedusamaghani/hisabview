import { describeSync, useSyncState, type SyncView } from '../data';
import { useT } from '../i18n/i18n';
import type { TextKey } from '../i18n/translations';
import { cx } from '../lib/cx';
import { Icon } from './Icon';

// A small line under the shop name: is the khata also safe on the internet?
//  "Save ho gaya"  or  "Internet aate hi save hoga"  (waiting for internet)
// Never red or green (those colours mean money). Waiting = marigold, to be noticed a little.
const WORDS: Record<SyncView, TextKey> = {
  synced: 'syncSynced',
  queued: 'syncQueued',
  syncing: 'syncSaving',
  problem: 'syncProblem',
};

export function SyncBadge({ className }: { className?: string }) {
  const { t } = useT();
  const state = useSyncState();
  const view = describeSync(state);
  return (
    <p role="status" className={cx('flex items-center gap-1.5 text-caption font-semibold', view === 'synced' ? 'text-primarySoft' : 'text-accent', className)}>
      <Icon name="cloud" size={18} />
      <span>{t(WORDS[view])}</span>
    </p>
  );
}

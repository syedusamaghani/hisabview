import type { ReactNode } from 'react';
import { cx } from '../lib/cx';
import { useT } from '../i18n/i18n';
import { navigate } from '../lib/router';
import { BottomActionBar } from './BottomActionBar';
import { Icon, type IconName } from './Icon';

// The four main places of the app: Home, Customers, Stock, Settings. Big icons with a name under each.
export type Tab = 'home' | 'customers' | 'stock' | 'settings';

const TABS: { tab: Tab; icon: IconName; path: string; label: 'navHome' | 'navCustomers' | 'navStock' | 'navSettings' }[] = [
  { tab: 'home', icon: 'home', path: '/', label: 'navHome' },
  { tab: 'customers', icon: 'users', path: '/customers', label: 'navCustomers' },
  { tab: 'stock', icon: 'box', path: '/stock', label: 'navStock' },
  { tab: 'settings', icon: 'gear', path: '/settings', label: 'navSettings' },
];

// Just the row of four. Also shown on its own in the component gallery.
export function NavTabs({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  const { t } = useT();
  return (
    <nav className="grid grid-cols-4 gap-1" aria-label={t('appName')}>
      {TABS.map(({ tab, icon, label }) => (
        <button
          key={tab}
          type="button"
          onClick={() => onSelect(tab)}
          aria-current={tab === active ? 'page' : undefined}
          className={cx(
            'flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-button transition-colors duration-fast',
            'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
            tab === active ? 'bg-primarySoft text-primary' : 'text-inkSoft',
          )}
        >
          <Icon name={icon} size={28} />
          <span className="text-caption font-extrabold leading-tight">{t(label)}</span>
        </button>
      ))}
    </nav>
  );
}

// The bar fixed at the bottom of a main screen. "children" sit above the three tabs
// (for example the Diye / mic / Mile dock on Home).
export function BottomNav({ active, children }: { active: Tab; children?: ReactNode }) {
  const go = (tab: Tab) => {
    if (tab === active) return;
    // replace, so the Back button does not walk through every tab you visited
    navigate(TABS.find((x) => x.tab === tab)!.path, { replace: true });
  };
  return (
    <BottomActionBar>
      {children && <div className="pb-3">{children}</div>}
      <NavTabs active={active} onSelect={go} />
    </BottomActionBar>
  );
}

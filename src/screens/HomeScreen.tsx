import { useMemo, useState } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomNav } from '../components/BottomNav';
import { Card } from '../components/Card';
import { HideBanner } from '../components/HideBanner';
import { HideAmountsButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import { MicButton } from '../components/MicButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Sheet } from '../components/Sheet';
import { entriesRepo, partiesRepo, useLive, type Entry } from '../data';
import { useT } from '../i18n/i18n';
import { balancesByParty, totals } from '../lib/balance';
import { cx } from '../lib/cx';
import { formatDay, formatTime } from '../lib/dates';
import { beginFlow, navigate } from '../lib/router';
import { todaySummary } from '../lib/today';
import { useEntrySnack } from './useEntrySnack';

// Home: what I will collect and must pay, today's summary, the latest entries,
// and the big Diye / mic / Mile bar at the bottom.
export function HomeScreen({ shopName }: { shopName: string }) {
  const { t } = useT();
  const [micOpen, setMicOpen] = useState(false);
  const { snackbar } = useEntrySnack();

  const data = useLive(
    async () => ({ parties: await partiesRepo.listAll(), entries: await entriesRepo.listAll() }),
    [],
  );

  const view = useMemo(() => {
    if (!data) return null;
    const active = data.parties.filter((p) => !p.archived);
    const sum = totals(balancesByParty(active, data.entries));
    const names = new Map(data.parties.map((p) => [p.id, p.name]));
    const recent = data.entries
      .filter((e) => e.status === 'active' && (e.kind === 'diye' || e.kind === 'mile') && e.party_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
    return { sum, names, recent, today: todaySummary(data.entries) };
  }, [data]);

  const start = (kind: 'diye' | 'mile') => {
    beginFlow();
    navigate(`/entry/${kind}`);
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={shopName} subtitle={t('tagline')} right={<HideAmountsButton tone="onBrand" />} />

      <div className="flex flex-col gap-4 px-gutter pt-4">
        <HideBanner />

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('leneHain')}</p>
            <AmountText amount={view?.sum.leneHain ?? 0} tone="out" />
          </Card>
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('deneHain')}</p>
            <AmountText amount={view?.sum.deneHain ?? 0} />
          </Card>
        </div>

        <Card pattern className="flex flex-col gap-3">
          <h2 className="text-body font-extrabold text-ink">{t('todayTitle')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-label font-semibold text-inkSoft">{t('todayDiye')}</p>
              <AmountText amount={view?.today.diye ?? 0} tone="out" room="130px" />
            </div>
            <div>
              <p className="text-label font-semibold text-inkSoft">{t('todayMile')}</p>
              <AmountText amount={view?.today.mile ?? 0} tone="in" room="130px" />
            </div>
          </div>
          {/* WhatsApp comes in a later phase: clearly switched off for now */}
          <BigButton full variant="ghost" icon="whatsapp" disabled>
            {t('sendStatement')}
            <span className="rounded-full bg-primarySoft px-2 text-caption font-bold text-primary">{t('soon')}</span>
          </BigButton>
        </Card>

        <h2 className="pt-1 text-title font-extrabold text-ink">{t('recentTitle')}</h2>
      </div>

      {view && view.recent.length === 0 && (
        <div className="px-gutter">
          <Card tone="soft">
            <p className="text-body font-extrabold text-ink">{t('emptyTitle')}</p>
            <p className="text-body text-inkSoft">{t('emptyBody')}</p>
          </Card>
        </div>
      )}
      <ul className="flex flex-col gap-2 px-gutter">
        {view?.recent.map((entry) => (
          <li key={entry.id}>
            <RecentRow entry={entry} name={view.names.get(entry.party_id!) ?? ''} />
          </li>
        ))}
      </ul>

      <Sheet open={micOpen} onClose={() => setMicOpen(false)} title={t('micSoonTitle')}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-mic place-items-center rounded-full bg-accent text-accentInk">
            <Icon name="mic" size={40} />
          </span>
          <p className="text-body text-inkSoft">{t('micSoonBody')}</p>
          <BigButton full onClick={() => setMicOpen(false)}>{t('theekHai')}</BigButton>
        </div>
      </Sheet>

      {snackbar}

      <BottomNav active="home">
        <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center gap-3">
          <BigButton size="lg" variant="diye" icon="up" className="!px-2" onClick={() => start('diye')}>{t('diye')}</BigButton>
          <MicButton label={t('mic')} className="-mt-9 justify-self-center" onClick={() => setMicOpen(true)} />
          <BigButton size="lg" variant="mile" icon="down" className="!px-2" onClick={() => start('mile')}>{t('mile')}</BigButton>
        </div>
      </BottomNav>
    </main>
  );
}

// One recent entry: who, when, how much. Tap to open that customer.
function RecentRow({ entry, name }: { entry: Entry; name: string }) {
  const { t, lang } = useT();
  const gave = entry.kind === 'diye';
  return (
    <button
      type="button"
      onClick={() => navigate(`/party/${entry.party_id}`)}
      className={
        'flex min-h-[68px] w-full items-center gap-3 rounded-card border-[1.5px] border-line bg-surface p-3 text-start shadow-card ' +
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent'
      }
    >
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-full', gave ? 'bg-moneyOutSoft text-moneyOut' : 'bg-moneyInSoft text-moneyIn')}>
        <Icon name={gave ? 'up' : 'down'} size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span dir="auto" className="block truncate text-body font-extrabold">{name}</span>
        <span className="block text-label text-inkSoft">
          {t(gave ? 'diye' : 'mile')} · <span className="whitespace-nowrap">{formatDay(entry.created_at, lang)}</span>{' '}
          <span className="whitespace-nowrap"><bdi>{formatTime(entry.created_at, lang)}</bdi></span>
        </span>
      </span>
      <AmountText amount={entry.amount} tone={gave ? 'out' : 'in'} room="120px" />
    </button>
  );
}

import { useMemo } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomNav } from '../components/BottomNav';
import { Card } from '../components/Card';
import { HideBanner } from '../components/HideBanner';
import { InstallCard } from '../components/InstallCard';
import { ContactsCard } from './ContactsCard';
import { SyncBadge } from '../components/SyncBadge';
import { HideAmountsButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import { MicButton } from '../components/MicButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { entriesRepo, partiesRepo, statsRepo, useLive, type Entry } from '../data';
import { useT } from '../i18n/i18n';
import { totals } from '../lib/balance';
import { cx } from '../lib/cx';
import { formatDay, formatTime } from '../lib/dates';
import { beginFlow, navigate } from '../lib/router';
import { pakistanDayStart, todaySummary } from '../lib/today';
import { todayText } from '../lib/messages';
import { openWhatsApp, whatsappUrl } from '../lib/whatsapp';
import { speechSupported } from '../voice/speech';
import { useEntrySnack } from './useEntrySnack';

// Home: what I will collect and must pay, today's summary, the latest entries,
// and the big Diye / mic / Mile bar at the bottom.
export function HomeScreen({ shopName }: { shopName: string }) {
  const { t, lang } = useT();
  const { snackbar } = useEntrySnack();

  const data = useLive(
    // Only what Home shows is read: the customers, their summaries, the 5 newest entries and today's entries.
    // The whole history is never read here, so a khata with years of entries opens just as fast.
    async () => ({
      parties: await partiesRepo.listAll(),
      stats: await statsRepo.all(),
      recent: await entriesRepo.listRecentMoney(5),
      today: await entriesRepo.listSince(pakistanDayStart(new Date()).toISOString()),
    }),
    [],
  );

  const view = useMemo(() => {
    if (!data) return null;
    const balances: Record<string, number> = {};
    for (const p of data.parties) if (!p.archived) balances[p.id] = data.stats[p.id]?.balance ?? 0;
    const names = new Map(data.parties.map((p) => [p.id, p.name]));
    return { sum: totals(balances), names, recent: data.recent, today: todaySummary(data.today) };
  }, [data]);

  const start = (kind: 'diye' | 'mile') => {
    beginFlow();
    navigate(`/entry/${kind}`);
  };

  // No mic on a phone that cannot turn speech into text: just Diye and Mile
  const canSpeak = speechSupported();
  // The summary of the day, typed in WhatsApp (the shopkeeper chooses who gets it)
  const sendToday = () => {
    if (view) openWhatsApp(whatsappUrl(null, todayText(lang, shopName, new Date(), view.today)));
  };
  const openVoice = () => {
    beginFlow();
    navigate('/voice');
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={shopName} right={<HideAmountsButton tone="header" />}>
        <SyncBadge />
      </ScreenHeader>

      <div className="flex flex-col gap-4 px-gutter pt-4">
        <HideBanner />
        {/* The phone's contacts come first: they make names and numbers easy everywhere else */}
        <ContactsCard offer />
        {/* Offered once the first entry is written, not before: first the work, then the install */}
        {view && view.recent.length > 0 && <InstallCard />}

        <div className="flex flex-col gap-3">
          <Card className="flex items-center justify-between gap-3">
            <p className="text-body font-extrabold text-ink">{t('leneHain')}</p>
            <AmountText amount={view?.sum.leneHain ?? 0} size="l" tone="out" room="210px" />
          </Card>
          <Card className="flex items-center justify-between gap-3">
            <p className="text-body font-extrabold text-ink">{t('deneHain')}</p>
            <AmountText amount={view?.sum.deneHain ?? 0} size="l" room="210px" />
          </Card>
        </div>

        <Card pattern className="flex flex-col gap-3">
          {/* The title opens the full Aaj ka hisaab page */}
          <button
            type="button"
            onClick={() => navigate('/today')}
            className="-m-1 flex min-h-tap items-center gap-2 rounded-button p-1 text-start focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent"
          >
            <h2 className="flex-1 text-body font-extrabold text-ink">{t('todayTitle')}</h2>
            <Icon name="back" size={26} className="rotate-180 text-primary rtl:rotate-0" />
          </button>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <div>
              <p className="text-label font-semibold text-inkSoft">{t('todayDiye')}</p>
              <AmountText amount={view?.today.diye ?? 0} tone="out" room="130px" />
            </div>
            <div>
              <p className="text-label font-semibold text-inkSoft">{t('todayMile')}</p>
              <AmountText amount={view?.today.mile ?? 0} tone="in" room="130px" />
            </div>
            <div>
              <p className="text-label font-semibold text-inkSoft">{t('todaySale')}</p>
              <AmountText amount={view?.today.sale ?? 0} tone="in" room="130px" />
            </div>
            <div>
              <p className="text-label font-semibold text-inkSoft">{t('todayKharcha')}</p>
              <AmountText amount={view?.today.kharcha ?? 0} tone="out" room="130px" />
            </div>
          </div>
          <BigButton full variant="ghost" icon="whatsapp" disabled={!view} onClick={sendToday}>
            {t('sendStatement')}
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

      {snackbar}

      <BottomNav active="home">
        <div className={canSpeak ? 'grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center gap-3' : 'grid grid-cols-2 gap-3'}>
          <BigButton size="lg" variant="diye" icon="up" className="!px-2" onClick={() => start('diye')}>{t('diye')}</BigButton>
          {canSpeak && <MicButton label={t('mic')} className="-mt-9 justify-self-center" onClick={openVoice} />}
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

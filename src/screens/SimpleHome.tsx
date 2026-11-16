import { useMemo, useState } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomNav } from '../components/BottomNav';
import { Card } from '../components/Card';
import { ClockBanner } from '../components/ClockBanner';
import { EmptyState } from '../components/EmptyState';
import { HideBanner } from '../components/HideBanner';
import { HideAmountsButton } from '../components/IconButton';
import { MicButton } from '../components/MicButton';
import { PartyRow } from '../components/PartyRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchBar } from '../components/SearchBar';
import { SyncBadge } from '../components/SyncBadge';
import { partiesRepo, statsRepo, useLive } from '../data';
import { useT } from '../i18n/i18n';
import { totals } from '../lib/balance';
import { askForContacts } from '../lib/contactBook';
import { buildSearch } from '../lib/partyText';
import { beginFlow, navigate } from '../lib/router';
import { useVoiceFull } from '../lib/voiceFull';
import { speechSupported } from '../voice/speech';
import { useEntrySnack } from './useEntrySnack';
import { useLimit } from './useLimit';

// Home in "simple mode": only what a first-time shopkeeper needs. The two totals, a search box, the customers
// (highest balance first), and the big Diye / Mile buttons. Everything else lives behind the switch in Settings.
export function SimpleHome({ shopName }: { shopName: string }) {
  const { t } = useT();
  const { snackbar } = useEntrySnack();
  const voiceFull = useVoiceFull();
  const [query, setQuery] = useState('');
  const data = useLive(async () => ({ parties: await partiesRepo.listActive(), stats: await statsRepo.all() }), []);

  const view = useMemo(() => {
    if (!data) return null;
    const rows = data.parties
      .map((party) => ({ party, balance: data.stats[party.id]?.balance ?? 0 }))
      .sort((a, b) => b.balance - a.balance || a.party.name.localeCompare(b.party.name));
    const balances = Object.fromEntries(rows.map((r) => [r.party.id, r.balance]));
    return { rows, sum: totals(balances), search: buildSearch(rows, (r) => r.party) };
  }, [data]);

  const found = useMemo(() => (view ? view.search(query) : []), [view, query]);
  const { shown, more } = useLimit(found);
  const none = view !== null && view.rows.length === 0;
  const canSpeak = speechSupported() && voiceFull; // the big mic is the Beta switch in Settings, off by default

  const start = (kind: 'diye' | 'mile') => {
    beginFlow();
    navigate(`/entry/${kind}`);
  };
  const openVoice = async () => {
    await askForContacts();
    beginFlow();
    navigate('/voice');
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={shopName} right={<HideAmountsButton tone="header" />}>
        <SyncBadge />
      </ScreenHeader>

      <div className="flex flex-col gap-3 px-gutter pt-4">
        <HideBanner />
        <ClockBanner />
        <Card className="flex items-center justify-between gap-3">
          <p className="text-body font-extrabold text-ink">{t('leneHain')}</p>
          <AmountText amount={view?.sum.leneHain ?? 0} size="l" tone="out" room="210px" />
        </Card>
        <Card className="flex items-center justify-between gap-3">
          <p className="text-body font-extrabold text-ink">{t('deneHain')}</p>
          <AmountText amount={view?.sum.deneHain ?? 0} size="l" room="210px" />
        </Card>
      </div>

      {!none && (
        <div className="sticky z-10 bg-page px-gutter py-3" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder')} />
        </div>
      )}

      {none && <EmptyState title={t('noPartiesTitle')} body={t('noPartiesBody')} buttonLabel={t('noPartiesButton')} onButton={() => navigate('/party/new')} />}
      {view && !none && found.length === 0 && <EmptyState title={t('noResultsTitle')} body={t('noResultsBody')} />}

      <ul className="flex flex-col gap-3 px-gutter">
        {shown.map(({ party, balance }) => (
          <li key={party.id}>
            <PartyRow name={party.name} identifier={party.identifier} balance={balance} onClick={() => navigate(`/party/${party.id}`)} />
          </li>
        ))}
      </ul>
      {more && <div className="px-gutter pt-3">{more}</div>}

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

import { useEffect, useMemo, useState } from 'react';
import { BigButton } from '../components/BigButton';
import { BottomNav } from '../components/BottomNav';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { HideBanner } from '../components/HideBanner';
import { HideAmountsButton } from '../components/IconButton';
import { PartyRow } from '../components/PartyRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchBar } from '../components/SearchBar';
import { Snackbar } from '../components/Snackbar';
import { partiesRepo, statsRepo, useLive } from '../data';
import { useT } from '../i18n/i18n';
import { buildSearch } from '../lib/partyText';
import { navigate, takeFlash } from '../lib/router';
import { useLimit } from './useLimit';

// Everyone in the khata: highest balance first, with a sticky search bar.
// Hidden (archived) customers are kept in a list at the bottom, and can be brought back.
export function CustomersScreen() {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [undoArchive, setUndoArchive] = useState<string | null>(null);

  // "Customer chhupa diya / Wapas lo", coming back from the customer's page
  useEffect(() => {
    const flash = takeFlash();
    if (flash?.kind === 'undoArchive') setUndoArchive(flash.partyId);
  }, []);

  const data = useLive(
    async () => ({ parties: await partiesRepo.listActive(), archived: await partiesRepo.listArchived(), stats: await statsRepo.all() }),
    [],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    return data.parties
      .map((party) => ({ party, balance: data.stats[party.id]?.balance ?? 0 }))
      .sort((a, b) => b.balance - a.balance || a.party.name.localeCompare(b.party.name));
  }, [data]);

  const search = useMemo(() => buildSearch(rows, (r) => r.party), [rows]);
  const found = useMemo(() => search(query), [search, query]);
  const { shown, more } = useLimit(found);
  const noParties = data !== undefined && rows.length === 0;

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t('navCustomers')} right={<HideAmountsButton tone="onBrand" />} />

      <div className="px-gutter pt-4">
        <HideBanner />
      </div>

      {!noParties && (
        <div className="sticky z-10 bg-page px-gutter py-3" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder')} />
        </div>
      )}

      {noParties && <EmptyState title={t('noPartiesTitle')} body={t('noPartiesBody')} />}
      {data && !noParties && found.length === 0 && <EmptyState title={t('noResultsTitle')} body={t('noResultsBody')} />}

      <ul className="flex flex-col gap-3 px-gutter">
        {shown.map(({ party, balance }) => (
          <li key={party.id}>
            <PartyRow name={party.name} identifier={party.identifier} balance={balance} onClick={() => navigate(`/party/${party.id}`)} />
          </li>
        ))}
      </ul>
      {more && <div className="px-gutter pt-3">{more}</div>}

      {data && data.archived.length > 0 && (
        <section className="flex flex-col gap-3 px-gutter pt-8">
          <h2 className="text-title font-extrabold text-ink">{t('archivedSection')}</h2>
          {data.archived.map((party) => (
            <Card key={party.id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span dir="auto" className="block truncate text-body font-extrabold">{party.name}</span>
                {party.identifier && <span dir="auto" className="block truncate text-label text-inkSoft">{party.identifier}</span>}
              </span>
              <BigButton variant="ghost" onClick={() => void partiesRepo.update(party.id, { archived: false })}>{t('wapasLo')}</BigButton>
            </Card>
          ))}
        </section>
      )}

      <Snackbar
        open={undoArchive !== null}
        message={t('archivedDone')}
        actionLabel={t('wapasLo')}
        duration={10_000}
        onAction={() => undoArchive && void partiesRepo.update(undoArchive, { archived: false })}
        onClose={() => setUndoArchive(null)}
      />

      <BottomNav active="customers">
        <BigButton full size="lg" icon="userPlus" onClick={() => navigate('/party/new')}>
          {noParties ? t('noPartiesButton') : t('newCustomer')}
        </BigButton>
      </BottomNav>
    </main>
  );
}

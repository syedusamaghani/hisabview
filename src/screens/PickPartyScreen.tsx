import { useMemo, useState } from 'react';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { EmptyState } from '../components/EmptyState';
import { PartyRow } from '../components/PartyRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchBar } from '../components/SearchBar';
import { entriesRepo, partiesRepo, useLive, type Party } from '../data';
import { useT } from '../i18n/i18n';
import { balancesByParty } from '../lib/balance';
import { matchesQuery } from '../lib/partyText';
import { splitByRecent } from '../lib/recent';
import { goBack, navigate } from '../lib/router';

// Step 1 of writing an entry from Home: who is it for? People you dealt with lately come first.
export function PickPartyScreen({ kind }: { kind: 'diye' | 'mile' }) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const data = useLive(async () => ({ parties: await partiesRepo.listActive(), entries: await entriesRepo.listAll() }), []);

  const view = useMemo(() => {
    if (!data) return null;
    const { recent, others } = splitByRecent(data.parties, data.entries);
    return { recent, others, balances: balancesByParty(data.parties, data.entries) };
  }, [data]);

  const searching = query.trim().length > 0;
  const results = view && searching ? [...view.recent, ...view.others].filter((p) => matchesQuery(p, query)) : [];
  const empty = data !== undefined && data.parties.length === 0;

  const row = (party: Party) => (
    <li key={party.id}>
      <PartyRow
        name={party.name}
        identifier={party.identifier}
        balance={view!.balances[party.id]}
        onClick={() => navigate(`/party/${party.id}/${kind}`)}
      />
    </li>
  );

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t(kind)} subtitle={t('pickWho')} onBack={() => goBack('/')} />

      {empty && <EmptyState title={t('noPartiesTitle')} body={t('noPartiesBody')} />}

      {!empty && (
        <div className="sticky z-10 bg-page px-gutter py-3" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder')} />
        </div>
      )}

      {view && searching && results.length === 0 && <EmptyState title={t('noResultsTitle')} body={t('noResultsBody')} />}

      {view && searching && <ul className="flex flex-col gap-3 px-gutter">{results.map(row)}</ul>}

      {view && !searching && (
        <div className="flex flex-col gap-3 px-gutter">
          {view.recent.length > 0 && (
            <>
              <h2 className="text-label font-bold text-inkSoft">{t('recentCustomers')}</h2>
              <ul className="flex flex-col gap-3">{view.recent.map(row)}</ul>
            </>
          )}
          {view.others.length > 0 && (
            <>
              {view.recent.length > 0 && <h2 className="pt-2 text-label font-bold text-inkSoft">{t('otherCustomers')}</h2>}
              <ul className="flex flex-col gap-3">{view.others.map(row)}</ul>
            </>
          )}
        </div>
      )}

      <BottomActionBar>
        <BigButton full size="lg" icon="userPlus" onClick={() => navigate(`/party/new?then=${kind}`)}>
          {empty ? t('noPartiesButton') : t('newCustomer')}
        </BigButton>
      </BottomActionBar>
    </main>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { HideAmountsButton } from '../components/IconButton';
import { PartyRow } from '../components/PartyRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchBar } from '../components/SearchBar';
import { Snackbar } from '../components/Snackbar';
import { entriesRepo, partiesRepo, useLive } from '../data';
import { useT } from '../i18n/i18n';
import { balancesByParty, totals } from '../lib/balance';
import { matchesQuery } from '../lib/partyText';
import { navigate, takeFlash } from '../lib/router';
import { useAuth } from '../state/auth';

// Home: what I will collect, what I must pay, and everyone in the khata (biggest first).
export function HomeScreen({ shopName }: { shopName: string }) {
  const { t } = useT();
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [undoArchive, setUndoArchive] = useState<string | null>(null);

  // "Customer chhupa diya" with an undo, coming back from the customer page
  useEffect(() => {
    const flash = takeFlash();
    if (flash?.kind === 'undoArchive') setUndoArchive(flash.partyId);
  }, []);

  const data = useLive(async () => ({ parties: await partiesRepo.listActive(), entries: await entriesRepo.listAll() }), []);

  const { rows, sum } = useMemo(() => {
    if (!data) return { rows: [], sum: { leneHain: 0, deneHain: 0 } };
    const balances = balancesByParty(data.parties, data.entries);
    const rows = data.parties
      .map((party) => ({ party, balance: balances[party.id] }))
      .sort((a, b) => b.balance - a.balance || a.party.name.localeCompare(b.party.name));
    return { rows, sum: totals(balances) };
  }, [data]);

  const shown = rows.filter((r) => matchesQuery(r.party, query));
  const noParties = data !== undefined && rows.length === 0;

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={shopName} subtitle={t('tagline')} right={<HideAmountsButton tone="onBrand" />} />

      <div className="grid grid-cols-2 gap-3 px-gutter pt-4">
        <Card>
          <p className="text-label font-semibold text-inkSoft">{t('leneHain')}</p>
          <AmountText amount={sum.leneHain} tone="out" />
        </Card>
        <Card>
          <p className="text-label font-semibold text-inkSoft">{t('deneHain')}</p>
          <AmountText amount={sum.deneHain} />
        </Card>
      </div>

      {!noParties && (
        <div className="sticky z-10 bg-page px-gutter py-3" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder')} />
        </div>
      )}

      {noParties && <EmptyState title={t('noPartiesTitle')} body={t('noPartiesBody')} />}
      {data && !noParties && shown.length === 0 && <EmptyState title={t('noResultsTitle')} body={t('noResultsBody')} />}

      <ul className="flex flex-col gap-3 px-gutter">
        {shown.map(({ party, balance }) => (
          <li key={party.id}>
            <PartyRow name={party.name} identifier={party.identifier} balance={balance} onClick={() => navigate(`/party/${party.id}`)} />
          </li>
        ))}
      </ul>

      <div className="px-gutter pt-8">
        <BigButton full variant="ghost" onClick={signOut}>{t('logout')}</BigButton>
      </div>

      <Snackbar
        open={undoArchive !== null}
        message={t('archivedDone')}
        actionLabel={t('wapasLo')}
        onAction={() => undoArchive && void partiesRepo.update(undoArchive, { archived: false })}
        onClose={() => setUndoArchive(null)}
      />

      <BottomActionBar>
        <BigButton full size="lg" icon="userPlus" onClick={() => navigate('/party/new')}>
          {noParties ? t('noPartiesButton') : t('newCustomer')}
        </BigButton>
      </BottomActionBar>
    </main>
  );
}

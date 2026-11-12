import { useMemo, useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { HideBanner } from '../../components/HideBanner';
import { HideAmountsButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { currentUserId, entriesRepo, useLive, useRole, type CancelReason, type Entry } from '../../data';
import { useT } from '../../i18n/i18n';
import { addDays, dayKeyOf, dayStartOf } from '../../lib/cashbook';
import { categoryLabel, totalsByCategory } from '../../lib/expenses';
import { canChangeEntry } from '../../lib/permissions';
import { beginFlow, goBack, navigate } from '../../lib/router';
import { TodayRow } from '../TodayScreen';
import { useEntrySnack } from '../useEntrySnack';

type Period = 'today' | 'month';

// Kharcha: the expenses of today or of this month, the total, the total of each category, and every entry.
export function ExpensesScreen() {
  const { t } = useT();
  const role = useRole() ?? 'cashier';
  const { snackbar, notify, hide } = useEntrySnack();
  const [period, setPeriod] = useState<Period>('today');
  const [openId, setOpenId] = useState<string | null>(null);

  const entries = useLive(async () => {
    const today = dayKeyOf(new Date());
    const from = period === 'today' ? today : `${today.slice(0, 7)}-01`;
    const rows = await entriesRepo.listBetween(dayStartOf(from).toISOString(), dayStartOf(addDays(today, 1)).toISOString());
    return rows.filter((e) => e.kind === 'kharcha' && e.status !== 'draft').sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [period]);

  const totals = useMemo(() => totalsByCategory(entries ?? []), [entries]);
  const sum = totals.reduce((n, row) => n + row.total, 0);

  const cancel = async (entry: Entry, reason: CancelReason) => {
    setOpenId(null);
    await entriesRepo.cancel(entry.id, reason);
    notify('entryCancelled');
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t('expTitle')} onBack={() => goBack('/today')} right={<HideAmountsButton tone="header" />} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <HideBanner />

        <div className="flex flex-wrap gap-2" role="group" aria-label={t('expTitle')}>
          {(['today', 'month'] as const).map((p) => (
            <Chip key={p} aria-pressed={period === p} className={period === p ? 'border-primary bg-primarySoft' : undefined} onClick={() => { hide(); setPeriod(p); }}>
              {t(p === 'today' ? 'expToday' : 'expMonth')}
            </Chip>
          ))}
        </div>

        <Card>
          <p className="text-label font-semibold text-inkSoft">{t('expTotal')}</p>
          <AmountText amount={sum} size="xl" tone="out" />
        </Card>

        {totals.length > 0 && (
          <Card className="flex flex-col gap-2">
            <p className="text-body font-extrabold text-ink">{t('expByCategory')}</p>
            <ul className="flex flex-col gap-2">
              {totals.map((row) => (
                <li key={row.category ?? ''} className="flex items-baseline justify-between gap-3">
                  <span dir="auto" className="min-w-0 truncate text-body font-bold text-ink">{categoryLabel(row.category, t)}</span>
                  <AmountText amount={row.total} size="s" tone="out" room="140px" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <h2 className="pt-1 text-title font-extrabold text-ink">{t('expList')}</h2>
        {entries && entries.length === 0 && (
          <Card tone="soft">
            <p className="text-body font-extrabold text-ink">{t('expEmpty')}</p>
          </Card>
        )}
        <ul className="flex flex-col gap-2">
          {entries?.slice(0, 100).map((entry) => (
            <TodayRow
              key={entry.id}
              entry={entry}
              name=""
              showDay={period === 'month'}
              open={openId === entry.id}
              canChange={canChangeEntry(role, entry, currentUserId())}
              onToggle={() => {
                hide();
                setOpenId(openId === entry.id ? null : entry.id);
              }}
              onCancel={(reason) => cancel(entry, reason)}
            />
          ))}
        </ul>
      </div>

      {snackbar}

      <BottomActionBar>
        <BigButton full size="lg" variant="diye" icon="up" onClick={() => { beginFlow(); navigate('/today/kharcha'); }}>{t('expWrite')}</BigButton>
      </BottomActionBar>
    </main>
  );
}

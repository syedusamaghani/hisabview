import { useMemo, useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import { sync, teamRepo, useLive, useRole } from '../../data';
import { BigButton } from '../../components/BigButton';
import { useT } from '../../i18n/i18n';
import { formatTime } from '../../lib/dates';
import { canSeeTeamWork } from '../../lib/permissions';
import { goBack } from '../../lib/router';
import { whatOfKind } from '../../lib/team';
import { fill } from '../stock/stockText';
import { pickedFromAddress, pickedKey, RangeBar, rangeOfPicked, type Picked } from '../report/parts';
import { ROLE_TEXT, useTeam, useWho, WHAT_TEXT } from './parts';

// Staff ka kaam: for the days chosen, what each person sold, saved and cancelled; tap a person to see their entries.
export function TeamScreen() {
  const { t, lang } = useT();
  const role = useRole() ?? 'cashier';
  const [picked, setPicked] = useState<Picked>(pickedFromAddress);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const range = rangeOfPicked(picked);
  const team = useTeam();
  const who = useWho(team);

  const data = useLive(async () => (canSeeTeamWork(role) ? teamRepo.staffWork(range) : null), [pickedKey(picked), role]);
  const mine = useMemo(() => (data && open ? data.entries.filter((e) => e.created_by === open).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 40) : []), [data, open]);

  if (!canSeeTeamWork(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('teamTitle')} onBack={() => goBack('/dashboard')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('tNotAllowed')}</p>
      </main>
    );
  }

  const refresh = async () => {
    setBusy(true);
    try {
      await sync.syncNow({ pull: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={t('teamTitle')} onBack={() => goBack('/dashboard')} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <p className="text-body text-inkSoft">{t('teamIntro')}</p>
        <RangeBar value={picked} onChange={setPicked} />
        <BigButton full variant="ghost" disabled={busy} onClick={refresh}>{t('refreshNow')}</BigButton>

        {data && data.stats.length === 0 && (
          <Card tone="soft">
            <p className="text-body text-inkSoft">{t('tNobody')}</p>
          </Card>
        )}

        {data?.stats.map((p) => {
          const mate = team.find((m) => m.user_id === p.user_id);
          const isOpen = open === p.user_id;
          return (
            <Card key={p.user_id} className="flex flex-col gap-3">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.user_id)} className="flex min-h-tap flex-col gap-1 text-start">
                <span className="flex items-baseline justify-between gap-3">
                  <span dir="auto" className="min-w-0 truncate text-body font-extrabold text-ink">{who(p.user_id)}</span>
                  {mate && <span className="shrink-0 text-label font-bold text-inkSoft">{t(ROLE_TEXT[mate.role] ?? 'roleCashier')}</span>}
                </span>
                <span className="flex items-baseline justify-between gap-3">
                  <bdi className="text-label font-semibold text-inkSoft">{fill(t('tSalesCount'), { n: String(p.salesCount) })}</bdi>
                  <AmountText amount={p.sales} size="m" room="170px" />
                </span>
              </button>
              <ul className="grid grid-cols-3 gap-2 text-center">
                <li><p className="text-label text-inkSoft">{t('tEntries')}</p><bdi className="text-body font-extrabold text-ink">{p.entries}</bdi></li>
                <li><p className="text-label text-inkSoft">{t('dExpenses')}</p><AmountText amount={p.kharcha} size="s" tone="out" room="90px" /></li>
                <li><p className="text-label text-inkSoft">{t('tCancelled')}</p><bdi className={p.cancelled > 0 ? 'text-body font-extrabold text-moneyOut' : 'text-body font-extrabold text-ink'}>{p.cancelled}</bdi></li>
              </ul>
              {isOpen && (
                <div className="flex flex-col gap-2 border-t-[1.5px] border-line pt-3">
                  <p className="text-label font-bold text-inkSoft">{t('tHistory')}</p>
                  {mine.length === 0 && <p className="text-body text-inkSoft">{t('tHistoryNone')}</p>}
                  <ul className="flex flex-col gap-2">
                    {mine.map((e) => (
                      <li key={e.id} className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block text-body font-bold text-ink">
                            {t(WHAT_TEXT[whatOfKind(e.kind)])}
                            {e.status === 'cancelled' && <span className="text-moneyOut"> · {t('tCancelledMark')}</span>}
                          </span>
                          <bdi className="block text-label text-inkSoft">{formatTime(e.created_at, lang)}</bdi>
                        </span>
                        <AmountText amount={e.amount} size="s" tone="neutral" room="130px" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
        <p className="text-label text-inkSoft">{t('liveNote')}</p>
      </div>
    </main>
  );
}

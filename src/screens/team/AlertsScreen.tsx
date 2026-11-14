import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SwitchRow } from '../../components/SwitchRow';
import { alertsRepo, currentUserId, reportRepo, setAlertPrefs, useLive, useRole } from '../../data';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import { ALERT_KINDS, type Alert, type AlertKind } from '../../lib/alerts';
import { formatDay } from '../../lib/dates';
import { canSeeTeamWork } from '../../lib/permissions';
import { rangeFor, summarize, rangeMs } from '../../lib/profit';
import { dayKeyOf } from '../../lib/cashbook';
import { goBack, navigate } from '../../lib/router';
import { whatOfKind } from '../../lib/team';
import { fill, qtyText } from '../stock/stockText';
import { useTeam, useWho, WHAT_TEXT } from './parts';

const KIND_TEXT: Record<AlertKind, TextKey> = {
  lowStock: 'kLowStock',
  discount: 'kDiscount',
  cancelled: 'kCancelled',
  cashMismatch: 'kCashMismatch',
  overdue: 'kOverdue',
  summary: 'kSummary',
};

const rs = (n: number) => Math.abs(n).toLocaleString('en-US');

// Khabrein: what needs a look, worked out fresh from the saved records, plus the switches for each kind.
export function AlertsScreen() {
  const { t, lang } = useT();
  const role = useRole() ?? 'cashier';
  const team = useTeam();
  const who = useWho(team);

  const data = useLive(async () => {
    if (!canSeeTeamWork(role)) return null;
    const today = rangeFor('today', dayKeyOf(new Date()), { from: dayKeyOf(new Date()), to: dayKeyOf(new Date()) });
    const { fromMs, toMs } = rangeMs(today);
    const r = summarize(await reportRepo.load(today), fromMs, toMs);
    return alertsRepo.load({ sales: r.totalSales, expenses: r.expenses, profit: r.netProfit });
  }, [role]);

  if (!canSeeTeamWork(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('alertsTitle')} onBack={() => goBack('/dashboard')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('tNotAllowed')}</p>
      </main>
    );
  }

  const text = (a: Alert): string => {
    switch (a.kind) {
      case 'lowStock':
        return fill(t('alLow'), { name: a.product?.name ?? '', qty: a.product ? qtyText(t, a.stock ?? 0, a.product) : '' });
      case 'discount':
        return fill(t('alDisc'), { name: a.product?.name ?? '', price: rs(a.price ?? 0), list: rs(a.list ?? 0), pct: String(a.pct ?? 0), who: who(a.actor) });
      case 'cancelled':
        return fill(t('alCan'), { who: who(a.actor), amount: rs(a.amount ?? 0), what: t(WHAT_TEXT[whatOfKind(a.entryKind ?? '')]), party: a.party ? fill(t('alAnd'), { name: a.party }) : '' });
      case 'cashMismatch':
        return fill(t((a.amount ?? 0) < 0 ? 'alMisLess' : 'alMisMore'), { day: formatDay(`${a.day}T12:00:00+05:00`, lang), amount: rs(a.amount ?? 0) });
      case 'overdue':
        return fill(t('alLate'), { name: a.party ?? '', date: formatDay(`${a.date}T12:00:00+05:00`, lang), amount: rs(a.amount ?? 0) });
      case 'summary': {
        const s = a.summary;
        return fill(t((s?.profit ?? 0) < 0 ? 'alSumLoss' : 'alSum'), { sales: rs(s?.sales ?? 0), expenses: rs(s?.expenses ?? 0), profit: rs(s?.profit ?? 0) });
      }
    }
  };

  const toggle = async (kind: AlertKind, on: boolean) => {
    if (!data) return;
    await setAlertPrefs(currentUserId(), { ...data.prefs, [kind]: on });
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={t('alertsTitle')} onBack={() => goBack('/dashboard')} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        {data && data.alerts.length === 0 && (
          <Card tone="soft">
            <p className="text-body font-bold text-ink">{t('alNone')}</p>
          </Card>
        )}
        <ul className="flex flex-col gap-3">
          {data?.alerts.map((a) => {
            const go = a.kind === 'lowStock' && a.product ? `/stock/${a.product.id}` : a.kind === 'cashMismatch' ? '/cashbook' : null;
            const body = (
              <>
                <span className="block text-label font-bold text-inkSoft">{t(KIND_TEXT[a.kind])}</span>
                <span dir="auto" className="block text-body font-bold text-ink">{text(a)}</span>
              </>
            );
            return (
              <li key={a.id}>
                <Card className="!p-3">
                  {go ? (
                    <button type="button" onClick={() => navigate(go)} className="block min-h-tap w-full text-start">{body}</button>
                  ) : (
                    <div>{body}</div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>

        <Card className="flex flex-col gap-1">
          <h2 className="text-body font-extrabold text-ink">{t('alWant')}</h2>
          {data && ALERT_KINDS.map((k) => <SwitchRow key={k} label={t(KIND_TEXT[k])} checked={data.prefs[k]} onChange={(on) => void toggle(k, on)} />)}
          <p className="text-label text-inkSoft">{t('alPrefNote')}</p>
        </Card>
      </div>
    </main>
  );
}

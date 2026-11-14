import { useMemo, useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { HideBanner } from '../../components/HideBanner';
import { Icon } from '../../components/Icon';
import { HideAmountsButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { needsAttention } from '../../lib/alerts';
import { alertsRepo, entriesRepo, partiesRepo, productsRepo, reportRepo, statsRepo, useLive, useRole } from '../../data';
import { useT } from '../../i18n/i18n';
import { totals } from '../../lib/balance';
import { addDays } from '../../lib/cashbook';
import { canSeeProfit } from '../../lib/permissions';
import { daysIn, rangeMs, stepFor, summarize, trend } from '../../lib/profit';
import { beginFlow, goBack, navigate } from '../../lib/router';
import { pakistanDayStart, todaySummary } from '../../lib/today';
import { fill, qtyText } from '../stock/stockText';
import { pickedFromAddress, pickedKey, pickedQuery, RangeBar, rangeOfPicked, SplitBar, TrendChart, type Picked } from './parts';

// Karobar: the answers a shopkeeper wants first. How much did I sell? How much profit? Who owes me? What is running out?
// Cards first, two small charts after. The numbers all come from src/lib/profit.ts (the same ones the profit screen uses).
export function DashboardScreen() {
  const { t } = useT();
  const role = useRole() ?? 'cashier';
  const [picked, setPicked] = useState<Picked>(pickedFromAddress);
  const range = rangeOfPicked(picked);
  // The chart wants at least a week of bars, even when one day is chosen
  const chartRange = daysIn(range) >= 7 ? range : { from: addDays(range.to, -6), to: range.to };

  const data = useLive(async () => {
    if (!canSeeProfit(role)) return null;
    const [input, stock, parties, stats, today] = await Promise.all([
      reportRepo.load({ from: chartRange.from, to: range.to }),
      productsRepo.listStock(),
      partiesRepo.listAll(),
      statsRepo.all(),
      entriesRepo.listSince(pakistanDayStart(new Date()).toISOString()),
    ]);
    return { input, stock, parties, stats, today };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedKey(picked), role]);

  // How many alerts need a look (the daily summary is only news and is not counted)
  const alertCount = useLive(async () => (canSeeProfit(role) ? needsAttention((await alertsRepo.load(null)).alerts) : 0), [role]) ?? 0;

  const view = useMemo(() => {
    if (!data) return null;
    const { fromMs, toMs } = rangeMs(range);
    const report = summarize(data.input, fromMs, toMs);
    const balances: Record<string, number> = {};
    for (const p of data.parties) if (!p.archived) balances[p.id] = data.stats[p.id]?.balance ?? 0;
    const owing = data.parties
      .filter((p) => !p.archived && (data.stats[p.id]?.balance ?? 0) > 0)
      .sort((a, b) => (data.stats[b.id]?.balance ?? 0) - (data.stats[a.id]?.balance ?? 0))
      .slice(0, 5);
    return {
      report,
      buckets: trend(data.input, chartRange, stepFor(chartRange)),
      sum: totals(balances),
      owing,
      stockValue: data.stock.reduce((n, r) => n + r.value, 0),
      low: data.stock.filter((r) => r.low).slice(0, 5),
      products: new Map(data.stock.map((r) => [r.product.id, r.product])),
      todayCount: todaySummary(data.today).count,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pickedKey(picked)]);

  const start = (path: string) => {
    beginFlow();
    navigate(path);
  };

  if (!canSeeProfit(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('dashTitle')} onBack={() => goBack('/')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('dNotAllowed')}</p>
      </main>
    );
  }

  const r = view?.report;
  const net = r?.netProfit ?? 0;
  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t('dashTitle')} onBack={() => goBack('/')} right={<HideAmountsButton tone="header" />} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <HideBanner />
        <RangeBar value={picked} onChange={setPicked} />

        <Card pattern>
          <p className="text-label font-semibold text-inkSoft">{net < 0 ? t('dLossWord') : t('dProfit')}</p>
          <AmountText amount={Math.abs(net)} size="xl" tone={net < 0 ? 'out' : 'in'} />
          <p className="mt-1 text-label text-inkSoft">{t('pExplainProfit')}</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('dSales')}</p>
            <AmountText amount={r?.totalSales ?? 0} tone="neutral" />
          </Card>
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('dExpenses')}</p>
            <AmountText amount={r?.expenses ?? 0} tone="out" />
          </Card>
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('dCashReceived')}</p>
            <AmountText amount={r?.cashReceived ?? 0} tone="in" />
          </Card>
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('dDigitalReceived')}</p>
            <AmountText amount={r?.digitalReceived ?? 0} tone="in" />
          </Card>
        </div>

        {r && r.plainSales > 0 && (
          <Card tone="soft">
            <p className="text-label font-semibold text-ink">{fill(t('dPlainHint'), { amount: r.plainSales.toLocaleString('en-US') })}</p>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          <Card className="flex items-center justify-between gap-3">
            <p className="text-body font-extrabold text-ink">{t('leneHain')}</p>
            <AmountText amount={view?.sum.leneHain ?? 0} size="l" tone="out" room="210px" />
          </Card>
          <Card className="flex items-center justify-between gap-3">
            <p className="text-body font-extrabold text-ink">{t('deneHain')}</p>
            <AmountText amount={view?.sum.deneHain ?? 0} size="l" room="210px" />
          </Card>
          <Card className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-body font-extrabold text-ink">{t('dStockValue')}</p>
            <AmountText amount={view?.stockValue ?? 0} size="l" room="170px" />
          </Card>
        </div>

        <Card className="flex flex-col gap-2">
          <h2 className="text-body font-extrabold text-ink">{t('dTrend')}</h2>
          {view && <TrendChart buckets={view.buckets} />}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-body font-extrabold text-ink">{t('dSplit')}</h2>
          {r && <SplitBar money={r.inByMethod} />}
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-body font-extrabold text-ink">{t('dTopSelling')}</h2>
          {r && r.byProduct.length === 0 && <p className="text-body text-inkSoft">{t('dNoSales')}</p>}
          <ul className="flex flex-col gap-2">
            {[...(r?.byProduct ?? [])].sort((a, b) => b.sales - a.sales).slice(0, 5).map((row) => {
              const product = view?.products.get(row.product_id);
              return (
                <li key={row.product_id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span dir="auto" className="block truncate text-body font-bold text-ink">{row.name}</span>
                    {product && <bdi className="block text-label text-inkSoft">{t('pSoldQty')}: {qtyText(t, row.qty_base, product)}</bdi>}
                  </span>
                  <AmountText amount={row.sales} size="s" room="130px" />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-body font-extrabold text-ink">{t('dLowStock')}</h2>
          {view && view.low.length === 0 && <p className="text-body text-inkSoft">{t('dLowStockNone')}</p>}
          <ul className="flex flex-col gap-1">
            {view?.low.map((row) => (
              <li key={row.product.id}>
                <button type="button" onClick={() => navigate(`/stock/${row.product.id}`)} className="flex min-h-tap w-full items-center justify-between gap-3 text-start">
                  <span dir="auto" className="min-w-0 truncate text-body font-bold text-ink">{row.product.name}</span>
                  <bdi className="shrink-0 text-body font-extrabold text-moneyOut">{qtyText(t, row.stock, row.product)}</bdi>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-body font-extrabold text-ink">{t('dPending')}</h2>
          {view && view.owing.length === 0 && <p className="text-body text-inkSoft">{t('dPendingNone')}</p>}
          <ul className="flex flex-col gap-1">
            {view?.owing.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => navigate(`/party/${p.id}`)} className="flex min-h-tap w-full items-center justify-between gap-3 text-start">
                  <span dir="auto" className="min-w-0 truncate text-body font-bold text-ink">{p.name}</span>
                  <AmountText amount={data?.stats[p.id]?.balance ?? 0} size="s" tone="out" room="130px" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <button type="button" onClick={() => navigate('/today')} className="flex min-h-tap items-center gap-2 rounded-card border-[1.5px] border-line bg-surface px-4 text-start shadow-card">
          <span className="flex-1 text-body font-extrabold text-ink">{t('dTxns')} · <bdi>{fill(t('dTxnsCount'), { n: String(view?.todayCount ?? 0) })}</bdi></span>
          <Icon name="back" size={26} className="rotate-180 text-primary rtl:rotate-0" />
        </button>

        <BigButton full variant="ghost" icon="chart" onClick={() => navigate(`/profit${pickedQuery(picked)}`)}>{t('dMore')}</BigButton>

        <div className="flex flex-col gap-3">
          <BigButton full variant="ghost" icon="bell" onClick={() => navigate('/alerts')}>
            {t('dAlertsBtn')}{alertCount > 0 && <> · <bdi>{fill(t('dAlertsCount'), { n: String(alertCount) })}</bdi></>}
          </BigButton>
          <BigButton full variant="ghost" icon="users" onClick={() => navigate('/team')}>{t('dTeamWork')}</BigButton>
          <BigButton full variant="ghost" icon="note" onClick={() => navigate('/activity')}>{t('dActivity')}</BigButton>
        </div>
      </div>

      <BottomActionBar>
        <div className="grid grid-cols-4 gap-2">
          <BigButton variant="diye" icon="up" className="!flex-col !gap-0 !px-1 !text-label" onClick={() => start('/entry/diye')}>{t('diye')}</BigButton>
          <BigButton variant="mile" icon="down" className="!flex-col !gap-0 !px-1 !text-label" onClick={() => start('/entry/mile')}>{t('mile')}</BigButton>
          <BigButton variant="ghost" icon="wallet" className="!flex-col !gap-0 !px-1 !text-label" onClick={() => start('/today/sale')}>{t('writeSale')}</BigButton>
          <BigButton variant="ghost" icon="note" className="!flex-col !gap-0 !px-1 !text-label" onClick={() => start('/today/kharcha')}>{t('writeKharcha')}</BigButton>
        </div>
      </BottomActionBar>
    </main>
  );
}

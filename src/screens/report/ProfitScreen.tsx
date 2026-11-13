import { useMemo, useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { HideBanner } from '../../components/HideBanner';
import { HideAmountsButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { productsRepo, reportRepo, useLive, useRole } from '../../data';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import { canSeeProfit } from '../../lib/permissions';
import { daysIn, rangeMs, summarize, trend, type Step } from '../../lib/profit';
import { goBack } from '../../lib/router';
import { fill, qtyText } from '../stock/stockText';
import { bucketLabel, pickedFromAddress, pickedKey, RangeBar, rangeOfPicked, type Picked } from './parts';

const STEPS: { step: Step; text: TextKey }[] = [
  { step: 'day', text: 'pByDay' },
  { step: 'week', text: 'pByWeek' },
  { step: 'month', text: 'pByMonth' },
];

// One line of the profit statement
function Line({ label, amount, tone = 'neutral', strong }: { label: string; amount: number; tone?: 'out' | 'in' | 'neutral'; strong?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className={strong ? 'min-w-0 text-body font-extrabold text-ink' : 'min-w-0 text-body font-semibold text-inkSoft'}>{label}</span>
      <AmountText amount={amount} size={strong ? 'm' : 's'} tone={tone} room="150px" />
    </li>
  );
}

// Munafa aur nuqsan: the profit statement of the chosen days, item by item, and day by day. Profit is kept apart from the money.
export function ProfitScreen() {
  const { t, lang } = useT();
  const role = useRole() ?? 'cashier';
  const [picked, setPicked] = useState<Picked>(pickedFromAddress);
  const [step, setStep] = useState<Step>('day');
  const range = rangeOfPicked(picked);

  const data = useLive(async () => {
    if (!canSeeProfit(role)) return null;
    const [input, stock] = await Promise.all([reportRepo.load(range), productsRepo.listStock()]);
    return { input, stock };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedKey(picked), role]);

  const view = useMemo(() => {
    if (!data) return null;
    const { fromMs, toMs } = rangeMs(range);
    const report = summarize(data.input, fromMs, toMs);
    const products = new Map(data.stock.map((r) => [r.product.id, r.product]));
    const sold = new Map(report.byProduct.map((p) => [p.product_id, p.qty_base]));
    // items that are in stock but sold little (or not at all) in these days
    const slow = data.stock
      .filter((r) => r.stock > 0)
      .map((r) => ({ product: r.product, qty: sold.get(r.product.id) ?? 0 }))
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 5);
    return { report, products, slow, buckets: trend(data.input, range, step) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pickedKey(picked), step]);

  if (!canSeeProfit(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('pTitle')} onBack={() => goBack('/dashboard')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('dNotAllowed')}</p>
      </main>
    );
  }

  const r = view?.report;
  const net = r?.netProfit ?? 0;
  const manyDays = daysIn(range) > 1;
  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={t('pTitle')} onBack={() => goBack('/dashboard')} right={<HideAmountsButton tone="header" />} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <HideBanner />
        <RangeBar value={picked} onChange={setPicked} />

        <Card className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            <Line label={t('pSalesItems')} amount={r?.itemisedSales ?? 0} />
            <Line label={t('pCogs')} amount={r?.cogs ?? 0} tone="out" />
            <Line strong label={t('pGross')} amount={r?.grossProfit ?? 0} tone={(r?.grossProfit ?? 0) < 0 ? 'out' : 'in'} />
            <Line label={t('pExpenses')} amount={r?.expenses ?? 0} tone="out" />
            <Line label={t('pLoss')} amount={r?.stockLoss ?? 0} tone="out" />
          </ul>
          <div className="border-t-[1.5px] border-line pt-3">
            <p className="text-label font-semibold text-inkSoft">{net < 0 ? t('pNetLoss') : t('pNet')}</p>
            <AmountText amount={Math.abs(net)} size="xl" tone={net < 0 ? 'out' : 'in'} />
          </div>
          <p className="text-label text-inkSoft">{t('pExplainProfit')}</p>
        </Card>

        {r && (r.plainSales > 0 || r.udhaarGiven > 0) && (
          <Card tone="soft" className="flex flex-col gap-2">
            <Line label={t('pSalesPlain')} amount={r.plainSales} />
            <Line strong label={t('pSalesTotal')} amount={r.totalSales} />
            {r.plainSales > 0 && <p className="text-label font-semibold text-ink">{fill(t('dPlainHint'), { amount: r.plainSales.toLocaleString('en-US') })}</p>}
            {r.udhaarGiven > 0 && <p className="text-label font-semibold text-ink">{fill(t('pUdhaarNote'), { amount: r.udhaarGiven.toLocaleString('en-US') })}</p>}
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <h2 className="text-body font-extrabold text-ink">{t('pCashTitle')}</h2>
          <ul className="flex flex-col gap-2">
            <Line label={t('pCashIn')} amount={r?.moneyIn ?? 0} tone="in" />
            <Line label={t('pCashOut')} amount={r?.moneyOut ?? 0} tone="out" />
          </ul>
          <p className="text-label text-inkSoft">{t('pExplainCash')}</p>
        </Card>

        <h2 className="pt-1 text-title font-extrabold text-ink">{t('pProducts')}</h2>
        {r && r.byProduct.length === 0 && (
          <Card tone="soft">
            <p className="text-body text-inkSoft">{t('pNoItems')}</p>
          </Card>
        )}
        {r && r.byProduct.length > 0 && (
          <Card className="flex flex-col gap-3">
            <p className="text-body font-extrabold text-ink">{t('pBest')}</p>
            <ul className="flex flex-col gap-3">
              {r.byProduct.slice(0, 8).map((row) => {
                const product = view?.products.get(row.product_id);
                return (
                  <li key={row.product_id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span dir="auto" className="block truncate text-body font-bold text-ink">{row.name}</span>
                      {product && <bdi className="block text-label text-inkSoft">{t('pSoldQty')}: {qtyText(t, row.qty_base, product)}</bdi>}
                    </span>
                    <AmountText amount={Math.abs(row.profit)} size="s" tone={row.profit < 0 ? 'out' : 'in'} room="130px" />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {view && view.slow.length > 0 && (
          <Card className="flex flex-col gap-3">
            <p className="text-body font-extrabold text-ink">{t('pSlow')}</p>
            <ul className="flex flex-col gap-2">
              {view.slow.map((row) => (
                <li key={row.product.id} className="flex items-baseline justify-between gap-3">
                  <span dir="auto" className="min-w-0 truncate text-body font-bold text-ink">{row.product.name}</span>
                  <bdi className="shrink-0 text-label font-semibold text-inkSoft">{row.qty === 0 ? t('pNotSold') : `${t('pSoldQty')}: ${qtyText(t, row.qty, row.product)}`}</bdi>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {manyDays && (
          <>
            <div className="flex flex-wrap gap-2" role="group">
              {STEPS.map((s) => (
                <Chip key={s.step} aria-pressed={step === s.step} className={step === s.step ? 'border-primary bg-primarySoft' : undefined} onClick={() => setStep(s.step)}>
                  {t(s.text)}
                </Chip>
              ))}
            </div>
            <ul className="flex flex-col gap-2">
              {view?.buckets.map((b) => (
                <li key={b.start}>
                  <Card className="flex items-center justify-between gap-3 !p-3">
                    <span className="min-w-0">
                      <bdi className="block text-body font-extrabold text-ink">{b.start === b.end ? bucketLabel(b, lang) : `${bucketLabel(b, lang)} – ${bucketLabel({ ...b, start: b.end }, lang)}`}</bdi>
                      <span className="block text-label text-inkSoft">{t('dSales')}: <AmountText amount={b.report.totalSales} size="s" room="110px" className="!text-label" /></span>
                    </span>
                    <AmountText amount={Math.abs(b.report.netProfit)} size="s" tone={b.report.netProfit < 0 ? 'out' : 'in'} room="120px" />
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}

        <Card tone="soft" className="flex flex-col gap-1">
          <h2 className="text-body font-extrabold text-ink">{t('pHow')}</h2>
          <p className="text-label text-ink">{t('pHowBody')}</p>
        </Card>
      </div>
    </main>
  );
}

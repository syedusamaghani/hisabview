import { AmountText } from '../../components/AmountText';
import { Card } from '../../components/Card';
import { HideBanner } from '../../components/HideBanner';
import { HideAmountsButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { moversRepo, useLive, useRole } from '../../data';
import { useT } from '../../i18n/i18n';
import { canSeeProfit } from '../../lib/permissions';
import { goBack, navigate } from '../../lib/router';
import type { Mover } from '../../lib/movers';
import { fill, qtyText } from '../stock/stockText';

// Tez aur sust saman: from the last 30 days of sales. What will run out soon (with how much to order), what sells fastest,
// and what is stuck (stock but no sale). Only a guess: it assumes the next days sell like the last ones.
export function MoversScreen() {
  const { t } = useT();
  const role = useRole() ?? 'cashier';
  const data = useLive(async () => (canSeeProfit(role) ? moversRepo.load() : null), [role]);

  if (!canSeeProfit(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('moversTitle')} onBack={() => goBack('/dashboard')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('dNotAllowed')}</p>
      </main>
    );
  }

  const row = (m: Mover, sub: string, right?: number) => (
    <li key={m.product.id}>
      <button type="button" onClick={() => navigate(`/stock/${m.product.id}`)} className="flex min-h-tap w-full items-center justify-between gap-3 text-start">
        <span className="min-w-0">
          <span dir="auto" className="block truncate text-body font-bold text-ink">{m.product.name}</span>
          <bdi className="block text-label text-inkSoft">{sub}</bdi>
        </span>
        {right !== undefined && <AmountText amount={right} size="s" room="120px" />}
      </button>
    </li>
  );

  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={t('moversTitle')} onBack={() => goBack('/dashboard')} right={<HideAmountsButton tone="header" />} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <HideBanner />
        <p className="text-body text-inkSoft">{t('mvIntro')}</p>

        <Card className="flex flex-col gap-2">
          <h2 className="text-body font-extrabold text-ink">{t('mvOut')}</h2>
          {data && data.runningOut.length === 0 && <p className="text-body text-inkSoft">{t('mvOutNone')}</p>}
          <ul className="flex flex-col gap-1">
            {data?.runningOut.map((m) => row(m, fill(t('mvOutRow'), { days: String(m.daysLeft ?? 0), qty: qtyText(t, m.reorder, m.product) })))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-body font-extrabold text-ink">{t('mvFast')}</h2>
          {data && data.fast.length === 0 && <p className="text-body text-inkSoft">{t('mvFastNone')}</p>}
          <ul className="flex flex-col gap-1">
            {data?.fast.map((m) => row(m, fill(t('mvFastRow'), { qty: qtyText(t, m.sold, m.product) }), m.revenue))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-body font-extrabold text-ink">{t('mvSlow')}</h2>
          {data && data.slow.length === 0 && <p className="text-body text-inkSoft">{t('mvSlowNone')}</p>}
          <ul className="flex flex-col gap-1">
            {data?.slow.slice(0, 15).map((m) => row(m, fill(t('mvSlowRow'), { qty: qtyText(t, m.stock, m.product) }), m.value))}
          </ul>
        </Card>

        <p className="text-label text-inkSoft">{t('mvGuess')}</p>
      </div>
    </main>
  );
}

// Small pieces shared by the dashboard and the profit screen: the date chips, the bar chart, the payment split.
import { Chip } from '../../components/Chip';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import { dayKeyOf, isDayKey, type DayKey } from '../../lib/cashbook';
import { formatDay } from '../../lib/dates';
import { METHODS, METHOD_TEXT, type Method } from '../../lib/methods';
import { formatRs } from '../../lib/money';
import { rangeFor, type Bucket, type DayRange, type MethodMoney, type RangeKind } from '../../lib/profit';
import { usePrivacy } from '../../state/privacy';

export type Picked = { kind: RangeKind; custom: DayRange };

const KINDS: { kind: RangeKind; text: TextKey }[] = [
  { kind: 'today', text: 'rangeToday' },
  { kind: 'yesterday', text: 'rangeYesterday' },
  { kind: 'week', text: 'rangeWeek' },
  { kind: 'month', text: 'rangeMonth' },
  { kind: 'custom', text: 'rangeCustom' },
];

// The chosen dates are kept in the page address (?r=week, or ?r=custom&from=..&to=..), so a screen opened from another one shows the same days
export function pickedFromAddress(): Picked {
  const q = new URLSearchParams(window.location.search);
  const today = dayKeyOf(new Date());
  const r = q.get('r');
  const kind = KINDS.find((k) => k.kind === r)?.kind ?? 'today';
  const from = q.get('from');
  const to = q.get('to');
  const ok = (d: string | null): d is DayKey => isDayKey(d) && d <= today;
  return { kind, custom: { from: ok(from) ? from : today, to: ok(to) ? to : today } };
}

export const pickedQuery = (p: Picked): string => (p.kind === 'custom' ? `?r=custom&from=${p.custom.from}&to=${p.custom.to}` : `?r=${p.kind}`);
export const rangeOfPicked = (p: Picked): DayRange => rangeFor(p.kind, dayKeyOf(new Date()), p.custom);

export function RangeBar({ value, onChange }: { value: Picked; onChange: (next: Picked) => void }) {
  const { t, lang } = useT();
  const today = dayKeyOf(new Date());
  const field = 'min-h-tap w-full rounded-button border-[1.5px] border-line bg-surface px-3 text-body font-semibold text-ink';
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('dashTitle')}>
        {KINDS.map((k) => (
          <Chip key={k.kind} aria-pressed={value.kind === k.kind} className={value.kind === k.kind ? 'border-primary bg-primarySoft' : undefined} onClick={() => onChange({ ...value, kind: k.kind })}>
            {t(k.text)}
          </Chip>
        ))}
      </div>
      {value.kind === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-label font-bold text-inkSoft">
            {t('rangeFrom')}
            <input type="date" className={field} max={today} value={value.custom.from} onChange={(e) => isDayKey(e.target.value) && onChange({ ...value, custom: { ...value.custom, from: e.target.value } })} />
          </label>
          <label className="block text-label font-bold text-inkSoft">
            {t('rangeTo')}
            <input type="date" className={field} max={today} value={value.custom.to} onChange={(e) => isDayKey(e.target.value) && onChange({ ...value, custom: { ...value.custom, to: e.target.value } })} />
          </label>
        </div>
      )}
      <p className="text-label font-semibold text-inkSoft">
        <bdi>{rangeText(rangeOfPicked(value), lang)}</bdi>
      </p>
    </div>
  );
}

export function rangeText(range: DayRange, lang: 'ro' | 'ur' | 'en'): string {
  const at = (d: DayKey) => formatDay(`${d}T12:00:00+05:00`, lang);
  return range.from === range.to ? at(range.from) : `${at(range.from)} – ${at(range.to)}`;
}

// A label for one bar of the trend: the day, or the first day of the week or month
export const bucketLabel = (b: Bucket, lang: 'ro' | 'ur' | 'en'): string => formatDay(`${b.start}T12:00:00+05:00`, lang);

// Sales and profit side by side for every day, week or month. Plain bars, no chart library.
// Profit above zero is green, below zero (a loss) is red and drawn the same way, so size always means money.
export function TrendChart({ buckets }: { buckets: Bucket[] }) {
  const { t, lang } = useT();
  const { hidden } = usePrivacy();
  const W = 320;
  const H = 130;
  const top = Math.max(1, ...buckets.map((b) => Math.max(b.report.totalSales, Math.abs(b.report.netProfit))));
  const slot = W / Math.max(1, buckets.length);
  const bar = Math.max(2, Math.min(18, slot / 2 - 2));
  const h = (v: number) => Math.round((Math.abs(v) / top) * H);
  const every = Math.max(1, Math.ceil(buckets.length / 6)); // a label under about six bars, so they never touch
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label={t('dTrend')}>
        <line x1="0" x2={W} y1={H} y2={H} className="stroke-current text-line" strokeWidth="1.5" />
        {!hidden &&
          buckets.map((b, i) => {
            const x = i * slot + slot / 2;
            const profit = b.report.netProfit;
            return (
              <g key={b.start}>
                <rect x={x - bar - 1} y={H - h(b.report.totalSales)} width={bar} height={h(b.report.totalSales)} rx="2" className="fill-current text-primary" />
                <rect x={x + 1} y={H - h(profit)} width={bar} height={h(profit)} rx="2" className={profit >= 0 ? 'fill-current text-moneyIn' : 'fill-current text-moneyOut'} />
                {i % every === 0 && (
                  <text x={x} y={H + 16} textAnchor="middle" className="fill-current text-inkSoft" fontSize="10">
                    {bucketLabel(b, lang)}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-label font-semibold text-inkSoft">
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-primary" />{t('dLegendSales')}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-3 rounded-sm bg-moneyIn" />{t('dLegendProfit')}</span>
      </div>
    </div>
  );
}

const METHOD_TONE: Record<Method, string> = { cash: 'bg-primary', jazzcash: 'bg-accent', easypaisa: 'bg-moneyIn', bank: 'bg-inkSoft', other: 'bg-line' };

// One bar cut into the ways money came in (cash, JazzCash, ...), with the rupees listed under it
export function SplitBar({ money }: { money: MethodMoney }) {
  const { t } = useT();
  const { hidden } = usePrivacy();
  const total = METHODS.reduce((n, m) => n + money[m], 0);
  const rows = METHODS.filter((m) => money[m] > 0);
  if (total === 0) return <p className="text-body text-inkSoft">{t('dSplitNone')}</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-5 overflow-hidden rounded-full bg-line" role="img" aria-label={t('dSplit')}>
        {rows.map((m) => (
          <span key={m} className={METHOD_TONE[m]} style={{ width: `${(money[m] / total) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((m) => (
          <li key={m} className="flex items-center justify-between gap-3 text-body">
            <span className="flex items-center gap-2 font-bold text-ink"><span className={`inline-block size-3 rounded-sm ${METHOD_TONE[m]}`} />{t(METHOD_TEXT[m])}</span>
            <bdi className="font-extrabold text-ink">{hidden ? 'Rs ***' : `${formatRs(money[m])} · ${Math.round((money[m] / total) * 100)}%`}</bdi>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const pickedKey = (p: Picked) => `${p.kind}|${p.custom.from}|${p.custom.to}`;
import { useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Sheet } from '../../components/Sheet';
import { SaveSuccess } from '../../components/SaveSuccess';
import { TextField } from '../../components/TextField';
import { partiesRepo, productsRepo, useLive, useRole, type Product, type StockMove, type StockMoveKind } from '../../data';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import { cx } from '../../lib/cx';
import { formatDay, formatTime } from '../../lib/dates';
import { canManageStock } from '../../lib/permissions';
import { goBack, navigate } from '../../lib/router';
import { allUnits, toBase, unitFactor } from '../../lib/stock';
import { fill, qtyText, unitLabel } from './stockText';

const MOVE_TEXT: Record<StockMoveKind, TextKey> = {
  opening: 'mvOpening',
  purchase: 'mvPurchase',
  sale: 'mvSale',
  purchase_return: 'mvReturn',
  adjust: 'mvAdjust',
  damaged: 'mvDamaged',
  lost: 'mvLost',
  reversal: 'mvReversal',
};

// One item: what is left, what it is worth, and every movement (buying, selling, losses, corrections)
export function ProductScreen({ productId }: { productId: string }) {
  const { t } = useT();
  const role = useRole() ?? 'cashier';
  const manager = canManageStock(role);
  const data = useLive(
    async () => ({
      product: (await productsRepo.get(productId)) ?? null,
      moves: await productsRepo.movesFor(productId),
      names: Object.fromEntries((await partiesRepo.listAll()).map((p) => [p.id, p.name])),
      stock: (await productsRepo.listStock(true)).find((r) => r.product.id === productId),
    }),
    [productId],
  );
  const [filter, setFilter] = useState<'all' | 'buy'>('all');
  const [adjusting, setAdjusting] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [done, setDone] = useState(false);

  if (!data) return <main className="mx-auto min-h-screen max-w-app" />;
  const { product, moves, names, stock } = data;
  if (!product || !stock) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('navStock')} onBack={() => goBack('/stock')} />
      </main>
    );
  }
  const shown = filter === 'buy' ? moves.filter((m) => m.kind === 'purchase') : moves;

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={product.name} subtitle={product.category ?? undefined} onBack={() => goBack('/stock')} />

      <div className="flex flex-col gap-3 px-gutter pt-3">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {product.image ? (
              <img src={product.image} alt="" className="size-20 shrink-0 rounded-button object-cover" />
            ) : (
              <span className="grid size-20 shrink-0 place-items-center rounded-button bg-primarySoft text-primary"><Icon name="box" size={40} /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-label font-bold text-inkSoft">{t('stockLeft')}</p>
              <p className="break-words text-title font-extrabold text-ink"><bdi>{qtyText(t, stock.stock, product)}</bdi></p>
              {stock.low && <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-caption font-extrabold text-accentInk">{t('stockLow')}</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Fact label={t('pCost')} amount={product.cost_price} per={unitLabel(t, product.price_unit)} />
            <Fact label={t('pSell')} amount={product.sell_price} per={unitLabel(t, product.price_unit)} />
            <Fact label={t('pValue')} amount={stock.value} />
          </div>
        </Card>

        {manager && (
          <div className="grid grid-cols-2 gap-2">
            <BigButton full variant="ghost" icon="edit" onClick={() => navigate(`/stock/${product.id}/edit`)}>{t('editCustomer')}</BigButton>
            {product.archived ? (
              <BigButton full variant="ghost" onClick={() => void productsRepo.restore(product.id)}>{t('productShow')}</BigButton>
            ) : (
              <BigButton full variant="ghost" icon="archive" onClick={() => setHiding(true)}>{t('productHide')}</BigButton>
            )}
          </div>
        )}

        <h2 className="pt-2 text-title font-extrabold text-ink">{t('pHistory')}</h2>
        <div className="flex gap-2">
          <Chip aria-pressed={filter === 'all'} className={cx(filter === 'all' && 'bg-primarySoft')} onClick={() => setFilter('all')}>{t('stockAll')}</Chip>
          <Chip aria-pressed={filter === 'buy'} className={cx(filter === 'buy' && 'bg-primarySoft')} onClick={() => setFilter('buy')}>{t('pHistoryBuy')}</Chip>
        </div>
        {shown.length === 0 ? (
          <EmptyState title={t('pNoHistory')} body="" />
        ) : (
          <ul className="flex flex-col gap-2">{shown.map((m) => <MoveRow key={m.id} move={m} product={product} name={m.party_id ? names[m.party_id] : undefined} />)}</ul>
        )}
      </div>

      {manager && (
        <BottomActionBar>
          <BigButton size="lg" full icon="edit" onClick={() => setAdjusting(true)}>{t('pAdjust')}</BigButton>
        </BottomActionBar>
      )}

      <AdjustSheet open={adjusting} product={product} onClose={() => setAdjusting(false)} onSaved={() => { setAdjusting(false); setDone(true); }} />
      <Sheet open={hiding} onClose={() => setHiding(false)} title={t('productHideAsk')}>
        <div className="flex flex-col gap-3">
          <BigButton full onClick={() => { void productsRepo.archive(product.id); setHiding(false); }}>{t('productHideYes')}</BigButton>
          <BigButton full variant="ghost" onClick={() => setHiding(false)}>{t('no')}</BigButton>
        </div>
      </Sheet>
      <SaveSuccess show={done} label={t('adjDone')} onDone={() => setDone(false)} />
    </main>
  );
}

function Fact({ label, amount, per }: { label: string; amount: number; per?: string }) {
  return (
    <div className="min-w-0 rounded-button bg-primarySoft p-2">
      <p className="text-caption font-bold leading-tight text-inkSoft">{label}</p>
      <AmountText amount={amount} size="s" tone="neutral" room="90px" />
      {per && <p className="text-caption text-inkSoft">/ {per}</p>}
    </div>
  );
}

function MoveRow({ move, product, name }: { move: StockMove; product: Product; name?: string }) {
  const { t, lang } = useT();
  const plus = move.qty_base > 0;
  return (
    <li className={cx('flex items-center gap-3 rounded-card border-[1.5px] border-line bg-surface p-3 shadow-card')}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primarySoft text-primary"><Icon name={plus ? 'down' : 'up'} size={24} /></span>
      <span className="min-w-0 flex-1 text-start">
        <span className="block text-body font-extrabold">{t(MOVE_TEXT[move.kind])}{name ? ` · ` : ''}{name && <bdi>{name}</bdi>}</span>
        <span className="block text-label text-inkSoft">
          <span className="whitespace-nowrap">{formatDay(move.created_at, lang)}</span> <bdi className="whitespace-nowrap">{formatTime(move.created_at, lang)}</bdi>
        </span>
        {move.unit_price !== null && (
          <span className="block text-label text-inkSoft">
            Rs {move.unit_price.toLocaleString('en-US')} {fill(t('pPer'), { unit: unitLabel(t, move.unit) })}
          </span>
        )}
        {move.reason && <span dir="auto" className="block truncate text-label text-inkSoft">{move.reason}</span>}
      </span>
      <span className="shrink-0 text-end">
        <bdi className="block text-body font-extrabold text-ink">{plus ? '+' : ''}{qtyText(t, move.qty_base, product)}</bdi>
        {move.line_total > 0 && <AmountText amount={move.line_total} size="s" tone="neutral" room="100px" />}
      </span>
    </li>
  );
}

type AdjustKind = 'up' | 'down' | 'damaged' | 'lost';
const ADJUST_CHOICES: { key: AdjustKind; label: TextKey }[] = [
  { key: 'up', label: 'adjUp' },
  { key: 'down', label: 'adjDown' },
  { key: 'damaged', label: 'adjDamaged' },
  { key: 'lost', label: 'adjLost' },
];
const REASON_CHIPS: TextKey[] = ['adjReasonCount', 'adjReasonBroken', 'adjReasonExpired', 'adjReasonStolen'];

// Stock theek karo: counted more or less than the record, or something was damaged or lost. A reason is always kept.
function AdjustSheet({ open, product, onClose, onSaved }: { open: boolean; product: Product; onClose: () => void; onSaved: () => void }) {
  const { t } = useT();
  const [kind, setKind] = useState<AdjustKind>('down');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(product.price_unit);
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState<TextKey | null>(null);
  const units = allUnits(product);

  const save = async () => {
    const base = toBase(qty, unitFactor(product, unit) ?? 1);
    if (base === null) return setProblem('tQtyBad');
    if (!reason.trim()) return setProblem('adjNeedReason');
    try {
      await productsRepo.adjust(product.id, kind === 'up' ? 'adjust' : kind === 'down' ? 'adjust' : kind, kind === 'down' ? -base : base, reason);
      setQty('');
      setReason('');
      setProblem(null);
      onSaved();
    } catch {
      setProblem('tFailed');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('adjTitle')}>
      <div className="flex flex-col gap-3">
      <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('adjTitle')}>
          {ADJUST_CHOICES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={kind === c.key}
              onClick={() => setKind(c.key)}
              className={cx('min-h-tap rounded-button border-2 px-2 text-body font-extrabold', kind === c.key ? 'border-primary bg-primarySoft text-primary' : 'border-line bg-surface text-ink')}
            >
              {t(c.label)}
            </button>
          ))}
        </div>
        <TextField label={t('adjHowMuch')} inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {units.map((u) => (
            <Chip key={u.name} aria-pressed={unit === u.name} className={cx(unit === u.name && 'bg-primarySoft')} onClick={() => setUnit(u.name)}>{unitLabel(t, u.name)}</Chip>
          ))}
        </div>
        <TextField label={t('adjReason')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        <div className="flex flex-wrap gap-2">
          {REASON_CHIPS.map((k) => <Chip key={k} onClick={() => setReason(t(k))}>{t(k)}</Chip>)}
        </div>
        {problem && <p role="alert" className="rounded-button bg-accent px-3 py-2 text-body font-extrabold text-accentInk">{t(problem)}</p>}
      </div>
        <BigButton full onClick={() => void save()}>{t('adjSave')}</BigButton>
      </div>
    </Sheet>
  );
}

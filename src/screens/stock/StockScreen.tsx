import { useMemo, useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomNav } from '../../components/BottomNav';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SearchBar } from '../../components/SearchBar';
import { productsRepo, useLive, useRole, type StockRow } from '../../data';
import { useT } from '../../i18n/i18n';
import { cx } from '../../lib/cx';
import { canManageStock } from '../../lib/permissions';
import { navigate } from '../../lib/router';
import { useLimit } from '../useLimit';
import { useEntrySnack } from '../useEntrySnack';
import { unitLabel, qtyText } from './stockText';

// Saman: every item with what is left, a "Kam hai" flag, and the value of the stock at cost.
// Buying (Kharid) and selling (Bikri) are one tap from here; the stock then changes by itself.
export function StockScreen() {
  const { t } = useT();
  const role = useRole() ?? 'cashier';
  const manager = canManageStock(role);
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const { snackbar } = useEntrySnack();
  const rows = useLive(() => productsRepo.listStock(true), []);

  const view = useMemo(() => {
    if (!rows) return null;
    const live = rows.filter((r) => !r.product.archived);
    const q = query.trim().toLowerCase();
    const match = (r: StockRow) => !q || [r.product.name, r.product.category, r.product.barcode, r.product.sku].some((v) => v?.toLowerCase().includes(q));
    return {
      shown: live.filter((r) => match(r) && (!lowOnly || r.low)),
      hidden: rows.filter((r) => r.product.archived),
      total: live.reduce((sum, r) => sum + r.value, 0),
      lowCount: live.filter((r) => r.low).length,
      any: live.length > 0,
    };
  }, [rows, query, lowOnly]);
  const limited = useLimit(view?.shown ?? []);

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t('navStock')}>
        <Card className="mt-3">
          <p className="text-label font-bold text-inkSoft">{t('stockWorth')}</p>
          <AmountText amount={view?.total ?? 0} size="l" tone="neutral" />
          <p className="text-label text-inkSoft">{t('stockWorthHint')}</p>
        </Card>
      </ScreenHeader>

      <div className="flex flex-col gap-3 px-gutter pt-3">
        {manager && (
          <BigButton full variant="ghost" icon="plus" onClick={() => navigate('/stock/new')}>
            {t('addProduct')}
          </BigButton>
        )}

        {view?.any && (
          <>
            <SearchBar value={query} onChange={setQuery} placeholder={t('stockSearch')} />
            {view.lowCount > 0 && (
              <div className="flex gap-2">
                <Chip aria-pressed={!lowOnly} className={cx(!lowOnly && 'bg-primarySoft')} onClick={() => setLowOnly(false)}>
                  {t('stockAll')}
                </Chip>
                <Chip aria-pressed={lowOnly} className={cx(lowOnly && 'bg-primarySoft')} onClick={() => setLowOnly(true)}>
                  {t('stockLowOnly')} ({view.lowCount})
                </Chip>
              </div>
            )}
          </>
        )}

        {view && !view.any && <EmptyState title={t('stockEmptyTitle')} body={t('stockEmptyBody')} buttonLabel={manager ? t('addProduct') : undefined} onButton={manager ? () => navigate('/stock/new') : undefined} />}

        <ul className="flex flex-col gap-3">{limited.shown.map((row) => <ProductRow key={row.product.id} row={row} />)}</ul>
        {limited.more}

        {view && view.hidden.length > 0 && manager && (
          <>
            <BigButton full variant="ghost" onClick={() => setShowHidden(!showHidden)}>
              {t('hiddenProducts')} ({view.hidden.length})
            </BigButton>
            {showHidden && <ul className="flex flex-col gap-3">{view.hidden.map((row) => <ProductRow key={row.product.id} row={row} />)}</ul>}
          </>
        )}
      </div>

      {snackbar}

      <BottomNav active="stock">
        <div className={cx('grid gap-3', manager ? 'grid-cols-2' : 'grid-cols-1')}>
          {manager && (
            <BigButton size="lg" variant="ghost" icon="down" onClick={() => navigate('/stock/buy')}>
              {t('buyBtn')}
            </BigButton>
          )}
          <BigButton size="lg" icon="up" onClick={() => navigate('/stock/sell')}>
            {t('sellBtn')}
          </BigButton>
        </div>
      </BottomNav>
    </main>
  );
}

function ProductRow({ row }: { row: StockRow }) {
  const { t } = useT();
  const { product, stock, low } = row;
  return (
    <li>
      <button
        type="button"
        onClick={() => navigate(`/stock/${product.id}`)}
        className={cx(
          'flex min-h-[72px] w-full items-center gap-3 rounded-card border-[1.5px] border-line bg-surface p-3 text-start shadow-card',
          'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
          product.archived && 'opacity-60',
        )}
      >
        {product.image ? (
          <img src={product.image} alt="" className="size-14 shrink-0 rounded-button object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-button bg-primarySoft text-primary">
            <Icon name="box" size={30} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span dir="auto" className="block truncate text-body font-extrabold text-ink">{product.name}</span>
          <span className="block text-label text-inkSoft">
            {t('stockLeft')}: <bdi className="font-bold text-ink">{qtyText(t, stock, product)}</bdi>
          </span>
          {low && <span className="mt-1 inline-block rounded-full bg-accent px-2.5 py-0.5 text-caption font-extrabold text-accentInk">{t('stockLow')}</span>}
        </span>
        <span className="shrink-0 text-end">
          <AmountText amount={product.sell_price} size="s" tone="neutral" room="90px" />
          <span className="block text-caption text-inkSoft">/ {unitLabel(t, product.price_unit)}</span>
        </span>
      </button>
    </li>
  );
}

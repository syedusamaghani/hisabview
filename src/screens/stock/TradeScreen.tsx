import { useMemo, useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { ChoiceCard } from '../../components/ChoiceCard';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { MethodPicker } from '../../components/MethodPicker';
import { SaveSuccess } from '../../components/SaveSuccess';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SearchBar } from '../../components/SearchBar';
import { TextField } from '../../components/TextField';
import { entriesRepo, partiesRepo, productsRepo, tradeRepo, statsRepo, useLive, useRole, type Product, type TradeResult } from '../../data';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import { partyBalance } from '../../lib/balance';
import { overCreditLimit } from '../../lib/credit';
import { formatRs } from '../../lib/money';
import type { Method } from '../../lib/methods';
import { canManageStock } from '../../lib/permissions';
import { goBack, navigate, setFlash } from '../../lib/router';
import { allUnits, lineTotal, priceInUnit, toBase, unitFactor } from '../../lib/stock';
import { fill, qtyText, unitLabel } from './stockText';

// Kharid (buying from a supplier), Bikri (selling) and Supplier ko wapas (returning goods), all in one flow:
//   items -> details (who, bill, payment) -> check -> save.
// Saving writes the money entry, the stock movements, the supplier balance and the diary in ONE transaction.
export type TradeMode = 'buy' | 'sell' | 'return';

type Draft = { product: Product; unit: string; qtyText: string; qty_base: number; unit_price: number };
type Stage = 'lines' | 'pick' | 'line' | 'details' | 'check';

const TITLE: Record<TradeMode, TextKey> = { buy: 'tBuyTitle', sell: 'tSellTitle', return: 'tReturnTitle' };
const SAVED: Record<TradeMode, TextKey> = { buy: 'tSavedBuy', sell: 'tSavedSell', return: 'tSavedReturn' };
const digits = (s: string) => s.replace(/\D/g, '');

// Buying and returning use the biggest packing (carton), selling the unit the price is quoted in
function defaultUnit(product: Product, mode: TradeMode): string {
  if (mode === 'sell' || product.units.length === 0) return product.price_unit;
  return [...product.units].sort((a, b) => b.factor - a.factor)[0].name;
}

// The product's rate worked out for the chosen unit (price per carton from the price per piece, and so on)
function defaultRate(product: Product, unit: string, mode: TradeMode): number {
  const price = mode === 'sell' ? product.sell_price : product.cost_price;
  return priceInUnit(price, unitFactor(product, product.price_unit) ?? 1, unitFactor(product, unit) ?? 1);
}

export function TradeScreen({ mode }: { mode: TradeMode }) {
  const { t } = useT();
  const role = useRole() ?? 'cashier';
  const allowed = mode === 'sell' || canManageStock(role); // a cashier only sells
  const data = useLive(
    async () => ({
      rows: await productsRepo.listStock(false),
      parties: await partiesRepo.listActive(),
      stats: await statsRepo.all(),
    }),
    [],
  );
  const preset = new URLSearchParams(window.location.search).get('supplier');

  const [stage, setStage] = useState<Stage>('lines');
  const [lines, setLines] = useState<Draft[]>([]);
  const [query, setQuery] = useState('');
  // the item being added
  const [adding, setAdding] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [rate, setRate] = useState('');
  // details
  const [supplierId, setSupplierId] = useState<string | null>(preset);
  const [newSupplier, setNewSupplier] = useState('');
  const [invoice, setInvoice] = useState('');
  const [pay, setPay] = useState<'full' | 'part' | 'credit'>('full');
  const [paidText, setPaidText] = useState('');
  const [refund, setRefund] = useState<'no' | 'yes'>('no');
  const [refundText, setRefundText] = useState('');
  const [how, setHow] = useState<'cash' | 'udhaar'>('cash');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [method, setMethod] = useState<Method>('cash');
  // check and save
  const [problem, setProblem] = useState<TextKey | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<TradeResult | null>(null);

  const total = useMemo(() => lines.reduce((sum, l) => sum + lineTotal(l.qty_base, l.unit_price, unitFactor(l.product, l.unit) ?? 1), 0), [lines]);
  const suppliers = useMemo(() => (data?.parties ?? []).filter((p) => p.type === 'supplier'), [data]);
  const customers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    return (data?.parties ?? []).filter((p) => p.type === 'customer' && (!q || p.name.toLowerCase().includes(q)));
  }, [data, customerQuery]);
  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) => !q || [r.product.name, r.product.barcode, r.product.sku, r.product.category].some((v) => v?.toLowerCase().includes(q)));
  }, [data, query]);

  const supplierName = supplierId ? suppliers.find((s) => s.id === supplierId)?.name : newSupplier.trim();
  const customerName = customerId ? data?.parties.find((p) => p.id === customerId)?.name : undefined;
  const paid = mode === 'buy' ? (pay === 'full' ? total : pay === 'part' ? Number(digits(paidText) || '0') : 0) : mode === 'return' ? (refund === 'yes' ? Number(digits(refundText) || String(total)) : 0) : 0;
  const factorOf = (u: string) => (adding ? unitFactor(adding, u) : null) ?? 1;
  const qtyBase = adding ? toBase(qty, factorOf(unit)) : null;
  const previewTotal = qtyBase !== null && rate ? lineTotal(qtyBase, Number(digits(rate)), factorOf(unit)) : 0;

  const back = () => {
    setProblem(null);
    setWarning(null);
    if (stage === 'pick' || stage === 'line') return setStage('lines');
    if (stage === 'details') return setStage('lines');
    if (stage === 'check') return setStage('details');
    goBack('/stock');
  };

  const choose = (product: Product) => {
    const u = defaultUnit(product, mode);
    setAdding(product);
    setUnit(u);
    setRate(String(defaultRate(product, u, mode)));
    setQty('');
    setProblem(null);
    setStage('line');
  };

  const changeUnit = (u: string) => {
    if (!adding) return;
    setUnit(u);
    setRate(String(defaultRate(adding, u, mode)));
  };

  const addLine = () => {
    if (!adding) return;
    if (qtyBase === null) return setProblem('tQtyBad');
    setLines([...lines, { product: adding, unit, qtyText: qty.trim(), qty_base: qtyBase, unit_price: Number(digits(rate) || '0') }]);
    setAdding(null);
    setProblem(null);
    setStage('lines');
  };

  const toCheck = () => {
    setWarning(null);
    if (mode !== 'sell' && !supplierId && !newSupplier.trim()) return setProblem('tSupplier');
    if (mode === 'sell' && how === 'udhaar' && !customerId) return setProblem('tPickCustomer');
    if (paid > total || (mode === 'buy' && pay === 'part' && paid < 1)) return setProblem('tFailed');
    setProblem(null);
    setStage('check');
  };

  const save = async () => {
    if (saving) return;
    const drafts = lines.map((l) => ({ product_id: l.product.id, unit: l.unit, qty_base: l.qty_base, unit_price: l.unit_price }));
    // Two warnings, each shown once: pressing "Theek hai" again saves anyway
    if (!warning) {
      // Udhaar above the customer's limit: warned first, since it is money
      if (mode === 'sell' && how === 'udhaar' && customerId) {
        const customer = await partiesRepo.get(customerId);
        const over = customer ? overCreditLimit(customer.credit_limit, partyBalance(customer, await entriesRepo.listForParty(customerId)), total) : null;
        if (over !== null) return setWarning(t('creditWarn').replace('{limit}', formatRs(over)));
      }
      if (mode !== 'buy') {
        const short = await tradeRepo.shortages(drafts);
        if (short.length > 0) {
          const first = lines.find((l) => l.product.id === short[0])!.product;
          const have = data?.rows.find((r) => r.product.id === first.id)?.stock ?? 0;
          return setWarning(fill(t('tShort'), { name: first.name, have: qtyText(t, have, first) }));
        }
      }
      if (mode === 'buy' && supplierId && invoice.trim() && (await tradeRepo.findInvoice(supplierId, invoice))) return setWarning(t('tBillUsed'));
    }
    setSaving(true);
    try {
      let supplier = supplierId;
      if (mode !== 'sell' && !supplier) supplier = (await partiesRepo.create({ name: newSupplier, type: 'supplier' })).party.id;
      const done =
        mode === 'buy'
          ? await tradeRepo.purchase({ supplier_id: supplier!, lines: drafts, invoice_no: invoice, paid, method: paid > 0 ? method : null })
          : mode === 'return'
            ? await tradeRepo.purchaseReturn({ supplier_id: supplier!, lines: drafts, invoice_no: invoice, refund: paid, method: paid > 0 ? method : null })
            : await tradeRepo.sale({ lines: drafts, party_id: how === 'udhaar' ? customerId : null, method: how === 'cash' ? method : null });
      setFlash({ kind: 'undoEntry', entryId: done.entry.id });
      setResult(done);
      setSupplierId(supplier);
    } catch {
      setProblem('tFailed');
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t(TITLE[mode])} onBack={() => goBack('/stock')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('askManagerStock')}</p>
      </main>
    );
  }

  const header = <ScreenHeader title={stage === 'pick' ? t('tPickItem') : stage === 'line' && adding ? adding.name : t(TITLE[mode])} onBack={back} />;
  const alert = problem && <p role="alert" className="rounded-button bg-accent px-3 py-2 text-body font-extrabold text-accentInk">{t(problem)}</p>;
  const caution = warning && <p role="alert" className="rounded-button bg-accent px-3 py-2 text-body font-extrabold text-accentInk">{warning}</p>;
  const finish = () => navigate(preset ? `/party/${preset}` : mode === 'buy' || mode === 'return' ? `/party/${supplierId}` : '/stock', { replace: true });

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      {header}

      {stage === 'lines' && (
        <div className="flex flex-col gap-3 px-gutter pt-4">
          {data && data.rows.length === 0 && <EmptyState title={t('stockEmptyTitle')} body={t('tNoItems')} buttonLabel={canManageStock(role) ? t('addProduct') : undefined} onButton={() => navigate('/stock/new')} />}
          <ul className="flex flex-col gap-2">
            {lines.map((l, i) => (
              <li key={i} className="flex items-center gap-3 rounded-card border-[1.5px] border-line bg-surface p-3 shadow-card">
                <span className="min-w-0 flex-1 text-start">
                  <span dir="auto" className="block truncate text-body font-extrabold">{l.product.name}</span>
                  <bdi className="block text-label text-inkSoft">
                    {l.qtyText} {unitLabel(t, l.unit)} × {formatRs(l.unit_price)}
                  </bdi>
                </span>
                <AmountText amount={lineTotal(l.qty_base, l.unit_price, unitFactor(l.product, l.unit) ?? 1)} size="s" tone="neutral" room="110px" />
                <Chip onClick={() => setLines(lines.filter((_, n) => n !== i))}>{t('tRemove')}</Chip>
              </li>
            ))}
          </ul>
          {data && data.rows.length > 0 && <BigButton full variant="ghost" icon="plus" onClick={() => { setQuery(''); setStage('pick'); }}>{t('tAddItem')}</BigButton>}
          {lines.length > 0 && (
            <Card tone="soft" className="flex items-center justify-between">
              <span className="text-body font-extrabold">{t('tTotal')}</span>
              <AmountText amount={total} size="l" tone="neutral" reveal />
            </Card>
          )}
        </div>
      )}

      {stage === 'pick' && (
        <div className="flex flex-col gap-3 px-gutter pt-4">
          <SearchBar value={query} onChange={setQuery} placeholder={t('stockSearch')} />
          <ul className="flex flex-col gap-2">
            {products.map(({ product, stock }) => (
              <li key={product.id}>
                <button type="button" onClick={() => choose(product)} className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-card border-[1.5px] border-line bg-surface p-3 text-start shadow-card focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent">
                  <span dir="auto" className="min-w-0 flex-1 truncate text-body font-extrabold">{product.name}</span>
                  <bdi className="shrink-0 text-label text-inkSoft">{qtyText(t, stock, product)}</bdi>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage === 'line' && adding && (
        <div className="flex flex-col gap-4 px-gutter pt-4">
          <TextField label={t('tQty')} size="lg" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          <div>
            <p className="mb-1.5 text-label font-bold text-inkSoft">{t('tUnit')}</p>
            <div className="flex flex-wrap gap-2">
              {allUnits(adding).map((u) => <Chip key={u.name} aria-pressed={unit === u.name} className={unit === u.name ? 'bg-primarySoft' : undefined} onClick={() => changeUnit(u.name)}>{unitLabel(t, u.name)}</Chip>)}
            </div>
          </div>
          <TextField label={fill(t('tRate'), { unit: unitLabel(t, unit) })} inputMode="numeric" value={rate} onChange={(e) => setRate(digits(e.target.value))} />
          {previewTotal > 0 && (
            <Card tone="soft" className="flex items-center justify-between">
              <span className="text-body font-extrabold">{t('tTotal')}</span>
              <AmountText amount={previewTotal} size="l" tone="neutral" reveal />
            </Card>
          )}
          {qty.trim() && qtyBase === null && alert}
          {problem && qtyBase !== null && alert}
        </div>
      )}

      {stage === 'details' && (
        <div className="flex flex-col gap-4 px-gutter pt-4">
          {mode !== 'sell' && (
            <>
              <p className="text-label font-bold text-inkSoft">{mode === 'buy' ? t('tSupplier') : t('tSupplierReturn')}</p>
              <div className="flex flex-col gap-2">
                {suppliers.map((s) => <ChoiceCard key={s.id} title={s.name} selected={supplierId === s.id} onSelect={() => { setSupplierId(s.id); setNewSupplier(''); }} />)}
              </div>
              <TextField label={t('tNewSupplier')} hint={t('tSupplierName')} value={newSupplier} onChange={(e) => { setNewSupplier(e.target.value); if (e.target.value.trim()) setSupplierId(null); }} maxLength={80} />
              <TextField label={t('tBill')} value={invoice} onChange={(e) => setInvoice(e.target.value)} maxLength={60} />
            </>
          )}
          {mode === 'buy' && (
            <>
              <p className="text-label font-bold text-inkSoft">{t('tPaid')}</p>
              <div className="grid grid-cols-1 gap-2">
                <ChoiceCard title={t('tPayFull')} selected={pay === 'full'} onSelect={() => setPay('full')} />
                <ChoiceCard title={t('tPayPart')} selected={pay === 'part'} onSelect={() => setPay('part')} />
                <ChoiceCard title={t('tPayCredit')} selected={pay === 'credit'} onSelect={() => setPay('credit')} />
              </div>
              {pay === 'part' && <TextField label={t('tPaidAmount')} inputMode="numeric" value={paidText} onChange={(e) => setPaidText(digits(e.target.value))} />}
              {paid > 0 && <MethodPicker value={method} onChange={setMethod} />}
            </>
          )}
          {mode === 'return' && (
            <>
              <p className="text-label font-bold text-inkSoft">{t('tRefund')}</p>
              <div className="grid grid-cols-1 gap-2">
                <ChoiceCard title={t('tRefundNo')} selected={refund === 'no'} onSelect={() => setRefund('no')} />
                <ChoiceCard title={t('tRefundYes')} selected={refund === 'yes'} onSelect={() => setRefund('yes')} />
              </div>
              {refund === 'yes' && (
                <>
                  <TextField label={t('tPaidAmount')} inputMode="numeric" value={refundText} placeholder={String(total)} onChange={(e) => setRefundText(digits(e.target.value))} />
                  <MethodPicker value={method} onChange={setMethod} />
                </>
              )}
            </>
          )}
          {mode === 'sell' && (
            <>
              <p className="text-label font-bold text-inkSoft">{t('tSaleHow')}</p>
              <div className="grid grid-cols-1 gap-2">
                <ChoiceCard title={t('tSaleCash')} selected={how === 'cash'} onSelect={() => setHow('cash')} />
                <ChoiceCard title={t('tSaleUdhaar')} selected={how === 'udhaar'} onSelect={() => setHow('udhaar')} />
              </div>
              {how === 'cash' && <MethodPicker value={method} onChange={setMethod} />}
              {how === 'udhaar' && (
                <>
                  <p className="text-label font-bold text-inkSoft">{t('tPickCustomer')}</p>
                  <SearchBar value={customerQuery} onChange={setCustomerQuery} placeholder={t('searchPlaceholder')} />
                  <div className="flex flex-col gap-2">
                    {customers.slice(0, 40).map((p) => <ChoiceCard key={p.id} title={p.name} selected={customerId === p.id} onSelect={() => setCustomerId(p.id)} />)}
                  </div>
                </>
              )}
            </>
          )}
          {alert}
        </div>
      )}

      {stage === 'check' && (
        <div className="flex flex-col gap-3 px-gutter pt-4">
          <Card className="flex flex-col gap-2">
            {(supplierName || customerName) && <p dir="auto" className="text-title font-extrabold">{supplierName || customerName}</p>}
            {invoice.trim() && <p className="text-label text-inkSoft">{t('tBill').replace(/ \(.*\)/, '')}: <bdi>{invoice.trim()}</bdi></p>}
            <ul className="flex flex-col gap-1 border-t-[1.5px] border-line pt-2">
              {lines.map((l, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-start">
                    <span dir="auto" className="block truncate text-body font-bold">{l.product.name}</span>
                    <bdi className="block text-label text-inkSoft">{l.qtyText} {unitLabel(t, l.unit)} × {formatRs(l.unit_price)}</bdi>
                  </span>
                  <AmountText amount={lineTotal(l.qty_base, l.unit_price, unitFactor(l.product, l.unit) ?? 1)} size="s" tone="neutral" reveal room="110px" />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t-[1.5px] border-line pt-2">
              <span className="text-body font-extrabold">{t('tTotal')}</span>
              <AmountText amount={total} size="l" tone="neutral" reveal />
            </div>
            {mode === 'buy' && total - paid > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-body font-bold text-inkSoft">{t('tDue')}</span>
                <AmountText amount={total - paid} size="m" tone="neutral" reveal />
              </div>
            )}
          </Card>
          {caution}
          {alert}
        </div>
      )}

      <BottomActionBar>
        {stage === 'lines' && <BigButton size="lg" full disabled={lines.length === 0} onClick={() => { setProblem(null); setStage('details'); }}>{t('next')}</BigButton>}
        {stage === 'line' && <BigButton size="lg" full disabled={!qty.trim() || !rate} onClick={addLine}>{t('tLineAdd')}</BigButton>}
        {stage === 'details' && <BigButton size="lg" full onClick={toCheck}>{t('next')}</BigButton>}
        {stage === 'check' && (
          <div className="grid grid-cols-2 gap-3">
            <BigButton size="lg" variant="ghost" onClick={back}>{t('tChange')}</BigButton>
            <BigButton size="lg" disabled={saving} onClick={() => void save()}>{t('theekHai')}</BigButton>
          </div>
        )}
        {stage === 'pick' && <BigButton size="lg" full variant="ghost" onClick={back}>{t('back')}</BigButton>}
      </BottomActionBar>

      <SaveSuccess show={result !== null} label={t(SAVED[mode])} onDone={finish} />
    </main>
  );
}

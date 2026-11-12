import { useRef, useState } from 'react';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { ChoiceCard } from '../../components/ChoiceCard';
import { Chip } from '../../components/Chip';
import { SaveSuccess } from '../../components/SaveSuccess';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextField } from '../../components/TextField';
import { productsRepo, useLive, useRole, type BaseUnit, type ProductUnit } from '../../data';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import { compressImage } from '../../lib/image';
import { canManageStock } from '../../lib/permissions';
import { goBack, navigate } from '../../lib/router';
import { allUnits, defaultPriceUnit, PACK_NAMES, toBase, unitFactor } from '../../lib/stock';
import { BASE_TEXT, fill, unitLabel } from './stockText';

const BASES: BaseUnit[] = ['piece', 'gram', 'ml'];
const digits = (s: string) => s.replace(/\D/g, '');

// Naya saman / saman edit. The unit it is counted in (dana, wazan, liquid) is chosen once; packings such as
// "1 carton = 144 dana" let the shopkeeper buy in cartons and sell in pieces.
export function ProductFormScreen({ productId }: { productId?: string }) {
  const { t } = useT();
  const role = useRole() ?? 'cashier';
  const existing = useLive(async () => ({ product: productId ? ((await productsRepo.get(productId)) ?? null) : null, loaded: true }), [productId]);
  if (!existing) return <main className="mx-auto min-h-screen max-w-app" />;
  if (!canManageStock(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('addProduct')} onBack={() => goBack('/stock')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('askManagerStock')}</p>
      </main>
    );
  }
  // The form starts from the saved product; keyed so it resets when another product opens
  return <Form key={productId ?? 'new'} productId={productId} initial={existing.product} />;
}

type Initial = Awaited<ReturnType<typeof productsRepo.get>> | null;

function Form({ productId, initial }: { productId?: string; initial: Initial }) {
  const { t } = useT();
  const editing = Boolean(productId && initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [base, setBase] = useState<BaseUnit>(initial?.base_unit ?? 'piece');
  const [packs, setPacks] = useState<ProductUnit[]>(initial?.units ?? []);
  const [packName, setPackName] = useState('');
  const [packCount, setPackCount] = useState('');
  const [priceUnit, setPriceUnit] = useState(initial?.price_unit ?? defaultPriceUnit(initial?.base_unit ?? 'piece'));
  const [cost, setCost] = useState(initial ? String(initial.cost_price) : '');
  const [sell, setSell] = useState(initial ? String(initial.sell_price) : '');
  const [min, setMin] = useState(initial && initial.min_stock > 0 ? String(initial.min_stock / (unitFactor(initial, initial.price_unit) ?? 1)) : '');
  const [opening, setOpening] = useState('');
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const [barcodeUsedBy, setBarcodeUsedBy] = useState<string | null>(null);
  const [problem, setProblem] = useState<TextKey | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const units = allUnits({ base_unit: base, units: packs });
  const baseName = unitLabel(t, defaultBaseName(base));

  const chooseBase = (next: BaseUnit) => {
    setBase(next);
    setPacks([]);
    setPriceUnit(defaultPriceUnit(next));
  };

  const addPack = () => {
    const count = Number(packCount);
    const n = packName.trim().toLowerCase();
    if (!n || !Number.isInteger(count) || count < 2 || units.some((u) => u.name === n)) return setProblem('fBad');
    setPacks([...packs, { name: n, factor: count }]);
    setPackName('');
    setPackCount('');
    setProblem(null);
  };

  const checkBarcode = async (value: string) => {
    const other = await productsRepo.findByBarcode(value, productId);
    setBarcodeUsedBy(other?.name ?? null);
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    const url = await compressImage(file);
    if (url) setImage(url);
    else setProblem('fBad');
  };

  const save = async () => {
    const priceFactor = unitFactor({ base_unit: base, units: packs }, priceUnit) ?? 1;
    const minBase = min.trim() ? toBase(min, priceFactor) : 0;
    const openBase = !editing && opening.trim() ? toBase(opening, priceFactor) : 0;
    if (!name.trim() || minBase === null || openBase === null) return setProblem('fBad');
    const fields = {
      name,
      category,
      barcode,
      sku,
      base_unit: base,
      units: packs,
      price_unit: priceUnit,
      cost_price: Number(digits(cost) || '0'),
      sell_price: Number(digits(sell) || '0'),
      min_stock: minBase,
      image,
    };
    try {
      if (editing && productId) await productsRepo.update(productId, fields);
      else await productsRepo.create({ ...fields, opening_qty_base: openBase });
      setSaved(true);
    } catch {
      setProblem('fBad');
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={editing ? t('productEdit') : t('addProduct')} onBack={() => goBack('/stock')} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <TextField label={t('fName')} size="lg" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus={!editing} />

        <div>
          <p className="mb-1.5 text-label font-bold text-inkSoft">{t('fPhoto')}</p>
          <div className="flex items-center gap-3">
            {image && <img src={image} alt="" className="size-20 rounded-button object-cover" />}
            <div className="flex flex-1 flex-col gap-2">
              <BigButton full variant="ghost" icon="plus" onClick={() => fileRef.current?.click()}>{t('fPhotoAdd')}</BigButton>
              {image && <BigButton full variant="ghost" onClick={() => setImage(null)}>{t('fPhotoRemove')}</BigButton>}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </div>

        <div>
          <p className="mb-1.5 text-label font-bold text-inkSoft">{t('fBase')}</p>
          {editing ? (
            <Card tone="soft"><p className="text-body font-extrabold">{t(BASE_TEXT[base])}</p></Card>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {BASES.map((b) => <ChoiceCard key={b} title={t(BASE_TEXT[b])} selected={base === b} onSelect={() => chooseBase(b)} />)}
            </div>
          )}
        </div>

        <Card tone="soft" className="flex flex-col gap-3">
          <p className="text-body font-extrabold">{t('fPacks')}</p>
          <p className="text-label text-inkSoft">{t('fPacksHint')}</p>
          {packs.map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-2">
              <bdi className="text-body font-bold">{fill(t('fPackLine'), { pack: unitLabel(t, p.name), count: p.factor.toLocaleString('en'), unit: baseName })}</bdi>
              <Chip onClick={() => { setPacks(packs.filter((x) => x.name !== p.name)); if (priceUnit === p.name) setPriceUnit(defaultPriceUnit(base)); }}>{t('tRemove')}</Chip>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {PACK_NAMES.filter((n) => !units.some((u) => u.name === n)).map((n) => <Chip key={n} aria-pressed={packName === n} onClick={() => setPackName(n)}>{unitLabel(t, n)}</Chip>)}
          </div>
          <TextField label={t('fPackName')} value={packName} onChange={(e) => setPackName(e.target.value)} maxLength={20} />
          <TextField label={fill(t('fPackCount'), { pack: packName.trim() || '…', unit: baseName })} inputMode="numeric" value={packCount} onChange={(e) => setPackCount(digits(e.target.value))} />
          <BigButton full variant="ghost" icon="plus" onClick={addPack}>{t('fAddPack')}</BigButton>
        </Card>

        <div>
          <p className="mb-1.5 text-label font-bold text-inkSoft">{t('fPriceUnit')}</p>
          <div className="flex flex-wrap gap-2">
            {units.map((u) => <Chip key={u.name} aria-pressed={priceUnit === u.name} className={priceUnit === u.name ? 'bg-primarySoft' : undefined} onClick={() => setPriceUnit(u.name)}>{unitLabel(t, u.name)}</Chip>)}
          </div>
        </div>
        <TextField label={t('fCost')} inputMode="numeric" value={cost} onChange={(e) => setCost(digits(e.target.value))} />
        <TextField label={t('fSell')} inputMode="numeric" value={sell} onChange={(e) => setSell(digits(e.target.value))} />
        {!editing && <TextField label={`${t('fOpening')} (${unitLabel(t, priceUnit)})`} hint={t('fOpeningHint')} inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />}
        <TextField label={`${t('fMin')} (${unitLabel(t, priceUnit)})`} hint={t('fMinHint')} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />

        <TextField label={t('fCategory')} value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} />
        <TextField label={t('fBarcode')} value={barcode} onChange={(e) => setBarcode(e.target.value)} onBlur={() => void checkBarcode(barcode)} maxLength={64} />
        {barcodeUsedBy && <p role="status" className="rounded-button bg-accent px-3 py-2 text-body font-extrabold text-accentInk">{fill(t('fBarcodeUsed'), { name: barcodeUsedBy })}</p>}
        <TextField label={t('fSku')} value={sku} onChange={(e) => setSku(e.target.value)} maxLength={64} />
        {problem && <p role="alert" className="rounded-button bg-accent px-3 py-2 text-body font-extrabold text-accentInk">{t(problem)}</p>}
      </div>

      <BottomActionBar>
        <BigButton size="lg" full onClick={() => void save()}>{t('save')}</BigButton>
      </BottomActionBar>
      <SaveSuccess show={saved} label={t('productSaved')} onDone={() => navigate('/stock', { replace: true })} />
    </main>
  );
}

const defaultBaseName = (base: BaseUnit) => base;

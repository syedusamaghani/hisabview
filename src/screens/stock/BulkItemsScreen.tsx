import { useRef, useState } from 'react';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { SaveSuccess } from '../../components/SaveSuccess';
import { ScreenHeader } from '../../components/ScreenHeader';
import { productsRepo, useRole } from '../../data';
import { useT } from '../../i18n/i18n';
import { parseList, splitRows, type BulkRow } from '../../lib/bulkItems';
import { canManageStock } from '../../lib/permissions';
import { goBack, navigate } from '../../lib/router';
import { fill } from './stockText';

const cell = 'min-h-[52px] w-full rounded-button border-[1.5px] border-line bg-surface px-3 text-body font-bold text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent';

// Many items at once: paste or load a list, it becomes a table of name + price, the person fixes it, then saves.
// Nothing is saved before the Save button. Names that already exist are skipped, never changed.
export default function BulkItemsScreen() {
  const { t } = useT();
  const role = useRole() ?? 'cashier';
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [saved, setSaved] = useState(false);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!canManageStock(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('bulkTitle')} onBack={() => goBack('/stock')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('askManagerStock')}</p>
      </main>
    );
  }

  const addFrom = (source: string) => {
    const found = parseList(source);
    setResult(found.length === 0 ? t('bulkNoneFound') : '');
    if (found.length > 0) {
      setRows((prev) => [...prev, ...found]);
      setText('');
    }
  };
  const readPhoto = async (file: File) => {
    setReading(true);
    setProgress(0);
    setResult('');
    try {
      const { readPhotoText } = await import('../../lib/ocr');
      addFrom(await readPhotoText(file, setProgress));
    } catch {
      setResult(t(navigator.onLine ? 'bulkPhotoFail' : 'bulkPhotoOffline'));
    } finally {
      setReading(false);
    }
  };
  const change = (i: number, patch: Partial<BulkRow>) => setRows((prev) => prev.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.name.trim()).length;

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setResult('');
    try {
      const existing = (await productsRepo.listStock(true)).map((r) => r.product.name);
      const { ok, dup } = splitRows(rows, existing);
      const failed: BulkRow[] = [];
      for (const r of ok) {
        try {
          await productsRepo.create({ name: r.name, base_unit: 'piece', price_unit: 'piece', sell_price: Number(r.price.replace(/\D/g, '') || '0') });
        } catch {
          failed.push(r);
        }
      }
      const made = ok.length - failed.length;
      if (failed.length === 0 && dup.length === 0) {
        setRows([]);
        setSaved(true);
      } else {
        setRows([...dup, ...failed]); // what is left on the screen is what was NOT saved
        setResult([made > 0 ? fill(t('bulkSavedN'), { n: String(made) }) : '', dup.length > 0 ? fill(t('bulkDupN'), { n: String(dup.length) }) : '', failed.length > 0 ? fill(t('bulkFailN'), { n: String(failed.length) }) : ''].filter(Boolean).join(' '));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t('bulkTitle')} onBack={() => goBack('/stock')} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <p className="text-label text-inkSoft">{t('bulkHelp')}</p>

        <textarea
          dir="auto"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('bulkPaste')}
          aria-label={t('bulkPaste')}
          className={`${cell} py-3 font-normal`}
        />
        <BigButton full variant="ghost" icon="plus" disabled={!text.trim()} onClick={() => addFrom(text)}>{t('bulkMake')}</BigButton>
        <BigButton full variant="ghost" icon="up" disabled={reading} onClick={() => fileRef.current?.click()}>
          {reading ? fill(t('bulkReading'), { n: String(progress) }) : t('bulkFile')}
        </BigButton>
        <p className="-mt-2 text-caption text-inkSoft">{t('bulkPhotoHint')}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.txt,.csv,text/plain,text/csv"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.type.startsWith('image/')) void readPhoto(f);
            else if (f.size < 2_000_000) void f.text().then(addFrom);
          }}
        />

        {rows.length > 0 && (
          <Card className="flex flex-col gap-3">
            <p className="text-body font-extrabold text-ink">{t('bulkTable')}</p>
            <p className="text-label text-inkSoft">{t('bulkEditHint')}</p>
            <ul className="flex flex-col gap-3">
              {rows.map((r, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-button border border-line bg-page p-2">
                  <input dir="auto" aria-label={t('bulkName')} placeholder={t('bulkName')} value={r.name} maxLength={120} onChange={(e) => change(i, { name: e.target.value })} className={cell} />
                  <div className="flex items-center gap-2">
                    <input dir="ltr" inputMode="numeric" aria-label={t('bulkPrice')} placeholder={t('bulkPrice')} value={r.price} maxLength={9} onChange={(e) => change(i, { price: e.target.value.replace(/\D/g, '') })} className={`${cell} min-w-0 flex-1`} />
                    <button type="button" aria-label={t('tRemove')} onClick={() => setRows((prev) => prev.filter((_, k) => k !== i))} className="grid size-[52px] shrink-0 place-items-center rounded-button border-[1.5px] border-line bg-surface text-body font-extrabold text-ink">×</button>
                  </div>
                </li>
              ))}
            </ul>
            <BigButton full variant="ghost" icon="plus" onClick={() => setRows((prev) => [...prev, { name: '', price: '' }])}>{t('bulkAddRow')}</BigButton>
          </Card>
        )}
        {rows.length === 0 && (
          <BigButton full variant="ghost" icon="plus" onClick={() => setRows([{ name: '', price: '' }])}>{t('bulkAddRow')}</BigButton>
        )}
        {result && <p role="status" className="rounded-button bg-accent px-3 py-2 text-body font-extrabold text-accentInk">{result}</p>}
      </div>

      <BottomActionBar>
        <BigButton size="lg" full disabled={busy || filled === 0} onClick={() => void save()}>{fill(t('bulkSave'), { n: String(filled) })}</BigButton>
      </BottomActionBar>
      <SaveSuccess show={saved} label={t('productSaved')} onDone={() => navigate('/stock', { replace: true })} />
    </main>
  );
}

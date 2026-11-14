import { useRef, useState } from 'react';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { BackupError, backupFileName, conflictsRepo, exportShop, restoreFromBackup, useLive, type Shop } from '../data';
import { useT } from '../i18n/i18n';
import { shareOrSave } from '../lib/shareFile';

// Settings: a backup FILE the owner keeps (separate from the automatic internet backup), and the way back from it.
// A restore only adds what is missing on this phone; it never changes a record that is already here.
export function BackupFileCard({ shop }: { shop: Shop }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const pick = useRef<HTMLInputElement>(null);

  const download = async () => {
    setBusy(true);
    setNote('');
    try {
      const { text } = await exportShop();
      const done = await shareOrSave(new TextEncoder().encode(text), backupFileName(shop.shop_name), 'application/json', t('bfTitle'));
      setNote(done === 'cancelled' ? '' : done === 'shared' ? t('bfShared') : t('bfSaved'));
    } catch {
      setNote(t('bfFailed'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setNote('');
    try {
      const r = await restoreFromBackup(await file.text());
      setNote(r.added === 0 ? t('bfNothingNew') : t('bfRestored').replace('{n}', String(r.added)).replace('{m}', String(r.alreadyHere)));
    } catch (e) {
      const reason = e instanceof BackupError ? e.reason : 'damaged';
      setNote(t(reason === 'otherShop' ? 'bfOtherShop' : reason === 'notBackup' ? 'bfNotBackup' : reason === 'tooNew' ? 'bfTooNew' : 'bfDamaged'));
    } finally {
      setBusy(false);
      if (pick.current) pick.current.value = '';
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-body font-extrabold text-ink">{t('bfTitle')}</h2>
      <p className="text-label text-inkSoft">{t('bfBody')}</p>
      <p className="text-label font-bold text-ink">{t('bfPrivate')}</p>
      <BigButton full variant="ghost" icon="cloud" disabled={busy} onClick={() => void download()}>{t('bfDownload')}</BigButton>
      <BigButton full variant="ghost" icon="undo" disabled={busy} onClick={() => pick.current?.click()}>{t('bfRestore')}</BigButton>
      <input ref={pick} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void restore(e.target.files?.[0])} />
      {note && <p role="status" className="text-label font-bold text-ink">{note}</p>}
    </Card>
  );
}

const FIELD_TEXT: Record<string, Parameters<ReturnType<typeof useT>['t']>[0]> = {
  name: 'cfName', phone: 'cPhone', identifier: 'cfIdentifier', credit_limit: 'cfLimit', archived: 'cfHidden', cost_price: 'cfCost', sell_price: 'cfSell', min_stock: 'cMin', barcode: 'cfBarcode',
};

// Settings: two phones changed the same customer or item. This phone's change was kept; the other version is shown here.
export function ConflictsCard({ shopId }: { shopId: string }) {
  const { t } = useT();
  const list = useLive(() => conflictsRepo.list(shopId), [shopId]) ?? [];
  if (list.length === 0) return null;
  const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : v === true ? t('cfYes') : v === false ? t('cfNo') : String(v));
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-body font-extrabold text-ink">{t('cfTitle')}</h2>
      <p className="text-label text-inkSoft">{t('cfBody')}</p>
      <ul className="flex flex-col gap-3">
        {list.map((c) => (
          <li key={c.id} className="flex flex-col gap-1 border-t border-line pt-3">
            <span dir="auto" className="text-body font-extrabold text-ink">{c.name}</span>
            {c.fields.map((f) => (
              <p key={f.field} className="text-label text-inkSoft">
                {t(FIELD_TEXT[f.field] ?? 'cfName')}: <bdi className="font-bold text-ink">{show(f.mine)}</bdi> ({t('cfMine')}) · <bdi>{show(f.theirs)}</bdi> ({t('cfTheirs')})
              </p>
            ))}
            <BigButton variant="ghost" onClick={() => void conflictsRepo.dismiss(shopId, c.id)}>{t('cfDone')}</BigButton>
          </li>
        ))}
      </ul>
    </Card>
  );
}

import { useMemo, useState } from 'react';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import { reportRepo, shopsRepo, useLive, useRole } from '../../data';
import { useT } from '../../i18n/i18n';
import { goBack } from '../../lib/router';
import { buildReport, cellText, reportsFor, reportText, type Ctx, type ReportId } from '../../lib/reports';
import { openWhatsApp, whatsappUrl } from '../../lib/whatsapp';
import { useTeam, useWho } from '../team/parts';
import { qtyText } from '../stock/stockText';
import { excelBytes, fileName, pdfBytes, shareOrSave } from './exportReport';
import { pickedFromAddress, pickedKey, RangeBar, rangeOfPicked, type Picked } from './parts';

// Reports: pick the days, open a report, then share it as a PDF (readable on a phone, goes to WhatsApp) or an Excel file.
// Every number comes from the same code the dashboard uses (src/lib/reports.ts), so a report always agrees with it.
export function ReportsScreen() {
  const { t, lang } = useT();
  const role = useRole() ?? 'cashier';
  const [picked, setPicked] = useState<Picked>(pickedFromAddress);
  const [open, setOpen] = useState<ReportId | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const range = rangeOfPicked(picked);
  const team = useTeam();
  const who = useWho(team);
  const shop = useLive(() => shopsRepo.getMine(), []);
  const allowed = reportsFor(role);
  const data = useLive(() => reportRepo.forReports(range), [pickedKey(picked), role]);

  const ctx: Ctx = useMemo(() => {
    const products = new Map((data?.stock ?? []).map((s) => [s.product.id, s.product]));
    return {
      t,
      lang,
      who: (id) => who(id),
      qty: (base, id) => {
        const p = products.get(id);
        return p ? qtyText(t, base, p) : String(base);
      },
      showCost: role !== 'cashier',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, t, lang, role, team]);

  const table = data && open && allowed.some((r) => r.id === open) ? buildReport(open, data, ctx) : null;
  const period = table?.snapshot ? t('rpAsOfNow') : `${range.from} – ${range.to}`;
  const labels = table ? { title: t(table.title), period, shop: shop?.shop_name ?? '' } : null;

  const run = async (what: 'pdf' | 'xlsx') => {
    if (!table || !labels) return;
    setBusy(true);
    setNote('');
    try {
      const bytes = what === 'pdf' ? await pdfBytes(table, ctx, labels) : excelBytes(table, ctx, labels);
      const mime = what === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const done = await shareOrSave(bytes, fileName(table.id, range.from, range.to, what), mime, labels.title);
      setNote(done === 'saved' ? t('rpSaved') : done === 'shared' ? t('rpShared') : '');
    } catch {
      setNote(t('rpFailed'));
    } finally {
      setBusy(false);
    }
  };

  const field = 'whitespace-nowrap px-2 py-2';
  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={table && labels ? labels.title : t('reportsTitle')} onBack={() => (open ? setOpen(null) : goBack('/dashboard'))} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        {!open && <p className="text-body text-inkSoft">{t('rpIntro')}</p>}
        <RangeBar value={picked} onChange={(p) => { setPicked(p); setNote(''); }} />

        {!open && (
          <div className="flex flex-col gap-3">
            {allowed.map((r) => (
              <BigButton key={r.id} full variant="ghost" icon="note" onClick={() => { setOpen(r.id); setNote(''); }}>{t(r.title)}</BigButton>
            ))}
            <p className="text-label text-inkSoft">{t('rpNoExpiry')}</p>
          </div>
        )}

        {table && labels && (
          <>
            <p className="text-label font-semibold text-inkSoft"><bdi>{period}</bdi></p>
            <Card className="overflow-x-auto !p-0">
              <table className="w-full min-w-full border-collapse text-start text-label">
                <thead>
                  <tr className="bg-primarySoft">
                    {table.cols.map((col) => (
                      <th key={col.key} className={`${field} text-start font-extrabold text-ink`}>{t(col.key)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.length === 0 && (
                    <tr><td colSpan={table.cols.length} className="px-3 py-4 text-body text-inkSoft">{t('rpEmpty')}</td></tr>
                  )}
                  {table.rows.map((row, i) => (
                    <tr key={i} className="border-t border-line">
                      {row.map((cell, j) => (
                        <td key={j} dir="auto" className={`${field} ${table.cols[j].type === 'text' ? 'font-bold text-ink' : 'text-ink'}`}>
                          {table.cols[j].type === 'text' ? cellText(table.cols[j], cell) : <bdi>{cellText(table.cols[j], cell)}</bdi>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {table.total && (
                    <tr className="border-t-2 border-line bg-surfaceAlt font-extrabold">
                      {table.total.map((cell, j) => (
                        <td key={j} dir="auto" className={field}>{table.cols[j].type === 'text' ? cellText(table.cols[j], cell) : <bdi>{cellText(table.cols[j], cell)}</bdi>}</td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>

            <div className="flex flex-col gap-3">
              <BigButton full icon="note" disabled={busy} onClick={() => void run('pdf')}>{busy ? t('rpMaking') : t('rpPdf')}</BigButton>
              <BigButton full variant="ghost" icon="note" disabled={busy} onClick={() => void run('xlsx')}>{t('rpExcel')}</BigButton>
              <BigButton full variant="ghost" icon="note" onClick={() => openWhatsApp(whatsappUrl(null, reportText(table, ctx, period, labels.shop)))}>{t('rpWhatsapp')}</BigButton>
            </div>
            {note && <p role="status" className="text-body font-bold text-ink">{note}</p>}
          </>
        )}
      </div>
    </main>
  );
}

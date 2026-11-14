// Turns a report into a file: an Excel sheet, or a PDF made of A4 pictures drawn by the browser
// (so Urdu letters join correctly and it looks the same on every phone). Then it is shared with the phone's
// own Share sheet (WhatsApp is in it), or saved if the phone cannot share files.
import { A4, pagesToPdf, type PdfPage } from '../../lib/pdf';
import { cellText, type Ctx, type ReportTable } from '../../lib/reports';
import { makeXlsx } from '../../lib/xlsx';

type Labels = { title: string; period: string; shop: string };

export function excelBytes(table: ReportTable, c: Ctx, l: Labels): Uint8Array {
  return makeXlsx({
    name: l.title,
    title: `${l.shop} - ${l.title}`,
    period: l.period,
    header: table.cols.map((col) => c.t(col.key)),
    rows: table.rows,
    total: table.total,
    rtl: c.lang === 'ur',
    moneyCols: table.cols.map((col, i) => (col.type === 'money' ? i : -1)).filter((i) => i >= 0),
  });
}

const W = 1240; // A4 at 150 dpi
const H = Math.round((W * A4.h) / A4.w);
const M = 70; // margin
const ROW = 54;

// The pages as JPEG pictures. A long report goes over as many pages as it needs, with the header line repeated.
export async function pdfBytes(table: ReportTable, c: Ctx, l: Labels): Promise<Uint8Array> {
  if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready;
  const rtl = c.lang === 'ur';
  const family = (typeof document !== 'undefined' && getComputedStyle(document.body).fontFamily) || 'sans-serif';
  const inner = W - 2 * M;
  // money and number columns are narrow, the first text column takes what is left
  const fixed: number[] = table.cols.map((col) => (col.type === 'text' ? 0 : 230));
  const textCols = fixed.filter((w) => w === 0).length;
  const left = inner - fixed.reduce((n, w) => n + w, 0);
  const widths = fixed.map((w) => (w === 0 ? Math.max(180, Math.floor(left / Math.max(1, textCols))) : w));
  const scale = inner / widths.reduce((n, w) => n + w, 0);
  const cols = widths.map((w) => Math.floor(w * scale));
  const x0 = (i: number): number => {
    const before = cols.slice(0, i).reduce((n, w) => n + w, 0);
    return rtl ? W - M - before - cols[i] : M + before;
  };

  const lines: { cells: string[]; bold: boolean; head: boolean }[] = [
    ...table.rows.map((r) => ({ cells: r.map((v, i) => cellText(table.cols[i], v)), bold: false, head: false })),
    ...(table.total ? [{ cells: table.total.map((v, i) => cellText(table.cols[i], v)), bold: true, head: false }] : []),
  ];
  const headCells = table.cols.map((col) => c.t(col.key));
  const top = M + 150;
  const perPage = Math.floor((H - top - M - 40) / ROW) - 1; // minus the header line
  const pageCount = Math.max(1, Math.ceil(lines.length / perPage));

  const pages: PdfPage[] = [];
  for (let p = 0; p < pageCount; p++) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('No canvas');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, W, H);
    g.direction = rtl ? 'rtl' : 'ltr';
    g.textBaseline = 'middle';
    const text = (s: string, x: number, y: number, w: number, o: { size: number; bold?: boolean; color?: string; right?: boolean }) => {
      g.font = `${o.bold ? '700 ' : '400 '}${o.size}px ${family}`;
      g.fillStyle = o.color ?? '#111111';
      let out = s;
      while (out.length > 1 && g.measureText(out).width > w - 20) out = out.slice(0, -1);
      if (out !== s) out = `${out.slice(0, -1)}…`;
      const alignRight = o.right ?? false;
      g.textAlign = alignRight ? 'right' : 'left';
      g.fillText(out, alignRight ? x + w - 10 : x + 10, y);
    };
    text(l.shop, M, M + 30, inner, { size: 34, bold: true, right: rtl });
    text(l.title, M, M + 82, inner, { size: 46, bold: true, right: rtl, color: '#0a5c47' });
    text(l.period, M, M + 128, inner, { size: 28, right: rtl, color: '#555555' });
    // header line
    let y = top;
    g.fillStyle = '#e6f2ee';
    g.fillRect(M, y, inner, ROW);
    table.cols.forEach((col, i) => text(headCells[i], x0(i), y + ROW / 2, cols[i], { size: 26, bold: true, right: col.type !== 'text' !== rtl }));
    y += ROW;
    for (const line of lines.slice(p * perPage, (p + 1) * perPage)) {
      if (line.bold) {
        g.fillStyle = '#f2f2f2';
        g.fillRect(M, y, inner, ROW);
      }
      line.cells.forEach((cell, i) => text(cell, x0(i), y + ROW / 2, cols[i], { size: 27, bold: line.bold, right: table.cols[i].type !== 'text' !== rtl }));
      g.fillStyle = '#dddddd';
      g.fillRect(M, y + ROW - 1, inner, 1);
      y += ROW;
    }
    text(`HisabView  ·  ${p + 1} / ${pageCount}`, M, H - M, inner, { size: 22, right: rtl, color: '#888888' });
    const jpeg = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.9));
    if (!jpeg) throw new Error('Could not draw the page');
    pages.push({ jpeg: new Uint8Array(await jpeg.arrayBuffer()), w: W, h: H });
  }
  return pagesToPdf(pages);
}

export type ShareResult = 'shared' | 'saved' | 'cancelled';

// Share the file with the phone's Share sheet (WhatsApp, email, Drive...). A phone or computer that cannot share files saves it instead.
export async function shareOrSave(bytes: Uint8Array, filename: string, mime: string, title: string): Promise<ShareResult> {
  const file = new File([bytes as BlobPart], filename, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // any other failure: fall through and save it
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}

export const fileName = (id: string, from: string, to: string, ext: 'pdf' | 'xlsx'): string => `hisabview-${id}-${from}${from === to ? '' : `_${to}`}.${ext}`;

// A tiny PDF writer: one JPEG picture per page. The pages are drawn by the browser (so Urdu letters join
// correctly), and this only wraps them into a PDF file that opens everywhere and can be sent on WhatsApp.
export type PdfPage = { jpeg: Uint8Array; w: number; h: number }; // w, h = picture size in pixels

const enc = new TextEncoder();
export const A4 = { w: 595, h: 842 }; // points

export function pagesToPdf(pages: PdfPage[]): Uint8Array {
  if (pages.length === 0) throw new Error('A PDF needs at least one page');
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (x: Uint8Array | string) => {
    const b = typeof x === 'string' ? enc.encode(x) : x;
    chunks.push(b);
    size += b.length;
  };
  const object = (n: number, body: () => void) => {
    offsets[n] = size;
    push(`${n} 0 obj\n`);
    body();
    push('\nendobj\n');
  };
  // object numbers: 1 catalog, 2 pages, then for page i: 3+3i page, 4+3i content, 5+3i picture
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  object(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  object(2, () => push(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] >>`));
  pages.forEach((p, i) => {
    const page = 3 + 3 * i;
    object(page, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /XObject << /Im0 ${page + 2} 0 R >> >> /Contents ${page + 1} 0 R >>`));
    const draw = `q ${A4.w} 0 0 ${A4.h} 0 0 cm /Im0 Do Q`;
    object(page + 1, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
    object(page + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg);
      push('\nendstream');
    });
  });
  const count = 3 + 3 * pages.length;
  const xref = size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

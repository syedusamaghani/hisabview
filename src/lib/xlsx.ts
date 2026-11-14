// A small Excel (.xlsx) writer: one sheet, a title, the days, a bold header, the rows and a total line.
// An .xlsx file is a zip of a few XML files. Numbers are real numbers (so Excel can add them up), not text.
import { strToU8, zipSync } from 'fflate';

export type SheetCell = string | number;
export type Sheet = { name: string; title: string; period: string; header: string[]; rows: SheetCell[][]; total: SheetCell[] | null; rtl: boolean; moneyCols: number[] };

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const colName = (i: number): string => String.fromCharCode(65 + i); // up to 26 columns, a report has 5
// Excel's sheet names: at most 31 letters and none of [ ] : * ? / \
export const sheetName = (s: string): string => s.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Report';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
// styles: 0 plain, 1 bold, 2 whole rupees with commas, 3 bold + commas
const STYLES = `${XML}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/></cellXfs></styleSheet>`;

export function makeXlsx(sheet: Sheet): Uint8Array {
  const cell = (c: number, r: number, v: SheetCell, bold: boolean, money: boolean): string => {
    const ref = `${colName(c)}${r}`;
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}" s="${money ? (bold ? 3 : 2) : bold ? 1 : 0}"><v>${v}</v></c>`;
    const text = String(v);
    if (text === '') return '';
    return `<c r="${ref}" t="inlineStr" s="${bold ? 1 : 0}"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
  };
  const rowXml = (r: number, cells: SheetCell[], bold: boolean): string =>
    `<row r="${r}">${cells.map((v, c) => cell(c, r, v, bold, sheet.moneyCols.includes(c))).join('')}</row>`;
  const out: string[] = [rowXml(1, [sheet.title], true), rowXml(2, [sheet.period], false), rowXml(4, sheet.header, true)];
  let r = 5;
  for (const row of sheet.rows) out.push(rowXml(r++, row, false));
  if (sheet.total) out.push(rowXml(r++, sheet.total, true));
  const width = `<cols><col min="1" max="1" width="30" customWidth="1"/><col min="2" max="${Math.max(2, sheet.header.length)}" width="16" customWidth="1"/></cols>`;
  const sheetXml = `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"${sheet.rtl ? ' rightToLeft="1"' : ''}/></sheetViews>${width}<sheetData>${out.join('')}</sheetData></worksheet>`;
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zipSync({
    '[Content_Types].xml': strToU8(`${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    '_rels/.rels': strToU8(`${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><sheets><sheet name="${esc(sheetName(sheet.name))}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>`),
    'xl/styles.xml': strToU8(STYLES),
    'xl/worksheets/sheet1.xml': strToU8(sheetXml),
  });
}

import { COLUMN_LABELS, COLUMN_ORDER, type DataColumnKey } from '../constants/tableColumns';
import type { ContactRow } from '../types/contact';
import { createEmptyRow } from '../utils/newRow';
import { parseClipboardInput } from './clipboard/parseClipboardInput';

function escapeCsvCell(value: string, delimiter: ';' | ','): string {
  const needsQuote =
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r') ||
    value.includes(delimiter);
  if (!needsQuote) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportContactsToCsv(rows: ContactRow[], delimiter: ';' | ',' = ';'): string {
  const header = COLUMN_ORDER.map((k) => escapeCsvCell(COLUMN_LABELS[k], delimiter)).join(delimiter);
  const lines = [header];
  for (const r of rows) {
    lines.push(
      COLUMN_ORDER.map((k) => escapeCsvCell(r[k] ?? '', delimiter)).join(delimiter),
    );
  }
  return lines.join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Импорт CSV/TSV текста в новые строки (каждая строка файла → новая запись). */
export function importContactsFromDelimitedText(text: string): ContactRow[] {
  const { grid } = parseClipboardInput(text);
  const out: ContactRow[] = [];
  for (const cells of grid) {
    if (cells.every((c) => c.trim() === '')) continue;
    const row = createEmptyRow();
    for (let i = 0; i < COLUMN_ORDER.length && i < cells.length; i++) {
      const key = COLUMN_ORDER[i];
      row[key] = cells[i].replace(/\u00a0/g, ' ');
    }
    out.push(row);
  }
  return out;
}

export async function exportContactsToXlsx(rows: ContactRow[]): Promise<void> {
  const XLSX = await import('xlsx');
  const wsData: string[][] = [
    COLUMN_ORDER.map((k) => COLUMN_LABELS[k]),
    ...rows.map((r) => COLUMN_ORDER.map((k) => r[k])),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Контакты');
  XLSX.writeFile(wb, `контакты-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function importContactsFromXlsxFile(file: File): Promise<ContactRow[]> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  }) as (string | number | boolean | null | undefined)[][];
  if (!data.length) return [];
  const header = (data[0] ?? []).map((h) => String(h).trim().toLowerCase());
  const colMap: Partial<Record<DataColumnKey, number>> = {};
  const ru: Record<string, DataColumnKey> = {
    'номер телефона': 'phone',
    телефон: 'phone',
    phone: 'phone',
    'имя и фамилия': 'fullName',
    имя: 'fullName',
    name: 'fullName',
    fullname: 'fullName',
    город: 'city',
    city: 'city',
    юзер: 'user',
    user: 'user',
    комментарий: 'comment',
    comment: 'comment',
    чей: 'owner',
    owner: 'owner',
  };
  header.forEach((h, i) => {
    const key = ru[h.replace(/\s+/g, ' ')];
    if (key) colMap[key] = i;
  });

  const hasHeader = Object.keys(colMap).length >= 2;
  const start = hasHeader ? 1 : 0;
  const out: ContactRow[] = [];

  for (let r = start; r < data.length; r++) {
    const line = data[r];
    if (!line || line.every((c) => String(c ?? '').trim() === '')) continue;
    const row = createEmptyRow();
    if (hasHeader) {
      for (const key of COLUMN_ORDER) {
        const ci = colMap[key];
        if (ci !== undefined && ci < line.length) {
          row[key] = String(line[ci] ?? '').replace(/\u00a0/g, ' ');
        }
      }
    } else {
      for (let i = 0; i < COLUMN_ORDER.length && i < line.length; i++) {
        row[COLUMN_ORDER[i]] = String(line[i] ?? '').replace(/\u00a0/g, ' ');
      }
    }
    out.push(row);
  }
  return out;
}

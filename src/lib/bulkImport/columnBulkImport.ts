import { COLUMN_ORDER, type DataColumnKey } from '../../constants/tableColumns';
import { detectClipboardShape } from '../clipboard/detectClipboardShape';

const NBSP = /\u00a0/g;

/** Столбцы массового импорта в UI (без «Чей» — подставляется из сессии). */
export const BULK_IMPORT_FIELD_KEYS: DataColumnKey[] = ['phone', 'fullName', 'city', 'user', 'comment'];

/** Нормализация одной строки ячейки: NBSP → пробел, trim по краям. */
export function normalizeCellLine(s: string): string {
  return s.replace(NBSP, ' ').trim();
}

/**
 * Разбивает текст столбца по переносам строк, убирает пустой хвост строк.
 */
export function splitColumnText(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  let end = lines.length;
  while (end > 0 && normalizeCellLine(lines[end - 1] ?? '') === '') end -= 1;
  return lines.slice(0, end).map((line) => normalizeCellLine(line));
}

export type ColumnTextInputs = Record<DataColumnKey, string>;

export type ColumnBulkFilledCounts = Record<DataColumnKey, number>;

export type BuildGridFromColumnsResult = {
  grid: string[][];
  rowCount: number;
  filled: ColumnBulkFilledCounts;
  skippedAllEmptyRows: number;
};

/**
 * Собирает сетку по индексу строки в каждом столбце (порядок — COLUMN_ORDER).
 * Полностью пустые итоговые строки отбрасываются.
 */
export function buildGridFromColumnInputs(inputs: ColumnTextInputs): BuildGridFromColumnsResult {
  const cols = {} as Record<DataColumnKey, string[]>;
  for (const k of COLUMN_ORDER) {
    cols[k] = splitColumnText(inputs[k] ?? '');
  }

  const lengths = COLUMN_ORDER.map((k) => cols[k].length);
  const maxR = lengths.length ? Math.max(0, ...lengths) : 0;

  const rawRows: string[][] = [];
  for (let i = 0; i < maxR; i++) {
    rawRows.push(COLUMN_ORDER.map((k) => cols[k][i] ?? ''));
  }

  let skippedAllEmptyRows = 0;
  const grid = rawRows.filter((row) => {
    const allEmpty = row.every((c) => normalizeCellLine(c) === '');
    if (allEmpty) {
      skippedAllEmptyRows += 1;
      return false;
    }
    return true;
  });

  const filled = {} as ColumnBulkFilledCounts;
  for (const k of COLUMN_ORDER) filled[k] = 0;

  for (const row of grid) {
    COLUMN_ORDER.forEach((k, idx) => {
      if (normalizeCellLine(row[idx] ?? '') !== '') filled[k] += 1;
    });
  }

  return {
    grid,
    rowCount: grid.length,
    filled,
    skippedAllEmptyRows,
  };
}

/**
 * Для каждой строки: если «Чей» пусто — подставить глобальное значение (если оно не пустое).
 */
export function mergeGlobalOwnerIntoGrid(grid: string[][], globalDefault: string): string[][] {
  const d = normalizeCellLine(globalDefault);
  if (!d) return grid;
  const oi = COLUMN_ORDER.indexOf('owner');
  return grid.map((row) => {
    const copy = [...row];
    while (copy.length < COLUMN_ORDER.length) copy.push('');
    if (normalizeCellLine(copy[oi] ?? '') === '') copy[oi] = d;
    return copy;
  });
}

export type SmartClipboardResult =
  | {
      kind: 'multi';
      columns: Partial<Record<DataColumnKey, string>>;
    }
  | {
      kind: 'single';
      target: DataColumnKey;
      lines: string[];
    };

const COL_COUNT = COLUMN_ORDER.length;

/**
 * Умный разбор буфера: TSV/CSV/; таблица → до N колонок по порядку;
 * одна колонка → в defaultTarget.
 */
export function parseSmartClipboardToColumns(
  text: string,
  defaultSingleTarget: DataColumnKey,
): SmartClipboardResult {
  const det = detectClipboardShape(text);
  if (det.grid.length === 0) {
    return { kind: 'single', target: defaultSingleTarget, lines: [] };
  }

  const maxCols = Math.max(1, ...det.grid.map((r) => r.length));

  if (maxCols <= 1) {
    return {
      kind: 'single',
      target: defaultSingleTarget,
      lines: splitColumnText(text),
    };
  }

  const take = Math.min(COL_COUNT, maxCols);
  const columns: Partial<Record<DataColumnKey, string>> = {};
  for (let c = 0; c < take; c++) {
    const key = COLUMN_ORDER[c];
    const lines = det.grid.map((row) => normalizeCellLine(row[c] ?? ''));
    let end = lines.length;
    while (end > 0 && lines[end - 1] === '') end -= 1;
    columns[key] = lines.slice(0, end).join('\n');
  }
  return { kind: 'multi', columns };
}

export function columnLinesToTextarea(lines: string[]): string {
  return lines.join('\n');
}

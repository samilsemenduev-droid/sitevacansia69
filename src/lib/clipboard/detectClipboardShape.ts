import { COLUMN_ORDER } from '../../constants/tableColumns';
import type { PasteDelimiter, PasteDetectionResult, ParsedClipboardMatrix } from '../../types/paste';

const DATA_COLS = COLUMN_ORDER.length;

const NBSP = /\u00a0/g;

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function trimTrailingEmptyLines(lines: string[]): string[] {
  const out = [...lines];
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  return out;
}

function trimCell(s: string): string {
  return s.replace(NBSP, ' ').replace(/\s+$/g, '');
}

/** Разделитель `;` или `,` с учётом кавычек. */
export function splitSeparatedLine(line: string, sep: ';' | ','): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === sep) {
      out.push(trimCell(cur));
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(trimCell(cur));
  return out;
}

function splitTabLine(line: string): string[] {
  return line.split('\t').map((c) => trimCell(c));
}

function padMatrixToWidth(grid: ParsedClipboardMatrix, width: number): ParsedClipboardMatrix {
  return grid.map((row) => {
    const next = [...row];
    while (next.length < width) next.push('');
    return next;
  });
}

function matrixStats(grid: ParsedClipboardMatrix): {
  rowCount: number;
  columnCount: number;
  isUniformGrid: boolean;
} {
  if (grid.length === 0) return { rowCount: 0, columnCount: 0, isUniformGrid: true };
  const widths = grid.filter((r) => r.some((c) => c.trim() !== '')).map((r) => r.length);
  if (widths.length === 0) return { rowCount: grid.length, columnCount: 0, isUniformGrid: true };
  const minW = Math.min(...widths);
  const maxW = Math.max(...widths);
  return {
    rowCount: grid.length,
    columnCount: maxW,
    isUniformGrid: minW === maxW,
  };
}

function countSepOutsideQuotes(line: string, sep: ';' | ','): number {
  let n = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === sep) n++;
  }
  return n;
}

const PHONE_LIKE = /^[\d+\s().\-–—]+$/;

function looksLikePhoneCell(s: string): boolean {
  const t = s.trim();
  if (t.length < 10) return false;
  const digits = t.replace(/\D/g, '');
  return digits.length >= 10 && PHONE_LIKE.test(t);
}

/**
 * Приоритет: таб → `;` (с кавычками) → `,` (CSV) → одна колонка по строкам.
 */
export function detectClipboardShape(rawText: string): PasteDetectionResult {
  const normalized = normalizeNewlines(rawText);
  const lines = trimTrailingEmptyLines(normalized.split('\n'));

  if (lines.length === 0) {
    return {
      grid: [],
      delimiter: 'newline',
      needsPreview: false,
      rowCount: 0,
      columnCount: 0,
      isUniformGrid: true,
    };
  }

  const hasTab = lines.some((l) => l.includes('\t'));
  if (hasTab) {
    const rawGrid = lines.map((line) => splitTabLine(line));
    const maxW = Math.max(1, ...rawGrid.map((r) => r.length));
    const grid = padMatrixToWidth(rawGrid, maxW);
    const { columnCount, isUniformGrid } = matrixStats(grid);
    return {
      grid,
      delimiter: 'tab',
      needsPreview: !isUniformGrid,
      reason: !isUniformGrid ? 'Разное число колонок в строках с табами' : undefined,
      rowCount: grid.length,
      columnCount,
      isUniformGrid,
    };
  }

  const semiCounts = lines.map((l) => countSepOutsideQuotes(l, ';'));
  const uniformSemi =
    semiCounts.length > 0 && semiCounts.every((c) => c === semiCounts[0]) && semiCounts[0]! > 0;

  if (uniformSemi) {
    const rawGrid = lines.map((line) => splitSeparatedLine(line, ';'));
    const maxW = Math.max(1, ...rawGrid.map((r) => r.length));
    const grid = padMatrixToWidth(rawGrid, maxW);
    const { columnCount, isUniformGrid } = matrixStats(grid);
    const parts0 = grid[0]?.length ?? 0;
    const ambiguousSingle =
      lines.length === 1 && semiCounts[0] === 1 && parts0 === 2 && lines[0].length < 48;
    return {
      grid,
      delimiter: 'semicolon',
      needsPreview: !isUniformGrid || ambiguousSingle,
      reason:
        !isUniformGrid
          ? 'Разное число полей в строках с «;»'
          : ambiguousSingle
            ? 'Одна короткая строка с одним «;» — возможно не таблица'
            : undefined,
      rowCount: grid.length,
      columnCount,
      isUniformGrid,
    };
  }

  const commaCounts = lines.map((l) => countSepOutsideQuotes(l, ','));
  const uniformComma =
    commaCounts.length > 0 &&
    commaCounts.every((c) => c === commaCounts[0]) &&
    commaCounts[0]! > 0;

  if (uniformComma) {
    const rawGrid = lines.map((line) => splitSeparatedLine(line, ','));
    const maxW = Math.max(1, ...rawGrid.map((r) => r.length));
    const grid = padMatrixToWidth(rawGrid, maxW);
    const { columnCount, isUniformGrid } = matrixStats(grid);
    const first = grid[0]?.[0]?.trim() ?? '';
    const ambiguousCommaSingle =
      lines.length === 1 &&
      columnCount <= 3 &&
      columnCount >= 2 &&
      !looksLikePhoneCell(first) &&
      first.length < 80;
    return {
      grid,
      delimiter: 'comma',
      needsPreview: !isUniformGrid || ambiguousCommaSingle,
      reason: !isUniformGrid
        ? 'Разное число полей в строках с запятыми'
        : ambiguousCommaSingle
          ? 'Одна строка с запятыми — смысл неоднозначен (возможен текст с запятыми)'
          : undefined,
      rowCount: grid.length,
      columnCount,
      isUniformGrid,
    };
  }

  const grid: ParsedClipboardMatrix = lines.map((l) => [trimCell(l)]);
  return {
    grid,
    delimiter: 'newline',
    needsPreview: false,
    rowCount: grid.length,
    columnCount: 1,
    isUniformGrid: true,
  };
}

/**
 * Нужен ли предпросмотр с учётом якоря: очевидные случаи вставляем сразу без модалки.
 */
export function resolvePastePreview(
  detection: PasteDetectionResult,
  startColIndex: number,
): { needsPreview: boolean; reason?: string } {
  if (detection.grid.length === 0) return { needsPreview: false };

  const maxCols = Math.max(0, ...detection.grid.map((r) => r.length));

  if (maxCols === 1) return { needsPreview: false };

  if (startColIndex === 0 && maxCols === 5 && detection.isUniformGrid) {
    return { needsPreview: false };
  }

  if (maxCols === 5 && detection.isUniformGrid) {
    return { needsPreview: false };
  }

  if (startColIndex === 0 && maxCols === DATA_COLS && detection.isUniformGrid) {
    return { needsPreview: false };
  }

  if (maxCols === DATA_COLS && detection.isUniformGrid) {
    return { needsPreview: false };
  }

  if (detection.delimiter === 'tab' && detection.isUniformGrid) {
    return { needsPreview: false };
  }

  if (
    detection.delimiter === 'semicolon' &&
    detection.isUniformGrid &&
    maxCols >= 2 &&
    maxCols <= DATA_COLS
  ) {
    return { needsPreview: false };
  }

  // Ровная сетка 2–4 колонки, помещается справа от якоря — сразу вставка.
  if (
    detection.isUniformGrid &&
    maxCols >= 2 &&
    maxCols <= 4 &&
    startColIndex + maxCols <= DATA_COLS
  ) {
    return { needsPreview: false };
  }

  if (detection.delimiter === 'comma' && detection.isUniformGrid && detection.rowCount >= 2) {
    return { needsPreview: false };
  }

  if (detection.delimiter === 'comma' && detection.isUniformGrid && maxCols >= 4) {
    return { needsPreview: false };
  }

  // Ровная сетка с «лишними» столбцами: вставляем то, что помещается; без модалки.
  if (detection.isUniformGrid && maxCols >= 2) {
    return { needsPreview: false };
  }

  if (detection.needsPreview) {
    return { needsPreview: true, reason: detection.reason };
  }

  return { needsPreview: false };
}

export function describeDelimiter(d: PasteDelimiter): string {
  switch (d) {
    case 'tab':
      return 'табуляция (Excel / Google Таблицы)';
    case 'semicolon':
      return 'точка с запятой';
    case 'comma':
      return 'запятая (CSV)';
    default:
      return 'одна колонка по строкам';
  }
}

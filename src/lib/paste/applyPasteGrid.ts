import { COLUMN_ORDER } from '../../constants/tableColumns';
import type { ContactRow } from '../../types/contact';
import type { PasteApplyMode, PasteApplyStats } from '../../types/paste';
import { createEmptyRow } from '../../utils/newRow';

function rowIsEmptyData(r: ContactRow): boolean {
  return (
    r.phone.trim() === '' &&
    r.fullName.trim() === '' &&
    r.city.trim() === '' &&
    r.user.trim() === '' &&
    r.comment.trim() === '' &&
    r.owner.trim() === ''
  );
}

function cellIsVisuallyEmpty(value: string): boolean {
  return value.replace(/\u00a0/g, ' ').trim() === '';
}

export type ApplyPasteGridOptions = {
  mode?: PasteApplyMode;
  /** Уже отфильтровано до вызова; попадёт в stats для отчёта. */
  prefilteredAllEmptyRows?: number;
  /** Подставляется в `owner` у строк, расширяющих таблицу при вставке. */
  defaultOwnerForNewRows?: string;
};

/**
 * Применяет сетку к строкам начиная с anchor-строки и колонки.
 * Не мутирует исходный массив.
 */
export function applyPasteGrid(
  rows: ContactRow[],
  startRowId: string,
  startColIndex: number,
  grid: string[][],
  options?: ApplyPasteGridOptions,
): { nextRows: ContactRow[]; stats: PasteApplyStats } {
  const mode: PasteApplyMode = options?.mode ?? 'replace';
  const defOwner = options?.defaultOwnerForNewRows?.replace(/\u00a0/g, ' ').trim() ?? '';

  const emptyStats: PasteApplyStats = {
    rowsCreated: 0,
    rowsTouched: 0,
    rowsUpdatedExisting: 0,
    cellsWritten: 0,
    emptySourceRowsSkipped: 0,
    cellsDroppedOutsideTable: 0,
    prefilteredAllEmptyRows: options?.prefilteredAllEmptyRows,
  };

  const startIdx = rows.findIndex((r) => r.id === startRowId);
  if (startIdx === -1 || grid.length === 0) {
    return { nextRows: rows, stats: emptyStats };
  }

  const stats: PasteApplyStats = { ...emptyStats };
  const next = rows.map((r) => ({ ...r }));
  const existedIndices = new Set<number>();

  for (let r = 0; r < grid.length; r++) {
    const cells = grid[r];
    if (!cells || cells.every((c) => c.trim() === '')) {
      stats.emptySourceRowsSkipped += 1;
      continue;
    }

    const targetIndex = startIdx + r;
    while (next.length <= targetIndex) {
      next.push(createEmptyRow(defOwner ? { owner: defOwner } : undefined));
      stats.rowsCreated += 1;
    }

    if (targetIndex < rows.length) existedIndices.add(targetIndex);

    const before = next[targetIndex];
    let updated = { ...before };
    let rowTouched = false;

    for (let c = 0; c < cells.length; c++) {
      const ci = startColIndex + c;
      const rawVal = cells[c].replace(/\u00a0/g, ' ');
      if (ci < 0 || ci >= COLUMN_ORDER.length) {
        if (rawVal.trim() !== '') stats.cellsDroppedOutsideTable += 1;
        continue;
      }
      const field = COLUMN_ORDER[ci];
      if (field === 'owner') continue;
      if (mode === 'fillEmpty' && !cellIsVisuallyEmpty(updated[field])) {
        continue;
      }
      if (rawVal === updated[field]) continue;
      updated = { ...updated, [field]: rawVal };
      stats.cellsWritten += 1;
      rowTouched = true;
    }

    if (rowTouched) {
      next[targetIndex] = updated;
      stats.rowsTouched += 1;
    }
  }

  for (const idx of existedIndices) {
    const before = rows[idx];
    const after = next[idx];
    if (!before || !after) continue;
    const hadData = !rowIsEmptyData(before);
    const changed =
      before.phone !== after.phone ||
      before.fullName !== after.fullName ||
      before.city !== after.city ||
      before.user !== after.user ||
      before.comment !== after.comment ||
      before.owner !== after.owner;
    if (hadData && changed) stats.rowsUpdatedExisting += 1;
  }

  return { nextRows: next, stats };
}

/**
 * Вставка одного столбца в поле `field` вниз от строки startRowId.
 */
export function applyColumnPaste(
  rows: ContactRow[],
  startRowId: string,
  field: (typeof COLUMN_ORDER)[number],
  values: string[],
  options?: ApplyPasteGridOptions,
): { nextRows: ContactRow[]; stats: PasteApplyStats } {
  const col = COLUMN_ORDER.indexOf(field);
  const grid = values.map((v) => [v]);
  return applyPasteGrid(rows, startRowId, col, grid, options);
}

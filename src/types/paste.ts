import type { DataColumnKey } from '../constants/tableColumns';

export type PasteDelimiter = 'tab' | 'semicolon' | 'comma' | 'newline';

/** Разобранная матрица ячеек из буфера (строки → столбцы). */
export type ParsedClipboardMatrix = string[][];

export type ClipboardParseResult = {
  grid: ParsedClipboardMatrix;
  delimiter: PasteDelimiter;
  needsPreview: boolean;
  reason?: string;
};

/** Результат анализа буфера перед вставкой. */
export type PasteDetectionResult = ClipboardParseResult & {
  rowCount: number;
  columnCount: number;
  /** Все непустые строки имеют одинаковое число колонок после нормализации. */
  isUniformGrid: boolean;
};

export type PasteAnchor = {
  rowId: string;
  field: DataColumnKey;
};

/** Режим записи ячеек при массовой вставке. */
export type PasteApplyMode = 'replace' | 'fillEmpty';

export type PasteApplyStats = {
  rowsCreated: number;
  rowsTouched: number;
  rowsUpdatedExisting: number;
  cellsWritten: number;
  emptySourceRowsSkipped: number;
  /** Ячейки не записаны: не хватило колонок справа от якоря. */
  cellsDroppedOutsideTable: number;
  /** Строки отброшены до apply: все пять полей пустые (импорт столбиками). */
  prefilteredAllEmptyRows?: number;
};

export type PasteCompletionReport = PasteApplyStats & {
  duplicateRowsAfter: number;
  duplicateGroupsAfter: number;
};

/** Итог операции массовой вставки (для UI / тостов). */
export type BulkPasteResult = {
  applied: boolean;
  stats: PasteApplyStats;
  needsPreview: boolean;
  previewReason?: string;
  /** Сырой разбор, если нужно открыть модалку. */
  detection: PasteDetectionResult;
};

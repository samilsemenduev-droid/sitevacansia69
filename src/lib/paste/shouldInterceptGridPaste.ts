import { detectClipboardShape } from '../clipboard/detectClipboardShape';

/**
 * Решает, перехватывать ли paste как «табличный» (сетка) вместо вставки в одну ячейку.
 * Одиночный текст с одной запятой («Иванов, Иван») не перехватываем.
 * Удерживайте Alt при вставке, чтобы всегда вставить как обычный текст в поле.
 */
export function shouldInterceptGridPaste(text: string, altKey: boolean): boolean {
  if (altKey) return false;
  const t = text?.trim() ?? '';
  if (!t) return false;

  if (t.includes('\t')) return true;
  if (/[\n\r]/.test(text)) {
    const det = detectClipboardShape(text);
    const nonEmptyLines = det.grid.filter((row) => row.some((c) => c.trim() !== '')).length;
    return nonEmptyLines >= 2 || det.columnCount >= 2;
  }

  if (!t.includes(';') && !t.includes(',')) return false;

  const det = detectClipboardShape(text);
  if (det.grid.length === 0) return false;

  const meaningfulRows = det.grid.filter((row) => row.some((c) => c.trim() !== '')).length;
  const maxCols = Math.max(0, ...det.grid.map((r) => r.length));

  if (meaningfulRows >= 2) return true;
  if (maxCols >= 3) return true;
  // Одна строка и две «колонки» — часто «Фамилия, Имя»; не перехватываем
  if (meaningfulRows === 1 && maxCols === 2) return false;
  return maxCols >= 2;
}
